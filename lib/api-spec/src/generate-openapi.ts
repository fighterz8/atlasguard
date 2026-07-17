import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod/v4";

extendZodWithOpenApi(z);

// The OpenAPI extension must be installed before canonical schemas are
// constructed, so load the contracts package after extending Zod.
const { EvaluationResultSchema, ScenarioInputSchema } =
  await import("@workspace/contracts");

const registry = new OpenAPIRegistry();

const ScenarioInputTransportSchema = registry.register(
  "ScenarioInput",
  ScenarioInputSchema,
);
const EvaluationResultTransportSchema = registry.register(
  "EvaluationResult",
  EvaluationResultSchema,
);
const HealthStatusSchema = registry.register(
  "HealthStatus",
  z.object({ status: z.literal("ok") }).strict(),
);
const ValidationIssueSchema = registry.register(
  "ValidationIssue",
  z
    .object({
      code: z.string(),
      message: z.string(),
      path: z.array(z.union([z.string(), z.number().int()])),
    })
    .strict(),
);
const InvalidScenarioInputErrorSchema = registry.register(
  "InvalidScenarioInputError",
  z
    .object({
      error: z.literal("invalid_scenario_input"),
      issues: z.array(ValidationIssueSchema),
    })
    .strict(),
);
const DecisionEngineUnavailableErrorSchema = registry.register(
  "DecisionEngineUnavailableError",
  z
    .object({
      error: z.literal("decision_engine_not_ready"),
      message: z.string(),
    })
    .strict(),
);

registry.registerPath({
  method: "get",
  path: "/healthz",
  operationId: "healthCheck",
  tags: ["health"],
  summary: "Health check",
  description: "Returns the API process health status.",
  responses: {
    200: {
      description: "The API process is healthy.",
      content: {
        "application/json": { schema: HealthStatusSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/evaluate",
  operationId: "evaluateScenario",
  tags: ["evaluation"],
  summary: "Evaluate a relocation scenario",
  description:
    "Validates a canonical MoveWise scenario. The 200 response is the canonical activation contract; the current HTTP route returns 501 after successful validation until the deterministic engine is wired to the transport boundary.",
  request: {
    body: {
      required: true,
      description:
        "A structurally valid scenario. The server applies additional semantic refinements from @workspace/contracts at runtime.",
      content: {
        "application/json": { schema: ScenarioInputTransportSchema },
      },
    },
  },
  responses: {
    200: {
      description:
        "Canonical deterministic result shape reserved for transport activation; not returned by the current Phase 0 route.",
      content: {
        "application/json": { schema: EvaluationResultTransportSchema },
      },
    },
    400: {
      description: "The request failed canonical runtime validation.",
      content: {
        "application/json": { schema: InvalidScenarioInputErrorSchema },
      },
    },
    501: {
      description:
        "The request is valid, but the decision engine is not active at the HTTP boundary.",
      content: {
        "application/json": { schema: DecisionEngineUnavailableErrorSchema },
      },
    },
  },
});

const generator = new OpenApiGeneratorV31(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "MoveWise API",
    version: "0.2.0",
    description:
      "Generated structural transport contract. Runtime validation and semantic trust remain authoritative in @workspace/contracts.",
  },
  servers: [{ url: "/api", description: "Base API path" }],
  tags: [
    { name: "health", description: "Process health operations" },
    {
      name: "evaluation",
      description: "Canonical MoveWise scenario evaluation transport",
    },
  ],
});

const generatedHeader = [
  "# GENERATED FILE. DO NOT EDIT.",
  "# Source: @workspace/contracts plus lib/api-spec/src/generate-openapi.ts",
  "# This document is structural only; runtime refinements remain authoritative.",
  "",
].join("\n");
const defaultOutputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "openapi.yaml",
);
const outputPath = process.env.MOVEWISE_OPENAPI_OUTPUT
  ? resolve(process.env.MOVEWISE_OPENAPI_OUTPUT)
  : defaultOutputPath;

await writeFile(
  outputPath,
  `${generatedHeader}${YAML.stringify(document, { lineWidth: 0 })}`,
  "utf8",
);
