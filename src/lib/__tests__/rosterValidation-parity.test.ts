import { describe, expect, it } from "vitest";

import type { Chemistry, OptimizationConstraints, Pupil, Score } from "../api";
import { validateRoster } from "../rosterValidation";

const PUPILS: Pupil[] = [
  { id: "p1", name: "Ada", gender: "Female", originSchool: "North", needs: "None", zone: "A" },
  { id: "p2", name: "Bo", gender: "Male", originSchool: "North", needs: "Support", zone: "A" },
  { id: "p3", name: "Cia", gender: "Female", originSchool: "North", needs: "None", zone: "A" },
  { id: "p4", name: "Dan", gender: "Male", originSchool: "South", needs: "Support", zone: "B" },
  { id: "p5", name: "Eli", gender: "Male", originSchool: "South", needs: "None", zone: "B" },
  { id: "p6", name: "Fay", gender: "Female", originSchool: "South", needs: "Support", zone: "B" }
];

const ASSIGNMENT = [
  ["p3", "p4", "p5"],
  ["p1", "p2", "p6"]
];

const CONSTRAINTS: OptimizationConstraints = {
  minClassSize: 3,
  maxClassSize: 3,
  genderPriority: "flexible",
  originPriority: "best_effort",
  locationPriority: "flexible",
  needsPriority: "flexible"
};

const CHEMISTRY: Chemistry = {
  positive: [
    ["p1", "p2"],
    ["p1", "p3"],
    ["p4", "p5"]
  ],
  negative: []
};

const PYTHON_REFERENCE: Score = {
  overall: 0.7333333333333334,
  genderBalance: 0.75,
  originMix: 0.75,
  needsBalance: 0.75,
  locationBalance: 0.75,
  chemistry: 0.6666666666666666
};

describe("rosterValidation JS/Python parity", () => {
  it("matches the Python fixture scores within 0.05 for each category", () => {
    const result = validateRoster({
      assignment: ASSIGNMENT,
      pupils: PUPILS,
      chemistry: CHEMISTRY,
      constraints: CONSTRAINTS
    });

    expect(result.scores.overall).toBeCloseTo(PYTHON_REFERENCE.overall, 2);
    expect(result.scores.genderBalance).toBeCloseTo(PYTHON_REFERENCE.genderBalance, 2);
    expect(result.scores.originMix).toBeCloseTo(PYTHON_REFERENCE.originMix, 2);
    expect(result.scores.needsBalance).toBeCloseTo(PYTHON_REFERENCE.needsBalance, 2);
    expect(result.scores.locationBalance).toBeCloseTo(PYTHON_REFERENCE.locationBalance, 2);
    expect(result.scores.chemistry).toBeCloseTo(PYTHON_REFERENCE.chemistry, 2);
  });

  it("keeps all scores normalized between 0 and 1", () => {
    const result = validateRoster({
      assignment: ASSIGNMENT,
      pupils: PUPILS,
      chemistry: CHEMISTRY,
      constraints: CONSTRAINTS
    });

    Object.values(result.scores).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  it("detects no hard size or chemistry violations for the Python reference assignment", () => {
    const result = validateRoster({
      assignment: ASSIGNMENT,
      pupils: PUPILS,
      chemistry: CHEMISTRY,
      constraints: CONSTRAINTS
    });

    expect(result.violations).toEqual([]);
    expect(result.hardViolationPupilIds.size).toBe(0);
  });
});
