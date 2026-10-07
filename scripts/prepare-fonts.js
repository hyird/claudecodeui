import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = path.join(root, 'node_modules/@cloud-terminal/maple-mono-nf-cn');
const destination = path.join(root, 'public/fonts');
fs.mkdirSync(destination, { recursive: true });
for (const file of fs.readdirSync(source)) {
  if (/\.(woff2|txt)$/.test(file) || file === 'source.json') fs.copyFileSync(path.join(source, file), path.join(destination, file));
}
