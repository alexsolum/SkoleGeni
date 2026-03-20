export const PHASE2_PROJECT_ID = "11111111-1111-4111-8111-111111111111";
export const PHASE2_AUTH_STORAGE_KEY = "sb-localhost-auth-token";

export const phase2Session = {
  access_token: "phase2-access-token",
  refresh_token: "phase2-refresh-token",
  expires_in: 3600,
  expires_at: 4102444800,
  token_type: "bearer",
  user: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "teacher@example.com",
    aud: "authenticated",
    role: "authenticated"
  }
};

export const savedConstraintRow = {
  project_id: PHASE2_PROJECT_ID,
  min_class_size: 20,
  max_class_size: 25,
  gender_priority: "flexible" as const,
  origin_priority: "best_effort" as const,
  location_priority: "ignore" as const,
  needs_priority: "flexible" as const
};

export const savedPupilRows = [
  {
    id: "33333333-3333-4333-8333-333333333331",
    name: "Ada Lovelace",
    gender: "Female" as const,
    origin_school: "North",
    needs: "Reading support",
    zone: "Zone A",
    project_id: PHASE2_PROJECT_ID
  },
  {
    id: "33333333-3333-4333-8333-333333333332",
    name: "Grace Hopper",
    gender: "Female" as const,
    origin_school: "West",
    needs: "Math extension",
    zone: "Zone B",
    project_id: PHASE2_PROJECT_ID
  }
];

export const blockedDraftRow = {
  id: savedPupilRows[0].id,
  name: "Ada Lovelace",
  gender: "Female" as const,
  originSchool: "North",
  needs: "",
  zone: "Zone A"
};

export const failingSaveTogglePayload = {
  failNextRosterSave: true
};
