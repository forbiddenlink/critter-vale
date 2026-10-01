// One movement-input abstraction. The keyboard and the on-screen joystick both write here;
// the overworld reads only `axis()`, so a new input source never touches movement code.

export interface Axis {
  x: number; // -1 (left) .. 1 (right)
  z: number; // -1 (up/away) .. 1 (down/toward camera)
}

export class InputState {
  private keys = new Set<string>();
  private stick = { x: 0, z: 0 };

  keyDown(key: string) {
    this.keys.add(key.toLowerCase());
  }
  keyUp(key: string) {
    this.keys.delete(key.toLowerCase());
  }
  /** Analog stick, -1..1 on each axis (z positive = toward the camera). */
  setStick(x: number, z: number) {
    this.stick = { x, z };
  }
  clear() {
    this.keys.clear();
    this.stick = { x: 0, z: 0 };
  }

  /** Combined direction with magnitude <= 1. */
  axis(): Axis {
    let x = this.stick.x;
    let z = this.stick.z;
    const k = this.keys;
    if (k.has("a") || k.has("arrowleft")) x -= 1;
    if (k.has("d") || k.has("arrowright")) x += 1;
    if (k.has("w") || k.has("arrowup")) z -= 1;
    if (k.has("s") || k.has("arrowdown")) z += 1;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x: x || 0, z: z || 0 };
  }
}
