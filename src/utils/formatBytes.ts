export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const dm = Math.max(decimals, 0);
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${size} ${sizes[i]}`;
}
