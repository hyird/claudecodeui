import fs from 'node:fs';
import ts from 'typescript';

const modules = [
  'index', 'terminal-validation', 'terminal-workspaces', 'terminal-output',
  'terminal-sessions', 'terminal-snapshot', 'auth-http', 'auth-sockets', 'websocket-server', 'static-assets',
].map((name) => fs.readFileSync(new URL(`../${name}.js`, import.meta.url), 'utf8'));

export function readServerSource() {
  return modules.join('\n');
}

// Locate the production declaration structurally, including functions inside
// factories. Tests supply the captured dependencies without starting Bun.
export function extractServerFunction(name) {
  for (const text of modules) {
    const source = ts.createSourceFile('server.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    let match;
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) match = node;
      if (!match) ts.forEachChild(node, visit);
    };
    visit(source);
    if (match) {
      const margin = source.getLineAndCharacterOfPosition(match.getStart(source)).character;
      return match.getText(source).split('\n').map((line, index) => (
        index && line.startsWith(' '.repeat(margin)) ? line.slice(margin) : line
      )).join('\n').replace(/^export /, '');
    }
  }
  throw new Error(`Missing server function ${name}`);
}
