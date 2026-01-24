import fs from 'node:fs/promises';

import { Fluent } from '@moebius/fluent';

const fluent = new Fluent();
const localeFiles = await fs.readdir('locales');

for (const localeFile of localeFiles) {
  const filePath = `locales/${localeFile}`;
  const content = await fs.readFile(filePath, 'utf8');
  await fluent.addTranslation({
    locales: localeFile.split('.')[0],
    source: content,
  });
}

export { fluent };
