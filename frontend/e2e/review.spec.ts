import { expect, test } from "@playwright/test";

import { GUEST, logIn } from "./helpers";

interface Trip {
  id: number;
  can_review: boolean;
  listing: { id: number };
}

test("a guest reviews a completed stay and the listing's rating updates", async ({ page }) => {
  // The demo guest first; other seeded guests once her stays are all reviewed (repeat runs on one database).
  let trip: Trip | undefined;
  for (const email of [GUEST, "vikram@example.com", "neha@example.com", "rohan@example.com"]) {
    await logIn(page, email);
    const past: Trip[] = await (await page.request.get("/api/bookings/mine?phase=past")).json();
    trip = past.find((b) => b.can_review);
    if (trip) break;
  }
  expect(trip, "a seeded guest has a past stay to review").toBeTruthy();
  const listingId = trip!.listing.id;
  const before = await (await page.request.get(`/api/listings/${listingId}`)).json();

  await page.goto("/trips?tab=past");
  const tripLink = page.locator(`a[href="/trips/${trip!.id}"]`).last();
  await tripLink.locator("xpath=ancestor::*[.//button[normalize-space()='Write a review']][1]")
    .getByRole("button", { name: "Write a review" }).click();

  const dialog = page.getByRole("dialog");
  for (const group of ["Overall", "Cleanliness", "Accuracy", "Check-in", "Communication", "Location", "Value"]) {
    await dialog.getByRole("radiogroup", { name: `${group} rating` }).getByRole("radio", { name: "1 star", exact: true }).click();
  }
  await dialog.getByPlaceholder(/What did you love/).fill("Tested end to end: the stay was fine and the review flow works.");
  await dialog.getByRole("button", { name: "Publish review" }).click();
  await expect(page.getByText("Thanks! Your review is published.")).toBeVisible();

  // The listing's review count and rating changed, and the stay can't be reviewed twice.
  const after = await (await page.request.get(`/api/listings/${listingId}`)).json();
  expect(after.review_count).toBe(before.review_count + 1);
  expect(after.rating_avg).toBeLessThan(before.rating_avg);
  const again: Trip[] = await (await page.request.get("/api/bookings/mine?phase=past")).json();
  expect(again.find((b) => b.id === trip!.id)?.can_review).toBe(false);
});
