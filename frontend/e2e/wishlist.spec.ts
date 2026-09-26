import { expect, test } from "@playwright/test";

import { GUEST, logIn } from "./helpers";

test("a saved listing stays saved after a reload and shows on the wishlist", async ({ page }) => {
  await logIn(page, GUEST);
  await page.goto("/s/Mumbai--India/homes");

  const card = page.locator('a[href^="/rooms/"]').filter({ has: page.getByRole("button", { name: "Save to wishlist" }) }).first();
  const href = (await card.getAttribute("href"))!.split("?")[0];
  await card.getByRole("button", { name: "Save to wishlist" }).click();
  const saved = page.locator(`a[href^="${href}"]`).first().getByRole("button", { name: "Remove from wishlist" });
  await expect(saved).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(saved).toBeVisible();

  await page.goto("/wishlists");
  await expect(page.locator(`a[href^="${href}"]`).first()).toBeVisible();
});
