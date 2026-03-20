import { supabase } from "./supabase";

export type OptimizerGenderPriority = "strict" | "flexible" | "ignore";
export type OptimizerOriginPriority = "strict" | "flexible" | "best_effort" | "ignore";
export type OptimizerLocationPriority = "strict" | "flexible" | "ignore" | "not_considered";
export type OptimizerNeedsPriority = "strict" | "flexible";

export type Pupil = {
  id: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  originSchool: string;
  needs: string; // single-select MVP
  zone: string; // "Location / Zone" MVP
};

export type Chemistry = {
  // Directed edges from pupilA -> pupilB; optimizer treats negative as undirected blocks.
  positive: Array<[string, string]>;
  negative: Array<[string, string]>;
};

export type OptimizationConstraints = {
  minClassSize: number;
  maxClassSize: number;
  genderPriority: OptimizerGenderPriority;
  originPriority: OptimizerOriginPriority;
  locationPriority: OptimizerLocationPriority;
  needsPriority: OptimizerNeedsPriority;
};

export type OptimizeRequest = {
  projectId: string;
  constraints: OptimizationConstraints;
  pupils: Pupil[];
  chemistry: Chemistry;
};

export type Violation = {
  category: string;
  message: string;
  suggestion: string;
};

export type DiagnosticResponse = {
  violations: Violation[];
};

export class OptimizerRequestError extends Error {
  status: number;
  diagnostic?: DiagnosticResponse;

  constructor(message: string, status: number, diagnostic?: DiagnosticResponse) {
    super(message);
    this.name = "OptimizerRequestError";
    this.status = status;
    this.diagnostic = diagnostic;
  }
}

export type OptimizedClass = {
  classIndex: number;
  pupilIds: string[];
};

export type Score = {
  overall: number; // 0..1
  genderBalance: number; // 0..1
  originMix: number; // 0..1
  needsBalance: number; // 0..1
  locationBalance: number; // 0..1
  chemistry: number; // 0..1
};

export type OptimizeResponse = {
  classes: OptimizedClass[];
  score: Score;
  debug?: {
    chosenClassCount?: number;
    objective?: number;
  };
};

function getOptimizerBaseUrl() {
  return ((import.meta.env.VITE_OPTIMIZER_URL as string | undefined) ?? "/api/optimizer").replace(/\/$/, "");
}

function isViolation(value: unknown): value is Violation {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Violation).category === "string" &&
    typeof (value as Violation).message === "string" &&
    typeof (value as Violation).suggestion === "string"
  );
}

function parseDiagnosticResponse(payload: unknown): DiagnosticResponse | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const detail = "detail" in payload ? (payload as { detail?: unknown }).detail : payload;
  if (typeof detail !== "object" || detail === null || !("violations" in detail)) {
    return undefined;
  }

  const violations = (detail as { violations?: unknown }).violations;
  if (!Array.isArray(violations) || !violations.every(isViolation)) {
    return undefined;
  }

  return { violations };
}

async function throwOptimizerRequestError(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  let payload: unknown;

  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = undefined;
    }
  }

  const diagnostic = parseDiagnosticResponse(payload);
  const fallbackMessage =
    typeof payload === "object" && payload !== null && "detail" in payload && typeof (payload as { detail?: unknown }).detail === "string"
      ? (payload as { detail: string }).detail
      : text || `Optimizer failed (${res.status}).`;

  const message =
    diagnostic?.violations[0]?.message ?? `Optimizer failed (${res.status}): ${fallbackMessage}`;

  throw new OptimizerRequestError(message, res.status, diagnostic);
}

async function getAuthHeaders(signal?: AbortSignal) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sign in before saving or optimizing a roster.");
  }

  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  return {
    authorization: `Bearer ${session.access_token}`
  };
}

export async function saveProjectRosterState(
  projectId: string,
  pupils: Pupil[],
  chemistry: Chemistry
): Promise<void> {
  const pupilRows = pupils.map((pupil) => ({
    id: pupil.id,
    name: pupil.name,
    gender: pupil.gender,
    origin_school: pupil.originSchool,
    needs: pupil.needs,
    zone: pupil.zone
  }));

  const chemistryRows = {
    positive: chemistry.positive.map(([fromPupilId, toPupilId]) => ({
      from_pupil_id: fromPupilId,
      to_pupil_id: toPupilId
    })),
    negative: chemistry.negative.map(([fromPupilId, toPupilId]) => ({
      from_pupil_id: fromPupilId,
      to_pupil_id: toPupilId
    }))
  };

  const { error } = await supabase.rpc("replace_project_roster_state", {
    project_id_input: projectId,
    pupils_input: pupilRows,
    chemistry_input: chemistryRows
  });

  if (error) {
    throw new Error(`Saving roster failed: ${error.message}`);
  }
}

export async function optimizeProject(
  projectId: string,
  signal?: AbortSignal
): Promise<OptimizeResponse> {
  const url = `${getOptimizerBaseUrl()}/project`;
  const authHeaders = await getAuthHeaders(signal);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({ projectId }),
    signal
  });

  if (!res.ok) {
    await throwOptimizerRequestError(res);
  }

  return (await res.json()) as OptimizeResponse;
}

export async function optimizeClasses(
  payload: OptimizeRequest,
  signal?: AbortSignal
): Promise<OptimizeResponse> {
  const url = getOptimizerBaseUrl();

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });

  if (!res.ok) {
    await throwOptimizerRequestError(res);
  }

  return (await res.json()) as OptimizeResponse;
}

