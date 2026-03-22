import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PupilData from "../PupilData";
import { OptimizerRequestError } from "../../lib/api";

const {
  constraintsMaybeSingleMock,
  pupilsOrderMock,
  chemistryEqMock,
  optimizationInsertMock,
  optimizeProjectMock,
  toastErrorMock,
  toastSuccessMock,
  signOutMock
} = vi.hoisted(() => ({
  constraintsMaybeSingleMock: vi.fn(),
  pupilsOrderMock: vi.fn(),
  chemistryEqMock: vi.fn(),
  optimizationInsertMock: vi.fn(),
  optimizeProjectMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  signOutMock: vi.fn()
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
    }),
    auth: {
      signOut: signOutMock,
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "fake-token" } }
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}));

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api")>("../../lib/api");
  return {
    ...actual,
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

beforeEach(() => {
  constraintsMaybeSingleMock.mockReset();
  pupilsOrderMock.mockReset();
  chemistryEqMock.mockReset();
  optimizationInsertMock.mockReset();
  optimizeProjectMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  signOutMock.mockReset();

  constraintsMaybeSingleMock.mockResolvedValue({ data: null, error: null });
  pupilsOrderMock.mockResolvedValue({
    data: [
      {
        id: "p1",
        name: "Jamie",
        gender: "Male",
        origin_school: "North",
        needs: "None",
        zone: "A",
        project_id: "project-1"
      }
    ],
    error: null
  });
  chemistryEqMock.mockResolvedValue({ data: [], error: null });
  optimizationInsertMock.mockResolvedValue({ error: null });
  signOutMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

it("401 from optimizer triggers signOut and error toast", async () => {
  const user = userEvent.setup();

  optimizeProjectMock.mockRejectedValueOnce(new OptimizerRequestError("Unauthorized", 401));

  renderPupilData();

  // Wait for initial load
  await waitFor(() => {
    expect(screen.getByDisplayValue("Jamie")).toBeInTheDocument();
  });

  // Click the Run Optimizer button
  const runButton = screen.getByRole("button", { name: /run optimizer/i });
  await user.click(runButton);

  // runOptimizer has a 3-second delay before calling optimizeProject;
  // extend waitFor timeout to 8 seconds to accommodate it
  await waitFor(
    () => {
      expect(signOutMock).toHaveBeenCalled();
    },
    { timeout: 8000 }
  );

  expect(toastErrorMock).toHaveBeenCalledWith("Your session has expired. Please sign in again.");
});
