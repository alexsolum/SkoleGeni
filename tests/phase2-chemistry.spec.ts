import { expect, test } from "@playwright/test";

import { installPhase2SupabaseRoutes } from "./helpers/phase2SupabaseRoutes";

test("phase-2 chemistry picker", async ({ page }) => {
  const routes = await installPhase2SupabaseRoutes(page);

  await page.goto("/");

  await page.getByRole("button", { name: "Create New Roster" }).click();
  await expect(page).toHaveURL(`/configure/${routes.projectId}`);

  await page.getByRole("button", { name: "Next: Pupil Data →" }).click();
  await expect(page).toHaveURL(`/pupils/${routes.projectId}`);

  await page.getByRole("button", { name: "Add Row" }).click();
  await page.getByRole("button", { name: "Add Row" }).click();

  const nameInputs = page.getByPlaceholder("Name");
  const originInputs = page.getByPlaceholder("e.g. Oakridge Elem.");
  const needsInputs = page.getByPlaceholder("e.g. Reading support");
  const zoneInputs = page.getByPlaceholder("e.g. Zone A");

  await nameInputs.nth(0).fill("Ada Lovelace");
  await originInputs.nth(0).fill("North");
  await needsInputs.nth(0).fill("Reading support");
  await zoneInputs.nth(0).fill("Zone A");

  await nameInputs.nth(1).fill("Grace Hopper");
  await originInputs.nth(1).fill("West");
  await needsInputs.nth(1).fill("Math extension");
  await zoneInputs.nth(1).fill("Zone B");

  await expect(page.getByText("All changes saved")).toBeVisible();

  const chemistrySummary = page.getByText("+0 / -0").first();
  await expect(chemistrySummary).toBeVisible();

  await page.getByTitle("Positive chemistry (+)").first().click();
  await expect(page.getByText("Chemistry (+) Picker")).toBeVisible();
  await page.getByRole("button", { name: /Grace Hopper/ }).click();

  await expect(page.getByText("All changes saved")).toBeVisible();
  await expect(page.getByText("+1 / -0").first()).toBeVisible();
});
