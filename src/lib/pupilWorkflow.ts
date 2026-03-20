import debounce from "lodash.debounce";

import type { Chemistry, Pupil } from "./api";

export const EXPECTED_PUPIL_FIELDS = ["name", "originSchool", "gender", "needs", "zone"] as const;

export type ExpectedPupilField = (typeof EXPECTED_PUPIL_FIELDS)[number];
export type PupilFieldMap = Record<ExpectedPupilField, string>;
export type RawImportRow = Record<string, unknown>;

export const HEADER_ALIASES: Record<ExpectedPupilField, string[]> = {
  name: ["name", "student_name"],
  originSchool: ["origin_school", "originSchool"],
  gender: ["gender", "sex"],
  needs: ["needs", "academic_needs"],
  zone: ["zone", "location", "location_zone"]
};

export type FailedImportSummary = {
  rowNumber: number;
  reason: string;
  values: Record<ExpectedPupilField, string>;
};

export type PupilIssue = {
  id: string;
  message: string;
  rowId?: string;
  field?: ExpectedPupilField;
};

export type PupilIssueSummary = {
  errors: PupilIssue[];
  warnings: PupilIssue[];
  fieldErrors: Record<string, Partial<Record<ExpectedPupilField, string>>>;
};

export type ImportPreview = {
  validRows: Pupil[];
  failedRows: FailedImportSummary[];
};

function normalizeHeader(value: string) {
  return value.trim().replace(/[\s-]+/g, "_").toLowerCase();
}

function toDisplayString(value: unknown) {
  return String(value ?? "").trim();
}

function buildPupilFingerprint(pupil: Pupil) {
  // Duplicate fingerprint: name|originSchool|gender|needs|zone
  return [
    pupil.name.trim().toLowerCase(),
    pupil.originSchool.trim().toLowerCase(),
    pupil.gender.trim().toLowerCase(),
    pupil.needs.trim().toLowerCase(),
    pupil.zone.trim().toLowerCase()
  ].join("|");
}

export function normalizeImportedGender(value: string): Pupil["gender"] {
  const normalized = value.trim().toLowerCase();

  if (["m", "male", "boy", "man"].includes(normalized)) {
    return "Male";
  }

  if (["f", "female", "girl", "woman"].includes(normalized)) {
    return "Female";
  }

  if (!normalized) {
    return "Other";
  }

  return "Other";
}

export function detectCsvHeaders(rows: RawImportRow[]) {
  const headers = new Map<string, string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const normalized = normalizeHeader(key);
      if (!headers.has(normalized)) {
        headers.set(normalized, key);
      }
    });
  });

  return Array.from(headers.values());
}

export function autoDetectFieldMap(headers: string[]) {
  const headerLookup = new Map(headers.map((header) => [normalizeHeader(header), header]));
  const fieldMap = {} as Partial<PupilFieldMap>;
  const missingFields: ExpectedPupilField[] = [];

  EXPECTED_PUPIL_FIELDS.forEach((field) => {
    const candidates = [field, ...HEADER_ALIASES[field]].map((alias) => normalizeHeader(alias));
    const match = candidates.map((candidate) => headerLookup.get(candidate)).find(Boolean);

    if (match) {
      fieldMap[field] = match;
    } else {
      missingFields.push(field);
    }
  });

  return {
    fieldMap,
    missingFields
  };
}

function createImportId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readMappedValue(row: RawImportRow, fieldMap: PupilFieldMap, field: ExpectedPupilField) {
  return toDisplayString(row[fieldMap[field]]);
}

export function summarizeFailedImports(failedRows: FailedImportSummary[]) {
  return failedRows;
}

export function buildImportPreview(rows: RawImportRow[], fieldMap: PupilFieldMap): ImportPreview {
  const validRows: Pupil[] = [];
  const failedRows: FailedImportSummary[] = [];

  rows.forEach((row, index) => {
    const values = {
      name: readMappedValue(row, fieldMap, "name"),
      originSchool: readMappedValue(row, fieldMap, "originSchool"),
      gender: readMappedValue(row, fieldMap, "gender"),
      needs: readMappedValue(row, fieldMap, "needs"),
      zone: readMappedValue(row, fieldMap, "zone")
    };

    const reasons: string[] = [];

    if (!values.name) {
      reasons.push("Missing student name");
    }

    if (!values.originSchool) {
      reasons.push("Missing origin school");
    }

    if (!values.gender) {
      reasons.push("Missing gender");
    }

    if (!values.needs) {
      reasons.push("Missing academic needs");
    }

    if (!values.zone) {
      reasons.push("Missing location / zone");
    }

    if (reasons.length > 0) {
      failedRows.push({
        rowNumber: index + 2,
        reason: reasons.join("; "),
        values
      });
      return;
    }

    validRows.push({
      id: createImportId(),
      name: values.name,
      originSchool: values.originSchool,
      gender: normalizeImportedGender(values.gender),
      needs: values.needs,
      zone: values.zone
    });
  });

  return {
    validRows,
    failedRows
  };
}

export function collectPupilIssues(pupils: Pupil[], chemistry: Chemistry): PupilIssueSummary {
  const errors: PupilIssue[] = [];
  const warnings: PupilIssue[] = [];
  const fieldErrors: Record<string, Partial<Record<ExpectedPupilField, string>>> = {};
  const duplicates = new Map<string, number[]>();

  pupils.forEach((pupil, index) => {
    const rowIssues: Partial<Record<ExpectedPupilField, string>> = {};

    if (!pupil.name.trim()) {
      rowIssues.name = `Row ${index + 1}: missing student name.`;
    }

    if (!pupil.originSchool.trim()) {
      rowIssues.originSchool = `Row ${index + 1}: missing origin school.`;
    }

    if (!pupil.needs.trim()) {
      rowIssues.needs = `Row ${index + 1}: missing academic needs.`;
    }

    if (!pupil.zone.trim()) {
      rowIssues.zone = `Row ${index + 1}: missing location / zone.`;
    }

    if (Object.keys(rowIssues).length > 0) {
      fieldErrors[pupil.id] = rowIssues;
      Object.entries(rowIssues).forEach(([field, message]) => {
        errors.push({
          id: `${pupil.id}:${field}`,
          rowId: pupil.id,
          field: field as ExpectedPupilField,
          message
        });
      });
    }

    const fingerprint = buildPupilFingerprint(pupil);
    const bucket = duplicates.get(fingerprint) ?? [];
    bucket.push(index);
    duplicates.set(fingerprint, bucket);
  });

  duplicates.forEach((indexes) => {
    if (indexes.length < 2) {
      return;
    }

    indexes.forEach((index) => {
      const pupil = pupils[index];
      errors.push({
        id: `duplicate:${pupil.id}`,
        rowId: pupil.id,
        message: `Duplicate pupil row: Row ${index + 1} matches another row.`
      });
    });
  });

  const chemistryIds = new Set(pupils.map((pupil) => pupil.id));
  chemistry.positive.concat(chemistry.negative).forEach(([fromId, toId], index) => {
    if (!chemistryIds.has(fromId) || !chemistryIds.has(toId)) {
      warnings.push({
        id: `chemistry:${index}`,
        message: "A chemistry link references a pupil that is no longer in the grid."
      });
    }
  });

  return {
    errors,
    warnings,
    fieldErrors
  };
}

export type AutosaveState = "idle" | "queued" | "saving" | "saved" | "error" | "blocked";

export const PUPIL_DRAFT_STORAGE_PREFIX = "skolegeni:pupil-draft:";
export const CHEMISTRY_DRAFT_STORAGE_PREFIX = "skolegeni:chemistry-draft:";

function getPupilDraftKey(projectId: string) {
  return `${PUPIL_DRAFT_STORAGE_PREFIX}${projectId}`;
}

function getChemistryDraftKey(projectId: string) {
  return `${CHEMISTRY_DRAFT_STORAGE_PREFIX}${projectId}`;
}

function normalizeDraftPupil(pupil: Pupil): Pupil {
  return {
    id: pupil.id,
    name: pupil.name ?? "",
    gender: pupil.gender ?? "Other",
    originSchool: pupil.originSchool ?? "",
    needs: pupil.needs ?? "",
    zone: pupil.zone ?? ""
  };
}

export function readRosterDraft(projectId: string) {
  if (typeof window === "undefined") {
    return {
      pupils: null,
      chemistry: null
    };
  }

  const rawPupils = window.sessionStorage.getItem(getPupilDraftKey(projectId));
  const rawChemistry = window.sessionStorage.getItem(getChemistryDraftKey(projectId));

  try {
    return {
      pupils: rawPupils ? (JSON.parse(rawPupils) as Pupil[]).map(normalizeDraftPupil) : null,
      chemistry: rawChemistry ? (JSON.parse(rawChemistry) as Chemistry) : null
    };
  } catch {
    clearRosterDraft(projectId);
    return {
      pupils: null,
      chemistry: null
    };
  }
}

export function writeRosterDraft(projectId: string, pupils: Pupil[], chemistry: Chemistry) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getPupilDraftKey(projectId), JSON.stringify(pupils));
  window.sessionStorage.setItem(getChemistryDraftKey(projectId), JSON.stringify(chemistry));
}

export function clearRosterDraft(projectId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getPupilDraftKey(projectId));
  window.sessionStorage.removeItem(getChemistryDraftKey(projectId));
}

export function createRosterAutosave({
  delayMs,
  onSave,
  onStateChange
}: {
  delayMs: number;
  onSave: () => Promise<void>;
  onStateChange?: (state: AutosaveState, error?: Error | null) => void;
}) {
  let currentState: AutosaveState = "idle";
  let lastError: Error | null = null;

  const emit = (state: AutosaveState, error?: Error | null) => {
    currentState = state;
    lastError = error ?? null;
    onStateChange?.(state, lastError);
  };

  const debouncedSave = debounce(async () => {
    emit("saving");

    try {
      await onSave();
      emit("saved");
    } catch (error) {
      emit("error", error instanceof Error ? error : new Error("Autosave failed."));
    }
  }, delayMs);

  return {
    queue() {
      emit("queued");
      debouncedSave();
    },
    async retry() {
      emit("queued");
      debouncedSave();
      await debouncedSave.flush();
    },
    async flush() {
      if (currentState === "queued") {
        await debouncedSave.flush();
      }
    },
    cancel() {
      debouncedSave.cancel();
      emit("idle");
    },
    getState() {
      return currentState;
    },
    getLastError() {
      return lastError;
    }
  };
}
