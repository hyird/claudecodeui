import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

test('server modules resolve runtime names and imports without the test VM globals', () => {
  const directory = fileURLToPath(new URL('.', import.meta.url));
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.js') && !file.endsWith('.test.js'))
    .map((file) => directory + file);
  const program = ts.createProgram(files, {
    allowJs: true, checkJs: true, noEmit: true, esModuleInterop: true, resolveJsonModule: true,
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true,
  });
  const errors = ts.getPreEmitDiagnostics(program).filter((diagnostic) => [2304, 2305, 2552].includes(diagnostic.code));
  assert.deepEqual(errors.map((error) => ({
    file: error.file?.fileName,
    message: ts.flattenDiagnosticMessageText(error.messageText, ' '),
  })), []);
});
