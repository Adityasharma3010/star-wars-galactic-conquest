import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { diceRotation } from './three/layout.js';
import { makeSurface } from './three/common.js';

/**
 * A tiny real-time 3D dice tray: two rounded ivory dice with dimpled pips, soft contact shadows and
 * image-based lighting. It renders on demand (only while a roll is animating), so it costs nothing
 * when idle. Used by every view so dice look the same on the 2D board, the 3D dock and the table.
 */

const PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
// Material order of the box faces: +x, -x, +y, -y, +z, -z
const FACE_ORDER = [4, 3, 1, 6, 2, 5];

function faceTextures(value, theme) {
  const size = 256;
  const color = makeSurface(size, size, 8);
  const bump = makeSurface(size, size, 4);
  color.ctx.fillStyle = theme.face;
  color.ctx.fillRect(0, 0, size, size);
  const wash = color.ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.15,
    size / 2,
    size / 2,
    size * 0.75,
  );
  wash.addColorStop(0, 'rgba(255,255,255,0)');
  wash.addColorStop(1, 'rgba(120,100,70,0.10)');
  color.ctx.fillStyle = wash;
  color.ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = '#ffffff';
  bump.ctx.fillRect(0, 0, size, size);
  const step = size / 4;
  for (const n of PATTERNS[value]) {
    const x = step + (n % 3) * step,
      y = step + Math.floor(n / 3) * step,
      r = size * (value === 1 ? 0.125 : 0.098);
    const pip = color.ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    pip.addColorStop(0, theme.pipLight);
    pip.addColorStop(1, theme.pip);
    color.ctx.fillStyle = pip;
    color.ctx.beginPath();
    color.ctx.arc(x, y, r, 0, Math.PI * 2);
    color.ctx.fill();
    const dimple = bump.ctx.createRadialGradient(x, y, 0, x, y, r * 1.25);
    dimple.addColorStop(0, '#000');
    dimple.addColorStop(0.75, '#444');
    dimple.addColorStop(1, '#fff');
    bump.ctx.fillStyle = dimple;
    bump.ctx.beginPath();
    bump.ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
    bump.ctx.fill();
  }
  color.texture.needsUpdate = true;
  bump.texture.colorSpace = THREE.NoColorSpace;
  bump.texture.needsUpdate = true;
  return { map: color.texture, bump: bump.texture };
}

const THEMES = {
  starwars: { face: '#f4f8fc', pip: '#0b2236', pipLight: '#35566f' },
  classic: { face: '#fbf1d9', pip: '#7a1a10', pipLight: '#c4473a' },
};

export function createDiceScene(canvas, { classic = false, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  const camera = new THREE.PerspectiveCamera(26, 2.2, 0.1, 40);
  camera.position.set(0, 2.7, 3.05);
  camera.lookAt(0, 0.05, 0);
  const key = new THREE.DirectionalLight('#fff4e0', 2.4);
  key.position.set(2.5, 5, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 14 });
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  scene.add(key, new THREE.HemisphereLight('#ffffff', '#9aa7b8', 0.45));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.ShadowMaterial({ opacity: 0.42 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const theme = THEMES[classic ? 'classic' : 'starwars'];
  const owned = [floor.geometry, floor.material, environment];
  const geometry = new RoundedBoxGeometry(1, 1, 1, 6, 0.16);
  owned.push(geometry);
  const faceCache = new Map();
  const materialsFor = (value) => {
    if (!faceCache.has(value)) {
      const { map, bump } = faceTextures(value, theme);
      const material = new THREE.MeshPhysicalMaterial({
        map,
        bumpMap: bump,
        bumpScale: 3,
        roughness: 0.3,
        metalness: 0,
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
        envMapIntensity: 0.9,
      });
      owned.push(map, bump, material);
      faceCache.set(value, material);
    }
    return faceCache.get(value);
  };
  // Each die gets six materials; the face under each slot is fixed, so we orient the die instead.
  const dice = [0, 1].map((i) => {
    const mesh = new THREE.Mesh(
      geometry,
      FACE_ORDER.map((v) => materialsFor(v)),
    );
    mesh.castShadow = true;
    mesh.position.set(i ? 0.82 : -0.82, 0, i ? -0.06 : 0.06);
    scene.add(mesh);
    return mesh;
  });

  let disposed = false,
    width = 0,
    height = 0;
  const render = () => {
    if (!disposed && width) renderer.render(scene, camera);
  };
  const resize = (w, h) => {
    if (!w || !h) return;
    width = w;
    height = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1.6 ? 36 : 27;
    camera.updateProjectionMatrix();
    render();
  };

  const yaw = [0.42, -0.3];
  const finalQuaternion = (value, i) => {
    const [x, y, z] = diceRotation(value) || [0, 0, 0];
    const face = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    return new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw[i])
      .multiply(face);
  };
  const tweens = [];
  const stop = () => {
    tweens.splice(0).forEach((t) => t.kill());
  };
  const setValues = (values, animate) => {
    stop();
    dice.forEach((die, i) => {
      const end = finalQuaternion(values[i], i);
      const home = new THREE.Vector3(i ? 0.82 : -0.82, 0, i ? -0.06 : 0.06);
      if (!animate || reduced) {
        die.quaternion.copy(end);
        die.position.copy(home);
        return;
      }
      const axis = new THREE.Vector3(i ? -0.6 : 0.7, 1, i ? 0.8 : -0.4).normalize();
      const spin = new THREE.Quaternion();
      const state = { t: 0 };
      tweens.push(
        gsap.to(state, {
          t: 1,
          duration: 1.05 + i * 0.12,
          ease: 'power3.out',
          onUpdate: () => {
            spin.setFromAxisAngle(axis, (1 - state.t) * (1 - state.t) * Math.PI * (7 + i * 2));
            die.quaternion.copy(spin).multiply(end);
            render();
          },
        }),
        gsap.fromTo(
          die.position,
          { x: home.x + (i ? 1.8 : -1.8), y: 2.4, z: home.z + 0.9 },
          {
            x: home.x,
            y: 0,
            z: home.z,
            duration: 1.0 + i * 0.12,
            ease: 'bounce.out',
            onUpdate: render,
          },
        ),
      );
    });
    render();
  };

  return {
    resize,
    setValues,
    render,
    dispose() {
      disposed = true;
      stop();
      owned.forEach((r) => r.dispose?.());
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
