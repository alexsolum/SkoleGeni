import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Configuration from "../Configuration";

const { maybeSingleMock, upsertMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  upsertMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn()
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== "project_constraints") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleMock
          }))
        })),
        upsert: upsertMock
      };
    })
  }
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock
  }
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderConfiguration() {
  return render(
    <MemoryRouter initialEntries={["/configure/project-1"]}>
      <Routes>
        <Route
          path="/configure/:projectId"
          element={
            <>
              <Configuration />
              <LocationDisplay />
            </>
          }
        />
        <Route path="/pupils/:projectId" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  maybeSingleMock.mockReset();
  upsertMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  maybeSingleMock.mockResolvedValue({ data: null, error: null });
  window.sessionStorage.clear();
});

it("blocks save when cached constraints are invalid and surfaces the first validation error", async () => {
  window.sessionStorage.setItem(
    "skolegeni:config:project-1",
    JSON.stringify({
      minClassSize: 0,
      maxClassSize: 0,
      genderPriority: "flexible",
      originPriority: "best_effort",
      locationPriority: "ignore",
      needsPriority: "flexible"
    })
  );

  renderConfiguration();

  await waitFor(() => {
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByRole("button", { name: "Next: Pupil Data →" }));

  expect(screen.getByText("Unsaved validation errors")).toBeInTheDocument();
  expect(toastErrorMock).toHaveBeenCalledWith("Sizes must be positive.");
  expect(upsertMock).not.toHaveBeenCalled();
});

it("saves valid constraints, syncs the session cache, and navigates to pupil entry", async () => {
  upsertMock.mockResolvedValue({ error: null });

  renderConfiguration();

  await waitFor(() => {
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByLabelText("Strict (exactly equal)"));
  await userEvent.click(screen.getByRole("button", { name: "Next: Pupil Data →" }));

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/pupils/project-1");
  });

  expect(upsertMock).toHaveBeenCalledWith(
    expect.objectContaining({
      project_id: "project-1"
    })
  );
  expect(JSON.parse(window.sessionStorage.getItem("skolegeni:config:project-1") ?? "{}")).toEqual(
    expect.objectContaining({
      genderPriority: "strict"
    })
  );
});
