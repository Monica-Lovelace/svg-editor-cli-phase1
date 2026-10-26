import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, dirname, basename } from 'node:path';

const root = resolve('src');
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.ts')) files.push(path);
  }
}
await walk(root);
const allowed = { domain: new Set(['domain']), application: new Set(['application','domain']), cli: new Set(['cli','application','domain']), infrastructure: new Set(['infrastructure','application','domain']) };
const violations = [];
let imports = 0;
let classes = 0;
for (const file of files) {
  const local = relative(root, file).replaceAll('\\', '/');
  const layer = local.split('/')[0];
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let classCount = 0;
  function inspect(node) {
    if (ts.isClassDeclaration(node)) {
      classes++; classCount++;
      if (node.name?.text !== basename(file, '.ts')) violations.push(`${local}: class and filename differ`);
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports++;
      const target = node.moduleSpecifier.text;
      if (target.startsWith('.')) {
        const dependency = relative(root, resolve(dirname(file), target)).replaceAll('\\', '/').split('/')[0];
        if (allowed[layer] && !allowed[layer].has(dependency)) violations.push(`${local}: forbidden ${layer} -> ${dependency}`);
      } else if (layer === 'domain' || layer === 'application') violations.push(`${local}: core depends on external package ${target}`);
    }
    if (ts.isSwitchStatement(node)) violations.push(`${local}: switch requires review; use polymorphism or the two catalogs`);
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(node.operatorToken.kind)) {
      if (ts.isPropertyAccessExpression(node.left) && ['type', 'tag'].includes(node.left.name.text) && ts.isStringLiteral(node.right)) {
        violations.push(`${local}: possible shape-name dispatch outside factory`);
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  if (classCount > 1) violations.push(`${local}: multiple classes in one file`);
}
if (violations.length) {
  console.error(violations.join('\n')); process.exitCode = 1;
} else console.log(`Architecture checks passed: ${files.length} source files, ${classes} classes, ${imports} imports; dependency rules and one-class-per-file verified. Name-dispatch heuristics require human review too.`);
