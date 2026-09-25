import { describe, expect, it } from "vitest";

import { applyDestination, emptyDraft, errorsFromServer, stepErrors, toListingWrite, validate } from "./listing-form";

const GOA = { name: "Goa", state: "Goa", country: "India", latitude: 15.4909, longitude: 73.8278, blurb: "" };

function completeDraft() {
  return {
    ...applyDestination(emptyDraft(), GOA),
    title: "Cliffside cottage",
    description: "A quiet cottage above the sea with sunset views.",
    address: "12 Cliff Road",
    photo_urls: ["https://images.example.com/a.jpg"],
  };
}

describe("validate", () => {
  it("accepts a complete draft", () => {
    expect(validate(completeDraft())).toEqual({});
  });

  it("mirrors the backend limits", () => {
    const errors = validate({ ...completeDraft(), title: "Hut", nightly_price: 50, beds: 0, photo_urls: ["javascript:alert(1)"] });
    expect(Object.keys(errors).sort()).toEqual(["beds", "nightly_price", "photo_urls", "title"]);
  });

  it("needs coordinates, which a destination fills in", () => {
    expect(validate({ ...completeDraft(), latitude: null }).latitude).toBeDefined();
  });
});

describe("stepErrors", () => {
  it("only reports the fields a step owns", () => {
    const draft = emptyDraft();
    expect(stepErrors("type", draft)).toEqual({});
    expect(Object.keys(stepErrors("location", draft)).sort()).toEqual(["address", "city", "latitude"]);
    expect(Object.keys(stepErrors("photos", draft))).toEqual(["photo_urls"]);
  });
});

describe("conversions", () => {
  it("trims text and sends an empty state as null", () => {
    const body = toListingWrite({ ...completeDraft(), title: "  Cliffside cottage  ", state: " " });
    expect(body.title).toBe("Cliffside cottage");
    expect(body.state).toBeNull();
  });

  it("maps dotted server error paths onto fields", () => {
    expect(errorsFromServer([{ field: "photo_urls.0", message: "bad url" }, { field: "title", message: "short" }])).toEqual({
      photo_urls: "bad url", title: "short",
    });
  });
});
