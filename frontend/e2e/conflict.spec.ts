import { expect, test } from "@playwright/test";

import { addDays, cardListingIds, endOfNextMonth, freeStay, GUEST, logIn } from "./helpers";

test("booked nights are blocked on the calendar, hidden from search and refused a second time", async ({ page }) => {
  await logIn(page, GUEST);
  await page.goto("/s/Jaipur--India/homes");
  const [listingId] = await cardListingIds(page);
  expect(listingId).toBeTruthy();

  const { today, checkIn, checkOut } = await freeStay(page.request, listingId, 3, 5);
  const created = await page.request.post("/api/bookings", {
    data: { listing_id: listingId, check_in: checkIn, check_out: checkOut, adults: 1 },
  });
  expect(created.status(), await created.text()).toBe(201);

  // An overlapping stay is refused.
  const overlap = await page.request.post("/api/bookings", {
    data: { listing_id: listingId, check_in: addDays(checkIn, 1), check_out: addDays(checkOut, 1), adults: 1 },
  });
  expect(overlap.status()).toBe(409);

  // The listing's calendar strikes the booked nights through; the checkout day stays free for the next guest.
  expect(checkOut <= endOfNextMonth(today), "booked dates within the two months on screen").toBeTruthy();
  await page.goto(`/rooms/${listingId}`);
  const calendar = page.locator("#availability");
  for (let night = checkIn; night < checkOut; night = addDays(night, 1)) {
    await expect(calendar.locator(`td[data-day="${night}"] button`)).toBeDisabled();
  }
  await expect(calendar.locator(`td[data-day="${checkOut}"] button`)).toBeEnabled();

  // Searching those dates no longer offers the listing; searching free dates still does.
  await page.goto(`/s/Jaipur--India/homes?check_in=${checkIn}&check_out=${checkOut}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await cardListingIds(page)).not.toContain(listingId);
  const later = await freeStay(page.request, listingId, 3, 120);
  await page.goto(`/s/Jaipur--India/homes?check_in=${later.checkIn}&check_out=${later.checkOut}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await cardListingIds(page)).toContain(listingId);
});
