import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import Welcome from "../Welcome";
import Configuration from "../Configuration";
import PupilData from "../PupilData";

type ConstraintRow = {
  project_id: string;
  min_class_size: number;
  max_class_size: number;
  gender_priority: "strict" | "flexible" | "ignore";
  origin_priority: "strict" | "flexible" | "best_effort" | "ignore";
  location_priority: "strict" | "flexible" | "ignore" | "not_considered";
  needs_priority: "strict" | "flexible";
};

type ProjectRow = {
  id: string;
  title: string;
  updated_at: string | null;
};

type PupilRow = {
  id: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  origin_school: string;
  needs: string;
  zone: string;
  project_id: string;
};

type ChemistryLinkRow = {
  from_pupil_id: string;
  to_pupil_id: string;
  relationship: "positive" | "negative";
  project_id: string;
};

const {
  getSessionMock,
  onAuthStateChangeMock,
  signOutMock,
  signInWithOtpMock,
  saveProjectRosterStateMock,
  optimizeProjectMock,
  toastErrorMock,
  toastSuccessMock
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  saveProjectRosterStateMock: vi.fn(),
  optimizeProjectMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn()
}));

const store = vi.hoisted(() => ({
  projects: [] as ProjectRow[],
  constraintsByProjectId: new Map<string, ConstraintRow>(),
  pupilsByProjectId: new Map<string, PupilRow[]>(),
  chemistryByProjectId: new Map<string, ChemistryLinkRow[]>(),
  nextProjectConstraintsError: null as { message: string } | null
}));

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api")>("../../lib/api");

  return {
    ...actual,
    saveProjectRosterState: saveProjectRosterStateMock,
    optimizeProject: optimizeProjectMock
  };
});

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
      signInWithOtp: signInWithOtpMock
    },
    from: vi.fn((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: [...store.projects],
                error: null
              }))
            }))
          })),
          insert: vi.fn((payload: { title: string }) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                const project = {
                  id: "project-1",
                  title: payload.title,
                  updated_at: "2026-03-20T08:00:00.000Z"
                };
                store.projects = [project, ...store.projects.filter((row) => row.id !== project.id)];
                return {
                  data: { id: project.id, title: project.title },
                  error: null
                };
              })
            }))
          }))
        };
      }

      if (table === "project_constraints") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                if (store.nextProjectConstraintsError) {
                  const error = store.nextProjectConstraintsError;
                  store.nextProjectConstraintsError = null;
                  return { data: null, error };
                }

                return {
                  data: store.constraintsByProjectId.get("project-1") ?? null,
                  error: null
                };
              })
            }))
          })),
          upsert: vi.fn(async (payload: ConstraintRow) => {
            store.constraintsByProjectId.set(payload.project_id, payload);
            return { error: null };
          })
        };
      }

      if (table === "pupils") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: [...(store.pupilsByProjectId.get("project-1") ?? [])],
                error: null
              }))
            }))
          }))
        };
      }

      if (table === "chemistry_links") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: [...(store.chemistryByProjectId.get("project-1") ?? [])],
              error: null
            }))
          }))
        };
      }

      if (table === "optimization_runs") {
        return {
          insert: vi.fn(async () => ({ error: null }))
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
  },
  Toaster: () => null
}));

function renderWorkflow(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/configure/:projectId" element={<Configuration />} />
        <Route path="/pupils/:projectId" element={<PupilData />} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillPupilRow(rowIndex: number, values: { name: string; origin: string; needs: string; zone: string }) {
  const nameInputs = screen.getAllByPlaceholderText("Name");
  const originInputs = screen.getAllByPlaceholderText("e.g. Oakridge Elem.");
  const needsInputs = screen.getAllByPlaceholderText("e.g. Reading support");
  const zoneInputs = screen.getAllByPlaceholderText("e.g. Zone A");

  fireEvent.change(nameInputs[rowIndex], { target: { value: values.name } });
  fireEvent.blur(nameInputs[rowIndex]);
  fireEvent.change(originInputs[rowIndex], { target: { value: values.origin } });
  fireEvent.blur(originInputs[rowIndex]);
  fireEvent.change(needsInputs[rowIndex], { target: { value: values.needs } });
  fireEvent.blur(needsInputs[rowIndex]);
  fireEvent.change(zoneInputs[rowIndex], { target: { value: values.zone } });
  fireEvent.blur(zoneInputs[rowIndex]);
}

async function flushAutosave() {
  await act(async () => {
    vi.advanceTimersByTime(2000);
    await Promise.resolve();
  });
}

beforeEach(() => {
  store.projects = [
    {
      id: "project-1",
      title: "Saved Roster",
      updated_at: "2026-03-20T08:00:00.000Z"
    }
  ];
  store.constraintsByProjectId = new Map();
  store.pupilsByProjectId = new Map();
  store.chemistryByProjectId = new Map();
  store.nextProjectConstraintsError = null;

  getSessionMock.mockReset();
  onAuthStateChangeMock.mockReset();
  signOutMock.mockReset();
  signInWithOtpMock.mockReset();
  saveProjectRosterStateMock.mockReset();
  optimizeProjectMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();

  getSessionMock.mockResolvedValue({
    data: {
      session: {
        access_token: "token",
        user: {
          id: "user-1",
          email: "teacher@example.com"
        }
      }
    }
  });
  onAuthStateChangeMock.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn()
      }
    }
  });
  signOutMock.mockResolvedValue({ error: null });
  signInWithOtpMock.mockResolvedValue({ error: null });
  optimizeProjectMock.mockResolvedValue({
    classes: [],
    score: {
      overall: 1,
      genderBalance: 1,
      originMix: 1,
      needsBalance: 1,
      locationBalance: 1,
      chemistry: 1
    }
  });
  saveProjectRosterStateMock.mockImplementation(async (projectId: string, pupils, chemistry) => {
    store.pupilsByProjectId.set(
      projectId,
      pupils.map((pupil) => ({
        id: pupil.id,
        name: pupil.name,
        gender: pupil.gender,
        origin_school: pupil.originSchool,
        needs: pupil.needs,
        zone: pupil.zone,
        project_id: projectId
      }))
    );
    store.chemistryByProjectId.set(
      projectId,
      chemistry.positive
        .map(([fromPupilId, toPupilId]) => ({
          from_pupil_id: fromPupilId,
          to_pupil_id: toPupilId,
          relationship: "positive" as const,
          project_id: projectId
        }))
        .concat(
          chemistry.negative.map(([fromPupilId, toPupilId]) => ({
            from_pupil_id: fromPupilId,
            to_pupil_id: toPupilId,
            relationship: "negative" as const,
            project_id: projectId
          }))
        )
    );
  });

  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

it("reopening a saved project restores the last persisted constraint values and pupil rows instead of defaults", async () => {
  const user = userEvent.setup();

  const firstRender = renderWorkflow("/");

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Create New Roster" })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "Create New Roster" }));

  await waitFor(() => {
    expect(screen.getByText("Configuration Mode")).toBeInTheDocument();
  });

  const sliders = screen.getAllByRole("slider");
  fireEvent.change(sliders[0], { target: { value: "22" } });
  fireEvent.change(sliders[1], { target: { value: "28" } });
  await user.click(screen.getByLabelText("Gender Balance: Strict (exactly equal)"));
  await user.click(screen.getByLabelText("Origin School Mix: Flexible"));
  await user.click(screen.getByLabelText("Location / Zone Constraints: Not considered"));
  await user.click(screen.getByLabelText("Academic Needs Distribution: Strict"));

  await user.click(screen.getByRole("button", { name: "Next: Pupil Data →" }));

  await waitFor(() => {
    expect(screen.getByText("Pupil Mode")).toBeInTheDocument();
  });

  vi.useFakeTimers();

  fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
  fireEvent.click(screen.getByRole("button", { name: "Add Row" }));

  await fillPupilRow(0, {
    name: "Ada Lovelace",
    origin: "North",
    needs: "Reading support",
    zone: "Zone A"
  });
  await fillPupilRow(1, {
    name: "Grace Hopper",
    origin: "West",
    needs: "Math extension",
    zone: "Zone B"
  });

  await flushAutosave();
  expect(saveProjectRosterStateMock).toHaveBeenCalled();

  vi.useRealTimers();

  firstRender.unmount();

  renderWorkflow("/");

  await waitFor(() => {
    expect(screen.getByText("New Roster")).toBeInTheDocument();
  });

  const reopenProjectButton = screen.getByText("New Roster").closest("button");
  expect(reopenProjectButton).not.toBeNull();
  await user.click(reopenProjectButton!);

  await waitFor(() => {
    expect(screen.getByText("Min: 22")).toBeInTheDocument();
  });

  expect(screen.getByText("Max: 28")).toBeInTheDocument();
  expect(screen.getByLabelText("Gender Balance: Strict (exactly equal)")).toBeChecked();
  expect(screen.getByLabelText("Origin School Mix: Flexible")).toBeChecked();
  expect(screen.getByLabelText("Location / Zone Constraints: Not considered")).toBeChecked();
  expect(screen.getByLabelText("Academic Needs Distribution: Strict")).toBeChecked();

  await user.click(screen.getByRole("button", { name: "Next: Pupil Data →" }));

  await waitFor(() => {
    expect(screen.getByDisplayValue("Ada Lovelace")).toBeInTheDocument();
  });

  expect(screen.getByDisplayValue("Grace Hopper")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Reading support")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Math extension")).toBeInTheDocument();
});

it("configuration load failure keeps the user on the blocking retry state", async () => {
  store.nextProjectConstraintsError = { message: "network down" };

  renderWorkflow("/configure/project-1");

  expect(screen.getByText("Loading saved setup...")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Retry loading saved setup" })).toBeInTheDocument();
  });

  expect(screen.queryByRole("button", { name: "Next: Pupil Data →" })).not.toBeInTheDocument();
  expect(screen.getByText("Failed to load saved setup.")).toBeInTheDocument();
});

it("autosave failure on pupil edits keeps Run Optimizer disabled until retry succeeds", async () => {
  store.pupilsByProjectId.set("project-1", [
    {
      id: "pupil-1",
      name: "Jamie",
      gender: "Male",
      origin_school: "North",
      needs: "Reading",
      zone: "A",
      project_id: "project-1"
    }
  ]);

  saveProjectRosterStateMock.mockRejectedValueOnce(new Error("simulated save failure"));

  renderWorkflow("/pupils/project-1");

  await waitFor(() => {
    expect(screen.getByDisplayValue("Jamie")).toBeInTheDocument();
  });

  vi.useFakeTimers();

  fireEvent.change(screen.getByDisplayValue("Jamie"), { target: { value: "Jamie Retry" } });
  fireEvent.blur(screen.getByDisplayValue("Jamie Retry"));

  await flushAutosave();
  expect(screen.getByText("Save failed")).toBeInTheDocument();

  expect(screen.getByRole("button", { name: "Retry save" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run Optimizer" })).toBeDisabled();

  saveProjectRosterStateMock.mockResolvedValueOnce(undefined);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await Promise.resolve();
  });
  expect(screen.getByText("All changes saved")).toBeInTheDocument();

  expect(screen.getByRole("button", { name: "Run Optimizer" })).toBeEnabled();
});
