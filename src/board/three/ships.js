import * as THREE from 'three';

/* Procedural starship models. Each ship faces +Z and is roughly 1 unit long. */

const hull = (register, color = '#8d98a3', extra = {}) =>
  register(new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.75, ...extra }));
const glow = (register, color) => {
  const material = register(new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  material.color.multiplyScalar(3);
  return material;
};

function wedge(length, width, height, register, material) {
  const shape = new THREE.Shape();
  shape.moveTo(0, length / 2);
  shape.lineTo(width / 2, -length / 2);
  shape.lineTo(-width / 2, -length / 2);
  shape.closePath();
  const geometry = register(
    new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelThickness: height * 0.25,
      bevelSize: width * 0.015,
      bevelSegments: 1,
    }),
  );
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height / 2, 0);
  geometry.rotateY(0);
  const mesh = new THREE.Mesh(geometry, material);
  // Shape lives in XY; after rotateX the long axis points along Z.
  mesh.rotation.y = 0;
  return mesh;
}

export function createShip(kind, register) {
  const group = new THREE.Group();
  const add = (geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(register(geometry), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  if (kind === 'falcon') {
    const m = hull(register, '#c9ced4', { roughness: 0.5, metalness: 0.55 });
    const dark = hull(register, '#6d7680');
    add(new THREE.CylinderGeometry(0.42, 0.46, 0.09, 40), m, 0, 0, -0.05);
    add(new THREE.CylinderGeometry(0.3, 0.34, 0.05, 32), dark, 0, 0.065, -0.05);
    for (const x of [-0.17, 0.17]) add(new THREE.BoxGeometry(0.15, 0.07, 0.5), m, x, 0, 0.45);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 14), m, 0.3, 0.02, 0.28).rotation.x =
      Math.PI / 2;
    add(new THREE.SphereGeometry(0.06, 14, 10), dark, 0.3, 0.02, 0.46);
    add(new THREE.BoxGeometry(0.5, 0.04, 0.05), glow(register, '#7fd0ff'), 0, 0, -0.5);
  } else if (kind === 'destroyer' || kind === 'executor') {
    const big = kind === 'executor';
    const m = hull(register, big ? '#59626d' : '#8e98a3');
    const body = wedge(big ? 1.5 : 1.1, big ? 0.62 : 0.55, 0.08, register, m);
    group.add(body);
    add(new THREE.BoxGeometry(0.18, 0.1, 0.22), m, 0, 0.1, big ? -0.5 : -0.34);
    add(new THREE.BoxGeometry(0.3, 0.035, 0.07), m, 0, 0.18, big ? -0.5 : -0.34);
    for (const x of [-0.12, 0, 0.12])
      add(
        new THREE.BoxGeometry(0.07, 0.07, 0.04),
        glow(register, '#86d4ff'),
        x,
        0.04,
        big ? -0.76 : -0.57,
      );
  } else if (kind === 'blockade') {
    const m = hull(register, '#c0463a', { metalness: 0.4, roughness: 0.5 });
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 18), m, 0, 0, 0).rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.62, 0.07, 0.12), m, 0, 0, 0.42);
    for (const x of [-0.33, 0.33])
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), m, x, 0, 0.42);
    add(new THREE.BoxGeometry(0.12, 0.05, 0.05), glow(register, '#ffb070'), 0, 0, -0.42);
  } else if (kind === 'tie') {
    const m = hull(register, '#58616b', { roughness: 0.55 });
    add(new THREE.SphereGeometry(0.14, 20, 14), m);
    for (const x of [-0.26, 0.26]) {
      const panel = add(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 6), m, x, 0, 0);
      panel.rotation.z = Math.PI / 2;
    }
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 8), m).rotation.z = Math.PI / 2;
  } else if (kind === 'xwing') {
    const m = hull(register, '#d9dde0', { roughness: 0.4, metalness: 0.5 });
    const red = hull(register, '#c2483c');
    add(new THREE.CylinderGeometry(0.05, 0.09, 0.9, 14), m, 0, 0, 0).rotation.x = Math.PI / 2;
    add(new THREE.ConeGeometry(0.05, 0.28, 14), m, 0, 0, 0.58).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const wing = add(new THREE.BoxGeometry(0.42, 0.015, 0.3), m, sx * 0.24, sy * 0.1, -0.2);
        wing.rotation.z = -sx * sy * 0.22;
        add(
          new THREE.CylinderGeometry(0.035, 0.035, 0.38, 10),
          red,
          sx * 0.44,
          sy * 0.19,
          -0.2,
        ).rotation.x = Math.PI / 2;
        add(
          new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8),
          glow(register, '#ff7d5c'),
          sx * 0.44,
          sy * 0.19,
          -0.4,
        ).rotation.x = Math.PI / 2;
      }
  }
  return group;
}
