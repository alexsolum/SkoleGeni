import type { StoreApi } from "zustand";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { TemporalState } from "zundo";
import { temporal } from "zundo";

const EDITOR_STORAGE_NAME = "roster-draft-storage";

type EditorStoreState = {
  assignment: string[][];
  projectId: string | null;
  lastSaved: string | null;
  timestamp: number;
};

type EditorStoreActions = {
  setAssignment: (next: string[][]) => void;
  initialize: (projectId: string, initial: string[][], options?: { lastSaved?: string | null; timestamp?: number }) => void;
  setLastSaved: (value: string | null) => void;
  reset: () => void;
};

export type EditorStore = EditorStoreState & EditorStoreActions;

type TemporalControls = StoreApi<{
  clear: () => void;
}>;

type EditorTemporalState = TemporalState<Pick<EditorStoreState, "assignment">>;

const initialState: EditorStoreState = {
  assignment: [],
  projectId: null,
  lastSaved: null,
  timestamp: 0
};

function cloneAssignment(next: string[][]) {
  return next.map((group) => [...group]);
}

function nowTimestamp() {
  return Date.now();
}

function clearTemporalHistory(store: unknown) {
  const temporalStore = (store as { temporal?: TemporalControls }).temporal;
  temporalStore?.getState().clear();
}

export const useEditorStore = create<EditorStore>()(
  persist(
    temporal(
      (set, _get, store) => ({
        ...initialState,
        setAssignment: (next) => {
          set({
            assignment: cloneAssignment(next),
            timestamp: nowTimestamp()
          });
        },
        initialize: (projectId, initial, options) => {
          set({
            assignment: cloneAssignment(initial),
            projectId,
            lastSaved: options?.lastSaved ?? null,
            timestamp: options?.timestamp ?? nowTimestamp()
          });
          clearTemporalHistory(store);
        },
        setLastSaved: (value) => {
          set({ lastSaved: value });
        },
        reset: () => {
          set({ ...initialState });
          clearTemporalHistory(store);
        }
      }),
      {
        limit: 50,
        partialize: (state) => ({ assignment: state.assignment })
      }
    ),
    {
      name: EDITOR_STORAGE_NAME,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        assignment: state.assignment,
        projectId: state.projectId,
        lastSaved: state.lastSaved,
        timestamp: state.timestamp
      })
    }
  )
);

export function useEditorTemporalStore<T>(
  selector: (state: EditorTemporalState) => T,
  equality?: (a: T, b: T) => boolean
) {
  return useStoreWithEqualityFn(useEditorStore.temporal, selector, equality);
}

export function readEditorDraft(projectId: string) {
  const state = useEditorStore.getState();
  if (state.projectId !== projectId || state.assignment.length === 0) {
    return null;
  }

  return {
    assignment: cloneAssignment(state.assignment),
    lastSaved: state.lastSaved,
    timestamp: state.timestamp
  };
}

export function clearEditorDraft() {
  useEditorStore.getState().reset();
  void useEditorStore.persist.clearStorage();
}

export { EDITOR_STORAGE_NAME };
