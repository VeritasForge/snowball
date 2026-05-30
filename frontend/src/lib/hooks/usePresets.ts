import { useState, useCallback } from "react";
import { Preset, ApplyPresetResult } from "../../types";
import { fetchWithAuth } from "../fetchWithAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Persist the rate-limit cooldown so a reload keeps honoring a server 429.
const COOLDOWN_KEY = "presets-cooldown-until";
const DEFAULT_COOLDOWN_SECONDS = 60;
const COOLDOWN_MSG = "요청이 많습니다. 잠시 후 다시 시도해주세요.";

interface UsePresetsOptions {
  onError?: (msg: string) => void;
}

// One item in a save payload (matches backend PresetItemCreate).
export interface PresetItemInput {
  name: string;
  code: string | null;
  category: string;
  target_weight: number;
}

export function usePresets(options?: UsePresetsOptions) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onError = options?.onError;
  // Single optional-chaining site so callers below stay branch-free.
  const notify = useCallback((msg: string) => { onError?.(msg); }, [onError]);

  // Cross-cutting gate: honor an active cooldown, run the request, and convert
  // a 429 into a persisted cooldown. Returns the Response (possibly !ok, so the
  // caller decides how to surface failures) or null when blocked.
  const guardedRequest = useCallback(async (
    path: string, init: RequestInit,
  ): Promise<Response | null> => {
    const until = Number(sessionStorage.getItem(COOLDOWN_KEY) ?? 0);
    if (until > Date.now()) {
      notify(COOLDOWN_MSG);
      return null;
    }
    const res = await fetchWithAuth(`${API_URL}${path}`, init);
    if (res.status === 429) {
      // Retry-After may be absent, a non-numeric http-date, or garbage from a
      // proxy. Anything non-finite/non-positive falls back to the default —
      // otherwise NaN would poison the stored timestamp and silently disable
      // the cooldown (NaN > Date.now() is always false).
      const raw = Number(res.headers.get("Retry-After"));
      const retryAfter = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COOLDOWN_SECONDS;
      sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + retryAfter * 1000));
      notify(COOLDOWN_MSG);
      return null;
    }
    return res;
  }, [notify]);

  const fetchPresets = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await guardedRequest("/presets", {});
      if (!res) return;
      if (!res.ok) {
        const msg = "프리셋을 불러오지 못했습니다.";
        setError(msg);
        notify(msg);
        return;
      }
      setPresets(await res.json());
    } catch {
      const msg = "네트워크 오류가 발생했습니다.";
      setError(msg);
      notify(msg);
    } finally {
      setIsLoading(false);
    }
  }, [guardedRequest, notify]);

  const createPreset = useCallback(async (
    name: string, items: PresetItemInput[],
  ): Promise<Preset | null> => {
    const res = await guardedRequest("/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, items }),
    });
    if (!res) return null;
    if (!res.ok) {
      notify("프리셋 저장에 실패했습니다.");
      return null;
    }
    const created: Preset = await res.json();
    setPresets(prev => [created, ...prev]);
    return created;
  }, [guardedRequest, notify]);

  const deletePreset = useCallback(async (presetId: number): Promise<boolean> => {
    const res = await guardedRequest(`/presets/${presetId}`, { method: "DELETE" });
    if (!res) return false;
    if (!res.ok) {
      notify("프리셋 삭제에 실패했습니다.");
      return false;
    }
    setPresets(prev => prev.filter(p => p.id !== presetId));
    return true;
  }, [guardedRequest, notify]);

  const applyPreset = useCallback(async (
    presetId: number, accountId: number,
  ): Promise<ApplyPresetResult | null> => {
    const res = await guardedRequest(`/presets/${presetId}/apply/${accountId}`, { method: "POST" });
    if (!res) return null;
    if (!res.ok) {
      notify("프리셋 적용에 실패했습니다.");
      return null;
    }
    return await res.json();
  }, [guardedRequest, notify]);

  return { presets, isLoading, error, fetchPresets, createPreset, deletePreset, applyPreset };
}
