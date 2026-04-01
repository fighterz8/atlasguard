import { pgTable, text, serial, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const metrosTable = pgTable("metros", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  slug: text("slug").notNull().unique(),
  affordabilityScore: real("affordability_score").notNull().default(0),
  climateScore: real("climate_score").notNull().default(0),
  climateTendency: text("climate_tendency").notNull().default(""),
  safetyScore: real("safety_score").notNull().default(0),
  amenitiesScore: real("amenities_score").notNull().default(0),
  familyFitScore: real("family_fit_score").notNull().default(0),
  mobilityScore: real("mobility_score").notNull().default(0),
  opportunityScore: real("opportunity_score").notNull().default(0),
  incomeTaxRegime: text("income_tax_regime").notNull().default(""),
  benchmarkVersion: text("benchmark_version").notNull().default("v1"),
  staleRiskFlag: boolean("stale_risk_flag").notNull().default(false),
});

export const insertMetroSchema = createInsertSchema(metrosTable).omit({ id: true });
export type InsertMetro = z.infer<typeof insertMetroSchema>;
export type Metro = typeof metrosTable.$inferSelect;
