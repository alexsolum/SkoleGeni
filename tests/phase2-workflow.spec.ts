import { expect, test } from "@playwright/test";

import { installPhase2SupabaseRoutes } from "./helpers/phase2SupabaseRoutes";

test("phase-2 workflow", async ({ page }) => {
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

  await needsInputs.nth(0).fill("");
  await needsInputs.nth(0).blur();
  await expect(page.getByText("Unsaved validation errors")).toBeVisible();

  await routes.syncDraftFromBrowser();
  expect(routes.getDraftSnapshot()?.pupils?.[0]?.needs ?? "").toBe("");

  await page.reload();
  await expect(page.getByText("Unsaved validation errors")).toBeVisible();
  await expect(needsInputs.nth(0)).toHaveValue("");

  await needsInputs.nth(0).fill("Reading support");
  await expect(page.getByText("All changes saved")).toBeVisible();

  routes.setFailNextRosterSave();
  await zoneInputs.nth(1).fill("Zone C");
  await expect(page.getByText("Save failed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry save" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run Optimizer" })).toBeDisabled();

  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByText("All changes saved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run Optimizer" })).toBeEnabled();
});
