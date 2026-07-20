import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("mobile startup compatibility", () => {
  it("ships the production application as a classic legacy bundle", () => {
    const viteConfig = readProjectFile("../vite.config.ts");

    expect(viteConfig).toContain("renderModernChunks: false");
    expect(viteConfig).toContain('"iOS >= 11"');
    expect(viteConfig).toContain(
      'process.env.NODE_ENV !== "production" ? [runtimeErrorOverlay()] : []',
    );
  });

  it("provides a bounded startup failure instead of an endless loading state", () => {
    const indexHtml = readProjectFile("../index.html");

    expect(indexHtml).toContain("movewise-startup-status");
    expect(indexHtml).toContain("MW-BOOT-01");
    expect(indexHtml).toContain("MW-BOOT-02");
    expect(indexHtml).toContain("MW-BOOT-03");
  });
});
