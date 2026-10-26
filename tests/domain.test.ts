import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { Group } from '../src/domain/shapes/Group.js';
import { DocumentMemento } from '../src/domain/DocumentMemento.js';

test('six polymorphic shapes clone, scale and move without leaking mutable attributes', () => {
  const factory = new ShapeFactory();
  const inputs: [string, string[]][] = [
    ['rect', ['1','2','3','4']], ['circle', ['1','2','3']], ['ellipse', ['1','2','3','4']],
    ['line', ['1','2','3','4']], ['text', ['1','2','中文 & space']], ['g', []],
  ];
  for (const [type, args] of inputs) {
    const shape = factory.create(type, type, args);
    const clone = shape.clone(); shape.scale(2); shape.move(10, 20);
    assert.deepEqual(clone.attributes, factory.create(type, type, args).attributes);
    assert.throws(() => shape.setAttribute('id', 'changed'), /unknown attribute/);
    assert.throws(() => shape.scale(0), /scale factor must be positive/);
    assert.ok(Object.isFrozen(shape.attributes));
  }
});

test('nested Composite changes each leaf once, snapshots remain independent', () => {
  const doc = new SvgDocument(); const factory = new ShapeFactory();
  doc.add(new Group('outer')); doc.add(new Group('inner'), 'outer');
  doc.add(factory.create('rect', 'r', ['1','2','3','4']), 'inner');
  const before = new DocumentMemento(doc);
  doc.find('outer').move(10, 20); doc.find('outer').scale(2);
  assert.equal(doc.find('r').attributes.x, '22');
  assert.equal(doc.find('r').attributes.y, '44');
  assert.equal(before.restore().find('r').attributes.x, '1');
  doc.delete('outer'); assert.equal(doc.count, 0);
  const restored = before.restore(); assert.equal(restored.count, 3);
  restored.find('r').move(5, 5);
  assert.equal(before.restore().find('r').attributes.x, '1');
});

test('group uses original tree order, ungroup preserves slot, and cycles are rejected', () => {
  const doc = new SvgDocument(); const factory = new ShapeFactory();
  doc.add(new Group('scene'));
  for (const id of ['a','b','c','d']) doc.add(factory.create('rect', id, ['0','0','1','1']), 'scene');
  doc.group('pair', ['c','b']);
  assert.deepEqual(doc.container('scene').children.map(s => s.id), ['a','pair','d']);
  assert.deepEqual(doc.container('pair').children.map(s => s.id), ['b','c']);
  assert.throws(() => doc.addTo('pair', 'scene'), /own descendant/);
  assert.throws(() => doc.group('bad', ['b','pair']), /own descendant: pair/);
  doc.ungroup('pair');
  assert.deepEqual(doc.container('scene').children.map(s => s.id), ['a','b','c','d']);
  assert.throws(() => doc.ungroup('scene'), /top-level container/);
});

test('cross-parent grouping uses LCA, case-sensitive ids and tree indexes remain consistent', () => {
  const doc = new SvgDocument();
  for (const id of ['left','right']) doc.add(new Group(id));
  doc.add(new Group('A'), 'left'); doc.add(new Group('a'), 'right');
  doc.group('together', ['a','A']);
  assert.equal(doc.parentOf('together'), undefined);
  assert.deepEqual(doc.container('together').children.map(s => s.id), ['A','a']);
  assert.throws(() => doc.add(new Group('A')), /id already exists/);
  doc.assertValid(); assert.equal(doc.count, 5);
});
