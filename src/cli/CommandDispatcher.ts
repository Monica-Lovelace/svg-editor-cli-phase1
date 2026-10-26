import type { Command } from '../application/commands/Command.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { ReadCommand } from '../application/commands/ReadCommand.js';
import { SaveCommand } from '../application/commands/SaveCommand.js';
import { CanvasCommand } from '../application/commands/CanvasCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { UndoCommand } from '../application/commands/UndoCommand.js';
import { RedoCommand } from '../application/commands/RedoCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { EditorError } from '../domain/EditorError.js';
import { Arguments } from './Arguments.js';
import { Tokenizer } from './Tokenizer.js';

interface Entry { readonly syntax: string; readonly build: (args: Arguments) => Command }

/** Name dispatch point 1. TODO: external command registration in a later phase. */
export class CommandDispatcher {
  readonly #entries: ReadonlyMap<string, Entry>;
  readonly #tokenizer = new Tokenizer();

  constructor(private readonly shapes = new ShapeFactory()) {
    this.#entries = new Map<string, Entry>([
      ['init', { syntax: 'init [w h]', build: a => { a.count(0, 2); return new InitCommand(a.tokens.length ? a.number(0, 'width') : 800, a.tokens.length ? a.number(1, 'height') : 600); } }],
      ['read', { syntax: 'read <file.svg>', build: a => { a.count(1); return new ReadCommand(a.string(0)); } }],
      ['save', { syntax: 'save [file.svg]', build: a => { a.count(0, 1); return new SaveCommand(a.tokens[0]?.value); } }],
      ['canvas', { syntax: 'canvas [w h]', build: a => { a.count(0, 2); return new CanvasCommand(a.tokens.length ? a.number(0, 'width') : undefined, a.tokens.length ? a.number(1, 'height') : undefined); } }],
      ['create', { syntax: 'create <type> <id> [params...] [in <containerId>]', build: a => this.create(a) }],
      ['delete', { syntax: 'delete <id>', build: a => { a.count(1); return new DeleteCommand(a.string(0)); } }],
      ['move', { syntax: 'move <id> <dx> <dy>', build: a => { a.count(3); return new MoveCommand(a.string(0), a.number(1, 'dx'), a.number(2, 'dy')); } }],
      ['scale', { syntax: 'scale <id> <factor>', build: a => { a.count(2); return new ScaleCommand(a.string(0), a.number(1, 'factor')); } }],
      ['set', { syntax: 'set <id> <attr> <value>', build: a => { a.count(3); return new SetCommand(a.string(0), a.string(1), a.string(2)); } }],
      ['group', { syntax: 'group <newGid> <id1> [id2 ...]', build: a => { a.atLeast(2); return new GroupCommand(a.string(0), a.values.slice(1)); } }],
      ['ungroup', { syntax: 'ungroup <gid>', build: a => { a.count(1); return new UngroupCommand(a.string(0)); } }],
      ['addto', { syntax: 'addto <gid> <id>', build: a => { a.count(2); return new AddToCommand(a.string(0), a.string(1)); } }],
      ['front', { syntax: 'front <id>', build: a => { a.count(1); return new FrontCommand(a.string(0)); } }],
      ['back', { syntax: 'back <id>', build: a => { a.count(1); return new BackCommand(a.string(0)); } }],
      ['tree', { syntax: 'tree [id]', build: a => { a.count(0, 1); return new TreeCommand(a.tokens[0]?.value); } }],
      ['show', { syntax: 'show <id>', build: a => { a.count(1); return new ShowCommand(a.string(0)); } }],
      ['help', { syntax: 'help', build: a => { a.count(0); return new HelpCommand(this.help); } }],
      ['undo', { syntax: 'undo', build: a => { a.count(0); return new UndoCommand(); } }],
      ['redo', { syntax: 'redo', build: a => { a.count(0); return new RedoCommand(); } }],
    ]);
  }

  parse(line: string): Command | undefined {
    const tokens = this.#tokenizer.tokenize(line);
    const name = tokens[0]?.value;
    if (name === undefined) return undefined;
    const entry = this.#entries.get(name);
    if (!entry) throw new EditorError(`unknown command: ${name}`);
    return entry.build(new Arguments(tokens.slice(1)));
  }

  get help(): string {
    return ['Commands:', ...[...this.#entries.values()].map(entry => `  ${entry.syntax}`), '', 'Shapes:',
      '  rect <id> <x> <y> <w> <h> [fill]', '  circle <id> <cx> <cy> <r> [fill]',
      '  ellipse <id> <cx> <cy> <rx> <ry> [fill]', '  line <id> <x1> <y1> <x2> <y2> [stroke]',
      '  text <id> <x> <y> "content"', '  g <id>', '',
      'Double-quote arguments containing spaces. Lines beginning with # are comments.',
      'End input with Ctrl-D. box/plugins are outside phase 1.'].join('\n');
  }

  private create(args: Arguments): Command {
    args.atLeast(2);
    const suffix = args.tokens.at(-2);
    const hasParent = args.tokens.length >= 4 && suffix?.value === 'in' && !suffix.quoted;
    const end = hasParent ? -2 : undefined;
    return new CreateCommand(this.shapes, args.string(0), args.string(1), args.values.slice(2, end), hasParent ? args.tokens.at(-1)!.value : undefined);
  }
}
