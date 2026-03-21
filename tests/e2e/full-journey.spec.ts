import { expect, test, type Page, type Route } from "@playwright/test";

import {
  FULL_JOURNEY_AUTH_STORAGE_KEY,
  FULL_JOURNEY_PROJECT_ID,
  FULL_JOURNEY_SESSION,
  MOCK_CONSTRAINTS,
  MOCK_CSV_CONTENT,
  MOCK_OPTIMIZE_RESPONSE,
  MOCK_PROJECT,
  MOCK_PUPILS
} from "../fixtures/fullJourneyData";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installFullJourneyRoutes(page: Page) {
  let constraints = { ...MOCK_CONSTRAINTS };
  let pupils = [] as Array<(typeof MOCK_PUPILS)[number]>;
  let chemistryLinks: Array<{
    from_pupil_id: string;
    to_pupil_id: string;
    relationship: "positive" | "negative";
    project_id: string;
  }> = [];
  let latestOptimizationRun: { result_json: typeof MOCK_OPTIMIZE_RESPONSE; score_overall: number | null; created_at: string } | null = null;

  await page.addInitScript(
    ({ authStorageKey, session }) => {
      window.localStorage.setItem(authStorageKey, JSON.stringify(session));
    },
    {
      authStorageKey: FULL_JOURNEY_AUTH_STORAGE_KEY,
      session: FULL_JOURNEY_SESSION
    }
  );

  await page.route("**/auth/v1/user", async (route) => {
    await json(route, FULL_JOURNEY_SESSION.user);
  });

  await page.route("**/auth/v1/token?grant_type=refresh_token", async (route) => {
    await json(route, FULL_JOURNEY_SESSION);
  });

  await page.route("**/rest/v1/projects*", async (route) => {
    if (route.request().method() === "POST") {
      await json(route, MOCK_PROJECT, 201);
      return;
    }

    await json(route, [MOCK_PROJECT]);
  });

  await page.route("**/rest/v1/project_constraints*", async (route) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as typeof MOCK_CONSTRAINTS;
      constraints = { ...body };
      await json(route, [constraints], 201);
      return;
    }

    await json(route, constraints);
  });

  await page.route("**/rest/v1/pupils*", async (route) => {
    await json(route, pupils);
  });

  await page.route("**/rest/v1/chemistry_links*", async (route) => {
    await json(route, chemistryLinks);
  });

  await page.route("**/rest/v1/rpc/replace_project_roster_state", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      project_id_input: string;
      pupils_input: Array<{
        id: string;
        name: string;
        gender: "Male" | "Female" | "Other";
        origin_school: string;
        needs: string;
        zone: string;
      }>;
      chemistry_input: {
        positive: Array<{ from_pupil_id: string; to_pupil_id: string }>;
        negative: Array<{ from_pupil_id: string; to_pupil_id: string }>;
      };
    };

    pupils = body.pupils_input.map((row) => ({
      ...row,
      project_id: body.project_id_input
    }));
    chemistryLinks = body.chemistry_input.positive
      .map((row) => ({
        ...row,
        relationship: "positive" as const,
        project_id: body.project_id_input
      }))
      .concat(
        body.chemistry_input.negative.map((row) => ({
          ...row,
          relationship: "negative" as const,
          project_id: body.project_id_input
        }))
      );

    await json(route, null);
  });

  await page.route("**/api/optimizer/project", async (route) => {
    latestOptimizationRun = {
      result_json: MOCK_OPTIMIZE_RESPONSE,
      score_overall: MOCK_OPTIMIZE_RESPONSE.score.overall,
      created_at: "2026-03-21T10:05:00.000Z"
    };
    await json(route, MOCK_OPTIMIZE_RESPONSE);
  });

  await page.route("**/rest/v1/optimization_runs*", async (route) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        result_json: typeof MOCK_OPTIMIZE_RESPONSE;
        score_overall: number;
      };
      latestOptimizationRun = {
        result_json: body.result_json,
        score_overall: body.score_overall,
        created_at: "2026-03-21T10:05:00.000Z"
      };
      await json(route, [{ id: "run-journey" }], 201);
      return;
    }

    await json(route, latestOptimizationRun);
  });

  return { projectId: FULL_JOURNEY_PROJECT_ID };
}

test.describe("full roster journey", () => {
  test("create project, configure, import pupils, optimize, view results", async ({ page }) => {
    const routes = await installFullJourneyRoutes(page);

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Create New Roster" })).toBeVisible();

    await page.getByRole("button", { name: "Create New Roster" }).click();
    await expect(page).toHaveURL(`/configure/${routes.projectId}`);

    await page.getByRole("button", { name: "Next: Pupil Data →" }).click();
    await expect(page).toHaveURL(`/pupils/${routes.projectId}`);

    await page.getByLabel("Import CSV").setInputFiles({
      name: "pupils.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(MOCK_CSV_CONTENT, "utf-8")
    });

    await expect(page.locator('input[value="Ada"]')).toBeVisible();
    await expect(page.locator('input[value="Fay"]')).toBeVisible();
    await expect(page.getByText("All changes saved")).toBeVisible();

    await page.getByRole("button", { name: "Run Optimizer" }).click();
    await expect(page).toHaveURL(`/results/${routes.projectId}`);

    await expect(page.getByRole("heading", { name: "Optimization Results" })).toBeVisible();
    await expect(page.getByText("Generated 2 classes · 6 pupils")).toBeVisible();
    await expect(page.getByText("75%").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Class Editor" })).toBeVisible();
  });
});
