import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const workshops = defineCollection({
  loader: file("src/data/workshops.json"),
  schema: z
    .object({
      id: z
        .string()
        .regex(SLUG_RE, 'id must be a lowercase slug, e.g. "basic-soldering"'),
      title: z.string().min(1),
      date: z.string().regex(DATE_RE, "date must be formatted YYYY-MM-DD"),
      startTime: z
        .string()
        .regex(TIME_RE, "startTime must be formatted HH:MM (24-hour)"),
      endTime: z
        .string()
        .regex(TIME_RE, "endTime must be formatted HH:MM (24-hour)"),
      location: z.string().min(1),
      // Display-only in V1 — a static site can't count real-time signups.
      // Use `status` below to actually close a workshop.
      capacity: z.number().int().positive(),
      status: z.enum(["open", "full", "cancelled"]),
      description: z.string().min(1),
    })
    .refine((workshop) => workshop.endTime > workshop.startTime, {
      message: "endTime must be after startTime",
      path: ["endTime"],
    }),
});

export const collections = { workshops };
