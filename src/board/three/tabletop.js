import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasSurface, paintCenter } from './textures.js';

export function createFurniture(scene, classic, register) {
  if (!classic) {
    createHoloFurniture(scene, register);
    return;
  }
  const material = (color, roughness = 0.6, metalness = 0) =>
    register(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  const block = (width, height, depth, mat, x, y, z, radius = 0.06) => {
    const mesh = new THREE.Mesh(
      register(new RoundedBoxGeometry(width, height, depth, 2, radius)),
      mat,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const wood = canvasSurface(512, 512);
  const ctx = wood.context;
  ctx.fillStyle = classic ? '#66523d' : '#353d43';
  ctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 512; row++) {
    const tone = 2 + Math.sin(row * 1.7) + Math.sin(row * 0.71);
    ctx.strokeStyle = `rgba(14,9,6,${tone / 160})`;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const y = row + Math.sin(x * 0.016 + row * 0.025) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  wood.texture.wrapS = wood.texture.wrapT = THREE.RepeatWrapping;
  wood.texture.repeat.set(8, 8);
  register(wood.texture);
  const tableMat = register(new THREE.MeshStandardMaterial({ map: wood.texture, roughness: 0.85 }));
  block(100, 0.4, 100, tableMat, 0, -1.1, 0, 0.15);
  block(25.3, 0.8, 25.3, material(classic ? '#4b3524' : '#25383d', 0.38), 0, -0.4, 0, 0.18);
  block(25.05, 0.07, 25.05, material('#b89a63', 0.32, 0.5), 0, 0.025, 0, 0.09);
  block(24.84, 0.08, 24.84, material('#e8e1cc'), 0, 0.095, 0, 0.07);

  const center = canvasSurface(1024, 1024);
  paintCenter(center, classic);
  register(center.texture);
  const felt = register(
    new THREE.MeshStandardMaterial({ map: center.texture, roughness: 0.95, metalness: 0 }),
  );
  block(17.96, 0.035, 17.96, felt, 0, 0.16, 0, 0.025);

  for (const [index, label] of (classic
    ? ['CHANCE', 'COMMUNITY CHEST']
    : ['FORCE', 'GALACTIC EVENTS']
  ).entries()) {
    const deck = new THREE.Group();
    const paper = material('#e8deca', 0.8);
    const shade = classic ? (index ? '#7f4d42' : '#527565') : index ? '#475570' : '#3c686c';
    for (let layer = 0; layer < 6; layer++) {
      const card = new THREE.Mesh(
        register(new RoundedBoxGeometry(2.45, 0.055, 3.3, 2, 0.025)),
        paper,
      );
      card.position.set(Math.sin(layer * 3) * 0.035, 0.05 + layer * 0.055, Math.cos(layer) * 0.03);
      card.castShadow = card.receiveShadow = true;
      deck.add(card);
    }
    const surface = canvasSurface(384, 512);
    const c = surface.context;
    c.fillStyle = shade;
    c.fillRect(0, 0, 384, 512);
    c.strokeStyle = '#e0d1a4';
    c.lineWidth = 3;
    c.strokeRect(20, 20, 344, 472);
    c.strokeStyle = '#d1c39c77';
    c.strokeRect(30, 30, 324, 452);
    c.textAlign = 'center';
    c.fillStyle = '#f6ead0';
    c.font = '70px Georgia';
    c.fillText(index ? '✧' : '✦', 192, 240);
    c.font = 'bold 24px Segoe UI';
    label.split(' ').forEach((word, i) => c.fillText(word, 192, 310 + i * 32));
    surface.texture.needsUpdate = true;
    register(surface.texture);
    const top = new THREE.Mesh(
      register(new THREE.PlaneGeometry(2.45, 3.3)),
      register(new THREE.MeshStandardMaterial({ map: surface.texture, roughness: 0.65 })),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.36;
    top.receiveShadow = true;
    deck.add(top);
    deck.position.set(index ? 4.15 : -4.15, 0.18, 2.1);
    deck.rotation.y = index ? -0.14 : 0.14;
    scene.add(deck);
  }
}

function createHoloFurniture(scene, register) {
  const metal = (color, roughness = 0.5, metalness = 0.5) =>
    register(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  const cylinder = (radius, height, mat, y) => {
    const mesh = new THREE.Mesh(
      register(new THREE.CylinderGeometry(radius, radius, height, 128)),
      mat,
    );
    mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const floor = new THREE.Mesh(
    register(new THREE.PlaneGeometry(100, 100)),
    metal('#18212b', 0.95, 0),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.1;
  floor.receiveShadow = true;
  scene.add(floor);
  cylinder(13.7, 0.9, metal('#29333b', 0.4, 0.65), -0.48);
  cylinder(13.72, 0.09, metal('#a89d89', 0.34, 0.65), 0.015);
  cylinder(13.45, 0.07, metal('#333e47', 0.5, 0.6), 0.095);
  cylinder(12.8, 0.04, metal('#0d1e2b', 0.6, 0.25), 0.15);
  const grid = canvasSurface(1024, 1024),
    ctx = grid.context,
    size = 1024;
  ctx.fillStyle = '#102331';
  ctx.fillRect(0, 0, size, size);
  for (const [ring, inner, outer] of [
    [0, 125, 295],
    [1, 295, 496],
  ]) {
    for (let index = 0; index < 20; index++) {
      const start = (index * Math.PI) / 10,
        end = ((index + 1) * Math.PI) / 10;
      ctx.beginPath();
      ctx.arc(512, 512, outer, start, end);
      ctx.arc(512, 512, inner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = (index + ring) % 2 ? '#293d47' : '#142b38';
      ctx.fill();
      ctx.strokeStyle = '#7baca344';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#a7cec388';
  ctx.lineWidth = 3;
  for (const radius of [123, 295, 496]) {
    ctx.beginPath();
    ctx.arc(512, 512, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b4d8d0';
  ctx.font = 'bold 33px Segoe UI';
  ctx.fillText('GALACTIC', 512, 500);
  ctx.font = 'bold 26px Segoe UI';
  ctx.fillText('CONQUEST', 512, 545);
  grid.texture.needsUpdate = true;
  register(grid.texture);
  const disc = new THREE.Mesh(
    register(new THREE.CircleGeometry(9.1, 128)),
    register(
      new THREE.MeshStandardMaterial({
        map: grid.texture,
        roughness: 0.65,
        emissive: '#39778a',
        emissiveIntensity: 0.18,
      }),
    ),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.181;
  disc.receiveShadow = true;
  scene.add(disc);
  const glow = register(
    new THREE.MeshBasicMaterial({
      color: '#79c9db',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  for (const radius of [9.14, 12.45, 13.15]) {
    const ring = new THREE.Mesh(
      register(new THREE.RingGeometry(radius, radius + 0.035, 128)),
      glow,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.19;
    scene.add(ring);
  }
  for (let index = 0; index < 16; index++) {
    const angle = (index * Math.PI) / 8,
      x = Math.sin(angle) * 13.22,
      z = Math.cos(angle) * 13.22;
    const socket = new THREE.Mesh(
      register(new THREE.CylinderGeometry(0.19, 0.22, 0.12, 20)),
      metal('#a99c82', 0.35, 0.55),
    );
    socket.position.set(x, 0.19, z);
    scene.add(socket);
    const lens = new THREE.Mesh(register(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 16)), glow);
    lens.position.set(x, 0.26, z);
    scene.add(lens);
  }
  for (const [index, label] of ['FORCE', 'GALACTIC EVENTS'].entries()) {
    const surface = canvasSurface(384, 512),
      c = surface.context;
    c.fillStyle = '#173b4c';
    c.fillRect(0, 0, 384, 512);
    c.strokeStyle = '#8ccedf';
    c.lineWidth = 4;
    c.strokeRect(16, 16, 352, 480);
    c.fillStyle = '#cee8de';
    c.textAlign = 'center';
    c.font = '70px Georgia';
    c.fillText(index ? '✧' : '✦', 192, 210);
    c.font = 'bold 25px Segoe UI';
    label.split(' ').forEach((word, i) => c.fillText(word, 192, 300 + i * 34));
    surface.texture.needsUpdate = true;
    register(surface.texture);
    const panel = new THREE.Mesh(
      register(new THREE.PlaneGeometry(2.0, 2.7)),
      register(
        new THREE.MeshBasicMaterial({
          map: surface.texture,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    panel.rotation.x = -Math.PI / 2;
    panel.rotation.z = index ? -0.18 : 0.18;
    panel.scale.setScalar(0.6);
    panel.position.set(index ? 0.85 : -0.85, 0.24, 0);
    scene.add(panel);
  }
}

export function createTileFrame(width, depth, register) {
  const group = new THREE.Group();
  const mat = register(
    new THREE.MeshStandardMaterial({ color: '#d6b372', roughness: 0.35, metalness: 0.45 }),
  );
  for (const [w, d, x, z] of [
    [width, 0.04, 0, -depth / 2],
    [width, 0.04, 0, depth / 2],
    [0.04, depth, -width / 2, 0],
    [0.04, depth, width / 2, 0],
  ]) {
    const mesh = new THREE.Mesh(register(new THREE.BoxGeometry(w, 0.035, d)), mat);
    mesh.position.set(x, 0.13, z);
    group.add(mesh);
  }
  group.userData.material = mat;
  return group;
}
