import { Spector } from "spectorjs";

/**
 * Dev-only WebGL frame debugger. Attaches Spector.js's capture UI to the
 * renderer's canvas. Only ever imported when import.meta.env.DEV is true
 * (see the guard in main.ts), so this file and the spectorjs package never
 * reach the production bundle.
 *
 * Usage: run `pnpm dev`, then load the page with `?spector` in the URL to
 * open Spector.js and capture/inspect a frame.
 */
export function initSpectorDebugger(canvas: HTMLCanvasElement): void {
  const spector = new Spector();
  spector.captureCanvas(canvas); // target this canvas specifically (game has exactly one)
  spector.displayUI(); // adds the capture button + result viewer overlay
}
