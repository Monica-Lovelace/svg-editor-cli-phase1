import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SvgReader } from '../src/infrastructure/SvgReader.js';

test('real compiled CLI replays assignment flowchart, saves eight elements and reads back', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'svg-cli-integration-'));
  try {
    const script = await readFile('examples/flowchart.commands', 'utf8');
    const child = spawnSync(process.execPath, [resolve('dist/src/main.js')], {
      cwd: dir, input: script.replace('examples/flowchart.svg', 'flowchart.svg') + '\nread flowchart.svg\nshow process-label\nundo\n', encoding: 'utf8', timeout: 10000,
    });
    assert.equal(child.status, 0, child.stderr); assert.equal(child.stderr, '');
    assert.match(child.stdout, /svg-editor 0.1/); assert.match(child.stdout, /saved to flowchart.svg \(8 elements\)/);
    assert.match(child.stdout, /text="处理数据 v2"/);
    assert.equal(child.stdout.split('\n').filter(line => line.startsWith('error:')).length, 1);
    assert.match(child.stdout, /error: undo not allowed after io command/);
    const doc = new SvgReader().parse(await readFile(join(dir, 'flowchart.svg'), 'utf8')).document;
    assert.equal(doc.count, 8); assert.equal(doc.find('process').attributes.y, '100');
    assert.equal(doc.find('process-label').textContent, '处理数据 v2');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('complete assignment transcript reports specified errors and missing-id warning', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'svg-cli-session-'));
  try {
    const script = (await readFile('examples/session.commands', 'utf8'))
      .replace('examples/session.svg', join(dir, 'session.svg'));
    const child = spawnSync(process.execPath, [resolve('dist/src/main.js')], { input: script, encoding: 'utf8', timeout: 10000 });
    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stdout, /error: cannot group a container into its own descendant: markers/);
    assert.match(child.stdout, /saved to .*session.svg \(5 elements\)/);
    assert.match(child.stdout, /warning: assigned id rect1 to unnamed <rect>/);
    assert.match(child.stdout, /read tests\/fixtures\/other.svg \(7 elements\)/);
    assert.equal(child.stdout.split('\n').filter(line => line.startsWith('error:')).length, 2);
    const doc = new SvgReader().parse(await readFile(join(dir, 'session.svg'), 'utf8')).document;
    assert.equal(doc.find('c1').attributes.cx, '130'); assert.equal(doc.find('title').textContent, 'My Diagram');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
