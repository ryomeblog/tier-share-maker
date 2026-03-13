"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@/types/tier";

interface ItemCardProps {
  item: Item;
  onRemove: (itemId: string) => void;
  isDragOverlay?: boolean;
  showDebugOverlay?: boolean;
}

export function ItemCard({
  item,
  onRemove,
  isDragOverlay,
  showDebugOverlay,
}: ItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isLocal = item.source === "local";
  const showLocalIndicator = isLocal && showDebugOverlay;

  if (isDragOverlay) {
    return (
      <div className="relative h-16 w-16 rounded border-2 border-blue-500 bg-[#333] shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.label ?? ""}
          className="h-full w-full rounded object-cover"
        />
        {item.label && (
          <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 text-center text-[10px] text-white">
            {item.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: "none" }}
      {...attributes}
      {...listeners}
      className={`group relative h-16 w-16 shrink-0 cursor-grab rounded border bg-[#333] active:cursor-grabbing ${
        showLocalIndicator ? "border-[#FFA94D]" : "border-[#555]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.label ?? ""}
        className="h-full w-full rounded object-cover"
        draggable={false}
      />
      {item.label && (
        <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 text-center text-[10px] text-white">
          {item.label}
        </span>
      )}
      {showLocalIndicator && (
        <span className="absolute -right-1 -top-1 rounded bg-[#FFA94D] px-1 text-[8px] text-[#333]">
          🔒
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-[#e94560] text-[10px] text-white group-hover:flex"
      >
        ×
      </button>
    </div>
  );
}
