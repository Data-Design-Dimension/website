import { defineCollection, z } from 'astro:content';

const cards = defineCollection({
  type: 'data',
  schema: z.object({
    type: z.enum(['portfolio', 'talk', 'writing', 'link', 'repo', 'meta']),
    title: z.string(),
    summary: z.string(),
    cluster: z.string(),
    quickView: z.string().optional(),
    cta: z
      .object({
        label: z.string(),
        url: z.string(),
        external: z.boolean().default(false),
      })
      .optional(),
    tags: z.array(z.string()).default([]),
    media: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
    order: z.number().default(0),
  }),
});

const clusters = defineCollection({
  type: 'data',
  schema: z.object({
    label: z.string(),
    orbit: z.enum(['inner', 'middle', 'outer']).default('middle'),
    order: z.number().default(0),
  }),
});

const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    type: z.enum(['original', 'syndicated', 'note']),
    date: z.coerce.date(),
    publishedAt: z.string().optional(),
    originalUrl: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    excerpt: z.string().optional(),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { cards, clusters, writing, pages };
