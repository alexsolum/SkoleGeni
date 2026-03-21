import type { OptimizeResponse } from "../../src/lib/api";

export const FULL_JOURNEY_PROJECT_ID = "66666666-6666-4666-8666-666666666666";
export const FULL_JOURNEY_AUTH_STORAGE_KEY = "sb-localhost-auth-token";

export const FULL_JOURNEY_SESSION = {
  access_token: "full-journey-access-token",
  refresh_token: "full-journey-refresh-token",
  expires_in: 3600,
  expires_at: 4102444800,
  token_type: "bearer",
  user: {
    id: "77777777-7777-4777-8777-777777777777",
    email: "journey@example.com",
    aud: "authenticated",
    role: "authenticated"
  }
} as const;

export const MOCK_PROJECT = {
  id: FULL_JOURNEY_PROJECT_ID,
  title: "New Roster",
  created_at: "2026-03-21T10:00:00.000Z",
  updated_at: "2026-03-21T10:00:00.000Z",
  user_id: FULL_JOURNEY_SESSION.user.id
} as const;

export const MOCK_CONSTRAINTS = {
  project_id: FULL_JOURNEY_PROJECT_ID,
  min_class_size: 3,
  max_class_size: 3,
  gender_priority: "flexible" as const,
  origin_priority: "best_effort" as const,
  location_priority: "flexible" as const,
  needs_priority: "flexible" as const
};

export const MOCK_PUPILS = [
  {
    id: "p1",
    name: "Ada",
    gender: "Female" as const,
    origin_school: "North",
    needs: "None",
    zone: "A",
    project_id: FULL_JOURNEY_PROJECT_ID
  },
  {
    id: "p2",
    name: "Bo",
    gender: "Male" as const,
    origin_school: "North",
    needs: "Support",
    zone: "A",
    project_id: FULL_JOURNEY_PROJECT_ID
  },
  {
    id: "p3",
    name: "Cia",
    gender: "Female" as const,
    origin_school: "North",
    needs: "None",
    zone: "A",
    project_id: FULL_JOURNEY_PROJECT_ID
  },
  {
    id: "p4",
    name: "Dan",
    gender: "Male" as const,
    origin_school: "South",
    needs: "Support",
    zone: "B",
    project_id: FULL_JOURNEY_PROJECT_ID
  },
  {
    id: "p5",
    name: "Eli",
    gender: "Male" as const,
    origin_school: "South",
    needs: "None",
    zone: "B",
    project_id: FULL_JOURNEY_PROJECT_ID
  },
  {
    id: "p6",
    name: "Fay",
    gender: "Female" as const,
    origin_school: "South",
    needs: "Support",
    zone: "B",
    project_id: FULL_JOURNEY_PROJECT_ID
  }
] as const;

export const MOCK_OPTIMIZE_RESPONSE: OptimizeResponse = {
  classes: [
    { classIndex: 0, pupilIds: ["p1", "p2", "p6"] },
    { classIndex: 1, pupilIds: ["p3", "p4", "p5"] }
  ],
  score: {
    overall: 0.75,
    genderBalance: 0.8,
    originMix: 0.7,
    needsBalance: 0.75,
    locationBalance: 0.7,
    chemistry: 0.8
  },
  debug: {
    sacrificed_priorities: [],
    worst_class_highlights: {},
    class_scores: {
      0: {
        overall: 0.78,
        genderBalance: 0.8,
        originMix: 0.72,
        needsBalance: 0.76,
        locationBalance: 0.71,
        chemistry: 0.9
      },
      1: {
        overall: 0.72,
        genderBalance: 0.8,
        originMix: 0.68,
        needsBalance: 0.74,
        locationBalance: 0.69,
        chemistry: 0.7
      }
    }
  }
};

export const MOCK_CSV_CONTENT = `name,origin_school,gender,needs,zone
Ada,North,Female,None,A
Bo,North,Male,Support,A
Cia,North,Female,None,A
Dan,South,Male,Support,B
Eli,South,Male,None,B
Fay,South,Female,Support,B
`;
