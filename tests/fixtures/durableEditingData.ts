export const DURABLE_EDITING_PROJECT_ID = "44444444-4444-4444-8444-444444444444";
export const DURABLE_EDITING_AUTH_STORAGE_KEY = "sb-localhost-auth-token";

export const durableEditingSession = {
  access_token: "durable-editing-access-token",
  refresh_token: "durable-editing-refresh-token",
  expires_in: 3600,
  expires_at: 4102444800,
  token_type: "bearer",
  user: {
    id: "55555555-5555-4555-8555-555555555555",
    email: "editor@example.com",
    aud: "authenticated",
    role: "authenticated"
  }
};

export const durableEditingConstraintRow = {
  project_id: DURABLE_EDITING_PROJECT_ID,
  min_class_size: 1,
  max_class_size: 3,
  gender_priority: "flexible" as const,
  origin_priority: "best_effort" as const,
  location_priority: "ignore" as const,
  needs_priority: "flexible" as const
};

export const durableEditingPupilRows = [
  {
    id: "p1",
    name: "Ada",
    gender: "Female" as const,
    origin_school: "North",
    needs: "Reading",
    zone: "Zone A",
    project_id: DURABLE_EDITING_PROJECT_ID,
    created_at: "2026-03-20T08:00:00.000Z"
  },
  {
    id: "p2",
    name: "Bea",
    gender: "Female" as const,
    origin_school: "West",
    needs: "Math",
    zone: "Zone B",
    project_id: DURABLE_EDITING_PROJECT_ID,
    created_at: "2026-03-20T08:01:00.000Z"
  },
  {
    id: "p3",
    name: "Cleo",
    gender: "Other" as const,
    origin_school: "South",
    needs: "Speech",
    zone: "Zone C",
    project_id: DURABLE_EDITING_PROJECT_ID,
    created_at: "2026-03-20T08:02:00.000Z"
  }
] as const;

export const durableEditingChemistryRows = [] as const;

export const durableEditingOptimizerRun = {
  result_json: {
    classes: [
      { classIndex: 0, pupilIds: ["p1", "p2"] },
      { classIndex: 1, pupilIds: ["p3"] }
    ],
    score: {
      overall: 0.92,
      genderBalance: 0.9,
      originMix: 0.91,
      needsBalance: 0.93,
      locationBalance: 0.94,
      chemistry: 0.95
    }
  }
} as const;

export const durableEditingSavedAssignmentRow = {
  project_id: DURABLE_EDITING_PROJECT_ID,
  assignment: [["p1", "p2"], ["p3"]],
  score_json: {
    overall: 0.92,
    genderBalance: 0.9,
    originMix: 0.91,
    needsBalance: 0.93,
    locationBalance: 0.94,
    chemistry: 0.95
  },
  updated_at: "2026-03-20T09:00:00.000Z"
} as const;

export const durableEditingMovedScore = {
  overall: 0.88,
  genderBalance: 0.86,
  originMix: 0.89,
  needsBalance: 0.87,
  locationBalance: 0.9,
  chemistry: 0.91
} as const;
