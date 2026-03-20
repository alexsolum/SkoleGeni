import { expect, test } from "@playwright/test";

import { installDurableEditingSupabaseRoutes } from "../helpers/durableEditingSupabaseRoutes";

test("durable editing persistence and recovery", async ({ page }) => {
  const routes = await installDurableEditingSupabaseRoutes(page);

  await page.goto(`/editor/${routes.projectId}`);

  const sourceCard = page.getByTestId("pupil-card-p1");
  const targetDropzone = page.getByTestId("class-dropzone-1");

  await expect(page.getByTestId("class-dropzone-0").getByTestId("pupil-card-p1")).toBeVisible();
  await sourceCard.dragTo(targetDropzone);

  await expect(page.getByText("All changes saved")).toBeVisible();
  await expect(targetDropzone.getByTestId("pupil-card-p1")).toBeVisible();
  await expect(page.getByTestId("class-dropzone-0").getByTestId("pupil-card-p1")).toHaveCount(0);

  await page.reload();

  await expect(page.getByText("All changes saved")).toBeVisible();
  await expect(page.getByTestId("class-dropzone-1").getByTestId("pupil-card-p1")).toBeVisible();

  await page.getByRole("button", { name: "Reset to Optimizer Result" }).click();

  await expect(page.getByText("Restored optimizer assignment.")).toBeVisible();
  await expect(page.getByTestId("class-dropzone-0").getByTestId("pupil-card-p1")).toBeVisible();
  await expect(page.getByTestId("class-dropzone-1").getByTestId("pupil-card-p1")).toHaveCount(0);
  await expect.poll(() => routes.getSavedAssignmentRow()).toBeNull();
});
