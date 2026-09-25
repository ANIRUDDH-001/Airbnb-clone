import { describe, expect, it } from "vitest";

import { activeFilterCount, apiQuery, locationToSlug, parseSearch, searchHref, slugToLocation } from "./search";

describe("location slugs", () => {
  it("round-trips place names like the live site", () => {
    expect(locationToSlug("Goa, India")).toBe("Goa--India");
    expect(slugToLocation("Goa--India")).toBe("Goa, India");
    expect(slugToLocation(locationToSlug("Old Manali"))).toBe("Old Manali");
    expect(locationToSlug("  ")).toBe("anywhere");
    expect(slugToLocation("anywhere")).toBe("");
  });
});

describe("parseSearch / searchHref", () => {
  it("round-trips a full search", () => {
    const state = parseSearch("Goa", {
      check_in: "2026-10-05", check_out: "2026-10-09", adults: "2", children: "1", infants: "1",
      amenities: ["wifi", "pool"], property_types: "villa", min_price: "2000", sort: "price_asc", page: "2",
    });
    expect(searchHref(state)).toBe(
      "/s/Goa/homes?check_in=2026-10-05&check_out=2026-10-09&adults=2&children=1&infants=1&min_price=2000" +
        "&property_types=villa&amenities=wifi&amenities=pool&sort=price_asc&page=2",
    );
    expect(activeFilterCount(state.filters)).toBe(4);
  });

  it("drops half or reversed dates and clamps junk", () => {
    const state = parseSearch("anywhere", { check_in: "2026-10-09", check_out: "2026-10-05", adults: "99", page: "x" });
    expect(state.checkIn).toBeUndefined();
    expect(state.adults).toBe(16);
    expect(state.page).toBe(1);
    expect(parseSearch("anywhere", { check_in: "2026-10-09" }).checkIn).toBeUndefined();
  });

  it("builds the API query: guests = adults + children, at least 1", () => {
    const query = apiQuery(parseSearch("Jaipur", { adults: "2", children: "1", infants: "2" }), 18);
    expect(query).toMatchObject({ location: "Jaipur", guests: 3, page: 1, page_size: 18 });
    expect(apiQuery(parseSearch("anywhere", {}), 18).guests).toBe(1);
  });
});
