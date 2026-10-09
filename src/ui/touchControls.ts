// On-screen joystick + action button, shown only on coarse pointers (phones/tablets).
// It writes into the same InputState the keyboard uses, so movement code has one source.
import type { InputState } from "../input";

const DEADZONE = 0.18;
const RADIUS = 48; // px of knob travel that maps to full speed

export function mountTouchControls(input: InputState, onInteract: () => void): void {
  const mq = matchMedia("(pointer: coarse)");

  const root = document.createElement("div");
  root.className = "touch-controls";
  root.hidden = !mq.matches;
  root.innerHTML = `
    <div class="joystick" role="group" aria-label="Move joystick"><div class="joy-knob"></div></div>
    <button class="touch-act" type="button" aria-label="Interact">A</button>`;
  document.body.appendChild(root);
  mq.addEventListener("change", () => {
    root.hidden = !mq.matches;
    if (root.hidden) input.setStick(0, 0);
  });

  const base = root.querySelector<HTMLElement>(".joystick")!;
  const knob = root.querySelector<HTMLElement>(".joy-knob")!;
  let pointerId: number | null = null;

  const move = (e: PointerEvent) => {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / RADIUS;
    const nz = dy / RADIUS;
    if (Math.hypot(nx, nz) < DEADZONE) input.setStick(0, 0);
    else input.setStick(nx, nz);
  };
  const release = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    knob.style.transform = "";
    input.setStick(0, 0);
  };

  base.addEventListener("pointerdown", (e) => {
    if (pointerId !== null) return;
    pointerId = e.pointerId;
    base.setPointerCapture(e.pointerId);
    move(e);
    e.preventDefault();
  });
  base.addEventListener("pointermove", (e) => {
    if (e.pointerId === pointerId) move(e);
  });
  base.addEventListener("pointerup", release);
  base.addEventListener("pointercancel", release);

  root.querySelector(".touch-act")!.addEventListener("click", () => onInteract());
}
