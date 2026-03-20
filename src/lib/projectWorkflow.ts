import type { OptimizationConstraints } from "./api";
import { supabase } from "./supabase";

export const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  minClassSize: 20,
  maxClassSize: 25,
  genderPriority: "flexible",
  originPriority: "best_effort",
  locationPriority: "ignore",
  needsPriority: "flexible"
};

export type ConstraintFormState = OptimizationConstraints;

export type WorkflowSaveState = "idle" | "loading" | "saving" | "saved" | "error" | "blocked";

type ProjectConstraintsRow = {
  min_class_size: number;
  max_class_size: number;
  gender_priority: ConstraintFormState["genderPriority"];
  origin_priority: ConstraintFormState["originPriority"];
  location_priority: ConstraintFormState["locationPriority"];
  needs_priority: ConstraintFormState["needsPriority"];
};

export const CONFIG_CACHE_PREFIX = "skolegeni:config:";

function getConfigurationCacheKey(projectId: string) {
  return `${CONFIG_CACHE_PREFIX}${projectId}`;
}

function normalizeConstraintForm(form: ConstraintFormState): ConstraintFormState {
  return {
    minClassSize: form.minClassSize,
    maxClassSize: form.maxClassSize,
    genderPriority: form.genderPriority,
    originPriority: form.originPriority,
    locationPriority: form.locationPriority,
    needsPriority: form.needsPriority
  };
}

function mapRowToForm(row: ProjectConstraintsRow): ConstraintFormState {
  return {
    minClassSize: row.min_class_size,
    maxClassSize: row.max_class_size,
    genderPriority: row.gender_priority,
    originPriority: row.origin_priority,
    locationPriority: row.location_priority,
    needsPriority: row.needs_priority
  };
}

export function readConfigurationCache(projectId: string): ConstraintFormState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(getConfigurationCacheKey(projectId));
  if (!raw) {
    return null;
  }

  try {
    return normalizeConstraintForm(JSON.parse(raw) as ConstraintFormState);
  } catch {
    window.sessionStorage.removeItem(getConfigurationCacheKey(projectId));
    return null;
  }
}

export function writeConfigurationCache(projectId: string, form: ConstraintFormState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getConfigurationCacheKey(projectId),
    JSON.stringify(normalizeConstraintForm(form))
  );
}

export async function loadProjectConstraints(projectId: string): Promise<ConstraintFormState> {
  const { data, error } = await supabase
    .from("project_constraints")
    .select(
      "min_class_size,max_class_size,gender_priority,origin_priority,location_priority,needs_priority"
    )
    .eq("project_id", projectId)
    .maybeSingle<ProjectConstraintsRow>();

  if (error) {
    throw new Error(`Loading constraints failed: ${error.message}`);
  }

  if (!data) {
    return DEFAULT_CONSTRAINTS;
  }

  return mapRowToForm(data);
}

export async function saveProjectConstraints(
  projectId: string,
  form: ConstraintFormState
): Promise<void> {
  const { error } = await supabase.from("project_constraints").upsert({
    project_id: projectId,
    min_class_size: form.minClassSize,
    max_class_size: form.maxClassSize,
    gender_priority: form.genderPriority,
    origin_priority: form.originPriority,
    location_priority: form.locationPriority,
    needs_priority: form.needsPriority
  });

  if (error) {
    throw new Error(`Saving constraints failed: ${error.message}`);
  }
}

export function validateConstraintForm(
  projectId: string | undefined,
  form: ConstraintFormState
): string[] {
  const errors: string[] = [];

  if (!projectId) {
    errors.push("Missing project id.");
  }

  if (form.minClassSize < 1 || form.maxClassSize < 1) {
    errors.push("Sizes must be positive.");
  }

  if (form.minClassSize > form.maxClassSize) {
    errors.push("Min class size cannot exceed Max class size.");
  }

  if (form.needsPriority === "strict" && form.maxClassSize < 20) {
    errors.push("Academic needs cannot be Strict when Max class size is below 20.");
  }

  return errors;
}
