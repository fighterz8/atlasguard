import { pgTable, text, serial, integer, real, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scenariosTable } from "./scenarios";

export const scenarioResultsTable = pgTable("scenario_results", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull().references(() => scenariosTable.id),
  lifestyleFit: real("lifestyle_fit").notNull(),
  financialFit: real("financial_fit").notNull(),
  moveScore: real("move_score").notNull(),
  verdictBand: text("verdict_band").notNull(),
  resultMode: text("result_mode").notNull().$type<"explainer" | "repaired_explainer" | "deterministic_fallback">(),
  structuredExplanation: json("structured_explanation"),
  renderedOutput: json("rendered_output"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScenarioResultSchema = createInsertSchema(scenarioResultsTable).omit({ id: true, createdAt: true });
export type InsertScenarioResult = z.infer<typeof insertScenarioResultSchema>;
export type ScenarioResult = typeof scenarioResultsTable.$inferSelect;
