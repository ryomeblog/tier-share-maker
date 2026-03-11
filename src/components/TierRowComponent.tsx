"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { TierRow } from "@/types/tier";
import { TierLabel } from "./TierLabel";
import { ItemCard } from "./ItemCard";

interface TierRowComponentProps {
  tier: TierRow;
  onRename: (tierId: string, name: string) => void;
  onChangeColor: (tierId: string, color: string) => void;
  onDeleteTier: (tierId: string) => void;
  onRemoveItem: (itemId: string) => void;
  isViewMode?: boolean;
  showDebugOverlay?: boolean;
}

export function TierRowComponent({
  tier,
  onRename,
  onChangeColor,
  onDeleteTier,
  onRemoveItem,
  isViewMode,
  showDebugOverlay,
}: TierRowComponentProps) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });

  return (
    <div className="flex">
      <TierLabel
        name={tier.name}
        color={tier.color}
        onRename={(name) => onRename(tier.id, name)}
        onChangeColor={(color) => onChangeColor(tier.id, color)}
        showDebugOverlay={showDebugOverlay}
      />

      <SortableContext
        id={tier.id}
        items={tier.items.map((i) => i.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex flex-1 flex-wrap content-start items-start gap-1.5 rounded-r border p-1.5 md:gap-2 md:p-2 ${
            isOver
              ? "border-blue-500 bg-blue-500/10"
              : "border-[#333] bg-[#2a2a3e]"
          }`}
          style={{
            borderColor: isOver ? undefined : tier.color + "40",
            minHeight: "80px",
          }}
        >
          {tier.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              showDebugOverlay={showDebugOverlay}
            />
          ))}
          {tier.items.length === 0 && (
            <span className="flex w-full items-center justify-center text-xs text-[#555]">
              ここにドラッグ＆ドロップ
            </span>
          )}
        </div>
      </SortableContext>

      {!isViewMode && (
        <button
          type="button"
          onClick={() => onDeleteTier(tier.id)}
          className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center self-center rounded-full border border-[#e94560] text-xs text-[#e94560] hover:bg-[#e94560] hover:text-white"
          title="このTierを削除"
        >
          ×
        </button>
      )}
    </div>
  );
}
