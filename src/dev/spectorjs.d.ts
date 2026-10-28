// spectorjs ships no type declarations of its own; declare the slice of its
// API we actually use.
declare module "spectorjs" {
  export class Spector {
    displayUI(): void;
    captureCanvas(canvas: HTMLCanvasElement): void;
  }
}
