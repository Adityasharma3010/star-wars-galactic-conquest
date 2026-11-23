import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { diceSurface } from './textures.js';
import { hologramMaterial } from './hologram.js';

export function createPiece(color, classic, register) {
  const piece = new THREE.Group();
  const visual = new THREE.Group();
  const enamel = classic
    ? register(
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.25,
          metalness: 0.08,
          clearcoat: 0.85,
          clearcoatRoughness: 0.2,
        }),
      )
    : hologramMaterial(color, register);
  const mesh = (geometry, material, x, y, z) => {
    const object = new THREE.Mesh(register(geometry), material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = classic;
    visual.add(object);
    return object;
  };
  const points = [
    [0, 0.02],
    [0.31, 0.02],
    [0.34, 0.09],
    [0.32, 0.19],
    [0.23, 0.25],
    [0.17, 0.43],
    [0.19, 0.61],
    [0.29, 0.72],
    [0.32, 0.89],
    [0.26, 1.08],
    [0.12, 1.18],
    [0, 1.21],
  ];
  mesh(
    new THREE.LatheGeometry(
      points.map(([radius, height]) => new THREE.Vector2(radius, height)),
      40,
    ),
    enamel,
    0,
    0,
    0,
  );
  const base = register(
    new THREE.MeshStandardMaterial({
      color: classic ? '#c8a76a' : '#c6b48a',
      metalness: 0.65,
      roughness: 0.32,
    }),
  );
  mesh(new THREE.TorusGeometry(0.31, 0.026, 8, 40), base, 0, 0.13, 0).rotation.x = Math.PI / 2;
  const white = register(new THREE.MeshStandardMaterial({ color: '#fffdf2', roughness: 0.25 }));
  const pupil = register(new THREE.MeshStandardMaterial({ color: '#152532', roughness: 0.23 }));
  for (const x of [-0.12, 0.12]) {
    mesh(new THREE.SphereGeometry(0.095, 20, 12), white, x, 0.85, 0.275);
    mesh(new THREE.SphereGeometry(0.045, 16, 10), pupil, x + 0.012, 0.842, 0.355);
  }
  piece.add(visual);
  piece.userData.visual = visual;
  const ringMaterial = register(
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  const ring = new THREE.Mesh(register(new THREE.TorusGeometry(0.39, 0.018, 8, 40)), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.025;
  piece.add(ring);
  piece.userData.ring = ring;
  if (!classic) {
    const glow = new THREE.Mesh(
      register(new THREE.ConeGeometry(0.35, 0.42, 24, 1, true)),
      register(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.09,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
    );
    glow.position.y = -0.18;
    glow.rotation.z = Math.PI;
    piece.add(glow);
    const source = new THREE.Mesh(
      register(new THREE.RingGeometry(0.12, 0.21, 32)),
      register(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    source.rotation.x = -Math.PI / 2;
    source.position.y = -0.39;
    piece.add(source);
  }
  return piece;
}
export function createBuildings(level, classic, register) {
  const buildings = new THREE.Group();
  const hotel = level === 5,
    count = hotel ? 1 : level;
  const wall = classic
    ? register(
        new THREE.MeshStandardMaterial({
          color: hotel ? '#b9473d' : '#36876b',
          roughness: 0.36,
        }),
      )
    : hologramMaterial(hotel ? '#ce858a' : '#66b7ac', register);
  const roof = classic
    ? register(
        new THREE.MeshStandardMaterial({
          color: hotel ? '#893d34' : '#225944',
          roughness: 0.5,
        }),
      )
    : hologramMaterial(hotel ? '#b171ad' : '#438d9d', register);
  const windowMaterial = register(
    new THREE.MeshStandardMaterial({
      color: '#fff2cf',
    }),
  );
  for (let index = 0; index < count; index++) {
    const building = new THREE.Group();
    const size = hotel ? 0.82 : classic ? 0.4 : 0.28;
    const body = new THREE.Mesh(
      register(new RoundedBoxGeometry(size, hotel ? 0.75 : 0.4, size, 2, 0.03)),
      wall,
    );
    body.position.y = hotel ? 0.375 : 0.2;
    body.castShadow = classic;
    building.add(body);
    {
      const cap = new THREE.Mesh(register(new THREE.ConeGeometry(size * 0.8, 0.25, 4)), roof);
      cap.position.y = hotel ? 0.84 : 0.5;
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = classic;
      building.add(cap);
    }
    const window = new THREE.Mesh(
      register(new THREE.BoxGeometry(size * 0.45, 0.12, 0.025)),
      windowMaterial,
    );
    window.position.set(0, hotel ? 0.35 : 0.17, size / 2 + 0.01);
    building.add(window);
    building.position.x = hotel ? 0 : (index - (count - 1) / 2) * (classic ? 0.46 : 0.34);
    buildings.add(building);
  }
  return buildings;
}
export function createDice(register, classic = true) {
  const materials = [4, 3, 1, 6, 2, 5].map((value) => {
    const surface = diceSurface(value);
    register(surface.texture);
    return classic
      ? register(
          new THREE.MeshStandardMaterial({
            map: surface.texture,
            roughness: 0.35,
            metalness: 0.05,
          }),
        )
      : hologramMaterial('#b6d6e7', register, {
          map: surface.texture,
          emissiveIntensity: 0.12,
          opacity: 0.92,
        });
  });
  const dice = new THREE.Mesh(register(new RoundedBoxGeometry(1.2, 1.2, 1.2, 3, 0.13)), materials);
  dice.castShadow = true;
  return dice;
}
