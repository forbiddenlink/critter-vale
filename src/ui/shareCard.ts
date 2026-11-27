// Shareable team card: a 1200x630 PNG drawn client-side on a canvas from the player's own party.
// No network calls beyond loading the sprites the game already shows. Not tied to any paid API.
import type { Element } from "../game/critters";

export const CARD_W = 1200;
export const CARD_H = 630;
export const SITE_URL = "https://critter-vale.vercel.app";
export const TAGLINE = "Raise a team. Battle rival tamers. Summon new partners.";
export const MAX_NAME_CHARS = 12;

export interface ShareMember {
  id: string;
  name: string;
  level: number;
  element: Element;
}

export interface CardSlot {
  id: string;
  name: string; // already truncated for the card
  levelLabel: string;
  element: Element;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardLayout {
  width: number;
  height: number;
  title: string;
  tagline: string;
  teamLabel: string;
  footer: string;
  empty: boolean;
  slots: CardSlot[];
}

/** Shorten to `max` characters, ending in an ellipsis when cut. */
export function truncateName(name: string, max = MAX_NAME_CHARS): string {
  const chars = [...name.trim()];
  if (chars.length <= max) return chars.join("");
  return chars.slice(0, max - 1).join("").trimEnd() + "…";
}

/** Plain-text summary used for the clipboard fallback and the share sheet text. */
export function buildSummary(team: readonly ShareMember[], url = SITE_URL): string {
  if (!team.length) return `I am just starting out in Critter Vale. Come raise a team with me: ${url}`;
  const list = team.map((m) => `${m.name} Lv ${m.level}`).join(", ");
  const noun = team.length === 1 ? "critter" : "critters";
  return `My Critter Vale team (${team.length} ${noun}): ${list}. Build yours: ${url}`;
}

const COLS = 3;
const CELL_W = 340;
const CELL_H = 180;
const GAP = 24;
const GRID_TOP = 168;

/** Pure layout data for the card: up to 6 slots in rows of 3, each row centered. */
export function buildLayout(team: readonly ShareMember[]): CardLayout {
  const members = team.slice(0, 6);
  const slots: CardSlot[] = members.map((m, i) => {
    const row = Math.floor(i / COLS);
    const inRow = Math.min(COLS, members.length - row * COLS);
    const rowW = inRow * CELL_W + (inRow - 1) * GAP;
    const x = Math.round((CARD_W - rowW) / 2) + (i % COLS) * (CELL_W + GAP);
    const y = GRID_TOP + row * (CELL_H + GAP);
    return { id: m.id, name: truncateName(m.name), levelLabel: `Lv ${m.level}`, element: m.element, x, y, w: CELL_W, h: CELL_H };
  });
  return {
    width: CARD_W,
    height: CARD_H,
    title: "Critter Vale",
    tagline: TAGLINE,
    teamLabel: members.length ? `MY TEAM  ${members.length} / 6` : "MY TEAM",
    footer: SITE_URL.replace(/^https:\/\//, ""),
    empty: members.length === 0,
    slots,
  };
}

const PAPER = "#ffe3dc";
const PAPER_LIGHT = "#fff6f3";
const FOREST = "#1f1718";
const MOSS = "#5e3a3f";
const LINE = "#e2a99e";
const CORAL = "#ff8f80";
const ELEMENT_COLOR: Record<Element, string> = { Ember: "#a34727", Aqua: "#23616d", Leaf: "#42613a", Normal: "#5e3a3f" };
const FONT = "'Bricolage Grotesque', system-ui, sans-serif";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // keeps the canvas exportable for remote sprites
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw the card onto a canvas. `spriteSrc` maps a species id to an image URL. */
export async function renderCard(team: readonly ShareMember[], spriteSrc: (id: string) => string): Promise<HTMLCanvasElement> {
  const layout = buildLayout(team);
  try {
    await Promise.all([document.fonts.load(`700 64px ${FONT}`), document.fonts.load(`500 28px ${FONT}`)]);
  } catch {
    /* fall back to the system font */
  }
  const images = await Promise.all(layout.slots.map((s) => loadImage(spriteSrc(s.id))));

  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, layout.width, layout.height);
  bg.addColorStop(0, PAPER);
  bg.addColorStop(1, "#ffc9bd");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, 0, layout.width, 12);

  // Logo badge + wordmark + tagline
  ctx.fillStyle = FOREST;
  roundRect(ctx, 60, 48, 84, 84, 20);
  ctx.fill();
  ctx.fillStyle = CORAL;
  ctx.font = `700 40px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CV", 102, 92);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = FOREST;
  ctx.font = `700 64px ${FONT}`;
  ctx.fillText(layout.title, 168, 94);
  ctx.fillStyle = MOSS;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(layout.tagline, 168, 130);
  ctx.textAlign = "right";
  ctx.fillStyle = MOSS;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(layout.teamLabel, layout.width - 60, 94);
  ctx.textAlign = "left";

  if (layout.empty) {
    ctx.fillStyle = FOREST;
    ctx.font = `700 40px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("No team yet. Pick a partner to begin.", layout.width / 2, 360);
    ctx.textAlign = "left";
  }

  layout.slots.forEach((s, i) => {
    ctx.save();
    ctx.shadowColor = "rgba(31,23,24,0.18)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = PAPER_LIGHT;
    roundRect(ctx, s.x, s.y, s.w, s.h, 22);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    roundRect(ctx, s.x, s.y, s.w, s.h, 22);
    ctx.stroke();

    const img = images[i];
    const size = 136;
    const ix = s.x + 20;
    const iy = s.y + (s.h - size) / 2;
    if (img) {
      const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, ix + (size - dw) / 2, iy + (size - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = LINE;
      ctx.beginPath();
      ctx.arc(ix + size / 2, iy + size / 2, size / 2 - 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const tx = s.x + 172;
    ctx.fillStyle = FOREST;
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(s.name, tx, s.y + 80, s.w - 172 - 14);
    ctx.fillStyle = MOSS;
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(s.levelLabel, tx, s.y + 116);
    ctx.fillStyle = ELEMENT_COLOR[s.element];
    roundRect(ctx, tx, s.y + 128, 96, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 17px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(s.element.toUpperCase(), tx + 48, s.y + 149);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = MOSS;
  ctx.font = `600 24px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`Play free in your browser at ${layout.footer}`, layout.width / 2, 604);
  ctx.textAlign = "left";
  return canvas;
}

export type ShareOutcome = "shared" | "downloaded" | "cancelled" | "failed";

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Render the card, then share it with the native sheet, else download it and copy the text. */
export async function shareTeam(team: readonly ShareMember[], spriteSrc: (id: string) => string): Promise<ShareOutcome> {
  try {
    const canvas = await renderCard(team, spriteSrc);
    const blob = await toBlob(canvas);
    if (!blob) return "failed";
    const text = buildSummary(team);
    const file = new File([blob], "critter-vale-team.png", { type: "image/png" });
    if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My Critter Vale team", text, url: SITE_URL });
        return "shared";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
        // any other share failure: fall through to download
      }
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "critter-vale-team.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard can be denied; the download still happened */
    }
    return "downloaded";
  } catch {
    return "failed";
  }
}
