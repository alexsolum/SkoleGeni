import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PupilData from "../PupilData";
import {
  buildImportPreview,
  collectPupilIssues,
  normalizeImportedGender,
  type FailedImportSummary
} from "../../lib/pupilWorkflow";

const {
  constraintsMaybeSingleMock,
  pupilsOrderMock,
  chemistryEqMock,
  parseMock,
  toastErrorMock
} = vi.hoisted(() => ({
  constraintsMaybeSingleMock: vi.fn(),
  pupilsOrderMock: vi.fn(),
  chemistryEqMock: vi.fn(),
  parseMock: vi.fn(),
  toastErrorMock: vi.fn()
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

      throw new Error(`Unexpected table: ${table}`);
    })
  }
}));

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api")>("../../lib/api");

  return {
    ...actual,
    saveProjectRosterState: vi.fn(),
    optimizeProject: vi.fn()
  };
});

vi.mock("papaparse", () => ({
  default: {
    parse: parseMock
  }
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn()
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

function csvFile() {
  return new File(["name,origin_school,gender,needs,zone"], "pupils.csv", { type: "text/csv" });
}

beforeEach(() => {
  constraintsMaybeSingleMock.mockReset();
  pupilsOrderMock.mockReset();
  chemistryEqMock.mockReset();
  parseMock.mockReset();
  toastErrorMock.mockReset();

  constraintsMaybeSingleMock.mockResolvedValue({ data: null, error: null });
  pupilsOrderMock.mockResolvedValue({ data: [], error: null });
  chemistryEqMock.mockResolvedValue({ data: [], error: null });
});

it("opens a mapping modal when the csv is missing internal headers and imports only valid rows", async () => {
  parseMock.mockImplementation((_file: File, options: { complete: Function }) => {
    options.complete({
      data: [
        {
          student_name: "Jamie",
          origin_school: "North",
          sex: "girl",
          academic_needs: "Reading",
          location_zone: "A"
        },
        {
          student_name: "",
          origin_school: "North",
          sex: "boy",
          academic_needs: "Math",
          location_zone: "B"
        }
      ]
    });
  });

  renderPupilData();

  await waitFor(() => {
    expect(screen.getByText("Upload CSV or add row manually")).toBeInTheDocument();
  });

  await userEvent.upload(screen.getByLabelText("Import CSV"), csvFile());

  expect(await screen.findByRole("heading", { name: "Map CSV Columns" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel Import" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply Mapping" })).toBeInTheDocument();

  const nameSelect = screen.getByLabelText("name");
  await userEvent.selectOptions(nameSelect, "student_name");
  await userEvent.selectOptions(screen.getByLabelText("originSchool"), "origin_school");
  await userEvent.selectOptions(screen.getByLabelText("gender"), "sex");
  await userEvent.selectOptions(screen.getByLabelText("needs"), "academic_needs");
  await userEvent.selectOptions(screen.getByLabelText("zone"), "location_zone");
  await userEvent.click(screen.getByRole("button", { name: "Apply Mapping" }));

  expect(await screen.findByDisplayValue("Jamie")).toBeInTheDocument();
  expect(screen.getByText("Failed Imports")).toBeInTheDocument();
  expect(screen.getByText(/Row 2/i)).toBeInTheDocument();
});

it("normalizes imported genders from common freeform values", () => {
  expect(normalizeImportedGender("M")).toBe("Male");
  expect(normalizeImportedGender("male")).toBe("Male");
  expect(normalizeImportedGender("boy")).toBe("Male");
  expect(normalizeImportedGender("man")).toBe("Male");

  expect(normalizeImportedGender("F")).toBe("Female");
  expect(normalizeImportedGender("female")).toBe("Female");
  expect(normalizeImportedGender("girl")).toBe("Female");
  expect(normalizeImportedGender("woman")).toBe("Female");

  expect(normalizeImportedGender("nonbinary")).toBe("Other");
});

it("flags duplicate pupils as blocking errors until an edited row becomes unique", async () => {
  const preview = buildImportPreview(
    [
      {
        student_name: "Jamie",
        origin_school: "North",
        sex: "boy",
        academic_needs: "Reading",
        location_zone: "A"
      },
      {
        student_name: "Jamie",
        origin_school: "North",
        sex: "male",
        academic_needs: "Reading",
        location_zone: "A"
      }
    ],
    {
      name: "student_name",
      originSchool: "origin_school",
      gender: "sex",
      needs: "academic_needs",
      zone: "location_zone"
    }
  );

  const issues = collectPupilIssues(preview.validRows, { positive: [], negative: [] });
  expect(issues.errors.some((issue) => issue.message.includes("Duplicate pupil row"))).toBe(true);

  renderPupilData();

  await waitFor(() => {
    expect(screen.getByText("Upload CSV or add row manually")).toBeInTheDocument();
  });

  parseMock.mockImplementationOnce((_file: File, options: { complete: Function }) => {
    options.complete({
      data: [
        {
          name: "Jamie",
          origin_school: "North",
          gender: "boy",
          needs: "Reading",
          zone: "A"
        },
        {
          name: "Jamie",
          origin_school: "North",
          gender: "male",
          needs: "Reading",
          zone: "A"
        }
      ]
    });
  });

  await userEvent.upload(screen.getByLabelText("Import CSV"), csvFile());

  expect(await screen.findByText("Errors")).toBeInTheDocument();
  expect(screen.getByText(/Duplicate pupil row/i)).toBeInTheDocument();

  const nameInputs = screen.getAllByPlaceholderText("Name");
  await userEvent.clear(nameInputs[1]);
  await userEvent.type(nameInputs[1], "Jamie Two");
  await userEvent.tab();

  await waitFor(() => {
    expect(screen.queryByText(/Duplicate pupil row/i)).not.toBeInTheDocument();
  });
});

it("keeps validation feedback synchronized between the grid and the issues panel", async () => {
  renderPupilData();

  await waitFor(() => {
    expect(screen.getByText("Upload CSV or add row manually")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByRole("button", { name: "Add Row" }));

  const nameInput = screen.getByPlaceholderText("Name");
  await userEvent.click(nameInput);
  await userEvent.tab();

  await waitFor(() => {
    expect(nameInput.className).toMatch(/error|danger|destructive/);
  });

  const errorsSection = screen.getByText("Errors").closest("section") ?? screen.getByText("Errors").parentElement;
  expect(errorsSection).not.toBeNull();
  expect(within(errorsSection as HTMLElement).getByText(/missing student name/i)).toBeInTheDocument();

  await userEvent.type(nameInput, "Jamie");

  await waitFor(() => {
    expect(nameInput.className).not.toMatch(/error|danger|destructive/);
  });
});

it("renders failed import summaries with row numbers and reasons", () => {
  const preview = buildImportPreview(
    [
      {
        student_name: "",
        origin_school: "North",
        sex: "boy",
        academic_needs: "Reading",
        location_zone: "A"
      }
    ],
    {
      name: "student_name",
      originSchool: "origin_school",
      gender: "sex",
      needs: "academic_needs",
      zone: "location_zone"
    }
  );

  const failed = preview.failedRows as FailedImportSummary[];
  expect(failed).toEqual([
    expect.objectContaining({
      rowNumber: 2,
      reason: expect.stringMatching(/name/i)
    })
  ]);
});
