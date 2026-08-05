// HD-2D billboards. Loads real AI-generated PNG sprites from /public/sprites/,
// with a procedural canvas fallback if a file is missing.
import * as THREE from "three";
import type { Species } from "../game/critters";

const loader = new THREE.TextureLoader();

function tuneTexture(t: THREE.Texture) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

/** SpriteMaterial that shows the fallback immediately, then swaps in the PNG when it loads. */
function spriteFrom(url: string, fallback: HTMLCanvasElement, worldHeight: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: tuneTexture(new THREE.CanvasTexture(fallback)),
    transparent: true,
  });
  loader.load(
    url,
    (tex) => {
      mat.map = tuneTexture(tex);
      mat.needsUpdate = true;
    },
    undefined,
    () => {
      /* keep canvas fallback on 404 */
    }
  );
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(worldHeight, worldHeight, 1);
  return sprite;
}

export function makeCritterSprite(species: Species, worldHeight = 2.1): THREE.Sprite {
  return spriteFrom(`/sprites/${species.id}.png`, critterCanvas(species), worldHeight);
}

export function makePlayerSprite(worldHeight = 2.3): THREE.Sprite {
  return spriteFrom(`/sprites/player.png`, playerCanvas(), worldHeight);
}

export function makeNpcSprite(shirt: string, worldHeight = 2.1): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const cx = 64;
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.beginPath();
  g.ellipse(cx, 118, 22, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#3a3a55"; // legs
  g.fillRect(cx - 11, 92, 9, 22);
  g.fillRect(cx + 2, 92, 9, 22);
  g.fillStyle = shirt; // torso
  g.beginPath();
  g.roundRect(cx - 16, 56, 32, 40, 7);
  g.fill();
  g.fillStyle = "#f0b488"; // head
  g.beginPath();
  g.arc(cx, 40, 16, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#5a3a22"; // hair
  g.beginPath();
  g.arc(cx, 34, 16, Math.PI, 0);
  g.fill();
  g.fillStyle = "#1a1a1a"; // eyes
  g.beginPath();
  g.arc(cx - 5, 41, 2, 0, Math.PI * 2);
  g.arc(cx + 5, 41, 2, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(worldHeight, worldHeight, 1);
  return sprite;
}

// ---- procedural fallbacks (used only if a PNG is missing) ----
const S = 128;

function critterCanvas(sp: Species): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const cx = 64;
  g.fillStyle = sp.color;
  g.beginPath();
  g.ellipse(cx, 74, 36, 32, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(cx, 40, 26, 24, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = sp.accent;
  g.beginPath();
  g.ellipse(cx, 80, 16, 14, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#1a1a1a";
  g.beginPath();
  g.arc(cx - 10, 38, 4, 0, Math.PI * 2);
  g.arc(cx + 10, 38, 4, 0, Math.PI * 2);
  g.fill();
  return c;
}

function playerCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const cx = 64;
  g.fillStyle = "#c0392b";
  g.fillRect(cx - 16, 54, 32, 40);
  g.fillStyle = "#f0b488";
  g.beginPath();
  g.arc(cx, 38, 16, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2b6cff";
  g.beginPath();
  g.arc(cx, 32, 16, Math.PI, 0);
  g.fill();
  return c;
}
