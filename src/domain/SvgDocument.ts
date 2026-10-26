import { Shape } from './shapes/Shape.js';
import { Group } from './shapes/Group.js';
import { EditorError } from './EditorError.js';
import { Numeric } from './Numeric.js';

export class SvgDocument {
  #width: number;
  #height: number;
  readonly #root = new Group('__internal_canvas__');
  #index = new Map<string, Shape>();
  #parents = new Map<Shape, Group>();

  constructor(width = 800, height = 600) {
    this.#width = Numeric.positive(width, 'canvas width');
    this.#height = Numeric.positive(height, 'canvas height');
  }

  get width(): number { return this.#width; }
  get height(): number { return this.#height; }
  get children(): readonly Shape[] { return this.#root.children; }
  get count(): number { return this.#index.size; }

  resize(width: number, height: number): void {
    Numeric.positive(width, 'canvas width'); Numeric.positive(height, 'canvas height');
    this.#width = width; this.#height = height;
  }

  find(id: string): Shape {
    const shape = this.#index.get(id);
    if (!shape) throw new EditorError(`no such shape: ${id}`);
    return shape;
  }

  container(id: string): Group {
    const shape = this.#index.get(id);
    if (!shape) throw new EditorError(`no such container: ${id}`);
    if (!shape.container) throw new EditorError(`not a container: ${id}`);
    return shape.container;
  }

  parentOf(id: string): Group | undefined {
    const parent = this.#parents.get(this.find(id));
    return parent === this.#root ? undefined : parent;
  }

  add(shape: Shape, parentId?: string): void {
    const parent = parentId === undefined ? this.#root : this.container(parentId);
    const ids = new Set<string>();
    const check = (node: Shape): void => {
      if (ids.has(node.id) || this.#index.has(node.id)) throw new EditorError(`id already exists: ${node.id}`);
      ids.add(node.id); node.children.forEach(check);
    };
    check(shape);
    parent.insert(shape);
    this.assertValid();
  }

  delete(id: string): Shape {
    const shape = this.find(id);
    this.#parents.get(shape)!.remove(shape);
    this.assertValid(); return shape;
  }

  group(newId: string, ids: readonly string[]): Group {
    if (this.#index.has(newId)) throw new EditorError(`id already exists: ${newId}`);
    if (new Set(ids).size !== ids.length) throw new EditorError('duplicate group target');
    if (!ids.length) throw new EditorError('group requires at least one shape');
    const selected = ids.map(id => this.find(id));
    for (const shape of selected) {
      if (selected.some(other => other !== shape && shape.contains(other))) {
        throw new EditorError(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    // The common ancestor preserves local grouping; cross-parent input uses the LCA.
    let parent = this.#parents.get(selected[0]!)!;
    while (!selected.every(shape => parent.contains(shape))) parent = this.#parents.get(parent)!;
    const ordered = [...this.#index.values()].filter(shape => selected.includes(shape));
    const position = parent.children.findIndex(child => selected.some(shape => child.contains(shape)));
    const group = new Group(newId);
    for (const shape of ordered) { this.#parents.get(shape)!.remove(shape); group.insert(shape); }
    parent.insert(group, position);
    this.assertValid(); return group;
  }

  ungroup(id: string): void {
    const group = this.container(id);
    const parent = this.#parents.get(group)!;
    if (parent === this.#root) throw new EditorError(`cannot ungroup top-level container: ${id}`);
    const position = parent.remove(group);
    for (const [offset, shape] of group.children.entries()) {
      group.remove(shape); parent.insert(shape, position + offset);
    }
    this.assertValid();
  }

  addTo(groupId: string, id: string): void {
    const group = this.container(groupId);
    const shape = this.find(id);
    if (shape.contains(group)) throw new EditorError(`cannot add a container into its own descendant: ${id}`);
    this.#parents.get(shape)!.remove(shape);
    group.insert(shape); this.assertValid();
  }

  reorder(id: string, front: boolean): void {
    const shape = this.find(id);
    const parent = this.#parents.get(shape)!;
    parent.remove(shape); parent.insert(shape, front ? parent.children.length : 0);
    this.assertValid();
  }

  clone(): SvgDocument {
    const result = new SvgDocument(this.width, this.height);
    for (const shape of this.children) result.#root.insert(shape.clone());
    result.assertValid(); return result;
  }

  /** Rebuild both indexes; reject cycles, duplicate objects and duplicate ids. */
  assertValid(): void {
    const index = new Map<string, Shape>();
    const parents = new Map<Shape, Group>();
    const visit = (shape: Shape, parent: Group): void => {
      if (parents.has(shape)) throw new EditorError('invalid tree: cycle or shared child');
      if (index.has(shape.id)) throw new EditorError(`id already exists: ${shape.id}`);
      index.set(shape.id, shape); parents.set(shape, parent);
      for (const child of shape.children) visit(child, shape.container!);
    };
    for (const shape of this.children) visit(shape, this.#root);
    this.#index = index; this.#parents = parents;
  }
}
