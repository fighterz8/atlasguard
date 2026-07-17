import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

app.use(malformedJsonHandler);

app.use("/api", router);

export default app;
