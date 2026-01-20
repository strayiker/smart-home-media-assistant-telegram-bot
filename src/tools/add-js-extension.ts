#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

function isTextFile(file: string) {
  return file.endsWith('.ts') || file.endsWith('.mts') || file.endsWith('.tsx');
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const name of await fs.readdir(dir)) {
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      yield* walk(full);
    } else if (stat.isFile() && isTextFile(full) && !full.endsWith('.d.ts')) {
      yield full;
    }
  }
}

function shouldAddJs(spec: string) {
  // only relative paths
  if (!spec.startsWith('./') && !spec.startsWith('../')) return false;
  // ignore already has extension
  const ext = path.extname(spec.split('?')[0].split('#')[0]);
  if (ext) return false;
  return true;
}

async function processFile(file: string, apply: boolean) {
  const raw = await fs.readFile(file, 'utf8');
  let changed = false;
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];

  const importExportRegex = /^(\s*)(import(?!\s+type)[\s\S]*?from\s+|export\s+\*\s+from\s+)(['"])(\.\.?\/.+?)(['"])(.*)$/;
  const dynamicImportRegex = /(import\(\s*['"])(\.\.?\/.+?)(['"]\s*\))/g;

  for (let line of lines) {

    const m = line.match(importExportRegex);
    if (m) {
      const [, leading, _imp, q1, spec, q2, trailing] = m;
      if (shouldAddJs(spec)) {
        const newSpec = spec + '.js';
        line = `${leading}${_imp}${q1}${newSpec}${q2}${trailing}`;
        changed = true;
      }
      out.push(line);
      continue;
    }

    // dynamic imports in line
    line = line.replaceAll(dynamicImportRegex, (all, p1, spec, p3) => {
      if (shouldAddJs(spec)) {
        changed = true;
        return `${p1}${spec}.js${p3}`;
      }
      return all;
    });

    out.push(line);
  }

  if (changed) {
    if (apply) {
      // backup
      await fs.writeFile(file + '.bak', raw, 'utf8');
      await fs.writeFile(file, out.join('\n'), 'utf8');
      return {file, changed: true, applied: true};
    }
    return {file, changed: true, applied: false};
  }
  return {file, changed: false, applied: false};
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const results: Array<{file: string; changed: boolean; applied: boolean}> = [];

  for await (const file of walk(SRC)) {
    try {
      const r = await processFile(file, apply);
      if (r.changed) results.push(r);
    } catch (error) {
      console.error('Error processing', file, error);
    }
  }

  if (results.length === 0) {
    console.log('No changes needed.');
    return;
  }

  console.log(`${apply ? 'Applied' : 'Dry-run'}: ${results.length} file(s) would change:`);
  for (const r of results) console.log('-', path.relative(ROOT, r.file), r.applied ? '(applied)' : '(would change)');
}

try {
  await main();
} catch (error) {
   
  console.error(error);
  process.exit(2);
}
