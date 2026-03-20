import type { Page, Route } from "@playwright/test";

import {
  DURABLE_EDITING_AUTH_STORAGE_KEY,
  DURABLE_EDITING_PROJECT_ID,
  durableEditingChemistryRows,
  durableEditingConstraintRow,
  durableEditingMovedScore,
  durableEditingOptimizerRun,
  durableEditingPupilRows,
  durableEditingSavedAssignmentRow,
  durableEditingSession
} from "../fixtures/durableEditingData";

type SavedAssignmentRow = {
  project_id: string;
  assignment: string[][];
  score_json: {
    overall: number;
    genderBalance: number;
    originMix: number;
    needsBalance: number;
    locationBalance: number;
    chemistry: number;
  } | null;
  updated_at: string;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

function cloneAssignmentRow(row: SavedAssignmentRow | null): SavedAssignmentRow | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    assignment: row.assignment.map((groupClass) => [...groupClass]),
    score_json: row.score_json ? { ...row.score_json } : null
  };
}

function buildScoreForAssignment(assignment: string[][]) {
  const matchesMovedAssignment =
    assignment.length === 2 &&
    assignment[0]?.length === 1 &&
    assignment[0]?.[0] === "p2" &&
    assignment[1]?.length === 2 &&
    assignment[1]?.[0] === "p3" &&
    assignment[1]?.[1] === "p1";

  return matchesMovedAssignment
    ? { ...durableEditingMovedScore }
    : { ...durableEditingSavedAssignmentRow.score_json };
}

export async function installDurableEditingSupabaseRoutes(page: Page) {
  let savedAssignmentRow: SavedAssignmentRow | null = cloneAssignmentRow(durableEditingSavedAssignmentRow);
  let saveVersion = 0;

  await page.addInitScript(
    ({ authStorageKey, session }) => {
      window.localStorage.setItem(authStorageKey, JSON.stringify(session));
    },
    {
      authStorageKey: DURABLE_EDITING_AUTH_STORAGE_KEY,
      session: durableEditingSession
    }
  );

  await page.route("**/auth/v1/user", async (route) => {
    await json(route, durableEditingSession.user);
  });

  await page.route("**/auth/v1/token?grant_type=refresh_token", async (route) => {
    await json(route, durableEditingSession);
  });

  await page.route("**/rest/v1/project_constraints*", async (route) => {
    await json(route, durableEditingConstraintRow);
  });

  await page.route("**/rest/v1/pupils*", async (route) => {
    const url = new URL(route.request().url());
    const select = url.searchParams.get("select");

    if (select === "created_at") {
      await json(route, { created_at: durableEditingPupilRows[2].created_at });
      return;
    }

    await json(route, durableEditingPupilRows);
  });

  await page.route("**/rest/v1/chemistry_links*", async (route) => {
    await json(route, durableEditingChemistryRows);
  });

  await page.route("**/rest/v1/optimization_runs*", async (route) => {
    await json(route, durableEditingOptimizerRun);
  });

  await page.route("**/rest/v1/roster_assignments*", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await json(route, savedAssignmentRow);
      return;
    }

    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as {
        project_id: string;
        assignment: string[][];
      };

      saveVersion += 1;
      savedAssignmentRow = {
        project_id: body.project_id,
        assignment: body.assignment.map((groupClass) => [...groupClass]),
        score_json: buildScoreForAssignment(body.assignment),
        updated_at: `2026-03-20T09:00:0${saveVersion}.000Z`
      };

      await json(route, { updated_at: savedAssignmentRow.updated_at }, 201);
      return;
    }

    if (request.method() === "DELETE") {
      savedAssignmentRow = null;
      await json(route, []);
      return;
    }

    await route.fallback();
  });

  await page.route("**/api/optimizer/project/score", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as { assignment?: string[][] };
    await json(route, buildScoreForAssignment(body.assignment ?? durableEditingSavedAssignmentRow.assignment));
  });

  return {
    projectId: DURABLE_EDITING_PROJECT_ID,
    getSavedAssignmentRow() {
      return cloneAssignmentRow(savedAssignmentRow);
    }
  };
}
