import { MemoryRouter, Route, Routes } from "react-router-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PupilData from "../PupilData";

const {
  constraintsMaybeSingleMock,
  pupilsOrderMock,
  chemistryEqMock,
  optimizationInsertMock,
  saveProjectRosterStateMock,
  optimizeProjectMock,
  toastErrorMock,
  toastSuccessMock
} = vi.hoisted(() => ({
  constraintsMaybeSingleMock: vi.fn(),
  pupilsOrderMock: vi.fn(),
  chemistryEqMock: vi.fn(),
  optimizationInsertMock: vi.fn(),
  saveProjectRosterStateMock: vi.fn(),
  optimizeProjectMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn()
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "project_constraints") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: constraintsMaybeSingleMock
            }))
          }))
        };
      }

      if (table === "pupils") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: pupilsOrderMock
            }))
          }))
        };
      }

      if (table === "chemistry_links") {
        return {
          select: vi.fn(() => ({
            eq: chemistryEqMock
          }))
        };
      }

      if (table === "optimization_runs") {
        return {
          insert: optimizationInsertMock
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    })
  }
}));

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api")>("../../lib/api");

  return {
    ...actual,
    saveProjectRosterState: saveProjectRosterStateMock,
    optimizeProject: optimizeProjectMock
  };
});

vi.mock("react-hot-toast", () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock
  }
}));

function renderPupilData() {
  return render(
    <MemoryRouter initialEntries={["/pupils/project-1"]}>
      <Routes>
        <Route path="/pupils/:projectId" element={<PupilData />} />
      </Routes>
    </MemoryRouter>
  );
}

async function waitForInitialLoad() {
  await waitFor(() => {
    expect(screen.getByDisplayValue("Jamie")).toBeInTheDocument();
  });
}

beforeEach(() => {
  vi.useFakeTimers();

  constraintsMaybeSingleMock.mockReset();
  pupilsOrderMock.mockReset();
  chemistryEqMock.mockReset();
  optimizationInsertMock.mockReset();
  saveProjectRosterStateMock.mockReset();
  optimizeProjectMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();

  constraintsMaybeSingleMock.mockResolvedValue({ data: null, error: null });
  pupilsOrderMock.mockResolvedValue({
    data: [
      {
        id: "pupil-1",
        name: "Jamie",
        gender: "Male",
        origin_school: "North",
        needs: "Reading",
        zone: "A",
        project_id: "project-1"
      }
    ],
    error: null
  });
  chemistryEqMock.mockResolvedValue({ data: [], error: null });
  optimizationInsertMock.mockResolvedValue({ error: null });
  saveProjectRosterStateMock.mockResolvedValue(undefined);
  optimizeProjectMock.mockResolvedValue({
    classes: [],
    score: { overall: 1, genderBalance: 1, originMix: 1, needsBalance: 1, locationBalance: 1, chemistry: 1 }
  });

  window.sessionStorage.clear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

it("debounces roster saves for 2000 ms and disables the optimizer while a save is queued", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderPupilData();

  await waitForInitialLoad();

  const nameInput = screen.getByDisplayValue("Jamie");
  await user.type(nameInput, " Updated");

  expect(saveProjectRosterStateMock).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Run Optimizer" })).toBeDisabled();

  await act(async () => {
    vi.advanceTimersByTime(1999);
  });
  expect(saveProjectRosterStateMock).not.toHaveBeenCalled();

  await act(async () => {
    vi.advanceTimersByTime(1);
  });

  await waitFor(() => {
    expect(saveProjectRosterStateMock).toHaveBeenCalledTimes(1);
  });
});

it("shows a failed save state with retry while keeping local edits on screen", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  saveProjectRosterStateMock.mockRejectedValueOnce(new Error("network down"));

  renderPupilData();
  await waitForInitialLoad();

  const nameInput = screen.getByDisplayValue("Jamie");
  await user.clear(nameInput);
  await user.type(nameInput, "Jamie Retry");

  await act(async () => {
    vi.advanceTimersByTime(2000);
  });

  expect(await screen.findByText("Save failed")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry save" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("Jamie Retry")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run Optimizer" })).toBeDisabled();

  saveProjectRosterStateMock.mockResolvedValueOnce(undefined);
  await user.click(screen.getByRole("button", { name: "Retry save" }));

  await waitFor(() => {
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });
});

it("stores blocked validation edits in session draft storage and restores them after remount", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const firstRender = renderPupilData();

  await waitForInitialLoad();

  await user.click(screen.getByRole("button", { name: "Add Row" }));
  const nameInputs = screen.getAllByPlaceholderText("Name");
  await user.type(nameInputs[1], "Draft Pupil");
  await user.tab();

  await waitFor(() => {
    expect(screen.getByText("Unsaved validation errors")).toBeInTheDocument();
  });

  expect(window.sessionStorage.getItem("skolegeni:pupil-draft:project-1")).toContain("Draft Pupil");

  firstRender.unmount();
  renderPupilData();

  await waitFor(() => {
    expect(screen.getByDisplayValue("Draft Pupil")).toBeInTheDocument();
  });
});

it("shows the shared saved banner after a successful autosave without blocking continued edits", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderPupilData();

  await waitForInitialLoad();

  const nameInput = screen.getByDisplayValue("Jamie");
  await user.type(nameInput, " Saved");

  await act(async () => {
    vi.advanceTimersByTime(2000);
  });

  await waitFor(() => {
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  expect(screen.getByRole("button", { name: "Edit Constraints" })).not.toBeDisabled();
});

it("keeps the optimizer disabled for blocked, queued, saving, and failed save states", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderPupilData();

  await waitForInitialLoad();

  const runOptimizerButton = screen.getByRole("button", { name: "Run Optimizer" });

  await user.click(screen.getByRole("button", { name: "Add Row" }));
  expect(runOptimizerButton).toBeDisabled();

  const nameInputs = screen.getAllByPlaceholderText("Name");
  await user.type(nameInputs[1], "Queued Save");
  await user.clear(nameInputs[0]);
  await user.type(nameInputs[0], "Jamie Queue");

  expect(runOptimizerButton).toBeDisabled();
});
