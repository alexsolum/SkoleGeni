import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { optimizeProject } from "../api";

/**
 * Tests for getOptimizerBaseUrl() behavior (tested indirectly through optimizeProject,
 * since getOptimizerBaseUrl is a private function).
 *
 * Contract: VITE_OPTIMIZER_URL env var controls the base URL used by optimizeProject.
 * Fallback is /api/optimizer when the var is absent.
 */

vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "fake-token" } }
      })
    }
  }
}));

describe("getOptimizerBaseUrl — env var wiring (WIRE-01)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          classes: [],
          score: {
            overall: 1,
            genderBalance: 1,
            originMix: 1,
            needsBalance: 1,
            locationBalance: 1,
            chemistry: 1
          }
        })
    } as Response);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fetchSpy.mockRestore();
  });

  it("uses VITE_OPTIMIZER_URL when the env var is set", async () => {
    vi.stubEnv("VITE_OPTIMIZER_URL", "https://example.com");

    await optimizeProject("test-id");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/example\.com\//),
      expect.any(Object)
    );
  });

  it("falls back to /api/optimizer when VITE_OPTIMIZER_URL is absent", async () => {
    vi.stubEnv("VITE_OPTIMIZER_URL", undefined as unknown as string);

    await optimizeProject("test-id");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/optimizer\//),
      expect.any(Object)
    );
  });

  it("strips a trailing slash from VITE_OPTIMIZER_URL", async () => {
    vi.stubEnv("VITE_OPTIMIZER_URL", "https://example.com/");

    await optimizeProject("test-id");

    // Should call https://example.com/project (no double slash)
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toBe("https://example.com/project");
  });
});
