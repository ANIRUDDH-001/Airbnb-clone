import { expect, test } from "@playwright/test";

import { HOST, logIn } from "./helpers";

test("a host creates, edits and deletes a listing", async ({ page }) => {
  await logIn(page, HOST);
  await page.goto("/hosting/listings");
  await page.getByRole("link", { name: "Create listing" }).click();

  const next = page.getByRole("button", { name: "Next", exact: true });
  // 1. Type: the defaults are valid.
  await next.click();
  // 2. Location: a destination fills in the city, state, country and pin.
  await page.getByRole("button", { name: "Goa", exact: true }).click();
  await page.getByLabel("Street address").fill("12 Beach Road, Candolim");
  await next.click();
  // 3. Basics and 4. Amenities: the defaults are valid.
  await next.click();
  await next.click();
  // 5. Photos
  await page.getByRole("button", { name: "Add demo photos" }).click();
  await next.click();
  // 6. Details
  const title = `E2E villa ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByPlaceholder(/What makes your place special/).fill("A quiet villa a short walk from the beach, with a shaded garden.");
  await next.click();
  // 7. Price
  await page.getByLabel("Nightly price").fill("4500");
  await next.click();
  // 8. Review, then publish: the new listing's page opens.
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page).toHaveURL(/\/rooms\/\d+/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  const id = page.url().match(/\/rooms\/(\d+)/)![1];

  // Edit the title and price.
  await page.goto(`/hosting/listings/${id}/edit`);
  const renamed = `${title} (renovated)`;
  await page.getByLabel("Title").fill(renamed);
  await page.getByLabel("Nightly price").fill("5200");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/hosting\/listings$/);
  await expect(page.getByText(renamed)).toBeVisible();
  await page.goto(`/rooms/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
  await expect(page.getByText("₹5,200").first()).toBeVisible();

  // Delete it: it leaves the dashboard and its page is gone.
  await page.goto("/hosting/listings");
  const edit = page.locator(`a[href="/hosting/listings/${id}/edit"]`);
  await edit.locator("xpath=..").getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(edit).toHaveCount(0);
  expect((await page.request.get(`/api/listings/${id}`)).status()).toBe(404);
});
