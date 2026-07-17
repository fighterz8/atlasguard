import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "./app";

describe("MoveWise API request parsing", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
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
});
