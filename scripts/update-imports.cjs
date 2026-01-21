#!/usr/bin/env node
/**
 * Скрипт для обновления импортов после переименования файлов
 *
 * Использование:
 *   node scripts/update-imports.js --dry-run rename-map.csv
 *   node scripts/update-imports.js rename-map.csv
 *   node scripts/update-imports.js rename-map.csv --apply
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

function findSourceFiles() {
  const files = [];
  try {
    const output = execSync('git ls-files', { encoding: 'utf-8' });
    for (const line of output.trim().split('\n')) {
      if (line.endsWith('.ts') || line.endsWith('.js')) {
        files.push(line);
      }
    }
  } catch (e) {
    console.error('Ошибка при поиске файлов:', e.message);
    process.exit(1);
  }
  return files;
}

function extractRelativePath(filePath, importPath) {
  // Импорты в проекте обычно относительные
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null; // node_modules или абсолютный путь
  }
  return importPath;
}

function getBasenameWithoutExt(filePath) {
  const basename = path.basename(filePath);
  return basename.replace(/\.(ts|js)$/, '');
}

function shouldUpdateImport(importPath, oldPath, newPath) {
  // Проверяем, совпадает ли импорт со старым путём
  const importBasename = getBasenameWithoutExt(importPath);
  const oldBasename = getBasenameWithoutExt(oldPath);

  // Если импорт не совпадает с базовым именем — не меняем
  if (importBasename !== oldBasename) {
    return false;
  }

  return true;
}

function createReplacement(oldPath, newPath, line) {
  // Заменяем путь в строке импорта
  const oldBasename = getBasenameWithoutExt(oldPath);
  const newBasename = getBasenameWithoutExt(newPath);

  // Ищем импорты, которые совпадают с basename старого пути
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  const newLine = line.replace(importRegex, (match, importPath) => {
    if (!shouldUpdateImport(importPath, oldPath, newPath)) {
      return match;
    }

    // Заменяем базовое имя, сохраняя расширение и структуру пути
    const extMatch = importPath.match(/\.(ts|js)$/);
    const ext = extMatch ? extMatch[0] : '';

    // Вычисляем новый путь относительно текущего файла
    const oldDir = path.dirname(oldPath);
    const newDir = path.dirname(newPath);

    // Если директория не менялась, меняем только базовое имя
    if (oldDir === newDir) {
      return match.replace(oldBasename + ext, newBasename + ext);
    }

    // Если директория изменилась, нужно пересчитать относительный путь
    // Для этого нам нужно знать текущий файл, но сейчас мы обрабатываем только строку
    // Поэтому делаем простую замену
    const oldPathInImport = importPath.replace('.' + ext, '');
    const newPathInImport = importPath.replace(oldBasename, newBasename);

    return match.replace(importPath, newPathInImport + ext);
  });

  return newLine;
}

function processFile(filePath, renameMap, isDryRun) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  const changes = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (const { old, new: newP } of renameMap) {
      const newLine = createReplacement(old, newP, line);
      if (newLine !== line) {
        modified = true;
        changes.push({ line: i + 1, old, new: newP });
        line = newLine;
      }
    }
    lines[i] = line;
  }

  if (modified && !isDryRun) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  return changes;
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const isApply = args.includes('--apply') || args.includes('-a');

  const csvArg = args.find(arg => arg.endsWith('.csv'));
  if (!csvArg) {
    console.error('Использование: node scripts/update-imports.js [--dry-run] rename-map.csv [--apply]');
    process.exit(1);
  }

  const csvPath = csvArg;
  if (!fs.existsSync(csvPath)) {
    console.error(`Файл не найден: ${csvPath}`);
    process.exit(1);
  }

  const renameMap = parseRenameMap(csvPath);
  console.log(`Загружено ${renameMap.length} записей переименования`);

  if (isDryRun) {
    console.log('\nРежим dry-run — изменения не будут применены\n');
  }

  const sourceFiles = findSourceFiles();
  console.log(`Найдено ${sourceFiles.length} исходных файлов\n`);

  let totalChanges = 0;
  const modifiedFiles = [];

  for (const filePath of sourceFiles) {
    const changes = processFile(filePath, renameMap, isDryRun);
    if (changes.length > 0) {
      totalChanges += changes.length;
      modifiedFiles.push({ file: filePath, changes });
    }
  }

  console.log(`\nИтого: ${totalChanges} изменений в ${modifiedFiles.length} файлах\n`);

  if (isDryRun) {
    console.log('Файлы с изменениями (dry-run):\n');
    for (const { file, changes } of modifiedFiles) {
      console.log(`  ${file}`);
      for (const { line, old, new: newP } of changes) {
        console.log(`    Строка ${line}: ${old} → ${newP}`);
      }
    }
  } else {
    console.log('Применено\n');
    for (const { file, changes } of modifiedFiles) {
      console.log(`  ${file} (${changes.length} изменений)`);
    }
  }
}

main();
