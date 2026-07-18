import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createRouter } from "./routes";
import { logger } from "./lib/logger";
import {
  disabledEvaluationCapability,
  type EvaluationCapability,
} from "./research-evaluation";

export type AppOptions = Readonly<{
  evaluationCapability?: EvaluationCapability;
}>;

const malformedJsonHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  const parseError = error as {
    status?: unknown;
    type?: unknown;
  };

  if (
    !(error instanceof SyntaxError) ||
    parseError.status !== 400 ||
    parseError.type !== "entity.parse.failed"
  ) {
    next(error);
    return;
  }

  res.status(400).json({
    error: "invalid_scenario_input",
    issues: [
      {
        code: "invalid_json",
        message: "Malformed JSON request body.",
        path: [],
      },
    ],
  });
};

export const createApp = (options: AppOptions = {}): Express => {
  const app: Express = express();
  const evaluationCapability =
    options.evaluationCapability ?? disabledEvaluationCapability;

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(malformedJsonHandler);

  app.use("/api", createRouter(evaluationCapability));

  return app;
};

export default createApp();
