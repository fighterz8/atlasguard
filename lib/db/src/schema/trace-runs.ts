import { pgTable, serial, integer, text, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scenariosTable } from "./scenarios";

export const traceRunsTable = pgTable("trace_runs", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").references(() => scenariosTable.id),
  scoringEvidence: json("scoring_evidence"),
  rawExplanation: json("raw_explanation"),
  verifierResult: json("verifier_result"),
  finalMode: text("final_mode").notNull(),
  benchmarkVersion: text("benchmark_version").notNull().default("v1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTraceRunSchema = createInsertSchema(traceRunsTable).omit({ id: true, createdAt: true });
export type InsertTraceRun = z.infer<typeof insertTraceRunSchema>;
export type TraceRun = typeof traceRunsTable.$inferSelect;
