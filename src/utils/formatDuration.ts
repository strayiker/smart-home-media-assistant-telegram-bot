import dayjs from 'dayjs';

export function formatDuration(seconds: number) {
  return dayjs.duration(seconds, 'seconds').humanize();
}
