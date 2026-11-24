import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createShip } from './ships.js';

/* Player pawns and development models for both themes. */

const emissive = (register, color, intensity = 2.4) => {
  const m = register(new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  m.color.multiplyScalar(intensity);
  return m;
};

/** Character pawn kinds come from rules/data.js (saber, helmet, star, ship, shield, droid, bolt). */
export function createStarWarsPawn(color, kind, register) {
  const piece = new THREE.Group(),
    visual = new THREE.Group();
  piece.add(visual);
  const metal = register(
    new THREE.MeshStandardMaterial({ color: '#aab4be', metalness: 0.9, roughness: 0.28 }),
  );
  const dark = register(
    new THREE.MeshStandardMaterial({ color: '#1a222b', metalness: 0.7, roughness: 0.35 }),
  );
  const tint = register(
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.5,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.25,
    }),
  );
  const add = (geometry, material, x = 0, y = 0, z = 0, parent = visual) => {
    const mesh = new THREE.Mesh(register(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Base: machined puck with a glowing player-coloured collar.
  add(new THREE.CylinderGeometry(0.4, 0.46, 0.1, 40), dark, 0, 0.05, 0);
  add(
    new THREE.TorusGeometry(0.4, 0.028, 10, 48),
    emissive(register, color, 2.2),
    0,
    0.105,
    0,
  ).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.33, 0.36, 0.05, 36), metal, 0, 0.125, 0);
  const y0 = 0.15;
  if (kind === 'saber') {
    add(new THREE.CylinderGeometry(0.07, 0.085, 0.46, 18), metal, 0, y0 + 0.23, 0);
    for (const y of [0.1, 0.22, 0.34])
      add(new THREE.TorusGeometry(0.083, 0.012, 6, 20), dark, 0, y0 + y, 0).rotation.x =
        Math.PI / 2;
    add(new THREE.CylinderGeometry(0.095, 0.075, 0.06, 18), tint, 0, y0 + 0.49, 0);
    const blade = add(
      new THREE.CylinderGeometry(0.045, 0.045, 1.05, 14),
      emissive(register, color, 3.4),
      0,
      y0 + 1.04,
      0,
    );
    add(new THREE.SphereGeometry(0.045, 14, 8), emissive(register, color, 2.2), 0, y0 + 1.565, 0);
    blade.userData.blade = true;
  } else if (kind === 'helmet') {
    const shell = add(
      new THREE.SphereGeometry(0.32, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.82),
      dark,
      0,
      y0 + 0.5,
      0,
    );
    shell.scale.set(1, 1.05, 1.05);
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 28, 1, true), dark, 0, y0 + 0.2, 0);
    add(
      new THREE.BoxGeometry(0.46, 0.09, 0.05),
      emissive(register, color, 2.8),
      0,
      y0 + 0.52,
      0.29,
    );
    add(new THREE.ConeGeometry(0.07, 0.18, 10), metal, 0, y0 + 0.28, 0.32).rotation.x = Math.PI;
    add(new THREE.TorusGeometry(0.33, 0.03, 8, 30, Math.PI), tint, 0, y0 + 0.57, 0).rotation.x =
      Math.PI / 2;
  } else if (kind === 'star') {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.16 : 0.4,
        a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      i
        ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2,
    });
    const star = add(geo, tint, 0, y0 + 0.62, -0.045);
    star.castShadow = true;
    add(new THREE.CylinderGeometry(0.03, 0.05, 0.36, 10), metal, 0, y0 + 0.18, 0);
    add(new THREE.TorusGeometry(0.43, 0.012, 6, 40), emissive(register, color, 2), 0, y0 + 0.62, 0);
  } else if (kind === 'ship') {
    const ship = createShip('falcon', register);
    ship.scale.setScalar(0.95);
    ship.position.y = y0 + 0.5;
    ship.rotation.x = 0.12;
    visual.add(ship);
    add(new THREE.CylinderGeometry(0.03, 0.05, 0.34, 10), metal, 0, y0 + 0.17, 0);
  } else if (kind === 'shield') {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.5);
    shape.quadraticCurveTo(0.42, 0.42, 0.4, 0.05);
    shape.quadraticCurveTo(0.34, -0.3, 0, -0.5);
    shape.quadraticCurveTo(-0.34, -0.3, -0.4, 0.05);
    shape.quadraticCurveTo(-0.42, 0.42, 0, 0.5);
    add(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelSize: 0.03,
        bevelThickness: 0.03,
        bevelSegments: 2,
      }),
      tint,
      0,
      y0 + 0.62,
      -0.04,
    );
    add(
      new THREE.CylinderGeometry(0.02, 0.02, 0.62, 8),
      emissive(register, '#ffffff', 1.8),
      0,
      y0 + 0.62,
      0.07,
    );
    add(new THREE.CylinderGeometry(0.03, 0.05, 0.2, 10), metal, 0, y0 + 0.1, 0);
  } else if (kind === 'droid') {
    add(new THREE.CylinderGeometry(0.28, 0.3, 0.5, 28), metal, 0, y0 + 0.25, 0);
    add(new THREE.CylinderGeometry(0.285, 0.285, 0.12, 28), tint, 0, y0 + 0.3, 0);
    add(
      new THREE.SphereGeometry(0.28, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      metal,
      0,
      y0 + 0.5,
      0,
    );
    add(
      new THREE.CircleGeometry(0.07, 18),
      emissive(register, '#7fd8ff', 1.8),
      0.06,
      y0 + 0.66,
      0.255,
    ).lookAt(0.2, y0 + 0.7, 1);
    add(new THREE.BoxGeometry(0.18, 0.04, 0.02), tint, 0, y0 + 0.42, 0.29);
  } else {
    // bolt / default
    const shape = new THREE.Shape();
    shape.moveTo(0.1, 0.6);
    shape.lineTo(-0.22, 0.08);
    shape.lineTo(-0.02, 0.08);
    shape.lineTo(-0.12, -0.45);
    shape.lineTo(0.24, 0.12);
    shape.lineTo(0.03, 0.12);
    shape.closePath();
    add(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelSize: 0.02,
        bevelThickness: 0.02,
        bevelSegments: 2,
      }),
      emissive(register, color, 2.2),
      0,
      y0 + 0.55,
      -0.05,
    );
  }
  piece.userData.visual = visual;
  const ring = new THREE.Mesh(
    register(new THREE.TorusGeometry(0.56, 0.02, 8, 56)),
    emissive(register, color, 2.6),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  piece.add(ring);
  piece.userData.ring = ring;
  const beam = new THREE.Mesh(
    register(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 32, 1, true)),
    register(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  beam.position.y = 0.8;
  piece.add(beam);
  piece.userData.beam = beam;
  return piece;
}

/** Glossy classic board-game pawn (no cartoon face), used on the India board. */
export function createClassicPawn(color, register) {
  const piece = new THREE.Group(),
    visual = new THREE.Group();
  piece.add(visual);
  const enamel = register(
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
  );
  const points = [
    [0, 0.01],
    [0.3, 0.01],
    [0.33, 0.06],
    [0.3, 0.14],
    [0.2, 0.2],
    [0.13, 0.34],
    [0.12, 0.5],
    [0.18, 0.6],
    [0.2, 0.72],
    [0.15, 0.86],
    [0.2, 0.9],
    [0.2, 0.98],
    [0.15, 1.08],
    [0.08, 1.14],
    [0, 1.16],
  ];
  const body = new THREE.Mesh(
    register(
      new THREE.LatheGeometry(
        points.map(([r, h]) => new THREE.Vector2(r, h)),
        48,
      ),
    ),
    enamel,
  );
  body.castShadow = true;
  visual.add(body);
  const brass = register(
    new THREE.MeshStandardMaterial({ color: '#d4b06a', metalness: 0.9, roughness: 0.25 }),
  );
  const collar = new THREE.Mesh(register(new THREE.TorusGeometry(0.2, 0.02, 10, 40)), brass);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.73;
  visual.add(collar);
  piece.userData.visual = visual;
  const ring = new THREE.Mesh(
    register(new THREE.TorusGeometry(0.42, 0.018, 8, 48)),
    register(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.025;
  piece.add(ring);
  piece.userData.ring = ring;
  return piece;
}

/* --- Development models ------------------------------------------------ */

/** Star Wars: moisture-farm domes for outposts, a shield-generator citadel for a planetary base. */
export function createStarWarsDevelopment(level, register) {
  const group = new THREE.Group();
  const hotel = level === 5,
    count = hotel ? 1 : level;
  const hull = register(
    new THREE.MeshStandardMaterial({ color: '#b9c4cf', metalness: 0.7, roughness: 0.32 }),
  );
  const trim = register(
    new THREE.MeshStandardMaterial({ color: '#44515e', metalness: 0.8, roughness: 0.35 }),
  );
  const lit = register(new THREE.MeshBasicMaterial({ color: '#ffd89a', toneMapped: false }));
  lit.color.multiplyScalar(2.2);
  const cyan = register(new THREE.MeshBasicMaterial({ color: '#7fe3ff', toneMapped: false }));
  cyan.color.multiplyScalar(2.6);
  const put = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(register(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  if (hotel) {
    put(new THREE.CylinderGeometry(0.42, 0.5, 0.22, 8), trim, 0, 0.11, 0);
    put(new THREE.CylinderGeometry(0.3, 0.38, 0.6, 8), hull, 0, 0.5, 0);
    put(new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hull, 0, 0.8, 0);
    put(new THREE.TorusGeometry(0.34, 0.025, 8, 32), cyan, 0, 0.8, 0).rotation.x = Math.PI / 2;
    put(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 8), trim, 0, 1.28, 0);
    put(new THREE.SphereGeometry(0.05, 10, 8), cyan, 0, 1.55, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      put(
        new THREE.BoxGeometry(0.06, 0.1, 0.02),
        lit,
        Math.sin(a) * 0.385,
        0.5,
        Math.cos(a) * 0.385,
      ).rotation.y = a;
    }
  } else {
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.5;
      put(new THREE.CylinderGeometry(0.2, 0.23, 0.12, 10), trim, x, 0.06, 0);
      put(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hull, x, 0.12, 0);
      put(new THREE.BoxGeometry(0.1, 0.12, 0.04), lit, x, 0.2, 0.19);
      put(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6), trim, x + 0.08, 0.38, -0.05);
    }
  }
  return group;
}

/** India: pitched-roof houses; a hotel is a tiered palace with chhatri domes. */
export function createClassicDevelopment(level, register) {
  const group = new THREE.Group();
  const hotel = level === 5,
    count = hotel ? 1 : level;
  const wall = register(new THREE.MeshStandardMaterial({ color: '#f0e6cf', roughness: 0.6 }));
  const roofGreen = register(new THREE.MeshStandardMaterial({ color: '#2f8f63', roughness: 0.45 }));
  const roofRed = register(new THREE.MeshStandardMaterial({ color: '#c8452f', roughness: 0.4 }));
  const gold = register(
    new THREE.MeshStandardMaterial({ color: '#e0b457', metalness: 0.9, roughness: 0.25 }),
  );
  const win = register(new THREE.MeshStandardMaterial({ color: '#2a3a4a', roughness: 0.3 }));
  const put = (geometry, material, x, y, z, rx = 0, ry = 0) => {
    const mesh = new THREE.Mesh(register(geometry), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  if (hotel) {
    put(new RoundedBoxGeometry(1.15, 0.42, 0.7, 2, 0.02), wall, 0, 0.21, 0);
    put(new RoundedBoxGeometry(0.85, 0.36, 0.55, 2, 0.02), wall, 0, 0.6, 0);
    put(new THREE.BoxGeometry(1.2, 0.05, 0.75), gold, 0, 0.43, 0);
    put(new THREE.BoxGeometry(0.9, 0.05, 0.6), gold, 0, 0.79, 0);
    put(
      new THREE.SphereGeometry(0.28, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      roofRed,
      0,
      0.82,
      0,
    ).scale.set(1.2, 1.15, 0.85);
    put(new THREE.ConeGeometry(0.03, 0.2, 8), gold, 0, 1.28, 0);
    for (const x of [-0.5, 0.5]) {
      put(new THREE.CylinderGeometry(0.07, 0.07, 0.36, 12), wall, x, 0.6, 0.18);
      put(
        new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        gold,
        x,
        0.78,
        0.18,
      );
    }
    for (let i = -2; i <= 2; i++)
      put(new THREE.BoxGeometry(0.1, 0.16, 0.02), win, i * 0.2, 0.22, 0.355);
  } else {
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.46;
      put(new RoundedBoxGeometry(0.38, 0.28, 0.34, 2, 0.015), wall, x, 0.14, 0);
      const roof = put(
        new THREE.ConeGeometry(0.3, 0.22, 4),
        i % 2 ? roofRed : roofGreen,
        x,
        0.39,
        0,
        0,
        Math.PI / 4,
      );
      roof.scale.set(1.05, 1, 0.95);
      put(new THREE.BoxGeometry(0.09, 0.14, 0.02), win, x, 0.1, 0.175);
    }
  }
  return group;
}

export function createDie(
  textureFor,
  register,
  { solidColor = '#ffffff', emissiveBoost = 0, rough = 0.35 } = {},
) {
  const order = [4, 3, 1, 6, 2, 5];
  const materials = order.map((value) => {
    const map = register(textureFor(value));
    return register(
      new THREE.MeshStandardMaterial({
        map,
        color: solidColor,
        roughness: rough,
        metalness: 0.05,
        emissive: '#ffffff',
        emissiveMap: emissiveBoost ? map : null,
        emissiveIntensity: emissiveBoost,
      }),
    );
  });
  const die = new THREE.Mesh(register(new RoundedBoxGeometry(1.2, 1.2, 1.2, 4, 0.16)), materials);
  die.castShadow = true;
  return die;
}
