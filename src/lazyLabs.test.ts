import main from "./main.ts?raw";
import { describe, expect, it } from "vitest";

// The Summon Lab, Fusion Lab and Field Guide only open on a click. Keeping them
// out of the entry chunk shortens first load; a static import would silently
// pull them back in.

describe("main.ts lazy-loads on-demand screens", () => {
  it.each(["summonLab", "fusionLab", "fieldGuide"])("does not statically import %s", (name) => {
    expect(main).not.toMatch(new RegExp(`^import .* from "\\./ui/${name}"`, "m"));
  });

  it.each(["summonLab", "fusionLab", "fieldGuide"])("dynamically imports %s", (name) => {
    expect(main).toContain(`import("./ui/${name}")`);
  });
});
