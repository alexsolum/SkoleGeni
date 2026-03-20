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
  window.sessionStorage.clear();
});

it("replaces default values with saved database constraints after load", async () => {
  maybeSingleMock.mockResolvedValue({
    data: {
      min_class_size: 23,
      max_class_size: 29,
      gender_priority: "strict",
      origin_priority: "flexible",
      location_priority: "not_considered",
      needs_priority: "strict"
    },
    error: null
  });

  renderConfiguration();

  expect(screen.getByText("Loading saved setup...")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  expect(screen.getByText("Min: 23")).toBeInTheDocument();
  expect(screen.getByText("Max: 29")).toBeInTheDocument();
  expect(screen.getByLabelText("Strict (exactly equal)")).toBeChecked();
  expect(screen.getByLabelText("Flexible")).toBeChecked();
  expect(screen.getByLabelText("Not considered")).toBeChecked();
  expect(screen.getByLabelText("Strict")).toBeChecked();
});

it("shows a blocking retry state and prevents navigation when loading saved setup fails", async () => {
  maybeSingleMock.mockResolvedValue({
    data: null,
    error: { message: "network down" }
  });

  renderConfiguration();

  expect(screen.getByText("Loading saved setup...")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Retry loading saved setup" })).toBeInTheDocument();
  });

  expect(screen.queryByRole("button", { name: "Next: Pupil Data →" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Retry loading saved setup" }));

  await waitFor(() => {
    expect(maybeSingleMock).toHaveBeenCalledTimes(2);
  });

  expect(screen.getByTestId("location-display")).toHaveTextContent("/configure/project-1");
});
