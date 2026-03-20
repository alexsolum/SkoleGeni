import { describe, expect, it } from "vitest";

import type { Chemistry, OptimizationConstraints, Pupil } from "./api";
import { validateRoster } from "./rosterValidation";

const baseConstraints: OptimizationConstraints = {
  minClassSize: 2,
  maxClassSize: 3,
  genderPriority: "flexible",
  originPriority: "best_effort",
  locationPriority: "flexible",
  needsPriority: "flexible"
};

const pupils: Pupil[] = [
  {
    id: "p1",
    name: "Ada",
    gender: "Female",
    originSchool: "North",
    needs: "Reading",
    zone: "Zone A"
  },
  {
    id: "p2",
    name: "Bea",
    gender: "Female",
    originSchool: "North",
    needs: "Reading",
    zone: "Zone A"
  },
  {
    id: "p3",
    name: "Carl",
    gender: "Male",
    originSchool: "South",
    needs: "Math",
    zone: "Zone B"
  },
  {
    id: "p4",
    name: "Dina",
    gender: "Male",
    originSchool: "South",
    needs: "Math",
    zone: "Zone B"
  }
];

const chemistry: Chemistry = {
  positive: [["p1", "p3"]],
  negative: [["p1", "p2"], ["p4", "p3"]]
};

describe("validateRoster", () => {
  it("identifies negative chemistry conflicts within the same class", () => {
    const result = validateRoster({
      assignment: [
        ["p1", "p2"],
        ["p3", "p4"]
      ],
      pupils,
      chemistry,
      constraints: baseConstraints
    });

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "hard",
          code: "negative_chemistry",
          pupilId: "p1",
          classIndex: 0
        }),
        expect.objectContaining({
          kind: "hard",
          code: "negative_chemistry",
          pupilId: "p2",
          classIndex: 0
        })
      ])
    );
  });

  it("identifies class size violations", () => {
    const result = validateRoster({
      assignment: [["p1"], ["p2", "p3", "p4"]],
      pupils,
      chemistry: { positive: [], negative: [] },
      constraints: baseConstraints
    });

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "hard",
          code: "class_size_min",
          classIndex: 0
        })
      ])
    );
  });

  it("calculates detailed scores that match the Python scoring model", () => {
    const result = validateRoster({
      assignment: [
        ["p1", "p3"],
        ["p2", "p4"]
      ],
      pupils,
      chemistry,
      constraints: baseConstraints
    });

    expect(result.scores).toEqual({
      overall: 1,
      genderBalance: 1,
      originMix: 1,
      needsBalance: 1,
      locationBalance: 1,
      chemistry: 1
    });
  });

  it("stays within one percent of the Python integer math for imbalanced assignments", () => {
    const result = validateRoster({
      assignment: [
        ["p1", "p2"],
        ["p3", "p4"]
      ],
      pupils,
      chemistry,
      constraints: baseConstraints
    });

    expect(result.scores.overall).toBeCloseTo(0.4, 2);
    expect(result.scores.genderBalance).toBeCloseTo(0.5, 2);
    expect(result.scores.originMix).toBeCloseTo(0.5, 2);
    expect(result.scores.needsBalance).toBeCloseTo(0.5, 2);
    expect(result.scores.locationBalance).toBeCloseTo(0.5, 2);
    expect(result.scores.chemistry).toBeCloseTo(0, 2);
  });
});
