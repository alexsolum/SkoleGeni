import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ClassEditor from "../ClassEditor";
import { clearEditorDraft } from "../../lib/editorStore";

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
  created_at?: string;
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
  optimizerRun: null as {
    result_json: {
      classes: Array<{ classIndex: number; pupilIds: string[] }>;
      score: {
        overall: number;
        genderBalance: number;
        originMix: number;
        needsBalance: number;
        locationBalance: number;
        chemistry: number;
      };
    };
  } | null
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
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { updated_at: "2026-03-20T12:00:00.000Z" },
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

beforeEach(() => {
  store.constraints = {
    min_class_size: 2,
    max_class_size: 3,
    gender_priority: "flexible",
    origin_priority: "best_effort",
    location_priority: "flexible",
    needs_priority: "flexible"
  };
  store.pupils = [
    {
      id: "p1",
      project_id: "project-1",
      name: "Ada",
      gender: "Female",
      origin_school: "North",
      needs: "Reading",
      zone: "Zone A",
      created_at: "2026-03-20T10:00:00.000Z"
    },
    {
      id: "p2",
      project_id: "project-1",
      name: "Bea",
      gender: "Female",
      origin_school: "North",
      needs: "Reading",
      zone: "Zone A"
    },
    {
      id: "p3",
      project_id: "project-1",
      name: "Carl",
      gender: "Male",
      origin_school: "South",
      needs: "Math",
      zone: "Zone B"
    },
    {
      id: "p4",
      project_id: "project-1",
      name: "Dina",
      gender: "Male",
      origin_school: "South",
      needs: "Math",
      zone: "Zone B"
    }
  ];
  store.chemistry = [{ from_pupil_id: "p1", to_pupil_id: "p2", relationship: "negative" }];
  store.assignment = {
    assignment: [
      ["p1", "p2"],
      ["p3", "p4"]
    ],
    score_json: null,
    updated_at: "2026-03-20T11:00:00.000Z"
  };
  store.optimizerRun = {
    result_json: {
      classes: [
        { classIndex: 0, pupilIds: ["p1", "p3"] },
        { classIndex: 1, pupilIds: ["p2", "p4"] }
      ],
      score: {
        overall: 1,
        genderBalance: 1,
        originMix: 1,
        needsBalance: 1,
        locationBalance: 1,
        chemistry: 1
      }
    }
  };

  clearEditorDraft();
  window.sessionStorage.clear();
});

it("lists active issues and highlights the related pupil card on hover", async () => {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={["/editor/project-1"]}>
      <Routes>
        <Route path="/editor/:projectId" element={<ClassEditor />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText("Conflicts: 2")).toBeInTheDocument();
  });

  const adaIssue = screen.getByRole("button", { name: /Ada.*Ada cannot be in the same class as Bea\./i });
  expect(document.querySelector("[data-red-card='true']")).toBeTruthy();
  expect(screen.getByText("Manual Issues")).toBeInTheDocument();
  expect(screen.getAllByText("Negative chemistry").length).toBeGreaterThan(0);
  expect(screen.getByText("Ada cannot be in the same class as Bea.")).toBeInTheDocument();

  await user.hover(adaIssue);

  await waitFor(() => {
    const highlightedCards = document.querySelectorAll("[data-highlighted='true']");
    expect(highlightedCards).toHaveLength(1);
    expect(highlightedCards[0]?.textContent).toContain("Ada");
  });
});
