import { ScenarioInputSchema } from "@workspace/contracts";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * POST /api/evaluate
 *
 * Phase 0 intentionally stops after canonical runtime validation. The legacy
 * pipeline persisted a request before its unimplemented scorer ran, which
 * created orphaned financial scenarios. Persistence will return only after the
 * deterministic Decision Profile engine and protected trace boundary exist.
 */
router.post("/evaluate", async (req, res): Promise<void> => {
  const parsed = ScenarioInputSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_scenario_input",
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path,
      })),
    });
    return;
  }

  req.log.info("Validated MoveWise input before decision-engine activation");
  res.status(501).json({
    error: "decision_engine_not_ready",
    message: "The deterministic Decision Profile engine is not active yet.",
  });
});

/**
 * GET /api/metros
 *
 * The database is loaded only for this route, so health checks and input
 * validation do not require DATABASE_URL at process startup.
 */
router.get("/metros", async (_req, res): Promise<void> => {
  const { db, metrosTable } = await import("@workspace/db");
  const rows = await db.select().from(metrosTable).orderBy(metrosTable.city);
  res.json(rows);
});

export default router;
