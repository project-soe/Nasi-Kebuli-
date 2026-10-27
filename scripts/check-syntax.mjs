// Memeriksa sintaks semua berkas JavaScript situs dan tes (tanpa menjalankannya).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.m?js$/.test(name) ? [path] : [];
  });

const files = ['public/js', 'tests/rules'].flatMap(walk);
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
console.log(`Sintaks OK: ${files.length} berkas`);
