import { createApp } from "./app";
import { resolveEvaluationMode } from "./evaluation-mode";
import { logger } from "./lib/logger";
import {
  disabledEvaluationCapability,
  researchEvaluationCapability,
} from "./research-evaluation";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const evaluationMode = resolveEvaluationMode(
  process.env["MOVEWISE_EVALUATION_MODE"],
  process.env.NODE_ENV,
);
const app = createApp({
  evaluationCapability:
    evaluationMode === "research"
      ? researchEvaluationCapability
      : disabledEvaluationCapability,
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
