"use client";

import { useState, useRef } from "react";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { nanoid } from "nanoid";
import type { Item } from "@/types/tier";
import { POOL_ID, TRASH_ID, MAX_LOCAL_IMAGE_SIZE } from "@/lib/constants";
import { ItemCard } from "./ItemCard";

interface ItemPoolProps {
  items: Item[];
  onAddItem: (item: Item) => void;
  onRemoveItem: (itemId: string) => void;
  isViewMode?: boolean;
  showDebugOverlay?: boolean;
}

type Tab = "url" | "upload";

function TrashZone() {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id: TRASH_ID });

  if (!active) return null;

  return (
    <div
      ref={setNodeRef}
      className={`flex w-16 shrink-0 flex-col items-center justify-center rounded border-2 border-dashed transition-colors ${
        isOver
          ? "border-[#e94560] bg-[#e94560]/20 text-[#e94560]"
          : "border-[#555] text-[#555]"
      }`}
    >
      <span className="text-xl">🗑</span>
      <span className="text-[10px]">削除</span>
    </div>
  );
}

export function ItemPool({
  items,
  onAddItem,
  onRemoveItem,
  isViewMode,
  showDebugOverlay,
}: ItemPoolProps) {
  const [tab, setTab] = useState<Tab>("url");
  const [urlInput, setUrlInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });

  function handleAddUrl() {
    const url = urlInput.trim();
    if (!url) return;

    const item: Item = {
      id: `item-${nanoid(8)}`,
      url,
      label: labelInput.trim() || undefined,
      source: "url",
    };
    onAddItem(item);
    setUrlInput("");
    setLabelInput("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > MAX_LOCAL_IMAGE_SIZE) {
        alert(`${file.name} は5MBを超えています`);
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} は画像ファイルではありません`);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const item: Item = {
        id: `item-${nanoid(8)}`,
        url: objectUrl,
        label: file.name.replace(/\.[^.]+$/, ""),
        source: "local",
      };
      onAddItem(item);
    });

    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    Array.from(files).forEach((file) => {
      if (file.size > MAX_LOCAL_IMAGE_SIZE || !file.type.startsWith("image/")) {
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const item: Item = {
        id: `item-${nanoid(8)}`,
        url: objectUrl,
        label: file.name.replace(/\.[^.]+$/, ""),
        source: "local",
      };
      onAddItem(item);
    });
  }

  return (
    <div className="rounded-lg border border-[#0f3460] bg-[#16213e] p-3 md:p-4">
      <h3 className="mb-2 text-sm font-bold text-[#aaa]">
        未配置アイテム（プール）
      </h3>

      {!isViewMode && (
        <div className="mb-3">
          {/* タブ切り替え */}
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              onClick={() => setTab("url")}
              className={`rounded px-3 py-1 text-xs ${
                tab === "url"
                  ? "bg-[#0f3460] text-white"
                  : "border border-[#555] bg-[#2a2a3e] text-[#aaa]"
              }`}
            >
              🔗 URL追加
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`rounded px-3 py-1 text-xs ${
                tab === "upload"
                  ? "bg-[#0f3460] text-white"
                  : "border border-[#555] bg-[#2a2a3e] text-[#aaa]"
              }`}
            >
              📁 画像アップロード
            </button>
          </div>

          {tab === "url" ? (
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddUrl();
                }}
                placeholder="https://example.com/image.png"
                className="flex-1 rounded border border-[#333] bg-[#1a1a2e] px-3 py-1.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#0f3460]"
              />
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddUrl();
                }}
                placeholder="ラベル（任意）"
                className="w-full rounded border border-[#333] bg-[#1a1a2e] px-3 py-1.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#0f3460] md:w-32"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="rounded bg-[#0f3460] px-4 py-1.5 text-sm text-white hover:bg-[#0f3460]/80"
              >
                追加
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex cursor-pointer flex-col items-center justify-center rounded border border-dashed border-[#555] bg-[#1a1a2e] py-6"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-sm text-[#888]">
                📁 ファイルをドロップ、またはクリックして選択
              </p>
              <p className="mt-1 text-xs text-[#555]">
                PNG, JPG, GIF, WebP（最大5MB/枚）
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* プール内アイテム + ゴミ箱 */}
      <div className="flex gap-2">
        <SortableContext
          id={POOL_ID}
          items={items.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={`flex min-h-[48px] flex-1 flex-wrap gap-1.5 rounded p-1 md:gap-2 ${
              isOver ? "bg-blue-500/10" : ""
            }`}
          >
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onRemove={onRemoveItem}
                showDebugOverlay={showDebugOverlay}
              />
            ))}
            {items.length === 0 && (
              <span className="flex w-full items-center justify-center py-2 text-xs text-[#555]">
                {isViewMode
                  ? "未配置アイテムなし"
                  : "上からアイテムを追加してください"}
              </span>
            )}
          </div>
        </SortableContext>

        {/* ゴミ箱ドロップゾーン（ドラッグ中のみ表示） */}
        <TrashZone />
      </div>
    </div>
  );
}
