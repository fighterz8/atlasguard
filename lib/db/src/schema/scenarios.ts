import { pgTable, text, serial, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scenariosTable = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  email: text("email"),
  currentCity: text("current_city").notNull(),
  targetCity: text("target_city").notNull(),
  requestPayload: json("request_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScenarioSchema = createInsertSchema(scenariosTable).omit({ id: true, createdAt: true });
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenariosTable.$inferSelect;
