import dayjs from 'dayjs';

export function formatDuration(seconds: number, locale: string) {
  return dayjs.duration(seconds, 'seconds').locale(locale).humanize();
}
