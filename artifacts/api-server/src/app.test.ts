import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { losAngelesToSeattleBalancedResearchScenario } from "@workspace/benchmark-data";
import {
  ResearchEvaluationResultSchema,
  type ScenarioInput,
} from "@workspace/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app, { createApp } from "./app";
import {
  researchEvaluationCapability,
  type EvaluationCapability,
} from "./research-evaluation";

const listen = async (application: ReturnType<typeof createApp>) => {
  const server = createServer(application);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}/api` };
};

const close = async (server: Server) => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
};

describe("MoveWise API request parsing", () => {
  let server: Server;
  let baseUrl: string;
  let researchServer: Server;
  let researchBaseUrl: string;
  let failingServer: Server;
  let failingBaseUrl: string;

  beforeAll(async () => {
    ({ server, baseUrl } = await listen(app));
    ({ server: researchServer, baseUrl: researchBaseUrl } = await listen(
      createApp({ evaluationCapability: researchEvaluationCapability }),
    ));
    const failingCapability: EvaluationCapability = {
      mode: "research",
      evaluate: () => {
        throw new Error("sensitive internal failure");
      },
    };
    ({ server: failingServer, baseUrl: failingBaseUrl } = await listen(
      createApp({ evaluationCapability: failingCapability }),
    ));
  });

  afterAll(async () => {
    await Promise.all([
      close(server),
      close(researchServer),
      close(failingServer),
    ]);
  });

  it("returns the documented JSON envelope for malformed JSON", async () => {
    const response = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      error: "invalid_scenario_input",
      issues: [
        {
          code: "invalid_json",
          message: "Malformed JSON request body.",
          path: [],
        },
      ],
    });
  });

  it("keeps canonical semantic validation failures in the same envelope", async () => {
    const response = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const body = (await response.json()) as {
      error: string;
      issues: Array<{ code: string; message: string; path: unknown[] }>;
    };

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.error).toBe("invalid_scenario_input");
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["schemaVersion"],
        }),
      ]),
    );
  });

  it("rejects an invalid commute direction before capability dispatch", async () => {
    const scenario: ScenarioInput = structuredClone(
      losAngelesToSeattleBalancedResearchScenario,
    );
    const commute = scenario.priorities.find(
      ({ priorityId }) => priorityId === "commute_time",
    );
    if (commute === undefined) throw new Error("Missing commute priority.");
    commute.preferredDirection = "higher";

    const response = await fetch(`${researchBaseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });
    const body = (await response.json()) as {
      error: string;
      issues: Array<{ path: unknown[] }>;
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_scenario_input");
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["priorities", 1, "preferredDirection"],
        }),
      ]),
    );
  });

  it("keeps valid evaluation disabled by default", async () => {
    const response = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(losAngelesToSeattleBalancedResearchScenario),
    });

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: "decision_engine_not_ready",
      message:
        "The deterministic Decision Profile engine is not active at this HTTP boundary.",
    });
  });

  it("returns a verified research-only result when explicitly enabled", async () => {
    const scenario: ScenarioInput = structuredClone(
      losAngelesToSeattleBalancedResearchScenario,
    );
    const climate = scenario.priorities.find(
      ({ priorityId }) => priorityId === "climate_heat",
    );
    if (climate === undefined) throw new Error("Missing climate priority.");
    climate.weight = 2;

    const response = await fetch(`${researchBaseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });
    const result = ResearchEvaluationResultSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(result.releaseStatus).toBe("research_only");
    expect(result.resultMode).toBe("deterministic");
    expect(result.scenarioInput).toEqual(scenario);
    expect(
      result.decisionProfile.priorityChanges.find(
        ({ priorityId }) => priorityId === "climate_heat",
      ),
    ).toMatchObject({ classification: "improves" });
  });

  it("selects the opposite verified benchmark for a more-hot-days preference", async () => {
    const scenario: ScenarioInput = structuredClone(
      losAngelesToSeattleBalancedResearchScenario,
    );
    const climate = scenario.priorities.find(
      ({ priorityId }) => priorityId === "climate_heat",
    );
    if (climate === undefined) throw new Error("Missing climate priority.");
    climate.preferredDirection = "higher";
    climate.weight = 2;

    const response = await fetch(`${researchBaseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });
    const result = ResearchEvaluationResultSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(
      result.decisionProfile.priorityChanges.find(
        ({ priorityId }) => priorityId === "climate_heat",
      ),
    ).toMatchObject({ classification: "worsens" });
  });

  it("rejects canonical but unsupported location pairs without echoing them", async () => {
    const scenario: ScenarioInput = structuredClone(
      losAngelesToSeattleBalancedResearchScenario,
    );
    scenario.originMetroSlug = "portland-or";

    const response = await fetch(`${researchBaseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({
      error: "unsupported_research_scenario",
      issues: [
        {
          code: "unsupported_location_pair",
          message:
            "Research evaluation currently supports only the Los Angeles to Seattle comparison.",
          path: [],
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("portland-or");
  });

  it("rejects a scenario that omits a benchmark priority", async () => {
    const scenario: ScenarioInput = structuredClone(
      losAngelesToSeattleBalancedResearchScenario,
    );
    scenario.priorities = scenario.priorities.filter(
      ({ priorityId }) => priorityId !== "commute_time",
    );

    const response = await fetch(`${researchBaseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });
    const body = (await response.json()) as {
      error: string;
      issues: Array<{ code: string }>;
    };

    expect(response.status).toBe(422);
    expect(body.error).toBe("unsupported_research_scenario");
    expect(body.issues).toEqual([
      expect.objectContaining({ code: "extra_active_benchmark_priorities" }),
    ]);
  });

  it("rejects a scenario without an explicit hot-day preference", async () => {
    const scenario: ScenarioInput = structuredClone(
      losAngelesToSeattleBalancedResearchScenario,
    );
    scenario.priorities = scenario.priorities.filter(
      ({ priorityId }) => priorityId !== "climate_heat",
    );

    const response = await fetch(`${researchBaseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "unsupported_research_scenario",
      issues: [
        {
          code: "missing_climate_preference",
          message:
            "Research evaluation requires an explicit hot-day preference.",
          path: ["priorities"],
        },
      ],
    });
  });

  it("returns a generic error envelope for unexpected evaluator failures", async () => {
    const response = await fetch(`${failingBaseUrl}/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(losAngelesToSeattleBalancedResearchScenario),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "evaluation_failed",
      message: "The scenario could not be evaluated.",
    });
    expect(JSON.stringify(body)).not.toContain("sensitive internal failure");
  });
});
