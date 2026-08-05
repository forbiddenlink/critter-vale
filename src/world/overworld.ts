// 3D overworld "Sprout Hollow": sky, soft shadows, waving grass, water, HD-2D billboards.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makePlayerSprite } from "./sprites";
import { WILD_POOL } from "../game/critters";

export interface Encounter {
  speciesId: string;
  level: number;
}

const WORLD = 40;
const GRASS_TILES: Array<[number, number, number, number]> = [
  [-14, -6, -14, -6],
  [6, 16, -16, -8],
  [-18, -8, 6, 16],
  [8, 18, 8, 18],
];

export class Overworld {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private player = makePlayerSprite();
  private keys = new Set<string>();
  private speed = 9;
  private stepCooldown = 0;
  private elapsed = 0;
  private windMats: THREE.Material[] = [];
  onEncounter: ((e: Encounter) => void) | null = null;
  active = true;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 400);

    this.buildSky();
    this.buildGround();
    this.buildGrassPatches();
    this.buildWater();
    this.buildTown();
    this.scene.fog = new THREE.Fog(0xcfe8ff, 55, 120);

    this.player.position.set(0, 0.95, 0);
    this.scene.add(this.player);

    window.addEventListener("keydown", (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
  }

  private buildSky() {
    const sky = new Sky();
    sky.scale.setScalar(2000);
    const u = sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.2;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;
    const sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 32); // elevation
    const theta = THREE.MathUtils.degToRad(150);
    sun.setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(sun);
    this.scene.add(sky);

    this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x5a7d4a, 0.9));
    const dir = new THREE.DirectionalLight(0xfff2d6, 2.2);
    dir.position.copy(sun).multiplyScalar(60);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    const cam = dir.shadow.camera;
    cam.left = -50;
    cam.right = 50;
    cam.top = 50;
    cam.bottom = -50;
    cam.near = 1;
    cam.far = 160;
    dir.shadow.bias = -0.0004;
    this.scene.add(dir);
  }

  private buildGround() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x74bd55, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2, WORLD * 2), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const pathMat = new THREE.MeshStandardMaterial({ color: 0xcaa96e, roughness: 1 });
    for (const g of [
      new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2, 4.5), pathMat),
      new THREE.Mesh(new THREE.PlaneGeometry(4.5, WORLD * 2), pathMat),
    ]) {
      g.rotation.x = -Math.PI / 2;
      g.position.y = 0.02;
      g.receiveShadow = true;
      this.scene.add(g);
    }
  }

  /** Instanced blades with a vertex-shader wind sway; one draw call per patch group. */
  private buildGrassPatches() {
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x2f7d33, roughness: 1 });
    const bladeGeo = new THREE.PlaneGeometry(0.16, 1.0, 1, 2);
    bladeGeo.translate(0, 0.5, 0);

    let total = 0;
    const dims = GRASS_TILES.map(([x0, x1, z0, z1]) => {
      const w = x1 - x0;
      const d = z1 - z0;
      const t = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tileMat);
      t.rotation.x = -Math.PI / 2;
      t.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2);
      t.receiveShadow = true;
      this.scene.add(t);
      const n = Math.floor(w * d * 1.1);
      total += n;
      return { x0, w, z0, d, n };
    });

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x3f9c3f,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    bladeMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 };
      sh.vertexShader =
        "uniform float uTime;\n" +
        sh.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.7;
           float sway = sin(uTime * 2.2 + ph) * 0.16 + sin(uTime * 3.7 + ph * 1.7) * 0.05;
           transformed.x += sway * transformed.y;`
        );
      (bladeMat.userData as { shader?: THREE.WebGLProgramParametersWithUniforms }).shader = sh;
    };
    this.windMats.push(bladeMat);

    const inst = new THREE.InstancedMesh(bladeGeo, bladeMat, total);
    inst.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const pos = new THREE.Vector3();
    let i = 0;
    for (const { x0, w, z0, d, n } of dims) {
      for (let k = 0; k < n; k++) {
        pos.set(x0 + Math.random() * w, 0, z0 + Math.random() * d);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
        const s = 0.7 + Math.random() * 0.7;
        scl.set(s, s, s);
        m.compose(pos, q, scl);
        inst.setMatrixAt(i++, m);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);

    // scattered flowers for color pop (bloom bait)
    const petal = new THREE.SphereGeometry(0.18, 8, 8);
    const flowerColors = [0xff5d8f, 0xffd23f, 0xff8c42, 0xa66bff, 0xffffff];
    for (const hex of flowerColors) {
      const fm = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.35,
        roughness: 0.6,
      });
      const fInst = new THREE.InstancedMesh(petal, fm, 40);
      for (let k = 0; k < 40; k++) {
        const x = (Math.random() - 0.5) * WORLD * 1.4;
        const z = (Math.random() - 0.5) * WORLD * 1.4;
        m.compose(new THREE.Vector3(x, 0.28, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        fInst.setMatrixAt(k, m);
      }
      fInst.instanceMatrix.needsUpdate = true;
      this.scene.add(fInst);
    }
  }

  private buildWater() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2b8fd6,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.86,
    });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 };
      sh.vertexShader =
        "uniform float uTime;\n" +
        sh.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           transformed.z += sin(transformed.x * 0.6 + uTime * 1.5) * 0.12
                          + cos(transformed.y * 0.5 + uTime * 1.1) * 0.12;`
        );
      (mat.userData as { shader?: THREE.WebGLProgramParametersWithUniforms }).shader = sh;
    };
    this.windMats.push(mat);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(7, 48), mat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(16, 0.06, -2);
    this.scene.add(pond);
    // rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.5, 10, 48),
      new THREE.MeshStandardMaterial({ color: 0xb99a5b, roughness: 1 })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(16, 0.06, -2);
    this.scene.add(rim);
  }

  private buildTown() {
    const houses: Array<[number, number, number]> = [
      [-10, 0, 0xe8695f],
      [10, -14, 0x5b8fd8],
      [-6, 12, 0xe0b45b],
    ];
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      emissive: 0xffcf5a,
      emissiveIntensity: 1.4,
    });
    for (const [x, z, color] of houses) {
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(5.4, 4.2, 5.4, 4, 0.35),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
      );
      body.position.set(x, 2.1, z);
      body.castShadow = true;
      body.receiveShadow = true;
      this.scene.add(body);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4.5, 2.6, 4),
        new THREE.MeshStandardMaterial({ color: 0x8a4a2f, roughness: 0.9 })
      );
      roof.position.set(x, 5.5, z);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this.scene.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 2.2, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1 })
      );
      door.position.set(x, 1.1, z + 2.75);
      this.scene.add(door);

      for (const dx of [-1.4, 1.4]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), winMat);
        win.position.set(x + dx, 2.6, z + 2.75);
        this.scene.add(win);
      }
    }

    // trees: trunk + stacked canopy, varied
    for (let i = 0; i < 34; i++) {
      const x = (Math.random() - 0.5) * WORLD * 1.9;
      const z = (Math.random() - 0.5) * WORLD * 1.9;
      if (Math.abs(x) < 22 && Math.abs(z) < 22) continue;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.55, 2.6, 7),
        new THREE.MeshStandardMaterial({ color: 0x7a4a25, roughness: 1 })
      );
      trunk.position.set(x, 1.3, z);
      trunk.castShadow = true;
      this.scene.add(trunk);
      const green = 0x3f8a3f + Math.floor(Math.random() * 0x102000);
      for (let l = 0; l < 3; l++) {
        const leaf = new THREE.Mesh(
          new THREE.IcosahedronGeometry(2.2 - l * 0.4, 0),
          new THREE.MeshStandardMaterial({ color: green, roughness: 0.9, flatShading: true })
        );
        leaf.position.set(x, 3.2 + l * 1.1, z);
        leaf.castShadow = true;
        this.scene.add(leaf);
      }
    }
  }

  private inGrass(x: number, z: number): boolean {
    return GRASS_TILES.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  }

  update(dt: number) {
    this.elapsed += dt;
    for (const mat of this.windMats) {
      const sh = (mat.userData as { shader?: THREE.WebGLProgramParametersWithUniforms }).shader;
      if (sh) sh.uniforms.uTime.value = this.elapsed;
    }
    // gentle sprite bob
    this.player.material.rotation = 0;

    if (!this.active) return;
    let dx = 0;
    let dz = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) dz -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dz += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const len = Math.hypot(dx, dz);
      const nx = this.player.position.x + (dx / len) * this.speed * dt;
      const nz = this.player.position.z + (dz / len) * this.speed * dt;
      this.player.position.x = THREE.MathUtils.clamp(nx, -WORLD + 2, WORLD - 2);
      this.player.position.z = THREE.MathUtils.clamp(nz, -WORLD + 2, WORLD - 2);
      this.player.position.y = 0.95 + Math.abs(Math.sin(this.elapsed * 10)) * 0.12;
    }

    const p = this.player.position;
    this.camera.position.set(p.x, p.y + 15, p.z + 17);
    this.camera.lookAt(p.x, p.y, p.z - 2);

    this.stepCooldown = Math.max(0, this.stepCooldown - dt);
    if (moving && this.inGrass(p.x, p.z) && this.stepCooldown === 0) {
      this.stepCooldown = 0.35;
      if (Math.random() < 0.12) this.triggerEncounter();
    }
  }

  private triggerEncounter() {
    const speciesId = WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)];
    const level = 3 + Math.floor(Math.random() * 5);
    this.active = false;
    this.onEncounter?.({ speciesId, level });
  }

  resume() {
    this.active = true;
    this.stepCooldown = 0.5;
    this.keys.clear();
  }

  getPos(): { x: number; z: number } {
    return { x: this.player.position.x, z: this.player.position.z };
  }

  setPos(x: number, z: number) {
    this.player.position.x = x;
    this.player.position.z = z;
  }

  onResize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
