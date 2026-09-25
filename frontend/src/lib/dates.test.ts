import { describe, expect, it } from "vitest";

import {
  bookedNights, isCheckInDisabled, isCheckOutDisabled, isCheckOutOnly, MAX_NIGHTS, nightsBetween, rangeIsFree,
} from "./dates";

const TODAY = "2026-10-01";
// Someone stays 10 → 13 Oct (nights of 10, 11, 12). Another 20 → 21 Oct.
const BOOKED = bookedNights([
  { check_in: "2026-10-10", check_out: "2026-10-13" },
  { check_in: "2026-10-20", check_out: "2026-10-21" },
]);

describe("bookedNights", () => {
  it("covers each night of a half-open range", () => {
    expect([...bookedNights([{ check_in: "2026-10-30", check_out: "2026-11-02" }])]).toEqual([
      "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
  });
});

describe("check-in", () => {
  it("can't be in the past", () => {
    expect(isCheckInDisabled("2026-09-30", BOOKED, TODAY)).toBe(true);
    expect(isCheckInDisabled(TODAY, BOOKED, TODAY)).toBe(false);
  });

  it("can't be a booked night", () => {
    expect(isCheckInDisabled("2026-10-10", BOOKED, TODAY)).toBe(true);
    expect(isCheckInDisabled("2026-10-12", BOOKED, TODAY)).toBe(true);
  });

  it("can be the day another guest checks out", () => {
    expect(isCheckInDisabled("2026-10-13", BOOKED, TODAY)).toBe(false);
  });
});

describe("check-out", () => {
  it("must be after check-in", () => {
    expect(isCheckOutDisabled("2026-10-05", "2026-10-05", BOOKED)).toBe(true);
    expect(isCheckOutDisabled("2026-10-04", "2026-10-05", BOOKED)).toBe(true);
    expect(isCheckOutDisabled("2026-10-06", "2026-10-05", BOOKED)).toBe(false);
  });

  it("can be the day the next guest checks in (back-to-back)", () => {
    expect(isCheckOutDisabled("2026-10-10", "2026-10-05", BOOKED)).toBe(false);
  });

  it("can't span a booked night", () => {
    expect(isCheckOutDisabled("2026-10-11", "2026-10-05", BOOKED)).toBe(true);
    expect(isCheckOutDisabled("2026-10-15", "2026-10-05", BOOKED)).toBe(true);
  });

  it("respects the maximum stay", () => {
    expect(nightsBetween("2026-10-21", "2027-01-19")).toBe(MAX_NIGHTS);
    expect(isCheckOutDisabled("2027-01-19", "2026-10-21", BOOKED)).toBe(false);
    expect(isCheckOutDisabled("2027-01-20", "2026-10-21", BOOKED)).toBe(true);
  });
});

describe("check-out-only days", () => {
  it("flags a booked day that the chosen check-in can still end on", () => {
    expect(isCheckOutOnly("2026-10-10", BOOKED)).toBe(true); // booked night, but the previous night is free
    expect(isCheckOutOnly("2026-10-11", BOOKED)).toBe(false); // mid-booking
    expect(isCheckOutOnly("2026-10-05", BOOKED)).toBe(false); // free day
  });
});

describe("rangeIsFree / nightsBetween", () => {
  it("agrees with the backend's overlap rule", () => {
    expect(rangeIsFree("2026-10-13", "2026-10-20", BOOKED)).toBe(true);
    expect(rangeIsFree("2026-10-12", "2026-10-14", BOOKED)).toBe(false);
    expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3);
  });

  it("counts nights across a DST-free calendar without off-by-one", () => {
    expect(nightsBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});
