import { expect, test } from "@playwright/test";

import { cardListingIds, endOfNextMonth, freeStay } from "./helpers";

test("a guest searches, books a stay and finds it in My Trips", async ({ page }) => {
  // Search from the home page's search bar.
  await page.goto("/");
  const searchBar = page.getByRole("search");
  await searchBar.getByPlaceholder("Search destinations").fill("Goa");
  await searchBar.getByRole("button", { name: /search/i }).last().click();
  await expect(page).toHaveURL(/\/s\/Goa[^/]*\/homes/);
  await expect(page.getByRole("heading", { name: /homes? in Goa/ })).toBeVisible();

  // Open a listing from the results.
  const [listingId] = await cardListingIds(page);
  expect(listingId).toBeTruthy();
  await page.locator(`a[href^="/rooms/${listingId}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/rooms/${listingId}`));

  // Pick two free nights on the availability calendar (it shows this month and next).
  const { today, checkIn, checkOut } = await freeStay(page.request, listingId, 2, 3);
  expect(checkOut <= endOfNextMonth(today), "free dates within the two months on screen").toBeTruthy();
  const calendar = page.locator("#availability");
  await calendar.locator(`td[data-day="${checkIn}"] button`).click();
  await calendar.locator(`td[data-day="${checkOut}"] button`).click();
  await expect(calendar.getByRole("heading", { name: /^2 nights in / })).toBeVisible();

  // Reserve asks a logged-out visitor to log in, then carries on to checkout.
  await page.getByRole("button", { name: "Reserve", exact: true }).first().click();
  await page.getByRole("button", { name: /Continue as demo guest/ }).click();
  await expect(page.getByRole("heading", { name: "Confirm and pay" })).toBeVisible();

  await page.getByRole("button", { name: /^Confirm and pay · / }).click();
  await expect(page.getByRole("heading", { name: /^You.re going to / })).toBeVisible();
  await expect(page).toHaveURL(/\/trips\/\d+/);
  const bookingId = page.url().match(/\/trips\/(\d+)/)![1];

  // My Trips lists the new booking.
  await page.goto("/trips");
  await expect(page.locator(`a[href="/trips/${bookingId}"]`).first()).toBeVisible();
});
