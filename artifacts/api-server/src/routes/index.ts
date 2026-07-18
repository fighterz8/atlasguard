import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { createEvaluateRouter } from "./evaluate";
import {
  disabledEvaluationCapability,
  type EvaluationCapability,
} from "../research-evaluation";

export const createRouter = (
  evaluationCapability: EvaluationCapability = disabledEvaluationCapability,
): IRouter => {
  const router: IRouter = Router();

  router.use(healthRouter);
  router.use(createEvaluateRouter(evaluationCapability));

  return router;
};

export default createRouter();
