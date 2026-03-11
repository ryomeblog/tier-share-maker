"use client";

import { useReducer, useEffect, useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import type { Item } from "@/types/tier";
import { DEFAULT_STATE, POOL_ID, MAX_TITLE_LENGTH } from "@/lib/constants";
import { tierListReducer } from "@/lib/reducer";
import { getDataFromUrl, decodeUrlToState } from "@/lib/share";
import { TierRowComponent } from "./TierRowComponent";
import { ItemPool } from "./ItemPool";
import { ItemCard } from "./ItemCard";
import { ShareToolbar } from "./ShareToolbar";

export function TierListEditor() {
  const [state, dispatch] = useReducer(tierListReducer, DEFAULT_STATE);
  const [isViewMode, setIsViewMode] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(state.title);
  const [showDebugOverlay, setShowDebugOverlay] = useState(true);
  const tierAreaRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // URLからデータを復元
  useEffect(() => {
    const compressed = getDataFromUrl();
    if (compressed) {
      const data = decodeUrlToState(compressed);
      if (data) {
        dispatch({ type: "LOAD_FROM_URL", payload: { data } });
        setTitleValue(data.title);
        setIsViewMode(true);
      }
    }
  }, []);

  // タイトル編集
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // D&Dセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  // activeItemを全コンテナから探す
  const findItem = useCallback(
    (id: string): Item | null => {
      const poolItem = state.pool.find((i) => i.id === id);
      if (poolItem) return poolItem;
      for (const tier of state.tiers) {
        const found = tier.items.find((i) => i.id === id);
        if (found) return found;
      }
      return null;
    },
    [state],
  );

  // アイテムがどのコンテナに属するか検索
  const findContainer = useCallback(
    (id: string): string | null => {
      if (state.pool.some((i) => i.id === id)) return POOL_ID;
      for (const tier of state.tiers) {
        if (tier.items.some((i) => i.id === id)) return tier.id;
      }
      // idそのものがコンテナIDの場合
      if (id === POOL_ID) return POOL_ID;
      if (state.tiers.some((t) => t.id === id)) return id;
      return null;
    },
    [state],
  );

  function handleDragStart(event: DragStartEvent) {
    const item = findItem(event.active.id as string);
    setActiveItem(item);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    let overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    // overIdがアイテムIDなら、そのコンテナを取得
    if (overContainer !== overId) {
      overContainer = findContainer(overId);
    }

    if (activeContainer === overContainer) return;

    // コンテナ間移動
    const overItems =
      overContainer === POOL_ID
        ? state.pool
        : (state.tiers.find((t) => t.id === overContainer)?.items ?? []);

    const overIndex = overItems.findIndex((i) => i.id === overId);
    const insertIndex = overIndex >= 0 ? overIndex : overItems.length;

    dispatch({
      type: "MOVE_ITEM",
      payload: {
        itemId: activeId,
        toContainerId: overContainer!,
        toIndex: insertIndex,
      },
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      // 同一コンテナ内の並び替え
      const items =
        activeContainer === POOL_ID
          ? state.pool
          : (state.tiers.find((t) => t.id === activeContainer)?.items ?? []);

      const overIndex = items.findIndex((i) => i.id === overId);
      if (overIndex >= 0) {
        dispatch({
          type: "MOVE_ITEM",
          payload: {
            itemId: activeId,
            toContainerId: activeContainer,
            toIndex: overIndex,
          },
        });
      }
    }
  }

  function handleTitleSubmit() {
    const trimmed = titleValue.trim();
    if (trimmed) {
      dispatch({
        type: "SET_TITLE",
        payload: { title: trimmed.slice(0, MAX_TITLE_LENGTH) },
      });
    }
    setIsEditingTitle(false);
  }

  function handleCopyToEdit() {
    setIsViewMode(false);
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* ヘッダー */}
      <header className="border-b border-[#0f3460] bg-[#16213e] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="shrink-0 text-lg font-bold text-[#e94560]">
              Tier List Maker
            </h1>
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                maxLength={MAX_TITLE_LENGTH}
                className="rounded border border-dashed border-[#555] bg-[#1a1a2e] px-3 py-1 text-sm text-[#aaa] outline-none focus:border-[#0f3460]"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!isViewMode) {
                    setTitleValue(state.title);
                    setIsEditingTitle(true);
                  }
                }}
                className="rounded border border-dashed border-[#333] px-3 py-1 text-sm text-[#aaa] hover:border-[#555]"
              >
                {state.title}
              </button>
            )}
          </div>
          <ShareToolbar
            state={state}
            tierAreaRef={tierAreaRef}
            onReset={() => {
              dispatch({ type: "RESET" });
              setTitleValue("My Tier List");
            }}
            isViewMode={isViewMode}
            onCopyToEdit={handleCopyToEdit}
            setShowDebugOverlay={setShowDebugOverlay}
          />
        </div>
      </header>

      {/* デバッグ表示トグル */}
      {!isViewMode && (
        <div className="bg-[#111] px-4 py-1 text-right">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#888]">
            <input
              type="checkbox"
              checked={showDebugOverlay}
              onChange={(e) => setShowDebugOverlay(e.target.checked)}
              className="accent-[#e94560]"
            />
            編集UI表示（🎨🔒）
          </label>
        </div>
      )}

      {/* 閲覧モードバナー */}
      {isViewMode && (
        <div className="bg-[#0f3460] py-2 text-center text-sm text-white">
          👀 共有されたTier表を閲覧中
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-6xl px-4 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Tierエリア（画像キャプチャ対象） */}
          <div ref={tierAreaRef} className="space-y-1 md:space-y-1.5">
            {state.tiers.map((tier) => (
              <TierRowComponent
                key={tier.id}
                tier={tier}
                onRename={(tierId, name) =>
                  dispatch({
                    type: "RENAME_TIER",
                    payload: { tierId, name },
                  })
                }
                onChangeColor={(tierId, color) =>
                  dispatch({
                    type: "CHANGE_TIER_COLOR",
                    payload: { tierId, color },
                  })
                }
                onDeleteTier={(tierId) =>
                  dispatch({ type: "REMOVE_TIER", payload: { tierId } })
                }
                onRemoveItem={(itemId) =>
                  dispatch({ type: "REMOVE_ITEM", payload: { itemId } })
                }
                isViewMode={isViewMode}
                showDebugOverlay={showDebugOverlay}
              />
            ))}
          </div>

          {/* Tier追加ボタン */}
          {!isViewMode && (
            <button
              type="button"
              onClick={() => dispatch({ type: "ADD_TIER" })}
              className="mt-2 w-full rounded border border-dashed border-[#555] py-2 text-sm text-[#888] hover:border-[#aaa] hover:text-[#aaa]"
            >
              ＋ Tier を追加
            </button>
          )}

          {/* プールエリア */}
          <div className="mt-4">
            <ItemPool
              items={state.pool}
              onAddItem={(item) =>
                dispatch({ type: "ADD_ITEM", payload: { item } })
              }
              onRemoveItem={(itemId) =>
                dispatch({ type: "REMOVE_ITEM", payload: { itemId } })
              }
              isViewMode={isViewMode}
              showDebugOverlay={showDebugOverlay}
            />
          </div>

          {/* ドラッグオーバーレイ */}
          <DragOverlay>
            {activeItem ? (
              <ItemCard item={activeItem} onRemove={() => {}} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* フッター */}
      <footer className="mt-8 border-t border-[#0f3460] bg-[#16213e] py-3 text-center text-xs text-[#555]">
        © 2026 Tier List Maker
      </footer>
    </div>
  );
}
