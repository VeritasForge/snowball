"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Account, Asset, Preset } from "../types";
import { usePresets } from "../lib/hooks/usePresets";

interface PresetManagerModalProps {
  account: Account;
  onClose: () => void;
  onApplied: (updated: Account) => void;
  showToast: (msg: string, type?: "info" | "error") => void;
}

type Tab = "load" | "save";

interface ConfirmState {
  presetId: number;
  presetName: string;
  updatedCount: number;
  createdCount: number;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PresetManagerModal({
  account, onClose, onApplied, showToast,
}: PresetManagerModalProps) {
  const [tab, setTab] = useState<Tab>("load");
  const [name, setName] = useState("내 포트폴리오");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [pendingMutation, setPendingMutation] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { presets, isLoading, error, fetchPresets, createPreset, deletePreset, applyPreset } =
    usePresets({ onError: msg => showToast(msg, "error") });

  // Mount once: load presets, move focus into the modal, and remember the
  // opener so focus returns to it on close (WAI-ARIA dialog pattern). Run-once
  // deps are intentional — fetchPresets' identity changes every render (the
  // inline onError closure), so depending on it would re-fetch and steal
  // focus to the close button on every parent re-render.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    fetchPresets();
    closeRef.current?.focus();
    return () => opener?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Account switched out from under the modal: close once any in-flight
  // mutation settles (the effect re-runs when pendingMutation flips back).
  const initialAccountIdRef = useRef(account.id);
  useEffect(() => {
    if (account.id !== initialAccountIdRef.current && !pendingMutation) {
      showToast("계좌가 변경되어 프리셋 모달을 닫았습니다", "info");
      onClose();
    }
  }, [account.id, pendingMutation, onClose, showToast]);

  // Escape closes — but never mid-mutation (would orphan the request).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && !pendingMutation) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingMutation, onClose]);

  // Focus trap: keep Tab / Shift+Tab cycling within the modal. The tab
  // buttons are never disabled, so the modal always has ≥1 focusable node.
  const handleTrap = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !modalRef.current) return;
    const nodes = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const nameCount = [...name].length;  // count code points, not UTF-16 units
  const canSave = account.assets.length > 0 && nameCount >= 1 && nameCount <= 100;
  const chips = account.assets.map(a => ({
    label: `${a.name} ${a.target_weight.toFixed(1)}%`,
    isZero: a.target_weight === 0 || Number.isNaN(a.target_weight),
  }));

  // Each mutation handler is only reachable through a button that is
  // `disabled` while pending (and save is disabled when !canSave), so the
  // handlers don't re-guard — the disabled attribute is the real gate.
  const handleSave = async () => {
    setPendingMutation(true);
    try {
      const items = account.assets.map(a => ({
        name: a.name,
        code: a.code ?? null,
        category: a.category,
        target_weight: a.target_weight,
      }));
      const created = await createPreset(name, items);
      if (created) {
        showToast(`프리셋 "${created.name}" 저장 완료`, "info");
        setTab("load");
      }
    } finally {
      setPendingMutation(false);
    }
  };

  // Client-side dry-run mirroring the backend single-pass match, so the
  // confirm step can show "N updated / M created" before the request.
  const handleApplyClick = (preset: Preset) => {
    // Match against an id-ascending copy so the preview matches the backend,
    // which sorts before its single-pass match (presets.py: sorted(..., key=id)).
    // Without this, duplicate-name accounts in non-id order could be previewed
    // with different updated/created counts than the apply actually produces.
    const available = [...account.assets].sort((a, b) => a.id - b.id);
    const matched = new Set<number>();
    let updated = 0;
    let created = 0;
    for (const item of preset.items) {
      let hit: Asset | undefined;
      if (item.code) {
        hit = available.find(a => !matched.has(a.id) && a.code === item.code);
      }
      if (!hit) {
        // code-less item, or code set with no code match → name fallback
        hit = available.find(a => !matched.has(a.id) && a.name === item.name);
      }
      if (hit) {
        matched.add(hit.id);
        updated++;
      } else {
        created++;
      }
    }
    setConfirm({ presetId: preset.id, presetName: preset.name, updatedCount: updated, createdCount: created });
  };

  const handleApplyConfirm = async () => {
    // Only rendered (and clickable) when `confirm` is set → safe to assert.
    const target = confirm!;
    setPendingMutation(true);
    try {
      const result = await applyPreset(target.presetId, account.id);
      if (result) {
        onApplied(result.account);
        const balanced = Math.abs(result.weight_sum - 100) < 0.01;
        showToast(
          balanced ? "프리셋 적용 완료" : `적용 완료. 목표비중 합계가 ${result.weight_sum.toFixed(1)}%입니다`,
          "info",
        );
        setConfirm(null);
        onClose();
      } else {
        setConfirm(null);
      }
    } finally {
      setPendingMutation(false);
    }
  };

  const handleDelete = async (presetId: number) => {
    setPendingMutation(true);
    try {
      const ok = await deletePreset(presetId);
      if (ok) showToast("프리셋 삭제 완료", "info");
      setDeleteConfirmId(null);
    } finally {
      setPendingMutation(false);
    }
  };

  const requestClose = () => { if (!pendingMutation) onClose(); };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preset-modal-title"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) requestClose(); }}
      onKeyDown={handleTrap}
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 id="preset-modal-title" className="text-lg font-bold text-foreground">📂 프리셋 관리</h2>
          <button
            ref={closeRef}
            onClick={requestClose}
            disabled={pendingMutation}
            aria-label="모달 닫기"
            className="text-muted hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div role="tablist" aria-label="프리셋 탭" className="flex border-b border-border">
          <button
            id="preset-tab-load" role="tab" aria-selected={tab === "load"} aria-controls="preset-tabpanel"
            onClick={() => setTab("load")}
            className={`flex-1 py-2 text-sm font-bold ${tab === "load" ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            불러오기
          </button>
          <button
            id="preset-tab-save" role="tab" aria-selected={tab === "save"} aria-controls="preset-tabpanel"
            onClick={() => setTab("save")}
            className={`flex-1 py-2 text-sm font-bold ${tab === "save" ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            저장
          </button>
        </div>

        <div
          id="preset-tabpanel" role="tabpanel"
          aria-labelledby={tab === "load" ? "preset-tab-load" : "preset-tab-save"}
          className="flex-1 overflow-auto p-4"
        >
          {tab === "load" ? (
            <LoadTab
              presets={presets} isLoading={isLoading} error={error} onRetry={fetchPresets}
              confirm={confirm}
              onApplyClick={handleApplyClick}
              onApplyConfirm={handleApplyConfirm}
              onApplyCancel={() => setConfirm(null)}
              deleteConfirmId={deleteConfirmId}
              onDeleteRequest={setDeleteConfirmId}
              onDeleteConfirm={handleDelete}
              onDeleteCancel={() => setDeleteConfirmId(null)}
              pending={pendingMutation}
            />
          ) : (
            <SaveTab
              name={name} setName={setName} nameCount={nameCount}
              chips={chips} canSave={canSave} onSave={handleSave} pending={pendingMutation}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Load tab ─────────────────────────────

interface LoadTabProps {
  presets: Preset[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  confirm: ConfirmState | null;
  onApplyClick: (p: Preset) => void;
  onApplyConfirm: () => void;
  onApplyCancel: () => void;
  deleteConfirmId: number | null;
  onDeleteRequest: (id: number) => void;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
  pending: boolean;
}

function LoadTab(p: LoadTabProps) {
  if (p.isLoading) {
    return <div className="text-center text-muted py-8">프리셋을 불러오는 중...</div>;
  }
  if (p.error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger mb-2">{p.error}</p>
        <button onClick={p.onRetry} className="text-accent underline text-sm">재시도</button>
      </div>
    );
  }
  if (p.presets.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        저장된 프리셋이 없습니다.<br />
        <span className="text-xs">저장 탭에서 첫 프리셋을 만들어보세요.</span>
      </div>
    );
  }
  if (p.confirm) {
    return (
      <div className="bg-accent/5 border border-accent rounded-lg p-4">
        <p className="font-bold mb-1 text-foreground">&quot;{p.confirm.presetName}&quot; 적용</p>
        <p className="text-sm text-muted mb-3">
          기존 종목 {p.confirm.updatedCount}개 비중 업데이트, 신규 {p.confirm.createdCount}개 추가
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={p.onApplyCancel} disabled={p.pending} className="px-3 py-1 text-sm text-muted disabled:opacity-50">취소</button>
          <button onClick={p.onApplyConfirm} disabled={p.pending} className="px-3 py-1 bg-accent text-accent-foreground rounded text-sm font-bold disabled:opacity-50">
            {p.pending ? "적용 중..." : "적용 확정"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {p.presets.map(preset => (
        <li key={preset.id} className="border border-border rounded p-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-foreground">{preset.name}</div>
            <div className="text-xs text-muted">{preset.items.length}개 종목</div>
          </div>
          <div className="flex gap-2">
            {p.deleteConfirmId === preset.id ? (
              <>
                <button onClick={() => p.onDeleteConfirm(preset.id)} disabled={p.pending}
                  className="bg-danger text-white px-2 py-1 rounded text-xs disabled:opacity-50">삭제 확정</button>
                <button onClick={p.onDeleteCancel} disabled={p.pending}
                  className="text-muted text-xs disabled:opacity-50">취소</button>
              </>
            ) : (
              <>
                <button onClick={() => p.onApplyClick(preset)} disabled={p.pending}
                  className="bg-accent text-accent-foreground px-3 py-1 rounded text-sm font-bold disabled:opacity-50">적용</button>
                <button onClick={() => p.onDeleteRequest(preset.id)} disabled={p.pending}
                  aria-label={`${preset.name} 삭제`} className="text-danger text-sm disabled:opacity-50">🗑</button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────────── Save tab ─────────────────────────────

interface SaveTabProps {
  name: string;
  setName: (v: string) => void;
  nameCount: number;
  chips: { label: string; isZero: boolean }[];
  canSave: boolean;
  onSave: () => void;
  pending: boolean;
}

function SaveTab(p: SaveTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="preset-name" className="block text-sm text-muted mb-1">프리셋 이름</label>
        <input
          id="preset-name" type="text" value={p.name}
          onChange={e => p.setName(e.target.value)}
          className="w-full border border-border rounded p-2 bg-input text-foreground"
        />
        <div className={`text-xs mt-1 ${p.nameCount > 100 ? "text-danger" : "text-muted"}`}>{p.nameCount}/100</div>
      </div>
      <div>
        <span className="block text-sm text-muted mb-2">저장될 종목</span>
        {p.chips.length === 0 ? (
          <p className="text-muted text-sm">현재 계좌에 종목이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.chips.map((c, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c.isZero ? "border border-danger text-danger" : "bg-secondary text-foreground"}`}>
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={p.onSave}
        disabled={!p.canSave || p.pending}
        className="w-full py-2 bg-accent text-accent-foreground rounded font-bold disabled:opacity-50"
      >
        {p.pending ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
