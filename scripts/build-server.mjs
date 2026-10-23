import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const outdir = path.join(root, 'dist-server');
const nativePackages = ['node-pty', 'better-sqlite3'];
await fs.rm(outdir, { recursive: true, force: true });
await build({
  absWorkingDir: root,
  entryPoints: ['server/index.js', 'server/pty-broker.js'],
  entryNames: '[name]',
  outdir,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  external: [...nativePackages, 'bufferutil', 'utf-8-validate'],
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
});
await fs.rename(path.join(outdir, 'index.js'), path.join(outdir, 'server.js'));
await fs.writeFile(path.join(outdir, 'package.json'), '{"private":true,"type":"module"}\n');

// Native modules must be built on the deployment host. Copy their installed
// dependency closure, including compiled addons and node-pty's spawn helper.
async function copyPackage(name, from, destination) {
  const requireFrom = createRequire(from);
  const manifest = requireFrom.resolve(`${name}/package.json`);
  const source = path.dirname(manifest);
  const pkg = JSON.parse(await fs.readFile(manifest, 'utf8'));
  const target = path.join(destination, name);
  await fs.cp(source, target, { recursive: true });
  for (const dependency of Object.keys(pkg.dependencies ?? {})) await copyPackage(dependency, manifest, path.join(target, 'node_modules'));
}
for (const name of nativePackages) await copyPackage(name, path.join(root, 'package.json'), path.join(outdir, 'node_modules'));
