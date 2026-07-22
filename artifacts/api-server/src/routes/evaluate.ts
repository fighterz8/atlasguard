import { ScenarioInputSchema } from "@workspace/contracts";
import { Router, type IRouter } from "express";

import {
  disabledEvaluationCapability,
  type EvaluationCapability,
} from "../research-evaluation";

/**
 * POST /api/evaluate
 *
 * The default capability intentionally stops after canonical runtime
 * validation. A non-production process may inject the fixed LA -> Seattle
 * research capability; the browser and normal server configuration remain
 * provider-free, persistence-free, and disabled at this transport boundary.
 */
export const createEvaluateRouter = (
  capability: EvaluationCapability = disabledEvaluationCapability,
): IRouter => {
  const router: IRouter = Router();

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

    if (capability.mode === "disabled") {
      req.log.info(
        "Validated MoveWise input while HTTP evaluation is disabled",
      );
      res.status(501).json({
        error: "decision_engine_not_ready",
        message:
          "The deterministic Decision Profile engine is not active at this HTTP boundary.",
      });
      return;
    }

    try {
      const attempted = capability.evaluate(parsed.data);
      if (!attempted.success) {
        req.log.info(
          { issueCodes: attempted.issues.map(({ code }) => code) },
          "Rejected unsupported MoveWise research scenario",
        );
        res.status(422).json({
          error: "unsupported_research_scenario",
          issues: attempted.issues,
        });
        return;
      }

      req.log.info("Completed in-memory MoveWise research evaluation");
      res.status(200).json(attempted.result);
    } catch (error) {
      req.log.error(
        { errorName: error instanceof Error ? error.name : "unknown" },
        "MoveWise research evaluation failed",
      );
      res.status(500).json({
        error: "evaluation_failed",
        message: "The scenario could not be evaluated.",
      });
    }
  });

  return router;
};

export default createEvaluateRouter();
