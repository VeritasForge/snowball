import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PresetManagerModal } from "../../src/components/PresetManagerModal";
import { Account, Asset, Preset } from "../../src/types";

vi.mock("../../src/lib/hooks/usePresets", () => ({ usePresets: vi.fn() }));
import { usePresets } from "../../src/lib/hooks/usePresets";

const mockUsePresets = usePresets as unknown as ReturnType<typeof vi.fn>;

function asset(over: Partial<Asset> & { id: number; name: string }): Asset {
  return {
    account_id: 1, code: undefined, category: "주식", target_weight: 50,
    current_price: 0, avg_price: 0, quantity: 0, current_value: 0,
    invested_amount: 0, pl_amount: 0, pl_rate: 0, current_weight: 0,
    target_value: 0, diff_value: 0, action: "HOLD", action_quantity: 0,
    ...over,
  };
}

function makeAccount(over: Partial<Account> = {}): Account {
  return {
    id: 1, name: "ISA", cash: 0, assets: [],
    total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0,
    ...over,
  };
}

function preset(over: Partial<Preset> & { id: number }): Preset {
  return { name: "P", created_at: "2026-05-28T00:00:00", items: [], ...over };
}

function hook(over: Record<string, unknown> = {}) {
  return {
    presets: [] as Preset[], isLoading: false, error: null as string | null,
    fetchPresets: vi.fn(), createPreset: vi.fn(), deletePreset: vi.fn(), applyPreset: vi.fn(),
    ...over,
  };
}

function renderModal(props: Partial<Parameters<typeof PresetManagerModal>[0]> = {}) {
  const onClose = vi.fn();
  const onApplied = vi.fn();
  const showToast = vi.fn();
  const utils = render(
    <PresetManagerModal
      account={props.account ?? makeAccount()}
      onClose={props.onClose ?? onClose}
      onApplied={props.onApplied ?? onApplied}
      showToast={props.showToast ?? showToast}
    />,
  );
  return { ...utils, onClose: props.onClose ?? onClose, onApplied: props.onApplied ?? onApplied, showToast: props.showToast ?? showToast };
}

const NEVER = () => new Promise(() => {});  // never resolves → keeps pendingMutation true

beforeEach(() => vi.clearAllMocks());

describe("PresetManagerModal — a11y & structure", () => {
  it("[a11y] dialog is aria-modal with a tablist and runs initial fetch", () => {
    const fetchPresets = vi.fn();
    mockUsePresets.mockReturnValue(hook({ fetchPresets }));
    renderModal();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(fetchPresets).toHaveBeenCalled();
  });

  it("[Boundary] switching to 저장 then back to 불러오기 tab", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    expect(screen.getByRole("tab", { name: "저장" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "불러오기" }));
    expect(screen.getByRole("tab", { name: "불러오기" })).toHaveAttribute("aria-selected", "true");
  });

  it("[Error] hook onError option routes messages to showToast as error", () => {
    let captured: ((m: string) => void) | undefined;
    mockUsePresets.mockImplementation((opts?: { onError?: (m: string) => void }) => {
      captured = opts?.onError;
      return hook();
    });
    const { showToast } = renderModal();
    captured?.("백엔드 오류");
    expect(showToast).toHaveBeenCalledWith("백엔드 오류", "error");
  });
});

describe("PresetManagerModal — LoadTab states", () => {
  it("[Boundary] loading state", () => {
    mockUsePresets.mockReturnValue(hook({ isLoading: true }));
    renderModal();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  it("[Error] error state shows retry which re-fetches", () => {
    const fetchPresets = vi.fn();
    mockUsePresets.mockReturnValue(hook({ error: "프리셋을 불러오지 못했습니다.", fetchPresets }));
    renderModal();
    expect(screen.getByText("프리셋을 불러오지 못했습니다.")).toBeInTheDocument();
    fetchPresets.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "재시도" }));
    expect(fetchPresets).toHaveBeenCalled();
  });

  it("[Boundary] empty state", () => {
    mockUsePresets.mockReturnValue(hook({ presets: [] }));
    renderModal();
    expect(screen.getByText(/저장된 프리셋이 없습니다/)).toBeInTheDocument();
  });

  it("[Happy] lists presets with item counts", () => {
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 1, name: "3-Fund", items: [
        { name: "A", code: "A", category: "주식", target_weight: 100 },
      ] })],
    }));
    renderModal();
    expect(screen.getByText("3-Fund")).toBeInTheDocument();
    expect(screen.getByText("1개 종목")).toBeInTheDocument();
  });
});

describe("PresetManagerModal — SaveTab", () => {
  const oneAsset = makeAccount({ assets: [asset({ id: 1, name: "X", code: "X", target_weight: 60 })] });

  it("[Boundary] empty chips when account has no assets + save disabled", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal({ account: makeAccount({ assets: [] }) });
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    expect(screen.getByText(/현재 계좌에 종목이 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("[Boundary] chips render zero-weight differently + save enabled", () => {
    const acc = makeAccount({ assets: [
      asset({ id: 1, name: "Good", code: "G", target_weight: 60 }),
      asset({ id: 2, name: "Zero", code: "Z", target_weight: 0 }),
    ] });
    mockUsePresets.mockReturnValue(hook());
    renderModal({ account: acc });
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    expect(screen.getByText(/Good 60.0%/)).toBeInTheDocument();
    expect(screen.getByText(/Zero 0.0%/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  });

  it("[Boundary] save disabled + danger count when name exceeds 100 code points", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal({ account: oneAsset });
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    const input = screen.getByDisplayValue("내 포트폴리오");
    fireEvent.change(input, { target: { value: "x".repeat(101) } });
    expect(screen.getByText("101/100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("[Boundary] save disabled when name is empty", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal({ account: oneAsset });
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    fireEvent.change(screen.getByDisplayValue("내 포트폴리오"), { target: { value: "" } });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("[Happy] save success → toast + switches to load tab", async () => {
    const createPreset = vi.fn().mockResolvedValue(preset({ id: 9, name: "Saved" }));
    mockUsePresets.mockReturnValue(hook({ createPreset }));
    const { showToast } = renderModal({ account: oneAsset });
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createPreset).toHaveBeenCalledWith("내 포트폴리오", [
      { name: "X", code: "X", category: "주식", target_weight: 60 },
    ]));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining("저장 완료"), "info"));
    // switched back to load tab
    expect(screen.getByRole("tab", { name: "불러오기" })).toHaveAttribute("aria-selected", "true");
  });

  it("[Boundary] code-less asset saves with code:null", async () => {
    const codeless = makeAccount({ assets: [asset({ id: 1, name: "현금", code: undefined, category: "현금", target_weight: 100 })] });
    const createPreset = vi.fn().mockResolvedValue(preset({ id: 1, name: "C" }));
    mockUsePresets.mockReturnValue(hook({ createPreset }));
    renderModal({ account: codeless });
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createPreset).toHaveBeenCalledWith("내 포트폴리오", [
      { name: "현금", code: null, category: "현금", target_weight: 100 },
    ]));
  });

  it("[Error] save failure (null) → no toast, stays on save tab", async () => {
    const createPreset = vi.fn().mockResolvedValue(null);
    mockUsePresets.mockReturnValue(hook({ createPreset }));
    const { showToast } = renderModal({ account: oneAsset });
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createPreset).toHaveBeenCalled());
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "저장" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("PresetManagerModal — apply flow + dry-run", () => {
  const accountForMatch = makeAccount({ assets: [
    asset({ id: 1, name: "SPY ETF", code: "SPY" }),
    asset({ id: 2, name: "Cash", code: undefined }),
    asset({ id: 3, name: "TLT Fund", code: "OLD" }),
  ] });
  const presetForMatch = preset({ id: 7, name: "Mix", items: [
    { name: "anything", code: "SPY", category: "주식", target_weight: 25 },   // code match → asset1
    { name: "Cash", code: null, category: "현금", target_weight: 25 },          // name match → asset2
    { name: "TLT Fund", code: "TLT", category: "채권", target_weight: 25 },     // code no-hit → name match asset3 (tier-2)
    { name: "New", code: "NEW", category: "주식", target_weight: 25 },          // no match → create
  ] });

  it("[Happy] dry-run counts all 3 match tiers + 1 create before calling API", () => {
    const applyPreset = vi.fn();
    mockUsePresets.mockReturnValue(hook({ presets: [presetForMatch], applyPreset }));
    renderModal({ account: accountForMatch });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(screen.getByText(/기존 종목 3개 비중 업데이트, 신규 1개 추가/)).toBeInTheDocument();
    expect(applyPreset).not.toHaveBeenCalled();  // confirm step only
  });

  it("[Happy] confirm → applies, balanced toast, onApplied + onClose", async () => {
    const updated = makeAccount({ id: 1, name: "ISA" });
    const applyPreset = vi.fn().mockResolvedValue({ account: updated, updated_count: 1, created_count: 0, weight_sum: 100 });
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 7, name: "P", items: [{ name: "SPY ETF", code: "SPY", category: "주식", target_weight: 100 }] })],
      applyPreset,
    }));
    const { onApplied, onClose, showToast } = renderModal({ account: accountForMatch });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    fireEvent.click(screen.getByRole("button", { name: "적용 확정" }));
    await waitFor(() => expect(applyPreset).toHaveBeenCalledWith(7, 1));
    await waitFor(() => expect(onApplied).toHaveBeenCalledWith(updated));
    expect(showToast).toHaveBeenCalledWith("프리셋 적용 완료", "info");
    expect(onClose).toHaveBeenCalled();
  });

  it("[Boundary] confirm with unbalanced weight_sum → warns sum in toast", async () => {
    const applyPreset = vi.fn().mockResolvedValue({ account: makeAccount(), updated_count: 1, created_count: 0, weight_sum: 95 });
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 7, items: [{ name: "SPY ETF", code: "SPY", category: "주식", target_weight: 95 }] })],
      applyPreset,
    }));
    const { showToast } = renderModal({ account: accountForMatch });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    fireEvent.click(screen.getByRole("button", { name: "적용 확정" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining("95.0%"), "info"));
  });

  it("[Error] apply returns null → confirm cleared, no onApplied/onClose", async () => {
    const applyPreset = vi.fn().mockResolvedValue(null);
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 7, items: [{ name: "SPY ETF", code: "SPY", category: "주식", target_weight: 100 }] })],
      applyPreset,
    }));
    const { onApplied, onClose } = renderModal({ account: accountForMatch });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    fireEvent.click(screen.getByRole("button", { name: "적용 확정" }));
    await waitFor(() => expect(applyPreset).toHaveBeenCalled());
    expect(onApplied).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // back to list (confirm cleared)
    await waitFor(() => expect(screen.getByRole("button", { name: "적용" })).toBeInTheDocument());
  });

  it("[Error] dry-run sorts assets by id to match backend (dup-name, non-id order)", () => {
    // assets in id-DESC array order with a duplicate name; backend sorts by id
    // before its single-pass match, so the preview must too.
    const acc = makeAccount({ assets: [
      asset({ id: 9, name: "국채", code: "Q" }),
      asset({ id: 1, name: "국채", code: "P" }),
    ] });
    const dup = preset({ id: 7, name: "Dup", items: [
      { name: "국채", code: "ZZ", category: "채권", target_weight: 50 },  // name-fallback → id1 (lowest)
      { name: "X", code: "P", category: "주식", target_weight: 50 },      // code P already consumed → create
    ] });
    mockUsePresets.mockReturnValue(hook({ presets: [dup] }));
    renderModal({ account: acc });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    // id-sorted → 1 updated / 1 created (unsorted would wrongly show 2 / 0)
    expect(screen.getByText(/기존 종목 1개 비중 업데이트, 신규 1개 추가/)).toBeInTheDocument();
  });

  it("[Boundary] apply cancel returns to list", () => {
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 7, name: "P", items: [{ name: "SPY ETF", code: "SPY", category: "주식", target_weight: 100 }] })],
    }));
    renderModal({ account: accountForMatch });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("P")).toBeInTheDocument();
  });
});

describe("PresetManagerModal — delete flow", () => {
  const withPreset = (deletePreset: ReturnType<typeof vi.fn>) =>
    mockUsePresets.mockReturnValue(hook({ presets: [preset({ id: 5, name: "Del" })], deletePreset }));

  it("[Happy] delete confirm → calls deletePreset + toast", async () => {
    const deletePreset = vi.fn().mockResolvedValue(true);
    withPreset(deletePreset);
    const { showToast } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Del 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 확정" }));
    await waitFor(() => expect(deletePreset).toHaveBeenCalledWith(5));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("프리셋 삭제 완료", "info"));
  });

  it("[Error] delete failure (false) → no toast", async () => {
    const deletePreset = vi.fn().mockResolvedValue(false);
    withPreset(deletePreset);
    const { showToast } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Del 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 확정" }));
    await waitFor(() => expect(deletePreset).toHaveBeenCalled());
    expect(showToast).not.toHaveBeenCalled();
  });

  it("[Boundary] delete cancel returns to actions", () => {
    withPreset(vi.fn());
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Del 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByRole("button", { name: "적용" })).toBeInTheDocument();
  });
});

describe("PresetManagerModal — close paths", () => {
  it("[a11y] restores focus to the opener on close", () => {
    mockUsePresets.mockReturnValue(hook());
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const utils = render(
      <PresetManagerModal account={makeAccount()} onClose={vi.fn()} onApplied={vi.fn()} showToast={vi.fn()} />,
    );
    expect(document.activeElement).not.toBe(opener);  // focus moved into modal
    utils.unmount();
    expect(document.activeElement).toBe(opener);  // restored
    opener.remove();
  });

  it("[Boundary] focus restore is a no-op when there was no opener", () => {
    mockUsePresets.mockReturnValue(hook());
    const spy = vi.spyOn(document, "activeElement", "get").mockReturnValue(null);
    const utils = render(
      <PresetManagerModal account={makeAccount()} onClose={vi.fn()} onApplied={vi.fn()} showToast={vi.fn()} />,
    );
    spy.mockRestore();
    expect(() => utils.unmount()).not.toThrow();  // opener?.focus() skips on null
  });

  it("[Happy] close button calls onClose", () => {
    mockUsePresets.mockReturnValue(hook());
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "모달 닫기" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("[Happy] backdrop click closes", () => {
    mockUsePresets.mockReturnValue(hook());
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalled();
  });

  it("[Boundary] backdrop click while a mutation is pending does NOT close", () => {
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 5, name: "Del" })],
      deletePreset: vi.fn().mockImplementation(NEVER),
    }));
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Del 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 확정" }));  // pending = true now
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("[a11y] Escape closes", () => {
    mockUsePresets.mockReturnValue(hook());
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("[Boundary] non-Escape key does not close", () => {
    mockUsePresets.mockReturnValue(hook());
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("[Boundary] Escape while pending does NOT close", () => {
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 5, name: "Del" })],
      deletePreset: vi.fn().mockImplementation(NEVER),
    }));
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Del 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 확정" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("[Boundary] account switch closes with toast", () => {
    mockUsePresets.mockReturnValue(hook());
    const onClose = vi.fn();
    const showToast = vi.fn();
    const utils = render(
      <PresetManagerModal account={makeAccount({ id: 1 })} onClose={onClose} onApplied={vi.fn()} showToast={showToast} />,
    );
    utils.rerender(
      <PresetManagerModal account={makeAccount({ id: 2 })} onClose={onClose} onApplied={vi.fn()} showToast={showToast} />,
    );
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("계좌가 변경"), "info");
    expect(onClose).toHaveBeenCalled();
  });

  it("[Boundary] account switch while pending does NOT close", () => {
    mockUsePresets.mockReturnValue(hook({
      presets: [preset({ id: 5, name: "Del" })],
      deletePreset: vi.fn().mockImplementation(NEVER),
    }));
    const onClose = vi.fn();
    const showToast = vi.fn();
    const utils = render(
      <PresetManagerModal account={makeAccount({ id: 1 })} onClose={onClose} onApplied={vi.fn()} showToast={showToast} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Del 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 확정" }));  // pending
    utils.rerender(
      <PresetManagerModal account={makeAccount({ id: 2 })} onClose={onClose} onApplied={vi.fn()} showToast={showToast} />,
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("PresetManagerModal — focus trap", () => {
  it("[a11y] Tab from last focusable wraps to first", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal();
    const dialog = screen.getByRole("dialog");
    const nodes = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("[a11y] Shift+Tab from first focusable wraps to last", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal();
    const dialog = screen.getByRole("dialog");
    const nodes = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    first.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("[Boundary] Tab from a middle element does not wrap", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal();
    const dialog = screen.getByRole("dialog");
    const nodes = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const middle = nodes[1];
    middle.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(middle);  // unchanged
  });

  it("[Boundary] non-Tab key in dialog is ignored by trap", () => {
    mockUsePresets.mockReturnValue(hook());
    renderModal();
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });  // no throw, no focus change
    expect(dialog).toBeInTheDocument();
  });
});
