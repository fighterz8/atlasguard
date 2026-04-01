import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { scenariosTable, scenarioResultsTable, traceRunsTable } from "@workspace/db";
import { computeScoring } from "../core/scorer/index";
import { generateExplanation } from "../core/explainer/index";
import { verifyExplanation } from "../core/verifier/index";
import { generateFallbackExplanation } from "../core/fallback/index";
import type { ScenarioInput, ResultMode } from "../core/contracts/types";

const router: IRouter = Router();

/**
 * POST /api/evaluate
 *
 * Orchestrates the synchronous evaluation pipeline:
 *   ScenarioInput → Scorer → Explainer → Verifier → (Repair) → Fallback → Persist → Response
 *
 * TODO: Implement repair loop via Cursor once Explainer + Verifier are ready.
 */
router.post("/evaluate", async (req, res): Promise<void> => {
  const input: ScenarioInput = req.body;

  // Basic presence check — full Zod validation to be added via Cursor
  if (!input.currentCity || !input.targetCity) {
    res.status(400).json({ error: "currentCity and targetCity are required" });
    return;
  }

  // 1. Persist the scenario request
  const [scenario] = await db
    .insert(scenariosTable)
    .values({
      email: input.email ?? null,
      currentCity: input.currentCity,
      targetCity: input.targetCity,
      requestPayload: input as unknown as Record<string, unknown>,
    })
    .returning();

  let resultMode: ResultMode = "deterministic_fallback";
  let scoringEvidence;
  let structuredExplanation;
  let verifierResult;

  try {
    // 2. Scorer — deterministic
    scoringEvidence = await computeScoring(input);

    // 3. Explainer — AI
    const rawExplanation = await generateExplanation(scoringEvidence);

    // 4. Verifier — checks V-001 through V-010
    verifierResult = await verifyExplanation(scoringEvidence, rawExplanation);

    if (verifierResult.status === "PASS" || verifierResult.status === "PARTIAL") {
      structuredExplanation = rawExplanation;
      resultMode = verifierResult.status === "PASS" ? "explainer" : "repaired_explainer";
    } else {
      // 5. Fallback — deterministic renderer
      structuredExplanation = generateFallbackExplanation(scoringEvidence);
      resultMode = "deterministic_fallback";
    }
  } catch (_err) {
    // TODO: Add repair loop and proper error handling via Cursor
    req.log.warn("Pipeline not fully implemented — returning stub response");

    res.status(501).json({
      error: "Pipeline not yet implemented. Implement scorer/explainer/verifier in Cursor.",
    });
    return;
  }

  // 6. Persist trace run
  await db.insert(traceRunsTable).values({
    scenarioId: scenario.id,
    scoringEvidence: scoringEvidence as unknown as Record<string, unknown>,
    rawExplanation: structuredExplanation as unknown as Record<string, unknown>,
    verifierResult: verifierResult as unknown as Record<string, unknown>,
    finalMode: resultMode,
    benchmarkVersion: scoringEvidence.scenarioContext.benchmarkVersion,
  });

  // 7. Persist result
  const moveEvidence = scoringEvidence.moveEvidence;
  const [result] = await db
    .insert(scenarioResultsTable)
    .values({
      scenarioId: scenario.id,
      lifestyleFit: moveEvidence.lifestyleFit,
      financialFit: moveEvidence.financialFit,
      moveScore: moveEvidence.moveScore,
      verdictBand: moveEvidence.verdictBand,
      resultMode,
      structuredExplanation: structuredExplanation as unknown as Record<string, unknown>,
      renderedOutput: structuredExplanation as unknown as Record<string, unknown>,
    })
    .returning();

  res.json({
    scenarioId: scenario.id,
    lifestyleFit: result.lifestyleFit,
    financialFit: result.financialFit,
    moveScore: result.moveScore,
    verdictBand: result.verdictBand,
    verdict: structuredExplanation.verdict,
    resultMode: result.resultMode,
    structuredExplanation: result.structuredExplanation,
    renderedOutput: result.renderedOutput,
  });
});

/**
 * GET /api/scenarios
 * Lists all past scenarios (summary view).
 */
router.get("/scenarios", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: scenariosTable.id,
      currentCity: scenariosTable.currentCity,
      targetCity: scenariosTable.targetCity,
      createdAt: scenariosTable.createdAt,
    })
    .from(scenariosTable)
    .orderBy(scenariosTable.createdAt);

  res.json(rows);
});

/**
 * GET /api/scenarios/:id
 * Returns a scenario and its result.
 */
router.get("/scenarios/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid scenario id" });
    return;
  }

  const [scenario] = await db
    .select()
    .from(scenariosTable)
    .where(eq(scenariosTable.id, id));

  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }

  const [result] = await db
    .select()
    .from(scenarioResultsTable)
    .where(eq(scenarioResultsTable.scenarioId, id));

  res.json({ ...scenario, result: result ?? null });
});

/**
 * GET /api/metros
 * Lists all metros.
 */
router.get("/metros", async (_req, res): Promise<void> => {
  const { metrosTable } = await import("@workspace/db");
  const rows = await db.select().from(metrosTable).orderBy(metrosTable.city);
  res.json(rows);
});

// Import eq — needed for WHERE clauses above
import { eq } from "drizzle-orm";

export default router;
