import type { Chemistry, OptimizationConstraints, Pupil, Score } from "./api";

export type ValidationViolationKind = "hard" | "soft";

export type ValidationViolationCode =
  | "negative_chemistry"
  | "class_size_min"
  | "class_size_max";

export type ValidationViolation = {
  kind: ValidationViolationKind;
  code: ValidationViolationCode;
  classIndex: number;
  pupilId?: string;
  pupilIds?: string[];
  rule: string;
  message: string;
};

export type ValidateRosterResult = {
  violations: ValidationViolation[];
  scores: Score;
  violationsByPupilId: Record<string, ValidationViolation[]>;
  hardViolationPupilIds: Set<string>;
};

type ValidateRosterArgs = {
  assignment: string[][];
  pupils: Pupil[];
  chemistry: Chemistry;
  constraints: OptimizationConstraints;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function scoreFromPenalty(penalty: number, scale: number) {
  if (scale <= 0) {
    return 1;
  }

  return clampScore(1 / (1 + penalty / scale));
}

function getGroupPenaltiesByClass<T extends string>({
  pupils,
  assignment,
  getGroup
}: {
  pupils: Pupil[];
  assignment: string[][];
  getGroup: (pupil: Pupil) => T;
}) {
  if (assignment.length === 0) {
    return [];
  }

  const pupilsById = new Map(pupils.map((pupil) => [pupil.id, pupil]));
  const groupValues = new Set(pupils.map((pupil) => getGroup(pupil)));
  const penalties = assignment.map(() => 0);
  const classCount = assignment.length;

  for (const groupValue of groupValues) {
    const total = pupils.filter((pupil) => getGroup(pupil) === groupValue).length;
    const ideal = total / classCount;

    assignment.forEach((groupClass, classIndex) => {
      const count = groupClass.reduce((sum, pupilId) => {
        const pupil = pupilsById.get(pupilId);
        return sum + (pupil && getGroup(pupil) === groupValue ? 1 : 0);
      }, 0);

      penalties[classIndex] += Math.abs(count - ideal);
    });
  }

  return penalties;
}

function getPositivePairs(chemistry: Chemistry, pupilsById: Map<string, Pupil>) {
  const pairs = new Set<string>();

  for (const [first, second] of chemistry.positive) {
    if (!pupilsById.has(first) || !pupilsById.has(second) || first === second) {
      continue;
    }

    pairs.add(first < second ? `${first}|${second}` : `${second}|${first}`);
  }

  return Array.from(pairs, (key) => {
    const [first, second] = key.split("|");
    return [first, second] as const;
  });
}

function getChemistryPenaltiesByClass(assignment: string[][], chemistry: Chemistry, pupilsById: Map<string, Pupil>) {
  if (assignment.length === 0) {
    return [];
  }

  const classOf = new Map<string, number>();
  assignment.forEach((groupClass, classIndex) => {
    groupClass.forEach((pupilId) => {
      classOf.set(pupilId, classIndex);
    });
  });

  const penalties = assignment.map(() => 0);

  for (const [first, second] of getPositivePairs(chemistry, pupilsById)) {
    const firstClass = classOf.get(first);
    const secondClass = classOf.get(second);

    if (firstClass === undefined || secondClass === undefined || firstClass === secondClass) {
      continue;
    }

    penalties[firstClass] += 1;
    penalties[secondClass] += 1;
  }

  return penalties;
}

function createViolationIndexes(violations: ValidationViolation[]) {
  const violationsByPupilId: Record<string, ValidationViolation[]> = {};
  const hardViolationPupilIds = new Set<string>();

  for (const violation of violations) {
    if (!violation.pupilId && !violation.pupilIds) {
      continue;
    }

    const pupilIds = violation.pupilIds ?? [violation.pupilId as string];
    for (const pupilId of pupilIds) {
      violationsByPupilId[pupilId] ??= [];
      violationsByPupilId[pupilId].push(violation);
      if (violation.kind === "hard") {
        hardViolationPupilIds.add(pupilId);
      }
    }
  }

  return { violationsByPupilId, hardViolationPupilIds };
}

export function validateRoster({
  assignment,
  pupils,
  chemistry,
  constraints
}: ValidateRosterArgs): ValidateRosterResult {
  const pupilsById = new Map(pupils.map((pupil) => [pupil.id, pupil]));
  const classOf = new Map<string, number>();
  assignment.forEach((groupClass, classIndex) => {
    groupClass.forEach((pupilId) => classOf.set(pupilId, classIndex));
  });

  const violations: ValidationViolation[] = [];

  assignment.forEach((groupClass, classIndex) => {
    if (groupClass.length < constraints.minClassSize) {
      violations.push({
        kind: "hard",
        code: "class_size_min",
        classIndex,
        pupilIds: [...groupClass],
        rule: "Minimum class size",
        message: `Class ${classIndex + 1} has ${groupClass.length} pupils, below the minimum of ${constraints.minClassSize}.`
      });
    }

    if (groupClass.length > constraints.maxClassSize) {
      violations.push({
        kind: "hard",
        code: "class_size_max",
        classIndex,
        pupilIds: [...groupClass],
        rule: "Maximum class size",
        message: `Class ${classIndex + 1} has ${groupClass.length} pupils, above the maximum of ${constraints.maxClassSize}.`
      });
    }
  });

  const negativePairs = new Set<string>();
  for (const [first, second] of chemistry.negative) {
    if (!pupilsById.has(first) || !pupilsById.has(second) || first === second) {
      continue;
    }
    negativePairs.add(first < second ? `${first}|${second}` : `${second}|${first}`);
  }

  for (const key of negativePairs) {
    const [first, second] = key.split("|");
    const firstClass = classOf.get(first);
    const secondClass = classOf.get(second);

    if (firstClass === undefined || secondClass === undefined || firstClass !== secondClass) {
      continue;
    }

    const firstName = pupilsById.get(first)?.name ?? first;
    const secondName = pupilsById.get(second)?.name ?? second;

    violations.push({
      kind: "hard",
      code: "negative_chemistry",
      classIndex: firstClass,
      pupilId: first,
      pupilIds: [first, second],
      rule: "Negative chemistry",
      message: `${firstName} cannot be in the same class as ${secondName}.`
    });
    violations.push({
      kind: "hard",
      code: "negative_chemistry",
      classIndex: firstClass,
      pupilId: second,
      pupilIds: [second, first],
      rule: "Negative chemistry",
      message: `${secondName} cannot be in the same class as ${firstName}.`
    });
  }

  const genderPenalties =
    constraints.genderPriority === "ignore"
      ? assignment.map(() => 0)
      : getGroupPenaltiesByClass({
          pupils,
          assignment,
          getGroup: (pupil) => pupil.gender
        });
  const originPenalties =
    constraints.originPriority === "ignore"
      ? assignment.map(() => 0)
      : getGroupPenaltiesByClass({
          pupils,
          assignment,
          getGroup: (pupil) => pupil.originSchool
        });
  const needsPenalties = getGroupPenaltiesByClass({
    pupils,
    assignment,
    getGroup: (pupil) => pupil.needs
  });
  const locationPenalties =
    constraints.locationPriority === "ignore" || constraints.locationPriority === "not_considered"
      ? assignment.map(() => 0)
      : getGroupPenaltiesByClass({
          pupils,
          assignment,
          getGroup: (pupil) => pupil.zone
        });
  const chemistryPenalties = getChemistryPenaltiesByClass(assignment, chemistry, pupilsById);

  const chemistryPairs = getPositivePairs(chemistry, pupilsById);
  const chemistryTogether =
    chemistryPairs.length === 0
      ? 1
      : chemistryPairs.filter(([first, second]) => classOf.get(first) !== undefined && classOf.get(first) === classOf.get(second)).length /
        chemistryPairs.length;

  const scores: Score = {
    overall: 0,
    genderBalance:
      constraints.genderPriority === "ignore" ? 1 : scoreFromPenalty(genderPenalties.reduce((sum, value) => sum + value, 0), Math.max(1, pupils.length)),
    originMix:
      constraints.originPriority === "ignore" ? 1 : scoreFromPenalty(originPenalties.reduce((sum, value) => sum + value, 0), Math.max(1, pupils.length)),
    needsBalance: scoreFromPenalty(needsPenalties.reduce((sum, value) => sum + value, 0), Math.max(1, pupils.length)),
    locationBalance:
      constraints.locationPriority === "ignore" || constraints.locationPriority === "not_considered"
        ? 1
        : scoreFromPenalty(locationPenalties.reduce((sum, value) => sum + value, 0), Math.max(1, pupils.length)),
    chemistry: clampScore(chemistryTogether)
  };

  scores.overall = clampScore(
    scores.genderBalance * 0.2 +
      scores.originMix * 0.25 +
      scores.needsBalance * 0.2 +
      scores.locationBalance * 0.15 +
      scores.chemistry * 0.2
  );

  return {
    violations,
    scores,
    ...createViolationIndexes(violations)
  };
}
