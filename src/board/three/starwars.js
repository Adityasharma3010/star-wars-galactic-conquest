import * as THREE from 'three';
import { createPlanet } from './worlds.js';
import { createShip } from './ships.js';
import { createSkydome, createGalaxy, createFleet } from './space.js';
import { createStarWarsPawn, createStarWarsDevelopment, createDie } from './figures.js';
import {
  makeSurface,
  roundRect,
  wrapLines,
  slabGeometry,
  glowTexture,
  dicePips,
  mulberry,
} from './common.js';

/* The Galactic Conquest holotable: a floating command platform with a ring of 40 sector plates,
   22 live planets projected over their sectors, a spinning galaxy hologram and a fleet in the void. */

const FONT = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif';
const RING = { inner: 9.35, outer: 12.65, tileHeight: 0.34, base: 0.3 };
RING.mid = (RING.inner + RING.outer) / 2;
RING.depth = RING.outer - RING.inner;
RING.top = RING.base + RING.tileHeight;
const SPAN = (Math.PI * 2) / 40;

const SURFACES = [
  'mars',
  'moon',
  'earth_daymap',
  'mars',
  'jupiter',
  'earth_daymap',
  'earth_nightmap',
];
const SHIPS = { 5: 'falcon', 15: 'destroyer', 25: 'blockade', 35: 'executor' };
const GLYPH = {
  start: '➜',
  galactic: '◉',
  force: '✦',
  tax: '◈',
  utility: '⚡',
  detention: '▣',
  parking: '◎',
  goDetention: '⚑',
  transport: '➤',
};
const KIND_LABEL = {
  start: 'HYPERSPACE',
  galactic: 'GALACTIC EVENT',
  force: 'FORCE EVENT',
  tax: 'TAX',
  utility: 'UTILITY',
  detention: 'DETENTION',
  parking: 'FREE ORBIT',
  goDetention: 'IMPERIAL PATROL',
  transport: 'STARSHIP',
};

export function starWarsPlan(id) {
  const angle = -Math.PI / 4 + id * SPAN;
  return {
    x: Math.sin(angle) * RING.mid,
    z: -Math.cos(angle) * RING.mid,
    rotation: Math.PI - angle,
    angle,
    radius: RING.mid,
  };
}

function paintSectorTile(surface, tile, { owner, ownerColor, mortgaged, rules, planetImage }) {
  const { ctx, canvas } = surface,
    w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0e2236');
  bg.addColorStop(1, '#08121f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // faint hex scan texture
  ctx.strokeStyle = 'rgba(120,200,255,0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const accent = tile.color || '#5fc3ff';
  // group band (inner edge)
  const band = ctx.createLinearGradient(0, 0, 0, h * 0.16);
  band.addColorStop(0, accent);
  band.addColorStop(1, accent + '55');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h * 0.15);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, h * 0.15 - 4, w, 4);
  ctx.fillStyle = 'rgba(5,12,20,0.78)';
  ctx.font = `800 ${w * 0.062}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = `${w * 0.008}px`;
  ctx.fillText(
    tile.type === 'property' ? String(tile.group).toUpperCase() : KIND_LABEL[tile.type] || '',
    w / 2,
    h * 0.075,
    w * 0.9,
  );
  ctx.letterSpacing = '0px';
  // name
  ctx.fillStyle = '#eaf6ff';
  ctx.font = `800 ${w * 0.145}px ${FONT}`;
  const name = wrapLines(ctx, tile.name, w * 0.88).slice(0, 3);
  const nameTop = h * 0.255 - ((name.length - 1) * w * 0.17) / 2;
  name.forEach((line, i) => ctx.fillText(line, w / 2, nameTop + i * w * 0.17, w * 0.92));
  // emblem
  const cy = h * 0.58,
    cr = w * 0.3;
  if (tile.type === 'property') {
    const base = tile.planetColor || '#8aa';
    const g = ctx.createRadialGradient(w / 2 - cr * 0.35, cy - cr * 0.35, cr * 0.1, w / 2, cy, cr);
    g.addColorStop(0, '#ffffffcc');
    g.addColorStop(0.25, base);
    g.addColorStop(1, '#050b12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w / 2, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent + 'cc';
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.ellipse(w / 2, cy, cr * 1.28, cr * 0.34, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(120,200,255,0.1)';
    ctx.beginPath();
    ctx.arc(w / 2, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,220,255,0.7)';
    ctx.lineWidth = w * 0.012;
    ctx.stroke();
    ctx.fillStyle = '#bfeaff';
    ctx.font = `700 ${cr * 1.25}px ${FONT}`;
    ctx.fillText(GLYPH[tile.type] || '◆', w / 2, cy + cr * 0.06);
  }
  // price / label
  let price = '';
  if (tile.price) price = `◈ ${tile.price}`;
  else if (tile.id === 4) price = '10% ' + (rules?.taxBasis === 'wealth' ? 'WEALTH' : 'CASH');
  else if (tile.type === 'start') price = `COLLECT ${rules?.startBonus ?? 200}`;
  else if (tile.type === 'tax') price = `◈ ${rules?.luxuryTax ?? 100}`;
  else price = tile.label || 'DRAW A CARD';
  ctx.fillStyle = tile.price ? '#ffd98a' : '#8fd6ff';
  ctx.font = `800 ${w * (tile.price ? 0.17 : 0.095)}px ${FONT}`;
  ctx.fillText(price, w / 2, h * 0.86, w * 0.9);
  // frame
  ctx.strokeStyle = 'rgba(140,215,255,0.5)';
  ctx.lineWidth = 4;
  roundRect(ctx, 6, 6, w - 12, h - 12, 18);
  ctx.stroke();
  // owner strip (outer edge)
  if (owner) {
    ctx.fillStyle = ownerColor;
    ctx.fillRect(0, h - h * 0.045, w, h * 0.045);
  }
  if (mortgaged) {
    ctx.fillStyle = 'rgba(5,10,16,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff8a6b';
    ctx.font = `900 ${w * 0.13}px ${FONT}`;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.5);
    ctx.fillText('MORTGAGED', 0, 0, w * 1.4);
    ctx.restore();
  }
  surface.texture.needsUpdate = true;
}

function panelTexture(register, size = 1024) {
  const { canvas, texture, ctx } = makeSurface(size, size, 8);
  const rand = mulberry(7);
  ctx.fillStyle = '#26303a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 380; i++) {
    const x = rand() * size,
      y = rand() * size,
      w = 20 + rand() * 120,
      h = 8 + rand() * 40;
    ctx.fillStyle = `rgba(${150 + rand() * 60},${160 + rand() * 60},${170 + rand() * 60},${0.04 + rand() * 0.08})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeRect(x, y, w, h);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  for (let i = 0; i < size; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  texture.needsUpdate = true;
  return register(texture);
}

function floorTexture(register) {
  const size = 2048;
  const { canvas, texture, ctx } = makeSurface(size, size, 8);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, '#0c3347');
  g.addColorStop(0.5, '#08202f');
  g.addColorStop(1, '#050f19');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = 2;
  for (let r = 1; r <= 12; r++) {
    ctx.strokeStyle = `rgba(110,210,255,${r % 4 === 0 ? 0.55 : 0.16})`;
    ctx.beginPath();
    ctx.arc(c, c, (r / 12) * c * 0.98, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    ctx.strokeStyle = `rgba(110,210,255,${i % 10 === 0 ? 0.4 : 0.1})`;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * c * 0.15, c + Math.sin(a) * c * 0.15);
    ctx.lineTo(c + Math.cos(a) * c * 0.98, c + Math.sin(a) * c * 0.98);
    ctx.stroke();
  }
  // tick marks
  ctx.strokeStyle = 'rgba(150,230,255,0.7)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const len = i % 4 === 0 ? 34 : 16;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * c * 0.97, c + Math.sin(a) * c * 0.97);
    ctx.lineTo(c + Math.cos(a) * (c * 0.97 - len), c + Math.sin(a) * (c * 0.97 - len));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(160,230,255,0.85)';
  ctx.textAlign = 'center';
  ctx.font = `800 54px ${FONT}`;
  ctx.letterSpacing = '14px';
  ctx.fillText('GALACTIC CONQUEST', c, c + size * 0.255);
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText('CLAIM · BUILD · TRADE', c, c + size * 0.255 + 50);
  texture.needsUpdate = true;
  return register(texture);
}

export function createStarWarsWorld(ctx, board) {
  const { scene, register, container, renderer } = ctx;
  const root = new THREE.Group();
  scene.add(root);
  const tiles = new Map(),
    pickables = [],
    animated = [];
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mat = (color, options = {}) =>
    register(new THREE.MeshStandardMaterial({ color, ...options }));
  const emit = (color, scale = 2.4, options = {}) => {
    const m = register(new THREE.MeshBasicMaterial({ color, toneMapped: false, ...options }));
    m.color.multiplyScalar(scale);
    return m;
  };
  const addMesh = (geometry, material, x = 0, y = 0, z = 0, parent = root) => {
    const mesh = new THREE.Mesh(register(geometry), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  /* ---- sky & lights ---- */
  const sky = createSkydome(register, { a: '#1d58b0', b: '#6c2fa8', c: '#e08a38' });
  scene.add(sky);
  const fleet = createFleet(register);
  scene.add(fleet.group);
  scene.background = new THREE.Color('#02050b');
  scene.fog = new THREE.FogExp2('#030812', 0.0045);

  const key = new THREE.DirectionalLight('#ffe9cf', 2.6);
  key.position.set(-16, 26, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
  Object.assign(key.shadow.camera, {
    left: -17,
    right: 17,
    top: 17,
    bottom: -17,
    near: 1,
    far: 70,
  });
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  scene.add(new THREE.HemisphereLight('#7fb6ff', '#1a1030', 0.55));
  const rim = new THREE.DirectionalLight('#8a6bff', 1.2);
  rim.position.set(18, 8, -20);
  scene.add(rim);
  const core = new THREE.PointLight('#6fd6ff', 40, 26, 1.6);
  core.position.set(0, 3.2, 0);
  scene.add(core);

  /* ---- platform ---- */
  const panels = panelTexture(register);
  const steel = mat('#cfd6dd', { map: panels, metalness: 0.85, roughness: 0.42 });
  const darkSteel = mat('#1b232c', { metalness: 0.9, roughness: 0.38 });
  const brass = mat('#b79d6b', { metalness: 0.95, roughness: 0.3 });
  const body = addMesh(new THREE.CylinderGeometry(14.4, 13.2, 1.1, 128), steel, 0, -0.25, 0);
  body.receiveShadow = true;
  addMesh(new THREE.CylinderGeometry(14.75, 14.75, 0.16, 128), brass, 0, 0.3, 0).receiveShadow =
    true;
  const platform = addMesh(
    new THREE.CylinderGeometry(14.45, 14.5, 0.1, 128),
    darkSteel,
    0,
    0.36,
    0,
  );
  platform.scale.set(1, 1, 1);
  const floorMat = register(
    new THREE.MeshStandardMaterial({
      map: floorTexture(register),
      roughness: 0.5,
      metalness: 0.4,
      emissive: '#2a8fb8',
      emissiveIntensity: 0.4,
    }),
  );
  floorMat.emissiveMap = floorMat.map;
  const floor = addMesh(new THREE.CircleGeometry(9.25, 128), floorMat, 0, RING.base + 0.03, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  // beveled ring base plate beneath tiles
  const ringPlate = new THREE.Mesh(
    register(new THREE.RingGeometry(9.15, 13.0, 128)),
    mat('#0a1119', { metalness: 0.9, roughness: 0.4 }),
  );
  ringPlate.rotation.x = -Math.PI / 2;
  ringPlate.position.y = RING.base + 0.02;
  ringPlate.receiveShadow = true;
  root.add(ringPlate);
  // glowing seams
  for (const [r, w, c] of [
    [9.3, 0.05, '#6fd9ff'],
    [12.8, 0.05, '#6fd9ff'],
    [13.45, 0.07, '#ffcf85'],
  ]) {
    const seam = addMesh(
      new THREE.RingGeometry(r, r + w, 160),
      emit(c, 2.2, { side: THREE.DoubleSide }),
      0,
      RING.base + 0.05,
      0,
    );
    seam.rotation.x = -Math.PI / 2;
  }
  // outer studs
  const studGeo = register(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 12));
  const studs = new THREE.InstancedMesh(studGeo, emit('#9be8ff', 2.8), 72);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    dummy.position.set(Math.sin(a) * 14.1, 0.42, Math.cos(a) * 14.1);
    dummy.updateMatrix();
    studs.setMatrixAt(i, dummy.matrix);
  }
  root.add(studs);
  // pedestal & energy rings
  const pedestal = addMesh(
    new THREE.CylinderGeometry(13.2, 4.2, 7.5, 96, 1, true),
    mat('#10161d', { metalness: 0.9, roughness: 0.45, side: THREE.DoubleSide }),
    0,
    -4.55,
    0,
  );
  for (const [y, r] of [
    [-1.4, 12.2],
    [-3.2, 9.6],
    [-5.3, 6.6],
  ]) {
    const ring = addMesh(new THREE.TorusGeometry(r, 0.05, 8, 128), emit('#58c6ff', 2.2), 0, y, 0);
    ring.rotation.x = Math.PI / 2;
  }
  const underGlow = new THREE.Mesh(
    register(new THREE.CircleGeometry(15, 64)),
    register(
      new THREE.MeshBasicMaterial({
        map: glowTexture(register),
        color: '#46b8ff',
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  underGlow.rotation.x = -Math.PI / 2;
  underGlow.position.y = -1.6;
  root.add(underGlow);

  /* ---- centre hologram ---- */
  addMesh(new THREE.CylinderGeometry(1.6, 1.9, 0.25, 48), darkSteel, 0, RING.base + 0.14, 0);
  const emitterRing = addMesh(
    new THREE.TorusGeometry(1.45, 0.05, 8, 64),
    emit('#7fe0ff', 3),
    0,
    RING.base + 0.3,
    0,
  );
  emitterRing.rotation.x = Math.PI / 2;
  const galaxy = createGalaxy(register, { radius: 2.5 });
  galaxy.position.set(0, 3.4, 0);
  galaxy.scale.set(1, 0.9, 1);
  root.add(galaxy);
  const cone = addMesh(
    new THREE.ConeGeometry(1.5, 3, 40, 1, true),
    register(
      new THREE.MeshBasicMaterial({
        color: '#58c6ff',
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    ),
    0,
    1.9,
    0,
  );
  cone.rotation.x = Math.PI;
  const holoRings = [0, 1, 2].map((i) => {
    const ring = addMesh(
      new THREE.TorusGeometry(2.9 + i * 0.28, 0.012, 6, 128),
      emit(['#6fd9ff', '#ffcf85', '#6fd9ff'][i], 2),
      0,
      3.4,
      0,
    );
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.28;
    return ring;
  });
  animated.push((t) => {
    galaxy.rotation.y = t * 0.08;
    holoRings.forEach((r, i) => (r.rotation.z = t * (0.12 + i * 0.05) * (i % 2 ? -1 : 1)));
    emitterRing.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
  });

  /* ---- tiles ---- */
  const halfSpan = SPAN / 2 - 0.0085;
  const wInner = (RING.mid - RING.depth / 2) * Math.tan(halfSpan),
    wOuter = (RING.mid + RING.depth / 2) * Math.tan(halfSpan);
  const widthAt = (z) => wInner + ((z + RING.depth / 2) / RING.depth) * (wOuter - wInner);
  const outline = [
    [-wInner, -RING.depth / 2 + 0.03],
    [wInner, -RING.depth / 2 + 0.03],
    [wOuter - 0.03, RING.depth / 2 - 0.03],
    [-wOuter + 0.03, RING.depth / 2 - 0.03],
  ];
  const sharedGeometry = register(
    slabGeometry(outline, RING.tileHeight, 0.035, (x, z) => [
      x / (2 * widthAt(z)) + 0.5,
      1 - (z + RING.depth / 2) / RING.depth,
    ]),
  );
  const sideMat = mat('#0b141d', { metalness: 0.9, roughness: 0.32 });
  const edgeGeo = register(new THREE.EdgesGeometry(sharedGeometry, 30));

  board.forEach((tile) => {
    const plan = starWarsPlan(tile.id);
    const group = new THREE.Group();
    group.position.set(plan.x, RING.base, plan.z);
    group.rotation.y = plan.rotation;
    root.add(group);
    const surface = makeSurface(448, 832, aniso);
    register(surface.texture);
    const top = register(
      new THREE.MeshStandardMaterial({
        map: surface.texture,
        emissiveMap: surface.texture,
        emissive: '#ffffff',
        emissiveIntensity: 0.42,
        roughness: 0.38,
        metalness: 0.35,
      }),
    );
    const mesh = new THREE.Mesh(sharedGeometry, [top, sideMat]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.tileId = tile.id;
    group.add(mesh);
    pickables.push(mesh);
    // outer rim light strip + owner bar
    const accent = tile.color || '#58c6ff';
    const strip = addMesh(
      new THREE.BoxGeometry(wOuter * 2 - 0.12, 0.05, 0.07),
      emit(accent, 2.4),
      0,
      RING.tileHeight - 0.02,
      RING.depth / 2 - 0.02,
      group,
    );
    strip.visible = Boolean(tile.color);
    const ownerBar = addMesh(
      new THREE.BoxGeometry(wOuter * 2 - 0.08, 0.11, 0.16),
      emit('#ffffff', 3),
      0,
      RING.tileHeight + 0.01,
      RING.depth / 2 - 0.1,
      group,
    );
    ownerBar.visible = false;
    const border = new THREE.LineSegments(
      edgeGeo,
      register(
        new THREE.LineBasicMaterial({
          color: '#ffd98a',
          transparent: true,
          opacity: 0.95,
          toneMapped: false,
        }),
      ),
    );
    border.scale.setScalar(1.002);
    border.visible = false;
    group.add(border);
    const info = {
      tile,
      plan,
      group,
      mesh,
      top,
      surface,
      ownerBar,
      border,
      strip,
      photo: null,
      development: null,
      level: 0,
      depth: RING.depth,
      width: wOuter * 2,
      devAnchor: new THREE.Vector3(0, RING.tileHeight, -RING.depth / 2 + 0.55),
    };
    tiles.set(tile.id, info);
    // hovering prop above special tiles
    const prop = createProp(tile);
    if (prop) {
      prop.position.set(0, RING.tileHeight + 0.85, -0.2);
      group.add(prop);
      info.prop = prop;
    }
  });

  function createProp(tile) {
    const g = new THREE.Group();
    const wire = (geometry, color) => {
      const m = new THREE.LineSegments(
        register(new THREE.EdgesGeometry(register(geometry))),
        register(new THREE.LineBasicMaterial({ color, toneMapped: false })),
      );
      m.material.color.multiplyScalar(2.4);
      return m;
    };
    switch (tile.type) {
      case 'transport': {
        const ship = createShip(SHIPS[tile.id] || 'falcon', register);
        ship.scale.setScalar(tile.id === 35 ? 1.5 : 1.35);
        g.add(ship);
        g.userData.spin = 0.0;
        g.userData.bob = true;
        g.userData.ship = true;
        return g;
      }
      case 'force': {
        g.add(wire(new THREE.OctahedronGeometry(0.46), '#9fe3ff'));
        g.add(addMesh(new THREE.OctahedronGeometry(0.2), emit('#bdeeff', 3), 0, 0, 0, g));
        break;
      }
      case 'galactic': {
        g.add(wire(new THREE.DodecahedronGeometry(0.46), '#ffb36b'));
        g.add(addMesh(new THREE.SphereGeometry(0.16, 16, 12), emit('#ffb36b', 3), 0, 0, 0, g));
        break;
      }
      case 'start': {
        for (let i = 0; i < 3; i++) {
          const ring = addMesh(
            new THREE.TorusGeometry(0.5 - i * 0.13, 0.03, 8, 40),
            emit(['#8fe6ff', '#c9a6ff', '#ffd98a'][i], 2.8),
            0,
            0,
            0,
            g,
          );
          ring.position.z = i * 0.0;
          ring.userData.phase = i;
        }
        g.userData.tunnel = true;
        break;
      }
      case 'tax': {
        const coin = addMesh(
          new THREE.CylinderGeometry(0.34, 0.34, 0.07, 32),
          mat('#e9c261', { metalness: 1, roughness: 0.25 }),
          0,
          0,
          0,
          g,
        );
        coin.rotation.x = Math.PI / 2;
        break;
      }
      case 'utility': {
        addMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 20), emit('#9bf0ff', 2.6), 0, 0, 0, g);
        const r = addMesh(
          new THREE.TorusGeometry(0.34, 0.03, 8, 32),
          emit('#ffffff', 2.4),
          0,
          0,
          0,
          g,
        );
        r.rotation.x = Math.PI / 2;
        break;
      }
      case 'detention': {
        g.add(wire(new THREE.BoxGeometry(0.6, 0.8, 0.6), '#ff8a5c'));
        addMesh(
          new THREE.BoxGeometry(0.46, 0.66, 0.46),
          mat('#241a18', { metalness: 0.5, roughness: 0.5 }),
          0,
          0,
          0,
          g,
        );
        break;
      }
      case 'parking': {
        addMesh(
          new THREE.SphereGeometry(0.28, 24, 16),
          mat('#6aa8c9', {
            metalness: 0.4,
            roughness: 0.4,
            emissive: '#2a6a8a',
            emissiveIntensity: 0.4,
          }),
          0,
          0,
          0,
          g,
        );
        const r = addMesh(
          new THREE.TorusGeometry(0.5, 0.02, 6, 48),
          emit('#9be8ff', 2.4),
          0,
          0,
          0,
          g,
        );
        r.rotation.x = Math.PI / 2.4;
        break;
      }
      case 'goDetention': {
        const tie = createShip('tie', register);
        tie.scale.setScalar(1.5);
        g.add(tie);
        g.userData.bob = true;
        break;
      }
      default:
        return null;
    }
    return g;
  }

  /* ---- planets ---- */
  const loader = new THREE.TextureLoader(),
    surfaceCache = new Map();
  container.dataset.worldModels = '0';
  container.dataset.surfaceTextures = '0';
  const getSurface = (kind) => {
    const name = kind === 'clouds' ? 'earth_clouds' : SURFACES[kind];
    if (surfaceCache.has(name)) return surfaceCache.get(name);
    const entry = { texture: null, ready: { value: 0 } };
    const texture = loader.load(`/images/space-surfaces/${name}.jpg`, () => {
      entry.ready.value = 1;
      container.dataset.surfaceTextures = [...surfaceCache.values()].filter(
        (e) => e.ready.value,
      ).length;
      ctx.dirty();
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    entry.texture = register(texture);
    surfaceCache.set(name, entry);
    return entry;
  };
  const planets = [];
  const beamMat = register(
    new THREE.MeshBasicMaterial({
      color: '#7fe0ff',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  board
    .filter((tile) => tile.type === 'property')
    .forEach((tile, index) => {
      const plan = starWarsPlan(tile.id);
      const near = index % 2 === 0;
      const radius = near ? 7.55 : 5.7;
      const px = Math.sin(plan.angle) * radius,
        pz = -Math.cos(plan.angle) * radius;
      const model = createPlanet(tile, register, false, getSurface, {
        radius: 0.62,
        highDetail: true,
        holographic: false,
      });
      const baseY = 2.05 + (near ? 0 : 0.35);
      model.position.set(px, baseY, pz);
      model.userData.pickable.userData.tileId = tile.id;
      pickables.push(model.userData.pickable);
      root.add(model);
      const pad = addMesh(
        new THREE.CylinderGeometry(0.34, 0.4, 0.1, 24),
        darkSteel,
        px,
        RING.base + 0.1,
        pz,
      );
      const halo = addMesh(
        new THREE.RingGeometry(0.42, 0.5, 48),
        register(
          new THREE.MeshBasicMaterial({
            color: tile.color || '#8ddde7',
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            toneMapped: false,
          }),
        ),
        px,
        RING.base + 0.17,
        pz,
      );
      halo.rotation.x = -Math.PI / 2;
      const beam = new THREE.Mesh(
        register(new THREE.CylinderGeometry(0.62, 0.28, baseY - 0.5, 24, 1, true)),
        beamMat,
      );
      beam.position.set(px, RING.base + 0.2 + (baseY - 0.5) / 2, pz);
      root.add(beam);
      // tether from the sector plate to its planet
      const tether = new THREE.Line(
        register(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(
              Math.sin(plan.angle) * (RING.inner + 0.1),
              RING.top + 0.05,
              -Math.cos(plan.angle) * (RING.inner + 0.1),
            ),
            new THREE.Vector3(px, RING.base + 0.18, pz),
          ]),
        ),
        register(
          new THREE.LineBasicMaterial({
            color: tile.color || '#8ddde7',
            transparent: true,
            opacity: 0.55,
            toneMapped: false,
          }),
        ),
      );
      root.add(tether);
      const orbit = addMesh(
        new THREE.TorusGeometry(0.86, 0.008, 4, 64),
        register(
          new THREE.MeshBasicMaterial({ color: '#9fe3ff', transparent: true, opacity: 0.35 }),
        ),
        px,
        baseY,
        pz,
      );
      orbit.rotation.x = Math.PI / 2 + 0.25;
      planets.push({ tile, model, halo, orbit, base: new THREE.Vector3(px, baseY, pz), index });
    });
  container.dataset.worldModels = planets.length;

  /* ---- dice ---- */
  const diceTexture = (value) => dicePips(value, '#e9f4ff', '#0b2b44');
  const makeDie = () =>
    createDie(diceTexture, register, { solidColor: '#dff0ff', rough: 0.22, emissiveBoost: 0.18 });

  /* ---- world API ---- */
  const world = {
    kind: 'starwars',
    tiles,
    pickables,
    tileTop: RING.top,
    pawnY: RING.top + 0.02,
    pawnScale: 1,
    diceHome: [new THREE.Vector3(-0.85, 1.2, 0.35), new THREE.Vector3(0.85, 1.2, -0.35)],
    diceRest: 0.9 + RING.base,
    bounds: 14.9,
    camera: { lift: 1.7, elevation: 0.86, azimuth: 0, fov: 34, min: 7, max: 46 },
    bloom: { strength: 0.34, radius: 0.5, threshold: 0.88 },
    exposure: 1.05,
    plan: starWarsPlan,
    piecePosition(id, index = 0, count = 1) {
      const plan = starWarsPlan(id);
      const columns = Math.min(2, count),
        rows = Math.ceil(count / columns);
      const dx = ((index % columns) - (columns - 1) / 2) * 0.62,
        dz = (Math.floor(index / columns) - (rows - 1) / 2) * 0.7;
      return {
        x: plan.x + dx * Math.cos(plan.rotation) + dz * Math.sin(plan.rotation),
        z: plan.z - dx * Math.sin(plan.rotation) + dz * Math.cos(plan.rotation),
      };
    },
    focusPoint(id) {
      const planet = planets.find((p) => p.tile.id === id);
      const plan = starWarsPlan(id);
      return planet
        ? new THREE.Vector3(plan.x * 0.85, 0.8, plan.z * 0.85)
        : new THREE.Vector3(plan.x, RING.top, plan.z);
    },
    createPawn: (player) => createStarWarsPawn(player.color, player.pawnKind || 'saber', register),
    createDevelopment: (level) => createStarWarsDevelopment(level, register),
    createDie: makeDie,
    paint(info, game, owner) {
      const owned = game.ownership[info.tile.id];
      paintSectorTile(info.surface, info.tile, {
        owner,
        ownerColor: owner?.color,
        mortgaged: owned?.mortgaged,
        rules: game.rules,
      });
      info.ownerBar.visible = Boolean(owner);
      if (owner) info.ownerBar.material.color.set(owner.color).multiplyScalar(3);
    },
    style(info, { selected, hover, location, ownerMatch, dim }) {
      const lift = selected ? 0.22 : hover ? 0.1 : 0;
      info.group.position.y = RING.base + lift;
      info.border.visible = Boolean(location || ownerMatch || selected || hover);
      info.border.material.color.set(
        location || (ownerMatch ? ownerMatch : selected ? '#ffd98a' : '#9fe3ff'),
      );
      info.top.emissiveIntensity = dim ? 0.06 : selected ? 0.5 : 0.24;
      info.top.color.set(dim ? '#6c7b88' : '#ffffff');
    },
    styleWorlds(game, selected, filter) {
      planets.forEach(({ tile, model, halo, orbit }) => {
        const dim = filter && game.ownership[tile.id]?.owner !== filter;
        const owner = game.players.find((p) => p.id === game.ownership[tile.id]?.owner);
        model.userData.surface.uniforms.emphasis.value = dim ? 0.3 : 1;
        model.scale.setScalar(tile.id === selected ? 1.35 : 1);
        halo.material.color.set(owner?.color || tile.color || '#8ddde7');
        halo.material.opacity = tile.id === selected ? 1 : dim ? 0.2 : owner ? 0.95 : 0.55;
        orbit.visible = tile.id === selected || Boolean(owner);
        orbit.material.color.set(owner?.color || '#9fe3ff');
      });
    },
    setDevelopment(info, level, animate) {
      if (info.development) ctx.disposeGroup(info.development);
      info.development = null;
      info.level = level;
      if (!level) return;
      const dev = createStarWarsDevelopment(level, register);
      dev.position.copy(info.devAnchor);
      info.group.add(dev);
      info.development = dev;
      if (animate)
        ctx.tween(dev.scale, {
          from: { y: 0.01 },
          to: { y: 1 },
          duration: 0.6,
          ease: 'back.out(1.4)',
        });
    },
    project(camera, width, height, game) {
      return planets.map(({ tile, model }) => {
        const p = model.position.clone();
        p.y -= 0.95;
        p.project(camera);
        const c = model.position.clone().project(camera);
        const owner = game.players.find((o) => o.id === game.ownership[tile.id]?.owner);
        return {
          id: tile.id,
          name: tile.name,
          color: owner?.color || null,
          modelX: ((c.x + 1) * width) / 2,
          modelY: ((1 - c.y) * height) / 2,
          x: ((p.x + 1) * width) / 2,
          y: ((1 - p.y) * height) / 2,
          visible: Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && p.z < 1,
        };
      });
    },
    planetPosition(id) {
      return planets.find((p) => p.tile.id === id)?.model.position.clone();
    },
    animate(time) {
      sky.userData.material.uniforms.time.value = time;
      fleet.animate(time);
      animated.forEach((fn) => fn(time));
      planets.forEach(({ model, base, index, orbit }) => {
        model.rotation.y = time * 0.12;
        model.position.y = base.y + Math.sin(time * 0.8 + index) * 0.07;
        model.userData.surface.uniforms.time.value = time;
        orbit.rotation.z = time * 0.3;
      });
      tiles.forEach((info) => {
        const prop = info.prop;
        if (!prop) return;
        const u = prop.userData;
        if (u.ship) prop.rotation.y = time * 0.25 + info.tile.id;
        else if (u.tunnel)
          prop.children.forEach((ring, i) => (ring.rotation.z = time * (1 + i * 0.4)));
        else prop.rotation.y = time * 0.7;
        if (u.bob || u.ship)
          prop.position.y = RING.tileHeight + 0.85 + Math.sin(time * 1.3 + info.tile.id) * 0.06;
      });
    },
  };
  return world;
}
