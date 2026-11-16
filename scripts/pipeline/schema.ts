import { z } from "zod";

export const Unit = z.enum(["INR_CR", "USD", "JPY", "GBP", "EUR", "CAD"]);
export const Status = z.enum(["final", "estimated", "live", "projection", "revised", "reference"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Period = z.discriminatedUnion("type", [
  z.object({ type: z.literal("day"), date: isoDate.optional(), day: z.number().int().positive() }),
  z.object({ type: z.literal("cume"), asOf: isoDate.nullable(), throughDay: z.number().int().positive().nullable() }),
  z.object({ type: z.literal("weekend"), start: isoDate, end: isoDate, label: z.string() }),
  z.object({ type: z.literal("lifetime") }),
  z.object({ type: z.literal("advance"), showDate: isoDate, cutoff: z.string() }),
]);

/** One figure, exactly as a source published it. Nothing in the ledger is derived. */
export const Observation = z
  .object({
    id: z.string().min(3),
    film: z.string().min(2),
    metric: z.enum(["net", "gross", "gross_tracked", "milestone", "advance_gross", "advance_gross_blocked", "tickets", "shows", "occupancy", "footfalls"]),
    territory: z.string().min(2),
    region: z.string().optional(),
    city: z.string().optional(),
    language: z.string().optional(),
    format: z.string().optional(),
    period: Period,
    amount: z.number().positive().finite(),
    unit: Unit.or(z.enum(["COUNT", "PCT"])),
    source: z.string(),
    url: z.string().url().optional(),
    retrievedAt: z.string().datetime(),
    status: Status,
    note: z.string().optional(),
    theaters: z.number().int().positive().optional(),
    screens: z.number().int().positive().optional(),
  })
  .strict();
export type Observation = z.infer<typeof Observation>;

export const Source = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  region: z.string(),
  access: z.enum(["manual", "api", "licensed"]),
  accessNote: z.string(),
  reliability: z.string(),
  cites: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

export const FxState = z.object({
  status: z.enum(["pending", "ok", "stale"]),
  base: z.literal("USD"),
  rates: z.object({ INR: z.number().positive(), JPY: z.number().positive(), GBP: z.number().positive().optional(), EUR: z.number().positive().optional(), CAD: z.number().positive().optional() }).nullable(),
  date: isoDate.nullable(),
  source: z.string(),
  fetchedAt: z.string().nullable(),
  note: z.string().optional(),
});
export type FxState = z.infer<typeof FxState>;

export const FrankfurterResponse = z.object({
  base: z.literal("USD"),
  date: isoDate,
  rates: z.object({ INR: z.number().positive(), JPY: z.number().positive(), GBP: z.number().positive(), EUR: z.number().positive(), CAD: z.number().positive() }),
});
