import type { TierListState, Item, SharedTierData } from "@/types/tier";
import { DEFAULT_STATE, POOL_ID, MAX_TIERS, MAX_ITEMS } from "./constants";
import { nanoid } from "nanoid";

export type TierListAction =
  | { type: "ADD_ITEM"; payload: { item: Item } }
  | { type: "REMOVE_ITEM"; payload: { itemId: string } }
  | {
      type: "MOVE_ITEM";
      payload: {
        itemId: string;
        toContainerId: string;
        toIndex: number;
      };
    }
  | { type: "ADD_TIER"; payload?: { name?: string; color?: string } }
  | { type: "REMOVE_TIER"; payload: { tierId: string } }
  | { type: "RENAME_TIER"; payload: { tierId: string; name: string } }
  | { type: "CHANGE_TIER_COLOR"; payload: { tierId: string; color: string } }
  | { type: "SET_TITLE"; payload: { title: string } }
  | { type: "RESET" }
  | { type: "LOAD_FROM_URL"; payload: { data: SharedTierData } };

function countAllItems(state: TierListState): number {
  return (
    state.pool.length +
    state.tiers.reduce((sum, tier) => sum + tier.items.length, 0)
  );
}

function removeItemFromAll(
  state: TierListState,
  itemId: string,
): { state: TierListState; item: Item | null } {
  // プールから探す
  const poolIndex = state.pool.findIndex((i) => i.id === itemId);
  if (poolIndex !== -1) {
    const item = state.pool[poolIndex];
    return {
      state: {
        ...state,
        pool: state.pool.filter((i) => i.id !== itemId),
      },
      item,
    };
  }

  // Tierから探す
  for (const tier of state.tiers) {
    const itemIndex = tier.items.findIndex((i) => i.id === itemId);
    if (itemIndex !== -1) {
      const item = tier.items[itemIndex];
      return {
        state: {
          ...state,
          tiers: state.tiers.map((t) =>
            t.id === tier.id
              ? { ...t, items: t.items.filter((i) => i.id !== itemId) }
              : t,
          ),
        },
        item,
      };
    }
  }

  return { state, item: null };
}

function insertItem(
  state: TierListState,
  containerId: string,
  item: Item,
  index: number,
): TierListState {
  if (containerId === POOL_ID) {
    const newPool = [...state.pool];
    newPool.splice(index, 0, item);
    return { ...state, pool: newPool };
  }

  return {
    ...state,
    tiers: state.tiers.map((t) => {
      if (t.id !== containerId) return t;
      const newItems = [...t.items];
      newItems.splice(index, 0, item);
      return { ...t, items: newItems };
    }),
  };
}

export function tierListReducer(
  state: TierListState,
  action: TierListAction,
): TierListState {
  switch (action.type) {
    case "ADD_ITEM": {
      if (countAllItems(state) >= MAX_ITEMS) return state;
      return {
        ...state,
        pool: [...state.pool, action.payload.item],
      };
    }

    case "REMOVE_ITEM": {
      const { state: newState } = removeItemFromAll(
        state,
        action.payload.itemId,
      );
      return newState;
    }

    case "MOVE_ITEM": {
      const { itemId, toContainerId, toIndex } = action.payload;
      const { state: withoutItem, item } = removeItemFromAll(state, itemId);
      if (!item) return state;
      return insertItem(withoutItem, toContainerId, item, toIndex);
    }

    case "ADD_TIER": {
      if (state.tiers.length >= MAX_TIERS) return state;
      const newTier = {
        id: `tier-${nanoid(6)}`,
        name:
          action.payload?.name ?? String.fromCharCode(65 + state.tiers.length),
        color: action.payload?.color ?? "#868E96",
        items: [],
      };
      return { ...state, tiers: [...state.tiers, newTier] };
    }

    case "REMOVE_TIER": {
      const tier = state.tiers.find((t) => t.id === action.payload.tierId);
      if (!tier) return state;
      return {
        ...state,
        tiers: state.tiers.filter((t) => t.id !== action.payload.tierId),
        pool: [...state.pool, ...tier.items],
      };
    }

    case "RENAME_TIER": {
      return {
        ...state,
        tiers: state.tiers.map((t) =>
          t.id === action.payload.tierId
            ? { ...t, name: action.payload.name }
            : t,
        ),
      };
    }

    case "CHANGE_TIER_COLOR": {
      return {
        ...state,
        tiers: state.tiers.map((t) =>
          t.id === action.payload.tierId
            ? { ...t, color: action.payload.color }
            : t,
        ),
      };
    }

    case "SET_TITLE": {
      return { ...state, title: action.payload.title };
    }

    case "RESET": {
      return {
        ...DEFAULT_STATE,
        tiers: DEFAULT_STATE.tiers.map((t) => ({ ...t, items: [] })),
        pool: [],
      };
    }

    case "LOAD_FROM_URL": {
      const { data } = action.payload;
      return {
        title: data.title,
        tiers: data.tiers.map((t) => ({
          id: t.id || `tier-${nanoid(6)}`,
          name: t.name,
          color: t.color,
          items: t.items.map((i) => ({
            id: i.id || nanoid(),
            url: i.url,
            ...(i.label ? { label: i.label } : {}),
            source: "url" as const,
          })),
        })),
        pool: data.pool.map((i) => ({
          id: i.id || nanoid(),
          url: i.url,
          ...(i.label ? { label: i.label } : {}),
          source: "url" as const,
        })),
      };
    }

    default:
      return state;
  }
}
