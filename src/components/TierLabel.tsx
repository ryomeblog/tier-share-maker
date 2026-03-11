"use client";

import { useState, useRef, useEffect } from "react";
import { MAX_TIER_NAME_LENGTH, TIER_COLOR_PRESETS } from "@/lib/constants";

interface TierLabelProps {
  name: string;
  color: string;
  onRename: (name: string) => void;
  onChangeColor: (color: string) => void;
  showDebugOverlay?: boolean;
}

export function TierLabel({
  name,
  color,
  onRename,
  onChangeColor,
  showDebugOverlay,
}: TierLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit() {
    const trimmed = editValue.trim();
    if (trimmed) {
      onRename(trimmed.slice(0, MAX_TIER_NAME_LENGTH));
    }
    setIsEditing(false);
  }

  return (
    <div
      className="relative flex w-16 shrink-0 flex-col items-center justify-center self-stretch md:w-20"
      style={{ backgroundColor: color }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") setIsEditing(false);
          }}
          maxLength={MAX_TIER_NAME_LENGTH}
          className="w-14 rounded bg-white px-1 text-center text-sm font-bold text-[#333] outline-none md:w-16"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditValue(name);
            setIsEditing(true);
          }}
          className="cursor-text text-lg font-bold text-white md:text-2xl"
          title="クリックで名前を変更"
        >
          {name}
        </button>
      )}

      {showDebugOverlay && (
        <button
          type="button"
          onClick={() => setShowColorPicker((v) => !v)}
          className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-white/30 text-[8px] leading-4"
          title="背景色を変更"
        >
          🎨
        </button>
      )}

      {showDebugOverlay && showColorPicker && (
        <div
          ref={colorPickerRef}
          className="absolute left-full top-0 z-50 ml-2 rounded-lg bg-[#222] p-3 shadow-xl"
        >
          <p className="mb-2 text-xs text-[#aaa]">プリセット</p>
          <div className="flex gap-1.5">
            {TIER_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChangeColor(c);
                  setShowColorPicker(false);
                }}
                className={`h-6 w-6 rounded-full border-2 ${
                  c === color ? "border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="mb-1 mt-3 text-xs text-[#aaa]">カスタム</p>
          <input
            type="color"
            value={color}
            onChange={(e) => onChangeColor(e.target.value)}
            className="h-8 w-full cursor-pointer rounded border-none"
          />
        </div>
      )}
    </div>
  );
}
