import { render, screen } from "@testing-library/react";
import type { Chemistry, Pupil } from "../lib/api";
import { ClassCard, getChemistryStatusByPupil, mapClassPupils } from "./ClassCard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ data }: { data: unknown }) => <div data-testid="pie-data">{JSON.stringify(data)}</div>,
  Cell: () => null,
  Tooltip: () => null,
  BarChart: ({ data, children }: { data: unknown; children: React.ReactNode }) => (
    <div>
      <div data-testid="bar-data">{JSON.stringify(data)}</div>
      {children}
    </div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null
}));

const pupils = new Map<string, Pupil>([
  [
    "p1",
    {
      id: "p1",
      name: "Ada Lovelace",
      gender: "Female",
      originSchool: "North",
      needs: "None",
      zone: "East"
    }
  ],
  [
    "p2",
    {
      id: "p2",
      name: "Alan Turing",
      gender: "Male",
      originSchool: "North",
      needs: "Support",
      zone: "West"
    }
  ],
  [
    "p3",
    {
      id: "p3",
      name: "Grace Hopper",
      gender: "Female",
      originSchool: "South",
      needs: "None",
      zone: "East"
    }
  ]
]);

const chemistry: Chemistry = {
  positive: [["p1", "p2"]],
  negative: [["p2", "p3"]]
};

describe("ClassCard", () => {
  it("renders pupil names and chart data from mapped pupils", () => {
    render(
      <ClassCard
        classIndex={0}
        pupilIds={["p1", "p2", "p3"]}
        pupilsById={pupils}
        classes={[["p1", "p2", "p3"]]}
        chemistryLinks={chemistry}
      />
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByTestId("pie-data")).toHaveTextContent(
      JSON.stringify([
        { name: "Female", value: 2 },
        { name: "Male", value: 1 }
      ])
    );
    expect(screen.getByTestId("bar-data")).toHaveTextContent(
      JSON.stringify([
        { name: "North", value: 2 },
        { name: "South", value: 1 }
      ])
    );
  });

  it("maps missing pupils to safe fallback names", () => {
    expect(mapClassPupils(["missing-id"], pupils)).toEqual([
      expect.objectContaining({
        id: "missing-id",
        missing: true,
        name: "Unknown pupil (missing-)"
      })
    ]);
  });

  it("treats positive chemistry as satisfied for both linked pupils in the same class", () => {
    const statusByPupil = getChemistryStatusByPupil({
      classes: [["p1", "p2", "p3"]],
      chemistry
    });

    expect(statusByPupil.get("p1")).toEqual(
      expect.objectContaining({
        positiveSatisfied: true,
        positiveTargets: ["p2"]
      })
    );
    expect(statusByPupil.get("p2")).toEqual(
      expect.objectContaining({
        positiveSatisfied: true,
        positiveTargets: ["p1"],
        negativeViolation: true,
        negativeTargets: ["p3"]
      })
    );
  });

  it("handles empty classes without crashing", () => {
    render(
      <ClassCard classIndex={1} pupilIds={[]} pupilsById={pupils} classes={[[]]} chemistryLinks={{ positive: [], negative: [] }} />
    );

    expect(screen.getAllByText("No pupil data")).toHaveLength(2);
    expect(screen.getByText("No pupils assigned")).toBeInTheDocument();
  });
});
