import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  optimizerRun: null as { result_json: { classes: Array<{ classIndex: number; pupilIds: string[] }> } } | null
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

  clearEditorDraft();
  window.sessionStorage.clear();
});

it("supports undo and redo through buttons and keyboard shortcuts", async () => {
  const user = userEvent.setup();

  renderEditor();

  await waitFor(() => {
    expect(useEditorStore.getState().assignment).toEqual([["pupil-1"], ["pupil-2"]]);
  });

  const undoButton = screen.getByRole("button", { name: "Undo" });
  const redoButton = screen.getByRole("button", { name: "Redo" });

  expect(undoButton).toBeDisabled();
  expect(redoButton).toBeDisabled();

  act(() => {
    useEditorStore.getState().setAssignment([["pupil-2"], ["pupil-1"]]);
  });

  await waitFor(() => {
    expect(undoButton).toBeEnabled();
  });
  expect(redoButton).toBeDisabled();

  await user.click(undoButton);

  await waitFor(() => {
    expect(useEditorStore.getState().assignment).toEqual([["pupil-1"], ["pupil-2"]]);
  });
  expect(redoButton).toBeEnabled();

  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Z",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true
      })
    );
  });

  await waitFor(() => {
    expect(useEditorStore.getState().assignment).toEqual([["pupil-2"], ["pupil-1"]]);
  });
});
