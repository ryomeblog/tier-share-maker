"use client";

import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import type { TierListState } from "@/types/tier";
import { encodeStateToUrl } from "@/lib/share";

interface ShareToolbarProps {
  state: TierListState;
  tierAreaRef: React.RefObject<HTMLDivElement | null>;
  onReset: () => void;
  isViewMode?: boolean;
  onCopyToEdit?: () => void;
  setShowDebugOverlay?: (show: boolean) => void;
}

export function ShareToolbar({
  state,
  tierAreaRef,
  onReset,
  isViewMode,
  onCopyToEdit,
  setShowDebugOverlay,
}: ShareToolbarProps) {
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "warning" | "error") => {
      if (!toastRef.current) return;
      const el = toastRef.current;
      el.textContent = message;
      el.className = `fixed top-4 left-1/2 -translate-x-1/2 z-[100] rounded-lg px-4 py-2 text-sm shadow-lg transition-opacity ${
        type === "success"
          ? "bg-[#69DB7C] text-[#333]"
          : type === "warning"
            ? "bg-[#FFA94D] text-[#333]"
            : "bg-[#e94560] text-white"
      }`;
      el.style.opacity = "1";

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        el.style.opacity = "0";
      }, 3000);
    },
    [],
  );

  async function handleCopyUrl() {
    const { url, localImageCount, isOverLimit } = encodeStateToUrl(state);

    if (isOverLimit) {
      showToast("アイテムが多すぎます。画像として保存してください。", "error");
      return;
    }

    await navigator.clipboard.writeText(url);

    if (localImageCount > 0) {
      showToast(
        `URLをコピーしました（ローカル画像${localImageCount}件は含まれません）`,
        "warning",
      );
    } else {
      showToast("URLをクリップボードにコピーしました", "success");
    }
  }

  async function handleSaveImage() {
    if (!tierAreaRef.current) return;

    try {
      // デバッグUIを一時的にOFFにしてキャプチャ
      setShowDebugOverlay?.(false);
      // DOMの更新を待つ
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );

      const dataUrl = await toPng(tierAreaRef.current, {
        backgroundColor: "#1a1a2e",
        pixelRatio: 2,
      });

      setShowDebugOverlay?.(true);

      const link = document.createElement("a");
      link.download = `${state.title || "tier-list"}.png`;
      link.href = dataUrl;
      link.click();

      showToast("画像を保存しました", "success");
    } catch {
      setShowDebugOverlay?.(true);
      showToast("画像の保存に失敗しました", "error");
    }
  }

  function handleReset() {
    if (
      window.confirm(
        "Tier表をリセットしますか？\nすべてのアイテムと設定が初期状態に戻ります。",
      )
    ) {
      onReset();
      // URLのhashとqueryをクリア
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {isViewMode ? (
          <>
            <button
              type="button"
              onClick={handleSaveImage}
              className="rounded bg-[#0f3460] px-3 py-1.5 text-xs text-white hover:bg-[#0f3460]/80 md:text-sm"
            >
              📷 画像として保存
            </button>
            <button
              type="button"
              onClick={onCopyToEdit}
              className="rounded bg-[#69DB7C] px-3 py-1.5 text-xs text-[#333] hover:bg-[#69DB7C]/80 md:text-sm"
            >
              ✏️ コピーして編集
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="rounded bg-[#0f3460] px-3 py-1.5 text-xs text-white hover:bg-[#0f3460]/80 md:text-sm"
            >
              📋 URLをコピー
            </button>
            <button
              type="button"
              onClick={handleSaveImage}
              className="rounded bg-[#0f3460] px-3 py-1.5 text-xs text-white hover:bg-[#0f3460]/80 md:text-sm"
            >
              📷 画像として保存
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded border border-[#e94560] px-3 py-1.5 text-xs text-[#e94560] hover:bg-[#e94560] hover:text-white md:text-sm"
            >
              🔄 リセット
            </button>
          </>
        )}
      </div>

      {/* トースト */}
      <div
        ref={toastRef}
        style={{ opacity: 0 }}
        className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg transition-opacity"
      />
    </>
  );
}
