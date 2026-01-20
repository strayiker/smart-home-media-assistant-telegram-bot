import { z } from 'zod';

const dateish = z
  .union([z.date(), z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  });

export const SearchResultSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tags: z.array(z.string().trim().min(1)).default([]),
  size: z.number().finite().nonnegative(),
  seeds: z.number().finite().nonnegative(),
  peers: z.number().finite().nonnegative(),
  publishDate: dateish,
  detailsUrl: z.string().url().optional(),
  downloadUrl: z.string().url().min(1),
});

export const SearchResultsSchema = z.array(SearchResultSchema);