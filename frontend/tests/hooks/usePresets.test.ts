import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePresets } from "../../src/lib/hooks/usePresets";

vi.mock("../../src/lib/fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));
import { fetchWithAuth } from "../../src/lib/fetchWithAuth";

const mockFetch = fetchWithAuth as unknown as ReturnType<typeof vi.fn>;
const COOLDOWN_KEY = "presets-cooldown-until";

function ok(json: unknown) {
  return { ok: true, status: 200, json: async () => json };
}
function fail(status = 500) {
  return { ok: false, status, statusText: String(status), json: async () => ({}) };
}
function tooMany(retryAfter?: string) {
  const headers = new Headers();
  if (retryAfter !== undefined) headers.set("Retry-After", retryAfter);
  return { ok: false, status: 429, headers };
}

const ITEM = { name: "X", code: null, category: "주식", target_weight: 100 };

describe("usePresets (B3.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("fetchPresets", () => {
    it("[Happy] populates presets on success", async () => {
      mockFetch.mockResolvedValueOnce(ok([
        { id: 1, name: "P1", created_at: "2026-05-28T00:00:00", items: [] },
      ]));
      const { result } = renderHook(() => usePresets());
      await act(async () => { await result.current.fetchPresets(); });
      expect(result.current.presets).toHaveLength(1);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("[Boundary] empty list when no presets", async () => {
      mockFetch.mockResolvedValueOnce(ok([]));
      const { result } = renderHook(() => usePresets());
      await act(async () => { await result.current.fetchPresets(); });
      expect(result.current.presets).toEqual([]);
    });

    it("[Error] sets error + notifies on non-ok response", async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce(fail(500));
      const { result } = renderHook(() => usePresets({ onError }));
      await act(async () => { await result.current.fetchPresets(); });
      expect(result.current.error).not.toBeNull();
      expect(onError).toHaveBeenCalled();
    });

    it("[Boundary] non-ok without onError still sets error state (no throw)", async () => {
      mockFetch.mockResolvedValueOnce(fail(500));
      const { result } = renderHook(() => usePresets());  // no options
      await act(async () => { await result.current.fetchPresets(); });
      expect(result.current.error).not.toBeNull();
    });

    it("[Error] network throw → error state + notify", async () => {
      const onError = vi.fn();
      mockFetch.mockRejectedValueOnce(new Error("network"));
      const { result } = renderHook(() => usePresets({ onError }));
      await act(async () => { await result.current.fetchPresets(); });
      expect(result.current.error).not.toBeNull();
      expect(onError).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("[Error] 429 (Retry-After header) sets cooldown + notifies, no presets", async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce(tooMany("60"));
      const { result } = renderHook(() => usePresets({ onError }));
      await act(async () => { await result.current.fetchPresets(); });
      expect(result.current.presets).toEqual([]);
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/잠시 후/));
      expect(Number(sessionStorage.getItem(COOLDOWN_KEY))).toBeGreaterThan(Date.now());
    });
  });

  describe("createPreset", () => {
    it("[Happy] prepends created preset", async () => {
      mockFetch
        .mockResolvedValueOnce(ok([]))  // initial fetch
        .mockResolvedValueOnce(ok({ id: 2, name: "New", created_at: "2026-05-28", items: [] }));
      const { result } = renderHook(() => usePresets());
      await act(async () => { await result.current.fetchPresets(); });
      let created: unknown;
      await act(async () => { created = await result.current.createPreset("New", [ITEM]); });
      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe("New");
      expect(created).not.toBeNull();
    });

    it("[Error] non-ok → notify + returns null, list unchanged", async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce(fail(422));
      const { result } = renderHook(() => usePresets({ onError }));
      let r: unknown = "x";
      await act(async () => { r = await result.current.createPreset("Bad", [ITEM]); });
      expect(r).toBeNull();
      expect(onError).toHaveBeenCalled();
      expect(result.current.presets).toEqual([]);
    });

    it("[Boundary] cooldown active → blocked before fetch, returns null", async () => {
      const onError = vi.fn();
      sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + 100_000));
      const { result } = renderHook(() => usePresets({ onError }));
      let r: unknown = "x";
      await act(async () => { r = await result.current.createPreset("X", [ITEM]); });
      expect(r).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();  // gated before any request
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/잠시 후/));
    });
  });

  describe("deletePreset", () => {
    it("[Happy] removes preset from list, returns true", async () => {
      mockFetch
        .mockResolvedValueOnce(ok([
          { id: 1, name: "P1", created_at: "2026-05-28", items: [] },
          { id: 2, name: "P2", created_at: "2026-05-28", items: [] },
        ]))
        .mockResolvedValueOnce(ok({ ok: true }));  // DELETE
      const { result } = renderHook(() => usePresets());
      await act(async () => { await result.current.fetchPresets(); });
      let r: unknown;
      await act(async () => { r = await result.current.deletePreset(1); });
      expect(r).toBe(true);
      expect(result.current.presets.map(p => p.id)).toEqual([2]);
    });

    it("[Error] non-ok → notify + returns false", async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce(fail(404));
      const { result } = renderHook(() => usePresets({ onError }));
      let r: unknown = "x";
      await act(async () => { r = await result.current.deletePreset(99); });
      expect(r).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it("[Error] 429 without Retry-After → default cooldown, returns false", async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce(tooMany());  // no Retry-After header → default 60
      const { result } = renderHook(() => usePresets({ onError }));
      let r: unknown = "x";
      await act(async () => { r = await result.current.deletePreset(1); });
      expect(r).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/잠시 후/));
      expect(Number(sessionStorage.getItem(COOLDOWN_KEY))).toBeGreaterThan(Date.now());
    });

    it("[Error] 429 with non-numeric Retry-After → falls back to default, cooldown valid (not NaN)", async () => {
      // RFC 9110 allows Retry-After as an http-date; Number() would yield NaN
      // and silently disable the cooldown if not guarded.
      mockFetch.mockResolvedValueOnce(tooMany("Wed, 21 Oct 2026 07:28:00 GMT"));
      const { result } = renderHook(() => usePresets());
      await act(async () => { await result.current.deletePreset(1); });
      const until = Number(sessionStorage.getItem(COOLDOWN_KEY));
      expect(Number.isNaN(until)).toBe(false);
      expect(until).toBeGreaterThan(Date.now());
    });
  });

  describe("applyPreset", () => {
    it("[Happy] returns ApplyPresetResult", async () => {
      mockFetch.mockResolvedValueOnce(ok({
        account: { id: 1 }, updated_count: 2, created_count: 1, weight_sum: 100,
      }));
      const { result } = renderHook(() => usePresets());
      let r: any;
      await act(async () => { r = await result.current.applyPreset(1, 1); });
      expect(r.updated_count).toBe(2);
      expect(r.created_count).toBe(1);
    });

    it("[Error] non-ok → notify + returns null", async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce(fail(404));
      const { result } = renderHook(() => usePresets({ onError }));
      let r: unknown = "x";
      await act(async () => { r = await result.current.applyPreset(1, 1); });
      expect(r).toBeNull();
      expect(onError).toHaveBeenCalled();
    });

    it("[Boundary] cooldown active → blocked, returns null", async () => {
      sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + 100_000));
      const { result } = renderHook(() => usePresets());  // no options → notify no-op branch
      let r: unknown = "x";
      await act(async () => { r = await result.current.applyPreset(1, 1); });
      expect(r).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
