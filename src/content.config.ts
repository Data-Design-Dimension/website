import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const mediaSchema = z.object({
  src: z.string(),
  alt: z.string(),
  aspect: z.enum(['wide', 'tall', 'square']).optional(),
  aspectRatio: z.string().optional(),
  position: z
    .enum(['top', 'center', 'bottom', 'left', 'right', 'right center'])
    .optional(),
});

const ctaSchema = z.object({
  label: z.string(),
  url: z.string(),
  external: z.boolean(),
  disabled: z.boolean().optional(),
});

const cards = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/cards' }),
  schema: z.object({
    type: z.enum([
      'portfolio',
      'talk',
      'writing',
      'link',
      'repo',
      'meta',
      'inspiration',
      'skills',
    ]),
    title: z.string(),
    summary: z.string(),
    quickView: z.string().optional(),
    cta: ctaSchema.optional(),
    secondaryCta: ctaSchema.optional(),
    tags: z.array(z.string()),
    media: mediaSchema.optional(),
    mediaGrid: z.array(mediaSchema).optional(),
    body: z.string().optional(),
    order: z.number(),
    // YYYYMMDD; falls back to the entry file's git commit date when omitted.
    date: z.string().regex(/^\d{8}$/).optional(),
    archived: z.boolean().optional(),
    featured: z.boolean().optional(),
    approved: z.boolean().optional(),
  }),
});

const clusters = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/clusters' }),
  schema: z.object({
    label: z.string(),
    orbit: z.enum(['inner', 'middle', 'outer']),
    cardIds: z.array(z.string()),
    order: z.number(),
  }),
});

export const collections = { cards, clusters };
