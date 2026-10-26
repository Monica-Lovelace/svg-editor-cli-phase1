import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorSession } from '../src/application/EditorSession.js';
import { Repl } from '../src/cli/Repl.js';
import { Tokenizer } from '../src/cli/Tokenizer.js';
import { TreeRenderer } from '../src/cli/TreeRenderer.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

test('tokenizer handles quoted empty/Chinese text, escaped quotes, colors and whole-line comments', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('  # comment'), []);
  assert.deepEqual(tokenizer.tokenize('  '), []);
  assert.deepEqual(tokenizer.tokenize('set t text "中文 \\"双引号\\""').map(t => t.value), ['set','t','text','中文 "双引号"']);
  assert.equal(tokenizer.tokenize('""')[0]?.value, '');
  assert.equal(tokenizer.tokenize('#fff').length, 0);
  assert.equal(tokenizer.tokenize('set r fill #fff')[3]?.value, '#fff');
  assert.throws(() => tokenizer.tokenize('"open'), /unterminated/);
  assert.throws(() => tokenizer.tokenize('"text"tail'), /whitespace/);
});

test('CLI minimal vertical slice: init, create, move, undo, redo and queries', async () => {
  const session = new EditorSession(new MemoryDocumentStore()); const repl = new Repl(session);
  assert.match((await repl.evaluate('tree'))[0]!, /no document/);
  assert.match((await repl.evaluate('help'))[0]!, /Commands:/);
  await repl.evaluate('init');
  assert.match((await repl.evaluate('undo'))[0]!, /undo not allowed after io command/);
  assert.deepEqual(await repl.evaluate('create rect r 10 20 30 40 #fff'), ['rect#r created']);
  await repl.evaluate('move r 0.5 -2'); assert.equal(session.document.find('r').attributes.x, '10.5');
  await repl.evaluate('undo'); assert.equal(session.document.find('r').attributes.x, '10');
  await repl.evaluate('tree'); await repl.evaluate('show r'); await repl.evaluate('canvas'); await repl.evaluate('help');
  await repl.evaluate('redo'); assert.equal(session.document.find('r').attributes.x, '10.5');
  await repl.evaluate('undo'); await repl.evaluate('set r fill red');
  assert.deepEqual(await repl.evaluate('redo'), ['error: nothing to redo']);
});

test('create in accepts every type; quoted in text is not treated as a suffix', async () => {
  const session = new EditorSession(new MemoryDocumentStore()); const repl = new Repl(session);
  await repl.evaluate('init 400 300'); await repl.evaluate('create g root');
  for (const [type, params] of [['rect','0 0 10 10'],['circle','1 2 3'],['ellipse','1 2 3 4'],['line','0 0 1 1'],['text','1 2 "in"'],['g','']]) {
    const result = await repl.evaluate(`create ${type} ${type} ${params} in root`);
    assert.match(result[0]!, /created in g#root/);
  }
  await repl.evaluate('create text t 1 2 "in"');
  assert.equal(session.document.find('t').textContent, 'in');
  await repl.evaluate('create text empty 1 2 ""');
  assert.equal(session.document.find('empty').textContent, '');
  assert.deepEqual(await repl.evaluate('create g bad in missing'), ['error: no such container: missing']);
  assert.deepEqual(await repl.evaluate('create g bad in rect'), ['error: not a container: rect']);
  assert.deepEqual(await repl.evaluate('create box bad 1 2 3 4 "x"'), ['error: unknown shape type: box (is the plugin loaded?)']);
});

test('group, delete subtree, reparent, ungroup and z-order each undo as one unit', async () => {
  const session = new EditorSession(new MemoryDocumentStore()); const repl = new Repl(session); const renderer = new TreeRenderer();
  for (const command of ['init','create g scene','create rect a 0 0 10 10 in scene','create circle b 20 20 5 in scene','create text c 1 1 "C" in scene']) await repl.evaluate(command);
  const before = renderer.render(session.document);
  await repl.evaluate('group pair b a');
  assert.deepEqual(session.document.container('pair').children.map(s => s.id), ['a','b']);
  await repl.evaluate('undo'); assert.equal(renderer.render(session.document), before);
  await repl.evaluate('redo');
  const grouped = renderer.render(session.document);
  for (const command of ['delete pair','ungroup pair','addto pair c','front pair','back c','scale pair 2','move pair 10 20']) {
    const result = await repl.evaluate(command); assert.ok(!result[0]!.startsWith('error:'), result[0]!);
    await repl.evaluate('undo'); assert.equal(renderer.render(session.document), grouped, command);
  }
  assert.deepEqual(await repl.evaluate('ungroup scene'), ['error: cannot ungroup top-level container: scene']);
});

test('failed edits preserve document, path and redo; partial recursive mutation rolls back', async () => {
  const session = new EditorSession(new MemoryDocumentStore()); const repl = new Repl(session); const renderer = new TreeRenderer();
  for (const command of ['init','create g scene','create rect r 1 2 3 4 in scene','create circle huge 1e308 0 1 in scene','move r 2 3','undo']) await repl.evaluate(command);
  const before = renderer.render(session.document);
  for (const command of ['scale scene 2','set r width -1','set r unknown 1','group bad r missing','group bad scene r','addto scene scene','create rect r 0 0 1 1','move missing 1 1','move r NaN 1','scale r 0','set r x Infinity']) {
    const result = await repl.evaluate(command); assert.match(result[0]!, /^error:/, command);
    assert.equal(renderer.render(session.document), before, command);
    assert.equal(session.path, undefined);
  }
  await repl.evaluate('redo'); assert.equal(session.document.find('r').attributes.x, '3');
});

test('only successful document mutations clear history; save binds a default path', async () => {
  const store = new MemoryDocumentStore(); const session = new EditorSession(store); const repl = new Repl(session);
  await repl.evaluate('init'); await repl.evaluate('create g a');
  assert.deepEqual(await repl.evaluate('save'), ['error: no save path. use save <file.svg>']);
  assert.deepEqual(await repl.evaluate('save unwritable.svg'), ['error: cannot write file: unwritable.svg']);
  assert.deepEqual(await repl.evaluate('read missing.svg'), ['error: cannot read file: missing.svg']);
  await repl.evaluate('undo'); assert.equal(session.document.count, 0); await repl.evaluate('redo');
  await repl.evaluate('save doc.svg'); assert.equal(session.path, 'doc.svg');
  assert.deepEqual(await repl.evaluate('undo'), ['error: undo not allowed after io command']);
  await repl.evaluate('create g b'); await repl.evaluate('undo'); assert.equal(session.document.count, 1);
  assert.deepEqual(await repl.evaluate('undo'), ['error: nothing to undo']);
  await repl.evaluate('save'); assert.ok(store.files.has('doc.svg'));
  await repl.evaluate('create g c'); await repl.evaluate('canvas 900 700');
  assert.deepEqual(await repl.evaluate('redo'), ['error: undo not allowed after io command']);
  await repl.evaluate('create g d'); await repl.evaluate('read doc.svg'); assert.equal(session.document.count, 1);
  assert.deepEqual(await repl.evaluate('undo'), ['error: undo not allowed after io command']);
  await repl.evaluate('init'); assert.equal(session.path, undefined);
});

test('every shape geometry whitelist updates, scales and restores exact numeric values', async () => {
  const session = new EditorSession(new MemoryDocumentStore()); const repl = new Repl(session);
  await repl.evaluate('init');
  const cases: [string, string, string[]][] = [
    ['rect','1 2 3 4',['x','y','width','height']], ['circle','1 2 3',['cx','cy','r']],
    ['ellipse','1 2 3 4',['cx','cy','rx','ry']], ['line','1 2 3 4',['x1','y1','x2','y2']], ['text','1 2 "text"',['x','y']],
  ];
  for (const [type, args, attributes] of cases) {
    await repl.evaluate(`create ${type} ${type} ${args}`);
    for (const name of attributes) {
      await repl.evaluate(`set ${type} ${name} 0.1`);
      assert.equal(session.document.find(type).attributes[name], '0.1');
    }
    for (const [name, value] of [['fill','red'],['stroke','blue'],['stroke-width','1.5']]) {
      await repl.evaluate(`set ${type} ${name} ${value}`); assert.equal(session.document.find(type).attributes[name!], value);
    }
    await repl.evaluate(`scale ${type} 3`); await repl.evaluate('undo');
    for (const name of attributes) assert.equal(session.document.find(type).attributes[name], '0.1');
  }
  await repl.evaluate('create g g'); await repl.evaluate('set g fill red');
  assert.equal(session.document.find('g').attributes.fill, 'red');
  assert.match((await repl.evaluate('set g x 1'))[0]!, /unknown attribute: x/);
  assert.match((await repl.evaluate('set text label x'))[0]!, /unknown attribute: label/);
});

test('repeated structural edits undo to each prior tree and redo to the same result', async () => {
  const session = new EditorSession(new MemoryDocumentStore()); const repl = new Repl(session); const renderer = new TreeRenderer();
  for (const command of ['init','create g scene','create g left in scene','create g right in scene','create rect a 0 0 1 1 in left','create rect b 2 2 1 1 in right','create circle c 4 4 1 in right']) await repl.evaluate(command);
  const snapshots = [renderer.render(session.document)];
  const sequence = ['group pair b a','addto pair c','move pair 0.1 -0.2','scale scene 1.1','set pair fill blue','front left','back pair','ungroup pair','delete right','group newPair c b','delete newPair'];
  for (const command of sequence) {
    assert.ok(!(await repl.evaluate(command))[0]!.startsWith('error:'), command);
    session.document.assertValid(); snapshots.push(renderer.render(session.document));
  }
  for (let index = sequence.length - 1; index >= 0; index--) {
    await repl.evaluate('undo'); assert.equal(renderer.render(session.document), snapshots[index]);
    session.document.assertValid();
  }
  for (let index = 1; index <= sequence.length; index++) {
    await repl.evaluate('redo'); assert.equal(renderer.render(session.document), snapshots[index]);
    session.document.assertValid();
  }
});
