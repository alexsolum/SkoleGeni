import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ClassEditor from "../ClassEditor";
import { clearEditorDraft, useEditorStore } from "../../lib/editorStore";

type ConstraintRow = {
  min_class_size: number;
  max_class_size: number;
  gender_priority: "strict" | "flexible" | "ignore";
  origin_priority: "strict" | "flexible" | "best_effort" | "ignore";
  location_priority: "strict" | "flexible" | "ignore" | "not_considered";
  needs_priority: "strict" | "flexible";
};

type PupilRow = {
  id: string;
  project_id: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  origin_school: string;
  needs: string;
  zone: string;
};

type ChemistryRow = {
  from_pupil_id: string;
  to_pupil_id: string;
  relationship: "positive" | "negative";
};

const store = vi.hoisted(() => ({
  constraints: null as ConstraintRow | null,
  pupils: [] as PupilRow[],
  chemistry: [] as ChemistryRow[],
  assignment: null as {
    assignment: string[][];
    score_json: null;
    updated_at: string;
  } | null,
  optimizerRun: null as { result_json: { classes: Array<{ classIndex: number; pupilIds: string[] }> } } | null,
  upsertMock: vi.fn()
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false
  })
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "project_constraints") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: store.constraints,
                error: null
              }))
            }))
          }))
        };
      }

      if (table === "pupils") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: store.pupils,
              error: null
            }))
          }))
        };
      }

      if (table === "chemistry_links") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: store.chemistry,
              error: null
            }))
          }))
        };
      }

      if (table === "roster_assignments") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: store.assignment,
                error: null
              }))
            }))
          })),
          upsert: store.upsertMock,
          delete: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null }))
          }))
        };
      }

      if (table === "optimization_runs") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: store.optimizerRun,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    })
  }
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={["/editor/project-1"]}>
      <Routes>
        <Route path="/editor/:projectId" element={<ClassEditor />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  store.constraints = {
    min_class_size: 20,
    max_class_size: 25,
    gender_priority: "flexible",
    origin_priority: "best_effort",
    location_priority: "ignore",
    needs_priority: "flexible"
  };
  store.pupils = [
    {
      id: "pupil-1",
      project_id: "project-1",
      name: "Ada",
      gender: "Female",
      origin_school: "North",
      needs: "Reading",
      zone: "Zone A"
    },
    {
      id: "pupil-2",
      project_id: "project-1",
      name: "Bea",
      gender: "Female",
      origin_school: "West",
      needs: "Math",
      zone: "Zone B"
    }
  ];
  store.chemistry = [];
  store.assignment = null;
  store.optimizerRun = {
    result_json: {
      classes: [
        { classIndex: 0, pupilIds: ["pupil-1"] },
        { classIndex: 1, pupilIds: ["pupil-2"] }
      ]
    }
  };
  store.upsertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({
        data: { updated_at: "2026-03-20T12:00:00.000Z" },
        error: null
      }))
    }))
  }));

  clearEditorDraft();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

it("debounces manual edit autosaves for 2000 ms and only marks saved after the upsert completes", async () => {
  renderEditor();

  await waitFor(() => {
    expect(useEditorStore.getState().assignment).toEqual([["pupil-1"], ["pupil-2"]]);
  });

  vi.useFakeTimers();

  act(() => {
    useEditorStore.getState().setAssignment([["pupil-2"], ["pupil-1"]]);
  });

  expect(screen.getByText("Saving...")).toBeInTheDocument();
  expect(store.upsertMock).not.toHaveBeenCalled();

  await act(async () => {
    vi.advanceTimersByTime(1999);
  });
  expect(store.upsertMock).not.toHaveBeenCalled();

  await act(async () => {
    vi.advanceTimersByTime(1);
    await Promise.resolve();
  });

  expect(store.upsertMock).toHaveBeenCalledWith(
    {
      project_id: "project-1",
      assignment: [["pupil-2"], ["pupil-1"]],
      score_json: expect.objectContaining({
        overall: expect.any(Number)
      })
    },
    { onConflict: "project_id" }
  );
  expect(screen.getByText("All changes saved")).toBeInTheDocument();
});
