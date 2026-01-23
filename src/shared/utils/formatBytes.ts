export function formatBytes(bytes: number | undefined, decimals = 2) {
  const b = Number(bytes) || 0;
  if (b === 0) return '0 B';

  const k = 1024;
  const dm = Math.max(decimals, 0);
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  const size = Number.parseFloat((b / Math.pow(k, i)).toFixed(dm));
  const unit = sizes[i] ?? 'B';
  return `${size} ${unit}`;
}
