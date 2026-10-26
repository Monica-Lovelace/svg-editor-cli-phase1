import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, mkdir, readdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgReader } from '../src/infrastructure/SvgReader.js';
import { SvgWriter } from '../src/infrastructure/SvgWriter.js';
import { NodeDocumentStore } from '../src/infrastructure/NodeDocumentStore.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { Repl } from '../src/cli/Repl.js';
import { TreeRenderer } from '../src/cli/TreeRenderer.js';

test('assignment SVG imports seven elements, warns once, and round-trips tree and order', async () => {
  const source = await readFile('tests/fixtures/other.svg', 'utf8');
  const result = new SvgReader().parse(source);
  assert.equal(result.document.count, 7);
  assert.deepEqual(result.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.deepEqual(result.document.children.map(s => s.id), ['rect1','t1','c1','g1','e1']);
  const xml = new SvgWriter().serialize(result.document);
  const again = new SvgReader().parse(xml);
  assert.deepEqual(again.warnings, []);
  assert.equal(new TreeRenderer().render(again.document), new TreeRenderer().render(result.document));
});

test('missing ids reserve explicit ids throughout the document before assigning names', () => {
  const result = new SvgReader().parse('<svg><rect/><g><rect id="rect1"/><rect/></g><rect id="rect3"/></svg>');
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g1 to unnamed <g>', 'warning: assigned id rect4 to unnamed <rect>',
  ]);
  assert.equal(result.document.count, 5);
  assert.throws(() => new SvgReader().parse('<svg><g id="x"><rect id="x"/></g></svg>'), /id already exists: x/);
});

test('text, entities, CDATA, whitespace and quoted attributes survive XML round-trip', () => {
  const reader = new SvgReader(); const writer = new SvgWriter();
  const source = '<svg><g id="g" fill="red"><text id="t" x="1" y="2" font-family="A &quot;B&quot;">  中文 &lt; &amp; &gt; &quot; 😀<![CDATA[ <end> ]]></text><text id="empty"/><line id="l"/></g></svg>';
  const first = reader.parse(source).document;
  assert.equal(first.find('t').textContent, '  中文 < & > " 😀 <end> ');
  const serialized = writer.serialize(first);
  assert.match(serialized, /font-family="A &quot;B&quot;"/);
  assert.equal(first.find('l').attributes.stroke, undefined);
  assert.equal(first.find('empty').textContent, '');
  assert.deepEqual(reader.parse(serialized).document.find('t').attributes, first.find('t').attributes);
  assert.equal(reader.parse(serialized).document.find('t').textContent, first.find('t').textContent);
});

test('background example imports translate/scale with correct composed geometry and typography', async () => {
  const result = new SvgReader().parse(await readFile('tests/fixtures/transformed.svg', 'utf8'));
  assert.equal(result.document.count, 6);
  assert.equal(result.document.find('a').attributes.x, '60');
  assert.equal(result.document.find('rect1').attributes.x, '260');
  assert.equal(result.document.find('rect1').attributes.width, '96');
  const text = result.document.find('text1');
  assert.equal(text.attributes.x, '308');
  assert.equal(text.attributes.y, '70.4');
  assert.equal(text.attributes['font-size'], '12.8');
  assert.equal(text.attributes['text-anchor'], 'middle');
  assert.equal(text.attributes['stroke-width'], '0.8');
  const writer = new SvgWriter(); const xml = writer.serialize(result.document);
  assert.ok(!xml.includes('transform='));
  assert.equal(writer.serialize(new SvgReader().parse(xml).document), xml);
});

test('root presentation and inherited transformed stroke/font preserve appearance', () => {
  const reader = new SvgReader(); const writer = new SvgWriter();
  const first = reader.parse('<svg width="100px" height="200px" fill="blue" stroke-width="2"><g id="g" transform="scale(2) translate(3 4)" font-size="10"><text id="t" x="1" y="1">Hi</text></g></svg>').document;
  assert.equal(first.presentation.fill, 'blue');
  assert.equal(first.find('t').attributes.x, '8'); assert.equal(first.find('t').attributes.y, '10');
  assert.equal(first.find('t').attributes['stroke-width'], '4');
  assert.equal(first.find('t').attributes['font-size'], '20');
  assert.equal(writer.serialize(reader.parse(writer.serialize(first)).document), writer.serialize(first));
});

test('unsupported SVG is rejected explicitly instead of silently discarded', () => {
  const reader = new SvgReader();
  for (const source of [
    '<svg><rect></svg>', '<html/>', '<svg/><svg/>', '<!DOCTYPE svg><svg/>',
    '<svg><path id="p" d="M 0 0"/></svg>', '<svg><text id="t"><tspan>Hi</tspan></text></svg>',
    '<svg><g id="g" transform="rotate(30)"/></svg>', '<svg><g id="g" transform="scale(2,3)"/></svg>',
    '<svg><rect id="r" style="fill:red"/></svg>', '<svg viewBox="0 0 100 100" width="200" height="200"/>',
    '<svg xmlns="urn:other"/>', '<svg><circle id="c" r="-1"/></svg>',
  ]) assert.throws(() => reader.parse(source), /./, source);
});

test('real file errors and malformed imports leave session, redo and path unchanged', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'svg-editor-test-'));
  try {
    const store = new NodeDocumentStore(); const session = new EditorSession(store); const repl = new Repl(session);
    const good = join(dir, 'good.svg'); const bad = join(dir, 'bad.svg');
    await repl.evaluate('init'); await repl.evaluate('create rect r 1 2 3 4'); await repl.evaluate(`save "${good}"`);
    await repl.evaluate('move r 1 1'); await repl.evaluate('undo');
    const before = new SvgWriter().serialize(session.document);
    await writeFile(bad, '<svg><rect/><path/></svg>');
    for (const command of [`read "${bad}"`, `read "${dir}/missing.svg"`, `save "${dir}/missing/target.svg"`, `save "${dir}"`]) {
      assert.match((await repl.evaluate(command))[0]!, /^error:/);
      assert.equal(new SvgWriter().serialize(session.document), before);
      assert.equal(session.path, good);
    }
    await chmod(good, 0o444);
    assert.equal((await repl.evaluate(`save "${good}"`))[0], `error: cannot write file: ${good}`);
    await chmod(good, 0o644);
    await repl.evaluate('redo'); assert.equal(session.document.find('r').attributes.x, '2');
    await repl.evaluate('save');
    assert.equal((await store.read(good)).document.find('r').attributes.x, '2');
    assert.ok((await readdir(dir)).every(name => !name.endsWith('.tmp')));
    await mkdir(join(dir, 'folder'));
    assert.equal((await repl.evaluate(`read "${dir}/folder"`))[0], `error: cannot read file: ${dir}/folder`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
