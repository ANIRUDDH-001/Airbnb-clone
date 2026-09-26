import { type APIRequestContext, expect, type Page } from "@playwright/test";

export const GUEST = "ananya@example.com";
export const HOST = "rahul@example.com";

export interface StayDates {
  checkIn: string;
  checkOut: string;
}

/** Mocked auth: log in through the API. The session cookie lands in the page's browser context. */
export async function logIn(page: Page, email: string) {
  const response = await page.request.post("/api/auth/login", { data: { email } });
  expect(response.ok(), await response.text()).toBeTruthy();
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The last day of the month after `iso`: the edge of the two-month calendar that opens on `iso`'s month. */
export function endOfNextMonth(iso: string): string {
  const date = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 2, 0);
  return date.toISOString().slice(0, 10);
}

/** The server's today (IST) and the first free stay of `nights` nights for a listing, starting `from` days out. */
export async function freeStay(request: APIRequestContext, listingId: number, nights: number, from = 7, within?: number) {
  const availability = await (await request.get(`/api/listings/${listingId}/availability`)).json();
  const today: string = availability.start;
  const booked: { check_in: string; check_out: string }[] = availability.booked;
  const last = within === undefined ? addDays(today, 300) : addDays(today, within);
  for (let checkIn = addDays(today, from); addDays(checkIn, nights) <= last; checkIn = addDays(checkIn, 1)) {
    const checkOut = addDays(checkIn, nights);
    if (booked.every((range) => checkOut <= range.check_in || checkIn >= range.check_out)) return { today, checkIn, checkOut };
  }
  throw new Error(`No free ${nights}-night stay for listing ${listingId}`);
}

/** Listing ids linked from the current page's cards, once at least one card has rendered. */
export async function cardListingIds(page: Page): Promise<number[]> {
  await page.locator('a[href^="/rooms/"]').first().waitFor();
  const hrefs = await page.locator('a[href^="/rooms/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  return [...new Set(hrefs.map((href) => Number(href.match(/^\/rooms\/(\d+)/)?.[1])).filter(Boolean))];
}
