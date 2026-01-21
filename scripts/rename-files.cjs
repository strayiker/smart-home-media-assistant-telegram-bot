#!/usr/bin/env node
/**
 * Скрипт для применения переименования файлов по CSV-карте
 *
 * Использование:
 *   node scripts/rename-files.js --dry-run rename-map.csv
 *   node scripts/rename-files.js rename-map.csv
 *   node scripts/rename-files.js rename-map.csv --apply
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseRenameMap(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const map = [];
  for (const line of lines) {
    const [oldPath, newPath] = line.split(',').map(s => s.trim());
    if (oldPath && newPath && oldPath !== newPath) {
      map.push({ old: oldPath, new: newPath });
    }
  }
  return map;
}

function isCaseOnlyRename(oldPath, newPath) {
  const oldDir = path.dirname(oldPath);
  const newDir = path.dirname(newPath);
  const oldBasename = path.basename(oldPath);
  const newBasename = path.basename(newPath);

  if (oldDir !== newDir) {
    return false;
  }

  const oldLower = oldBasename.toLowerCase();
  const newLower = newBasename.toLowerCase();

  return oldLower === newLower;
}

function performGitMv(oldPath, newPath, isDryRun, verbose) {
  if (isDryRun) {
    console.log(`  [dry-run] git mv "${oldPath}" "${newPath}"`);
    return true;
  }

  try {
    execSync(`git mv "${oldPath}" "${newPath}"`, { stdio: verbose ? 'inherit' : 'pipe' });
    console.log(`  ✓ ${oldPath} → ${newPath}`);
    return true;
  } catch (e) {
    console.error(`  ✗ Ошибка при git mv "${oldPath}" "${newPath}": ${e.message}`);
    return false;
  }
}

function performCaseOnlyRename(oldPath, newPath, isDryRun, verbose) {
  const tmpPath = oldPath + '.tmp-' + Date.now();

  if (isDryRun) {
    console.log(`  [dry-run] git mv "${oldPath}" "${tmpPath}"`);
    console.log(`  [dry-run] git mv "${tmpPath}" "${newPath}"`);
    return true;
  }

  try {
    execSync(`git mv "${oldPath}" "${tmpPath}"`, { stdio: verbose ? 'inherit' : 'pipe' });
    execSync(`git mv "${tmpPath}" "${newPath}"`, { stdio: verbose ? 'inherit' : 'pipe' });
    console.log(`  ✓ ${oldPath} → ${newPath} (case-only)`);
    return true;
  } catch (e) {
    console.error(`  ✗ Ошибка при case-only переименовании "${oldPath}": ${e.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const isApply = args.includes('--apply') || args.includes('-a');
  const verbose = args.includes('--verbose') || args.includes('-v');

  const csvArg = args.find(arg => arg.endsWith('.csv'));
  if (!csvArg) {
    console.error('Использование: node scripts/rename-files.js [--dry-run] rename-map.csv [--apply]');
    process.exit(1);
  }

  const csvPath = csvArg;
  if (!fs.existsSync(csvPath)) {
    console.error(`Файл не найден: ${csvPath}`);
    process.exit(1);
  }

  const renameMap = parseRenameMap(csvPath);
  console.log(`Загружено ${renameMap.length} записей переименования\n`);

  if (isDryRun) {
    console.log('Режим dry-run — изменения не будут применены\n');
  } else {
    console.log('Режим apply — изменения будут применены\n');
  }

  let successCount = 0;
  let failCount = 0;

  for (const { old, new: newP } of renameMap) {
    const exists = fs.existsSync(old);
    if (!exists) {
      console.warn(`  ! Файл не существует: ${old}`);
      failCount++;
      continue;
    }

    const caseOnly = isCaseOnlyRename(old, newP);
    let success = false;

    if (caseOnly) {
      success = performCaseOnlyRename(old, newP, isDryRun, verbose);
    } else {
      success = performGitMv(old, newP, isDryRun, verbose);
    }

    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\nРезультат: ${successCount} успешно, ${failCount} с ошибками`);

  if (failCount > 0 && !isDryRun) {
    console.error('\n⚠️  Некоторые переименования не удались. Проверьте ошибки выше.');
    console.log('Вы можете выполнить `git status` для просмотра состояния.\n');
    process.exit(1);
  }

  if (!isDryRun) {
    console.log('\n✓ Все переименования выполнены успешно!');
    console.log('Теперь запустите `git status` для просмотра изменений.\n');
  }
}

main();
