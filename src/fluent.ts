import fs from 'node:fs/promises';

import { Fluent } from '@moebius/fluent';

const fluent = new Fluent();
const localeFiles = await fs.readdir('locales');

for (const localeFile of localeFiles) {
  fluent.addTranslation({
    locales: localeFile.split('.')[0],
    filePath: `locales/${localeFile}`,
  });
}

export { fluent };
