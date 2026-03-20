import { render, screen, waitFor } from "@testing-library/react";
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

type AssignmentRow = {
  assignment: string[][];
  score_json: {
    overall: number;
    genderBalance: number;
    originMix: number;
    needsBalance: number;
    locationBalance: number;
    chemistry: number;
  } | null;
  updated_at: string;
};

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn()
}));

const store = vi.hoisted(() => ({
  constraints: null as ConstraintRow | null,
  pupils: [] as PupilRow[],
  chemistry: [] as ChemistryRow[],
  assignment: null as AssignmentRow | null,
  optimizerRun: null as { result_json: { classes: Array<{ classIndex: number; pupilIds: string[] }>; score: AssignmentRow["score_json"] } } | null,
  deleteAssignmentMock: vi.fn(async () => ({ error: null }))
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
          select: vi.fn((columns: string) => {
            if (columns === "created_at") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({
                        data: store.pupils.length > 0 ? { created_at: store.pupils[0].created_at ?? null } : null,
                        error: null
                      }))
                    }))
                  }))
                }))
              };
            }

            return {
              eq: vi.fn(async () => ({
                data: store.pupils,
                error: null
              }))
            };
          })
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
            eq: store.deleteAssignmentMock
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
    error: toastErrorMock,
    success: toastSuccessMock
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
      zone: "Zone A",
      created_at: "2026-03-20T08:00:00.000Z"
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
      ],
      score: {
        overall: 0.5,
        genderBalance: 0.5,
        originMix: 0.5,
        needsBalance: 0.5,
        locationBalance: 0.5,
        chemistry: 1
      }
    }
  };
  store.deleteAssignmentMock = vi.fn(async () => ({ error: null }));

  clearEditorDraft();
  window.sessionStorage.clear();
});

it("prefers the newer session draft over the saved database assignment", async () => {
  store.assignment = {
    assignment: [["pupil-2"], ["pupil-1"]],
    score_json: {
      overall: 0.1,
      genderBalance: 0.1,
      originMix: 0.1,
      needsBalance: 0.1,
      locationBalance: 0.1,
      chemistry: 0.1
    },
    updated_at: "2026-03-20T10:00:00.000Z"
  };

  useEditorStore
    .getState()
    .initialize("project-1", [["pupil-1"], ["pupil-2"]], {
      lastSaved: "2026-03-20T09:00:00.000Z",
      timestamp: Date.parse("2026-03-20T12:00:00.000Z")
    });

  renderEditor();

  await waitFor(() => {
    expect(useEditorStore.getState().assignment).toEqual([["pupil-1"], ["pupil-2"]]);
  });

  expect(screen.getByText(/^Class 1$/)).toBeInTheDocument();
  expect(screen.getByText(/^Class 2$/)).toBeInTheDocument();
  expect(window.sessionStorage.getItem("roster-draft-storage")).toContain('"assignment":[["pupil-1"],["pupil-2"]]');
  expect(useEditorStore.getState().assignment).toEqual([["pupil-1"], ["pupil-2"]]);
});

it("resets back to the optimizer result and removes the saved assignment row", async () => {
  store.assignment = {
    assignment: [["pupil-2"], ["pupil-1"]],
    score_json: {
      overall: 0.1,
      genderBalance: 0.1,
      originMix: 0.1,
      needsBalance: 0.1,
      locationBalance: 0.1,
      chemistry: 0.1
    },
    updated_at: "2026-03-20T11:00:00.000Z"
  };

  renderEditor();

  await waitFor(() => {
    expect(useEditorStore.getState().assignment).toEqual([["pupil-2"], ["pupil-1"]]);
  });

  await userEvent.click(screen.getByRole("button", { name: "Reset to Optimizer Result" }));

  await waitFor(() => {
    expect(store.deleteAssignmentMock).toHaveBeenCalledWith("project_id", "project-1");
  });

  expect(useEditorStore.getState().assignment).toEqual([["pupil-1"], ["pupil-2"]]);
  expect(toastSuccessMock).toHaveBeenCalledWith("Restored optimizer assignment.");
});
