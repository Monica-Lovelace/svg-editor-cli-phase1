import { EditorSession } from './application/EditorSession.js';
import { Repl } from './cli/Repl.js';
import { NodeDocumentStore } from './infrastructure/NodeDocumentStore.js';

const session = new EditorSession(new NodeDocumentStore());
await new Repl(session).run(process.stdin, process.stdout);
