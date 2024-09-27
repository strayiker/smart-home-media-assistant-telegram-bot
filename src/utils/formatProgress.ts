interface FormatProgressOptions {
  length?: number;
  vmin?: number;
  vmax?: number;
  progressive?: boolean;
}

export function formatProgress(
  value: number,
  {
    length = 15,
    vmin = 0,
    vmax = 1,
    progressive = false,
  }: FormatProgressOptions = {},
) {
  // Block progression is 1/8
  const blocks = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
  const lsep = '▏';
  const rsep = '▕';

  // Normalize value
  const normalized_value =
    (Math.min(Math.max(value, vmin), vmax) - vmin) / Number(vmax - vmin);
  const v = normalized_value * length;
  const x = Math.floor(v); // integer part
  const y = v - x; // fractional part
  const i = Math.round(y * 8);
  const bar = Array.from({ length: x }).fill('█').join('') + blocks[i];
  const remaining = Array.from({ length: length - bar.length })
    .fill(' ')
    .join('');
  return `${lsep}${bar}${progressive ? '' : remaining}${rsep} ${Math.round(normalized_value * 100 * 100) / 100}%`;
}
