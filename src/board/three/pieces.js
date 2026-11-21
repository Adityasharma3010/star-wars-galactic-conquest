import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { diceSurface } from './textures.js';

export function createPiece(color, classic, badgeSvg, register) {
  const piece = new THREE.Group();
  if (classic) {
    const material = register(
      new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.35 }),
    );
    const baseMaterial = register(
      new THREE.MeshStandardMaterial({ color: '#536451', roughness: 0.4, metalness: 0.3 }),
    );
    const base = new THREE.Mesh(
      register(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 24)),
      baseMaterial,
    );
    base.position.y = 0.16;
    piece.add(base);
    const body = new THREE.Mesh(register(new THREE.CapsuleGeometry(0.12, 0.14, 6, 12)), material);
    body.position.y = 0.3;
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    piece.add(body);
  }
  const ringMaterial = register(
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  const ring = new THREE.Mesh(register(new THREE.TorusGeometry(0.25, 0.02, 8, 32)), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  piece.add(ring);
  piece.userData.ring = ring;
  if (!classic && badgeSvg) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const texture = register(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      register(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })),
    );
    sprite.scale.set(0.5, 0.5, 1);
    sprite.position.y = 0.7;
    piece.add(sprite);
    const svg = new Image();
    svg.onload = () => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.drawImage(svg, 0, 0, 128, 128);
      texture.needsUpdate = true;
    };
    svg.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(badgeSvg.replace('currentColor', color).replaceAll('currentColor', color));
  }
  return piece;
}
export function createBuildings(level, classic, register) {
  const buildings = new THREE.Group();
  const hotel = level === 5,
    count = hotel ? 1 : level;
  if (!classic) {
    const light = register(
      new THREE.LineBasicMaterial({
        color: hotel ? '#bdacff' : '#77e8ff',
        transparent: true,
        opacity: 0.85,
      }),
    );
    for (let index = 0; index < count; index++) {
      const geometry = register(
        new THREE.BoxGeometry(hotel ? 0.7 : 0.27, hotel ? 0.8 : 0.4, hotel ? 0.55 : 0.24),
      );
      const marker = new THREE.LineSegments(register(new THREE.EdgesGeometry(geometry)), light);
      marker.position.set(hotel ? 0 : (index - (count - 1) / 2) * 0.38, hotel ? 0.43 : 0.23, 0);
      buildings.add(marker);
    }
    return buildings;
  }
  const wall = register(
    new THREE.MeshStandardMaterial({
      color: classic ? (hotel ? '#ba4e46' : '#4e9770') : '#c3b496',
      roughness: 0.7,
    }),
  );
  const roof = register(
    new THREE.MeshStandardMaterial({
      color: classic ? (hotel ? '#833632' : '#255a43') : '#899a9e',
      roughness: 0.5,
    }),
  );
  const windowMaterial = register(
    new THREE.MeshStandardMaterial({
      color: classic ? '#fff2bf' : '#85d6ec',
      emissive: classic ? '#5a4613' : '#164c61',
      emissiveIntensity: 0.5,
    }),
  );
  for (let index = 0; index < count; index++) {
    const building = new THREE.Group();
    const size = hotel ? 0.7 : 0.38;
    const body = new THREE.Mesh(
      register(new THREE.BoxGeometry(size, hotel ? 0.6 : 0.32, size)),
      wall,
    );
    body.position.y = hotel ? 0.3 : 0.16;
    body.castShadow = true;
    building.add(body);
    if (classic) {
      const cap = new THREE.Mesh(register(new THREE.ConeGeometry(size * 0.8, 0.25, 4)), roof);
      cap.position.y = hotel ? 0.72 : 0.44;
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      building.add(cap);
    } else {
      const cap = new THREE.Mesh(
        register(
          hotel
            ? new THREE.BoxGeometry(size * 1.14, 0.13, size * 1.14)
            : new THREE.SphereGeometry(size / 2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        ),
        roof,
      );
      cap.position.y = hotel ? 0.65 : 0.32;
      cap.castShadow = true;
      building.add(cap);
    }
    const window = new THREE.Mesh(
      register(new THREE.BoxGeometry(size * 0.45, 0.12, 0.025)),
      windowMaterial,
    );
    window.position.set(0, 0.2, size / 2 + 0.01);
    building.add(window);
    building.position.x = hotel ? 0 : (index - (count - 1) / 2) * 0.42;
    buildings.add(building);
  }
  return buildings;
}
export function createDice(register) {
  const materials = [4, 3, 1, 6, 2, 5].map((value) => {
    const surface = diceSurface(value);
    register(surface.texture);
    return register(
      new THREE.MeshStandardMaterial({ map: surface.texture, roughness: 0.35, metalness: 0.05 }),
    );
  });
  const dice = new THREE.Mesh(
    register(new RoundedBoxGeometry(0.95, 0.95, 0.95, 2, 0.08)),
    materials,
  );
  dice.castShadow = true;
  return dice;
}
