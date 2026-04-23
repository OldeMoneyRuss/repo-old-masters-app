import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("The Starry Night")).toBe("the-starry-night");
  });

  it("strips accents", () => {
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
  });

  it("collapses multiple separators", () => {
    expect(slugify("Hello   World")).toBe("hello-world");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("strips quotes", () => {
    expect(slugify("O'Brien's Work")).toBe("obriens-work");
  });

  it("handles non-ASCII characters", () => {
    expect(slugify("Ångström")).toBe("angstrom");
  });

  it("truncates to 160 chars", () => {
    const long = "a".repeat(200);
    expect(slugify(long)).toHaveLength(160);
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});
