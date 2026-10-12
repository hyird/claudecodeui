import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = path.join(root, 'node_modules/@cloud-terminal/maple-mono-nf-cn');
const destination = path.join(root, 'public/fonts');
const served = (file) => /\.(woff2|txt)$/.test(file) || file === 'source.json';
const files = fs.readdirSync(source).filter(served);
fs.mkdirSync(destination, { recursive: true });
// public/fonts is generated. Drop files the package no longer ships so retired
// fonts are not built into dist/ and held in server memory.
for (const file of fs.readdirSync(destination)) {
  if (!files.includes(file)) fs.rmSync(path.join(destination, file), { recursive: true, force: true });
}
for (const file of files) fs.copyFileSync(path.join(source, file), path.join(destination, file));
