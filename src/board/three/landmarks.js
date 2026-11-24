import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* Tiny procedural monuments, one archetype per city. Each fits in a ~1 x 1 x 1 footprint. */

export const LANDMARK_FOR = {
  'New Delhi': 'gate',
  Mumbai: 'gateway',
  Hyderabad: 'charminar',
  Jaipur: 'hawa',
  Kolkata: 'bridge',
  Chandigarh: 'hand',
  Bhopal: 'mosque',
  Lucknow: 'mosque',
  Bengaluru: 'dome',
  Raipur: 'dome',
  Chennai: 'gopuram',
  Thiruvananthapuram: 'gopuram',
  Gandhinagar: 'shikhara',
  Bhubaneswar: 'shikhara',
  Ranchi: 'shikhara',
  Patna: 'golghar',
  Gangtok: 'stupa',
  Itanagar: 'stupa',
  Kohima: 'church',
  Panaji: 'church',
  Shimla: 'church',
  Shillong: 'pines',
};

export function createLandmark(city, register) {
  const kind = LANDMARK_FOR[city] || 'dome';
  const g = new THREE.Group();
  const std = (color, extra = {}) =>
    register(new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra }));
  const sandstone = std('#e0b184'),
    pink = std('#e69a94'),
    white = std('#f4efe6'),
    basalt = std('#8a8478'),
    gold = std('#e3b857', { metalness: 0.9, roughness: 0.25 }),
    green = std('#3b8a5c'),
    dark = std('#2d2a28'),
    red = std('#b5503a');
  const put = (geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(register(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const dome = (r, material, x, y, z) =>
    put(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), material, x, y, z);
  const spire = (h, material, x, y, z) =>
    put(new THREE.ConeGeometry(0.025, h, 8), material, x, y + h / 2, z);
  const archShape = (w, h, hole) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.lineTo(-w / 2, h);
    s.closePath();
    const p = new THREE.Path();
    p.moveTo(-hole / 2, 0);
    p.lineTo(-hole / 2, h * 0.5);
    p.absarc(0, h * 0.5, hole / 2, Math.PI, 0, true);
    p.lineTo(hole / 2, 0);
    p.closePath();
    s.holes.push(p);
    return s;
  };
  switch (kind) {
    case 'gate': {
      put(
        new THREE.ExtrudeGeometry(archShape(0.9, 1, 0.5), { depth: 0.3, bevelEnabled: false }),
        sandstone,
        0,
        0,
        -0.15,
      );
      put(new THREE.BoxGeometry(1, 0.08, 0.4), sandstone, 0, 1.02, 0);
      put(new THREE.BoxGeometry(0.96, 0.04, 0.36), dark, 0, 1.08, 0);
      break;
    }
    case 'gateway': {
      put(
        new THREE.ExtrudeGeometry(archShape(1.05, 0.85, 0.5), { depth: 0.34, bevelEnabled: false }),
        basalt,
        0,
        0,
        -0.17,
      );
      for (const x of [-0.5, 0.5])
        for (const z of [-0.14, 0.14]) {
          put(new THREE.CylinderGeometry(0.07, 0.07, 1.05, 10), basalt, x, 0.52, z);
          dome(0.09, basalt, x, 1.04, z);
        }
      break;
    }
    case 'charminar': {
      put(new THREE.BoxGeometry(0.8, 0.55, 0.8), sandstone, 0, 0.275, 0);
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        put(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 12), sandstone, sx * 0.4, 0.5, sz * 0.4);
        put(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), sandstone, sx * 0.4, 0.78, sz * 0.4);
        dome(0.085, white, sx * 0.4, 1.0, sz * 0.4);
        spire(0.14, gold, sx * 0.4, 1.08, sz * 0.4);
      }
      put(new THREE.BoxGeometry(0.34, 0.22, 0.34), sandstone, 0, 0.66, 0);
      dome(0.15, white, 0, 0.77, 0);
      break;
    }
    case 'hawa': {
      for (let i = 0; i < 5; i++) {
        const w = 1 - i * 0.14;
        put(new THREE.BoxGeometry(w, 0.2, 0.22 - i * 0.02), pink, 0, 0.1 + i * 0.2, 0);
        for (let k = -2; k <= 2; k++)
          if (Math.abs(k) * 0.2 < w / 2 - 0.06)
            put(
              new THREE.BoxGeometry(0.07, 0.1, 0.02),
              dark,
              k * 0.19,
              0.12 + i * 0.2,
              0.12 - i * 0.01,
            );
        dome(0.06, pink, -w / 2 + 0.07, 0.2 + i * 0.2, 0);
        dome(0.06, pink, w / 2 - 0.07, 0.2 + i * 0.2, 0);
      }
      break;
    }
    case 'bridge': {
      put(new THREE.BoxGeometry(1.2, 0.06, 0.2), dark, 0, 0.1, 0);
      for (const x of [-0.42, 0.42]) {
        put(new THREE.BoxGeometry(0.08, 0.85, 0.22), red, x, 0.45, 0);
        put(new THREE.BoxGeometry(0.1, 0.05, 0.26), red, x, 0.88, 0);
      }
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.42, 0.88, 0),
        new THREE.Vector3(0, 0.2, 0),
        new THREE.Vector3(0.42, 0.88, 0),
      );
      put(new THREE.TubeGeometry(curve, 24, 0.014, 6), red, 0, 0, 0.1);
      put(new THREE.TubeGeometry(curve, 24, 0.014, 6), red, 0, 0, -0.1);
      break;
    }
    case 'hand': {
      put(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 10), white, 0, 0.45, 0);
      put(new THREE.BoxGeometry(0.34, 0.5, 0.04), white, 0, 1.05, 0);
      for (let i = -2; i <= 2; i++)
        put(new THREE.BoxGeometry(0.05, 0.28, 0.04), white, i * 0.08, 1.42, 0);
      put(new THREE.BoxGeometry(0.1, 0.22, 0.04), white, -0.22, 1.26, 0).rotation.z = 0.5;
      break;
    }
    case 'mosque': {
      put(new THREE.BoxGeometry(0.9, 0.4, 0.5), white, 0, 0.2, 0);
      dome(0.2, white, 0, 0.4, 0);
      dome(0.12, white, -0.28, 0.4, 0);
      dome(0.12, white, 0.28, 0.4, 0);
      for (const x of [-0.5, 0.5]) {
        put(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 12), pink, x, 0.5, 0.2);
        dome(0.07, white, x, 1.0, 0.2);
        spire(0.12, gold, x, 1.06, 0.2);
      }
      break;
    }
    case 'dome': {
      put(new THREE.BoxGeometry(1.0, 0.4, 0.55), sandstone, 0, 0.2, 0);
      for (let i = -2; i <= 2; i++)
        put(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 8), white, i * 0.2, 0.2, 0.3);
      put(new THREE.BoxGeometry(0.4, 0.24, 0.4), sandstone, 0, 0.52, 0);
      dome(0.22, green, 0, 0.64, 0);
      spire(0.16, gold, 0, 0.86, 0);
      break;
    }
    case 'gopuram': {
      for (let i = 0; i < 6; i++) {
        const w = 0.9 - i * 0.12;
        put(
          new THREE.BoxGeometry(w, 0.15, w * 0.62),
          i % 2 ? red : sandstone,
          0,
          0.075 + i * 0.15,
          0,
        );
        put(new THREE.BoxGeometry(w + 0.04, 0.03, w * 0.62 + 0.04), white, 0, 0.15 + i * 0.15, 0);
      }
      put(
        new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12, 1, false, 0, Math.PI),
        gold,
        0,
        1.0,
        0,
      ).rotation.z = Math.PI / 2;
      for (let k = 0; k < 3; k++) spire(0.12, gold, (k - 1) * 0.12, 1.0, 0);
      break;
    }
    case 'shikhara': {
      const pts = [
        [0.38, 0],
        [0.34, 0.3],
        [0.26, 0.6],
        [0.2, 0.85],
        [0.15, 1.05],
        [0.1, 1.2],
        [0.04, 1.28],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      put(new THREE.LatheGeometry(pts, 16), sandstone, 0, 0, 0);
      put(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 16), white, 0, 1.0, 0);
      spire(0.18, gold, 0, 1.26, 0);
      put(new THREE.BoxGeometry(0.7, 0.14, 0.5), sandstone, 0, 0.07, 0.32);
      break;
    }
    case 'golghar': {
      put(new THREE.SphereGeometry(0.46, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, 0, 0);
      put(new THREE.CylinderGeometry(0.08, 0.1, 0.1, 10), white, 0, 0.46, 0);
      put(new THREE.BoxGeometry(0.7, 0.04, 0.05), sandstone, 0, 0.22, 0.4).rotation.x = -0.9;
      break;
    }
    case 'stupa': {
      put(new THREE.CylinderGeometry(0.46, 0.5, 0.12, 20), sandstone, 0, 0.06, 0);
      dome(0.36, white, 0, 0.12, 0);
      put(new THREE.BoxGeometry(0.2, 0.14, 0.2), gold, 0, 0.5, 0);
      put(new THREE.ConeGeometry(0.1, 0.4, 12), gold, 0, 0.76, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        put(
          new THREE.BoxGeometry(0.04, 0.04, 0.025),
          [red, white, green, gold, dark, red][i],
          Math.sin(a) * 0.3,
          0.62,
          Math.cos(a) * 0.3,
        );
      }
      break;
    }
    case 'church': {
      put(new THREE.BoxGeometry(0.5, 0.4, 0.8), white, 0, 0.2, 0.1);
      const roof = put(new THREE.ConeGeometry(0.42, 0.28, 4), red, 0, 0.54, 0.1);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1, 1, 1.5);
      put(new THREE.BoxGeometry(0.22, 0.75, 0.22), white, 0, 0.375, -0.34);
      put(new THREE.ConeGeometry(0.17, 0.35, 4), red, 0, 0.92, -0.34).rotation.y = Math.PI / 4;
      put(new THREE.BoxGeometry(0.02, 0.14, 0.02), gold, 0, 1.17, -0.34);
      put(new THREE.BoxGeometry(0.08, 0.02, 0.02), gold, 0, 1.19, -0.34);
      break;
    }
    case 'pines': {
      for (const [x, z, s] of [
        [-0.25, 0.05, 1],
        [0.2, -0.1, 0.85],
        [0.02, 0.28, 0.7],
      ]) {
        put(new THREE.CylinderGeometry(0.03, 0.04, 0.2 * s, 6), dark, x, 0.1 * s, z);
        for (let i = 0; i < 3; i++)
          put(
            new THREE.ConeGeometry((0.26 - i * 0.05) * s, 0.36 * s, 8),
            green,
            x,
            (0.3 + i * 0.22) * s,
            z,
          );
      }
      break;
    }
    default:
      dome(0.3, white, 0, 0, 0);
  }
  return g;
}
