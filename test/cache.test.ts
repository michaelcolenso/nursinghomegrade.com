import { describe, expect, it } from "vitest";
import { htmlCacheKey } from "../src/cache";

describe("htmlCacheKey", () => {
  it("versions rendered HTML cache keys", () => {
    expect(htmlCacheKey("facility:055258-community-subacute-and-transitional-care-center")).toBe(
      "html:v1:facility:055258-community-subacute-and-transitional-care-center",
    );
  });
});
