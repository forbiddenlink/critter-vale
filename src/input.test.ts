import { describe, it, expect } from "vitest";
import { InputState } from "./input";

describe("InputState (one movement source for keyboard and touch)", () => {
  it("is idle with no input", () => {
    expect(new InputState().axis()).toEqual({ x: 0, z: 0 });
  });

  it("maps WASD and arrows to x/z (up = -z)", () => {
    const i = new InputState();
    i.keyDown("w");
    expect(i.axis()).toEqual({ x: 0, z: -1 });
    i.keyUp("w");
    i.keyDown("ArrowRight");
    expect(i.axis()).toEqual({ x: 1, z: 0 });
  });

  it("normalises keyboard diagonals to unit length", () => {
    const i = new InputState();
    i.keyDown("w");
    i.keyDown("d");
    const { x, z } = i.axis();
    expect(Math.hypot(x, z)).toBeCloseTo(1);
  });

  it("opposite keys cancel", () => {
    const i = new InputState();
    i.keyDown("a");
    i.keyDown("d");
    expect(i.axis().x).toBe(0);
  });

  it("the touch stick feeds the same axis, clamped to unit length", () => {
    const i = new InputState();
    i.setStick(0.5, -0.5);
    expect(i.axis()).toEqual({ x: 0.5, z: -0.5 });
    i.setStick(3, 4);
    expect(Math.hypot(i.axis().x, i.axis().z)).toBeCloseTo(1);
  });

  it("clear() releases held keys and the stick", () => {
    const i = new InputState();
    i.keyDown("w");
    i.setStick(1, 1);
    i.clear();
    expect(i.axis()).toEqual({ x: 0, z: 0 });
  });
});
