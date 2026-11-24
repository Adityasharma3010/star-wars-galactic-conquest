import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import OUTLINE from '../../assets/indiaOutline.json';
import INDIA_IMAGES from '../../assets/indiaImages.json';
import { createClassicPawn, createClassicDevelopment, createDie } from './figures.js';
import { createLandmark } from './landmarks.js';
import { tilePlan } from './layout.js';
import {
  makeSurface,
  roundRect,
  wrapLines,
  slabGeometry,
  dicePips,
  mulberry,
  glowTexture,
} from './common.js';

/* India: a warm, lamp-lit wooden-table Monopoly board with a sculpted relief map of India in the
   middle, a miniature monument on every capital, brass trim, houses, palaces and glossy pawns. */

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Segoe UI", Inter, system-ui, sans-serif';
export const TILE_H = 0.22;
const SCALE = 0.42;

const CITIES = {
  Shimla: [77.17, 31.1],
  Gangtok: [88.61, 27.33],
  Shillong: [91.89, 25.58],
  Kohima: [94.1, 25.68],
  Itanagar: [93.6, 27.08],
  Patna: [85.14, 25.61],
  Ranchi: [85.31, 23.34],
  Bhubaneswar: [85.82, 20.3],
  Bhopal: [77.41, 23.26],
  Raipur: [81.63, 21.25],
  Lucknow: [80.95, 26.85],
  Panaji: [73.83, 15.5],
  Gandhinagar: [72.64, 23.22],
  Jaipur: [75.79, 26.91],
  Thiruvananthapuram: [76.94, 8.52],
  Bengaluru: [77.59, 12.97],
  Chennai: [80.27, 13.08],
  Hyderabad: [78.49, 17.39],
  Kolkata: [88.36, 22.57],
  Mumbai: [72.88, 19.08],
  Chandigarh: [76.78, 30.73],
  'New Delhi': [77.21, 28.61],
};
const mapXY = ([lon, lat]) => [(lon - 83) * SCALE, (lat - 22) * SCALE];

export function indiaPlan(id) {
  const plan = tilePlan(id);
  return {
    ...plan,
    rotation: id <= 10 ? Math.PI : id <= 20 ? Math.PI / 2 : id <= 30 ? 0 : -Math.PI / 2,
  };
}

const GLYPHS = { force: '?', galactic: '?', tax: '₹', transport: '🚆', utility: '💡' };

function paintCityTile(surface, tile, { owner, ownerColor, mortgaged, rules, photo }) {
  const { ctx, canvas } = surface,
    w = canvas.width,
    h = canvas.height;
  const corner = tile.id % 10 === 0;
  ctx.clearRect(0, 0, w, h);
  const paper = ctx.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, '#fbf4e1');
  paper.addColorStop(1, '#efe2c4');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ink = '#2a2118';
  if (corner) {
    const label = { 0: 'GO', 10: 'JAIL', 20: 'FREE\nPARKING', 30: 'GO TO\nJAIL' }[tile.id];
    const bg = { 0: '#c8442f', 10: '#e9a43a', 20: '#2f8f63', 30: '#3b64b0' }[tile.id];
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 6;
    roundRect(ctx, 16, 16, w - 32, h - 32, 30);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${w * (tile.id === 0 ? 0.36 : 0.2)}px ${SERIF}`;
    label
      .split('\n')
      .forEach((line, i, all) =>
        ctx.fillText(line, w / 2, h * (all.length > 1 ? 0.4 : 0.42) + i * w * 0.22, w * 0.84),
      );
    ctx.font = `700 ${w * 0.075}px ${SANS}`;
    ctx.letterSpacing = `${w * 0.006}px`;
    ctx.fillText(tile.label || '', w / 2, h * 0.8, w * 0.84);
    ctx.letterSpacing = '0px';
    surface.texture.needsUpdate = true;
    return;
  }
  const bandH = h * (tile.color ? 0.24 : 0);
  if (tile.color) {
    const g = ctx.createLinearGradient(0, 0, 0, bandH);
    g.addColorStop(0, tile.color);
    g.addColorStop(1, tile.color + 'cc');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, bandH);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, bandH - 5, w, 5);
    // paisley-ish dots
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(w * (0.1 + i * 0.1), bandH * 0.5, w * 0.016, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const nameFont = tile.type === 'property' ? 0.118 : 0.11;
  ctx.fillStyle = ink;
  ctx.font = `800 ${w * nameFont}px ${SERIF}`;
  const lines = wrapLines(ctx, tile.name.toUpperCase(), w * 0.88).slice(0, 3);
  const top = bandH + h * 0.075 + (((lines.length - 1) * w * 0.135) / 2) * 0;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, top + i * w * 0.135, w * 0.9));
  const iy = bandH + h * 0.075 + lines.length * w * 0.135 + 12,
    ih = h * 0.3;
  if (photo && tile.type === 'property') {
    const ratio = Math.max((w * 0.78) / photo.width, ih / photo.height);
    ctx.save();
    roundRect(ctx, w * 0.11, iy, w * 0.78, ih, 14);
    ctx.clip();
    ctx.drawImage(
      photo,
      w / 2 - (photo.width * ratio) / 2,
      iy + ih / 2 - (photo.height * ratio) / 2,
      photo.width * ratio,
      photo.height * ratio,
    );
    ctx.restore();
    ctx.strokeStyle = '#8a6a34';
    ctx.lineWidth = 5;
    roundRect(ctx, w * 0.11, iy, w * 0.78, ih, 14);
    ctx.stroke();
  } else if (tile.type !== 'property') {
    ctx.fillStyle = '#3a5f4d';
    ctx.font = `700 ${w * 0.34}px ${SERIF}`;
    const glyph = {
      force: '?',
      galactic: '?',
      tax: '₹',
      transport: '🚆',
      utility: tile.id === 12 ? '💡' : '💧',
    }[tile.type];
    ctx.fillText(tile.type === 'galactic' ? 'CC' : glyph || '◆', w / 2, iy + ih * 0.5, w * 0.8);
  }
  let price = '';
  if (tile.price) price = `₹ ${tile.price}`;
  else if (tile.id === 4) price = '10% ' + (rules?.taxBasis === 'wealth' ? 'WEALTH' : 'CASH');
  else if (tile.type === 'tax') price = `₹ ${rules?.luxuryTax ?? 100}`;
  else price = tile.label || '';
  ctx.fillStyle = '#7a4a14';
  ctx.font = `800 ${w * 0.12}px ${SERIF}`;
  ctx.fillText(price, w / 2, h * 0.93, w * 0.9);
  ctx.strokeStyle = '#8a6a34';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  if (owner) {
    ctx.fillStyle = ownerColor;
    ctx.fillRect(0, h - h * 0.04, w, h * 0.04);
  }
  if (mortgaged) {
    ctx.fillStyle = 'rgba(235,224,200,0.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8c3b2c';
    ctx.font = `900 ${w * 0.13}px ${SERIF}`;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.5);
    ctx.fillText('MORTGAGED', 0, 0, w * 1.3);
    ctx.restore();
  }
  surface.texture.needsUpdate = true;
}

function woodTexture(register) {
  const size = 1024;
  const { canvas, texture, ctx } = makeSurface(size, size, 8);
  const rand = mulberry(11);
  const planks = 6;
  for (let p = 0; p < planks; p++) {
    const y0 = (p / planks) * size,
      ph = size / planks;
    const tone = 70 + rand() * 25;
    ctx.fillStyle = `rgb(${tone + 40},${tone * 0.62 + 18},${tone * 0.34 + 8})`;
    ctx.fillRect(0, y0, size, ph);
    for (let i = 0; i < 90; i++) {
      const y = y0 + rand() * ph;
      ctx.strokeStyle = `rgba(30,14,5,${0.05 + rand() * 0.14})`;
      ctx.lineWidth = 0.6 + rand() * 1.8;
      ctx.beginPath();
      const ph2 = rand() * 6;
      for (let x = 0; x <= size; x += 16) {
        const yy = y + Math.sin(x * 0.012 + ph2) * 2.6 + Math.sin(x * 0.04 + ph2 * 2) * 0.9;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(10,4,0,0.55)';
    ctx.fillRect(0, y0, size, 3);
  }
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return register(texture);
}

function centerFieldTexture(register) {
  const size = 2048;
  const { canvas, texture, ctx } = makeSurface(size, size, 8);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * 1.1);
  g.addColorStop(0, '#12503f');
  g.addColorStop(0.7, '#0c3a30');
  g.addColorStop(1, '#082a24');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // mandala rings
  ctx.strokeStyle = 'rgba(232,190,100,0.55)';
  for (const [r, lw] of [
    [0.97, 6],
    [0.93, 2],
    [0.72, 2],
    [0.5, 2],
  ]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(c, c, r * c, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let ring = 0; ring < 3; ring++) {
    const n = 24 + ring * 12,
      r0 = (0.5 + ring * 0.2) * c,
      pr = c * (0.07 - ring * 0.012);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.1;
      ctx.save();
      ctx.translate(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = ring % 2 ? 'rgba(232,190,100,0.22)' : 'rgba(210,90,60,0.28)';
      ctx.beginPath();
      ctx.moveTo(0, -pr);
      ctx.quadraticCurveTo(pr * 0.7, 0, 0, pr);
      ctx.quadraticCurveTo(-pr * 0.7, 0, 0, -pr);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,190,100,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245,220,160,0.92)';
  ctx.font = `900 ${size * 0.052}px ${SERIF}`;
  ctx.letterSpacing = `${size * 0.012}px`;
  ctx.fillText('MONOPOLY', c, size * 0.075);
  ctx.font = `700 ${size * 0.022}px ${SANS}`;
  ctx.fillText('INDIA · CITY CAPITALS', c, size * 0.105);
  ctx.fillText('BUY · BUILD · TRADE', c, size * 0.955);
  texture.needsUpdate = true;
  return register(texture);
}

function mapTexture(register, bounds) {
  const size = 2048;
  const { canvas, texture, ctx } = makeSurface(size, size, 8);
  const { minX, maxX, minY, maxY } = bounds;
  const sx = (x) => ((x - minX) / (maxX - minX)) * size,
    sy = (y) => (1 - (y - minY) / (maxY - minY)) * size;
  const polygons =
    OUTLINE.geometry.type === 'Polygon'
      ? [OUTLINE.geometry.coordinates]
      : OUTLINE.geometry.coordinates;
  const trace = () => {
    ctx.beginPath();
    for (const polygon of polygons)
      for (const ring of polygon) {
        ring.forEach((pt, i) => {
          const [x, y] = mapXY(pt);
          i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y));
        });
        ctx.closePath();
      }
  };
  ctx.fillStyle = '#6f9a58';
  trace();
  ctx.fill();
  ctx.save();
  trace();
  ctx.clip();
  const rand = mulberry(5);
  const blob = (lon, lat, rx, ry, color) => {
    const [x, y] = mapXY([lon, lat]);
    const g = ctx.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), rx * size * 0.1);
    g.addColorStop(0, color);
    g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(sx(x), sy(y));
    ctx.scale(1, ry / rx);
    ctx.translate(-sx(x), -sy(y));
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  };
  blob(72.5, 26.5, 5.2, 3.8, 'rgba(226,190,120,0.95)'); // Thar
  blob(77, 18, 7, 6, 'rgba(196,152,86,0.7)'); // Deccan
  blob(82, 26.5, 6, 2.2, 'rgba(70,140,70,0.85)'); // Ganga plains
  blob(92.5, 26, 3.5, 2.5, 'rgba(34,100,60,0.9)'); // Northeast
  blob(76, 11, 2.2, 4, 'rgba(40,120,70,0.85)'); // Western Ghats / Kerala
  blob(78, 33.5, 11, 3.4, 'rgba(246,248,250,0.95)'); // Himalaya snow
  blob(88, 28.6, 8, 1.8, 'rgba(240,244,248,0.9)');
  for (let i = 0; i < 9000; i++) {
    const x = rand() * size,
      y = rand() * size;
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '20,40,20' : '255,255,230'},${rand() * 0.08})`;
    ctx.fillRect(x, y, 2 + rand() * 7, 2 + rand() * 7);
  }
  ctx.restore();
  ctx.lineJoin = 'round';
  trace();
  ctx.strokeStyle = 'rgba(255,236,170,0.95)';
  ctx.lineWidth = 7;
  ctx.stroke();
  texture.needsUpdate = true;
  return register(texture);
}

export function createIndiaWorld(ctx, board) {
  const { scene, register, container, renderer } = ctx;
  const root = new THREE.Group();
  scene.add(root);
  const tiles = new Map(),
    pickables = [],
    animated = [];
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mat = (color, options = {}) =>
    register(new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...options }));
  const addMesh = (geometry, material, x = 0, y = 0, z = 0, parent = root) => {
    const mesh = new THREE.Mesh(register(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  /* ---- room: warm backdrop + lamp light ---- */
  scene.background = new THREE.Color('#1b0f0a');
  scene.fog = new THREE.Fog('#1b0f0a', 60, 140);
  const key = new THREE.DirectionalLight('#ffe2b8', 3.1);
  key.position.set(-14, 30, 18);
  key.castShadow = true;
  const shadowSize = innerWidth < 700 ? 2048 : 4096;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(key.shadow.camera, {
    left: -26,
    right: 26,
    top: 26,
    bottom: -26,
    near: 1,
    far: 90,
  });
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  scene.add(key);
  scene.add(new THREE.HemisphereLight('#ffe9cf', '#3a2417', 0.75));
  const fillLight = new THREE.DirectionalLight('#9fb8ff', 0.45);
  fillLight.position.set(20, 12, -16);
  scene.add(fillLight);

  /* ---- table ---- */
  const wood = woodTexture(register);
  const tableMat = register(
    new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62, metalness: 0.04 }),
  );
  const tableTop = addMesh(new RoundedBoxGeometry(110, 3, 110, 3, 0.4), tableMat, 0, -2.3, 0);
  tableTop.castShadow = false;
  tableTop.position.y = -2.3;

  /* board body + brass frame */
  const BOARD_HALF = 12.8;
  const bodyMat = mat('#143d33', { roughness: 0.5 });
  addMesh(
    new RoundedBoxGeometry(BOARD_HALF * 2 + 0.7, 0.9, BOARD_HALF * 2 + 0.7, 3, 0.16),
    mat('#5a2a14', { roughness: 0.5 }),
    0,
    -0.45 - 0.05,
    0,
  );
  const brass = mat('#d8b363', { metalness: 0.95, roughness: 0.26 });
  for (const [w, d, x, z] of [
    [BOARD_HALF * 2 + 0.7, 0.16, 0, -BOARD_HALF - 0.28],
    [BOARD_HALF * 2 + 0.7, 0.16, 0, BOARD_HALF + 0.28],
    [0.16, BOARD_HALF * 2 + 0.7, -BOARD_HALF - 0.28, 0],
    [0.16, BOARD_HALF * 2 + 0.7, BOARD_HALF + 0.28, 0],
  ])
    addMesh(new RoundedBoxGeometry(w, 0.1, d, 2, 0.04), brass, x, 0.03, z);
  addMesh(
    new RoundedBoxGeometry(BOARD_HALF * 2 + 0.2, 0.1, BOARD_HALF * 2 + 0.2, 2, 0.05),
    bodyMat,
    0,
    -0.05,
    0,
  ).receiveShadow = true;

  /* centre field */
  const field = new THREE.Mesh(
    register(new THREE.PlaneGeometry(18, 18)),
    register(
      new THREE.MeshStandardMaterial({ map: centerFieldTexture(register), roughness: 0.85 }),
    ),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.021;
  field.receiveShadow = true;
  root.add(field);
  const fieldFrame = addMesh(new RoundedBoxGeometry(18.3, 0.14, 18.3, 2, 0.05), brass, 0, 0.0, 0);
  fieldFrame.scale.set(1, 1, 1);
  fieldFrame.castShadow = false;
  field.position.y = 0.075;

  /* ---- relief map ---- */
  const polygons =
    OUTLINE.geometry.type === 'Polygon'
      ? [OUTLINE.geometry.coordinates]
      : OUTLINE.geometry.coordinates;
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const polygon of polygons)
    for (const pt of polygon[0]) {
      const [x, y] = mapXY(pt);
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  const pad = 0.08;
  bounds.minX -= pad;
  bounds.maxX += pad;
  bounds.minY -= pad;
  bounds.maxY += pad;
  const mapTex = mapTexture(register, bounds);
  const mapTop = register(new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.8 }));
  const mapSide = mat('#8e6b34', { metalness: 0.5, roughness: 0.4 });
  const MAP_H = 0.34;
  const mapGroup = new THREE.Group();
  mapGroup.position.set(0, 0.14, 0.2);
  root.add(mapGroup);
  for (const polygon of polygons) {
    const shape = new THREE.Shape(polygon[0].map((pt) => new THREE.Vector2(...mapXY(pt))));
    for (const hole of polygon.slice(1))
      shape.holes.push(new THREE.Path(hole.map((pt) => new THREE.Vector2(...mapXY(pt)))));
    const geometry = register(
      new THREE.ExtrudeGeometry(shape, {
        depth: MAP_H,
        bevelEnabled: true,
        bevelSize: 0.04,
        bevelThickness: 0.04,
        bevelSegments: 2,
      }),
    );
    const pos = geometry.attributes.position,
      nor = geometry.attributes.normal,
      uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++)
      if (nor.getZ(i) > 0.5)
        uv.setXY(
          i,
          (pos.getX(i) - bounds.minX) / (bounds.maxX - bounds.minX),
          (pos.getY(i) - bounds.minY) / (bounds.maxY - bounds.minY),
        );
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, [mapTop, mapSide]);
    mesh.castShadow = mesh.receiveShadow = true;
    mapGroup.add(mesh);
  }
  // Himalayan ridge
  const ridge = [
    [74, 35.2],
    [76, 34.4],
    [78, 33.2],
    [80, 31.4],
    [82, 30.2],
    [84, 28.9],
    [86, 28.2],
    [88, 27.9],
    [90, 28.2],
    [92, 28.6],
    [94.5, 29],
    [96.5, 28.4],
  ];
  const rand = mulberry(21);
  const rockMat = mat('#7e7a72', { roughness: 0.9 }),
    snowMat = mat('#fbfdff', { roughness: 0.6 });
  for (let i = 0; i < ridge.length - 1; i++)
    for (let k = 0; k < 5; k++) {
      const t = rand();
      const [x, y] = mapXY([
        ridge[i][0] + (ridge[i + 1][0] - ridge[i][0]) * t,
        ridge[i][1] + (ridge[i + 1][1] - ridge[i][1]) * t + (rand() - 0.5) * 0.8,
      ]);
      const s = 0.2 + rand() * 0.26;
      const peak = new THREE.Group();
      peak.position.set(x, MAP_H + 0.04, -y);
      const rock = new THREE.Mesh(register(new THREE.ConeGeometry(s * 0.85, s * 1.9, 6)), rockMat);
      rock.position.y = s * 0.95;
      rock.castShadow = true;
      const snow = new THREE.Mesh(register(new THREE.ConeGeometry(s * 0.38, s * 0.8, 6)), snowMat);
      snow.position.y = s * 1.55;
      peak.add(rock, snow);
      peak.rotation.y = rand() * 3;
      mapGroup.add(peak);
    }

  /* city pins with monuments */
  const pins = new Map();
  const cityTiles = board.filter((t) => t.type === 'property');
  for (const tile of cityTiles) {
    const [x, y] = mapXY(CITIES[tile.name]);
    const pin = new THREE.Group();
    pin.position.set(x, MAP_H + 0.04, -y);
    const base = new THREE.Mesh(
      register(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 28)),
      mat(tile.color, { metalness: 0.3, roughness: 0.35 }),
    );
    base.castShadow = base.receiveShadow = true;
    base.position.y = 0.03;
    const ring = new THREE.Mesh(
      register(new THREE.TorusGeometry(0.31, 0.03, 8, 32)),
      register(new THREE.MeshBasicMaterial({ color: tile.color, toneMapped: false })),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.07;
    const monument = createLandmark(tile.name, register);
    monument.scale.setScalar(0.5);
    monument.position.y = 0.06;
    pin.add(base, ring, monument);
    pin.userData.ring = ring;
    pin.userData.base = base;
    pin.userData.monument = monument;
    const hit = new THREE.Mesh(
      register(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 12)),
      register(new THREE.MeshBasicMaterial({ visible: false })),
    );
    hit.position.y = 0.4;
    hit.userData.tileId = tile.id;
    pin.add(hit);
    pickables.push(hit);
    mapGroup.add(pin);
    pins.set(tile.id, pin);
  }
  // compass
  const compass = new THREE.Mesh(
    register(new THREE.CircleGeometry(0.75, 48)),
    register(
      new THREE.MeshBasicMaterial({
        transparent: true,
        map: (() => {
          const s = makeSurface(256, 256, 4);
          s.ctx.translate(128, 128);
          s.ctx.strokeStyle = '#e6c37a';
          s.ctx.lineWidth = 5;
          s.ctx.beginPath();
          s.ctx.arc(0, 0, 118, 0, Math.PI * 2);
          s.ctx.stroke();
          s.ctx.fillStyle = '#e6c37a';
          s.ctx.beginPath();
          s.ctx.moveTo(0, -110);
          s.ctx.lineTo(18, 0);
          s.ctx.lineTo(0, 110);
          s.ctx.lineTo(-18, 0);
          s.ctx.fill();
          s.ctx.beginPath();
          s.ctx.moveTo(-110, 0);
          s.ctx.lineTo(0, 18);
          s.ctx.lineTo(110, 0);
          s.ctx.lineTo(0, -18);
          s.ctx.fill();
          s.ctx.fillStyle = '#fff3d2';
          s.ctx.font = `800 48px ${SERIF}`;
          s.ctx.textAlign = 'center';
          s.ctx.fillText('N', 0, -64);
          s.texture.needsUpdate = true;
          return register(s.texture);
        })(),
      }),
    ),
  );
  compass.rotation.x = -Math.PI / 2;
  compass.position.set(-7.6, 0.09, 7.4);
  root.add(compass);

  /* decks of cards */
  const deckMat = (text, bg) => {
    const s = makeSurface(256, 360, 4);
    s.ctx.fillStyle = bg;
    s.ctx.fillRect(0, 0, 256, 360);
    s.ctx.strokeStyle = '#f2d493';
    s.ctx.lineWidth = 8;
    s.ctx.strokeRect(14, 14, 228, 332);
    s.ctx.fillStyle = '#fff3d2';
    s.ctx.textAlign = 'center';
    s.ctx.font = `900 120px ${SERIF}`;
    s.ctx.fillText(text === 'CHANCE' ? '?' : '✉', 128, 190);
    s.ctx.font = `800 30px ${SANS}`;
    text.split(' ').forEach((word, i) => s.ctx.fillText(word, 128, 250 + i * 36));
    s.texture.needsUpdate = true;
    return register(s.texture);
  };
  for (const [x, z, rot, label, bg] of [
    [-6.4, -6.6, -0.3, 'CHANCE', '#c8442f'],
    [6.6, 6.6, 0.3, 'COMMUNITY CHEST', '#2d6fb8'],
  ]) {
    const deck = new THREE.Group();
    const paper = mat('#f1e7d0', { roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const card = new THREE.Mesh(register(new RoundedBoxGeometry(2.4, 0.05, 3.3, 2, 0.02)), paper);
      card.position.set(Math.sin(i * 3) * 0.03, 0.03 + i * 0.05, Math.cos(i) * 0.03);
      card.castShadow = card.receiveShadow = true;
      deck.add(card);
    }
    const topMesh = new THREE.Mesh(
      register(new THREE.PlaneGeometry(2.3, 3.2)),
      register(new THREE.MeshStandardMaterial({ map: deckMat(label, bg), roughness: 0.6 })),
    );
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.y = 0.43;
    deck.add(topMesh);
    deck.position.set(x, 0.12, z);
    deck.rotation.y = rot;
    root.add(deck);
  }

  /* diyas: flickering brass lamps in the corners of the table */
  const flames = [];
  const flameTex = glowTexture(register);
  for (const [x, z] of [
    [-17.5, -17.5],
    [17.5, -17.5],
    [-17.5, 17.5],
    [17.5, 17.5],
  ]) {
    const diya = new THREE.Group();
    const bowl = new THREE.Mesh(
      register(new THREE.SphereGeometry(0.55, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)),
      brass,
    );
    bowl.rotation.x = Math.PI;
    bowl.position.y = 0.55;
    bowl.castShadow = true;
    diya.add(bowl);
    const flame = new THREE.Mesh(
      register(new THREE.ConeGeometry(0.14, 0.5, 12)),
      register(new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false })),
    );
    flame.material.color.multiplyScalar(2.6);
    flame.position.y = 0.95;
    diya.add(flame);
    const halo = new THREE.Sprite(
      register(
        new THREE.SpriteMaterial({
          map: flameTex,
          color: '#ff9a3c',
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    halo.scale.set(2.6, 2.6, 1);
    halo.position.y = 1;
    diya.add(halo);
    const light = new THREE.PointLight('#ffa24a', 14, 18, 1.8);
    light.position.y = 1.2;
    diya.add(light);
    diya.position.set(x, -0.8, z);
    root.add(diya);
    flames.push({ flame, light, halo, seed: x * 0.3 + z });
  }
  animated.push((t) => {
    flames.forEach(({ flame, light, halo, seed }) => {
      const f = 1 + Math.sin(t * 9 + seed) * 0.06 + Math.sin(t * 17 + seed * 2) * 0.04;
      flame.scale.set(1 / f, f, 1 / f);
      light.intensity = 13 + Math.sin(t * 7 + seed) * 2;
      halo.material.opacity = 0.55 + Math.sin(t * 8 + seed) * 0.1;
    });
  });

  /* ---- tiles ---- */
  const photos = new Map();
  board.forEach((tile) => {
    const plan = indiaPlan(tile.id);
    const corner = tile.id % 10 === 0;
    const width = corner ? 3 : 2,
      depth = 3;
    const group = new THREE.Group();
    group.position.set(plan.x, 0, plan.z);
    group.rotation.y = plan.rotation;
    root.add(group);
    const surface = makeSurface(corner ? 640 : 448, corner ? 640 : 672, aniso);
    register(surface.texture);
    const top = register(new THREE.MeshStandardMaterial({ map: surface.texture, roughness: 0.7 }));
    const side = mat('#d9c9a2', { roughness: 0.6 });
    const hw = width / 2 - 0.03,
      hd = depth / 2 - 0.03;
    const geometry = register(
      slabGeometry(
        [
          [-hw, -hd],
          [hw, -hd],
          [hw, hd],
          [-hw, hd],
        ],
        TILE_H,
        0.03,
        (x, z) => [x / (2 * hw) + 0.5, 1 - (z + hd) / (2 * hd)],
      ),
    );
    const mesh = new THREE.Mesh(geometry, [top, side]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.tileId = tile.id;
    group.add(mesh);
    pickables.push(mesh);
    const frame = new THREE.Group();
    const frameMat = register(
      new THREE.MeshStandardMaterial({
        color: '#ffd98a',
        metalness: 0.7,
        roughness: 0.25,
        emissive: '#ffb84a',
        emissiveIntensity: 0.9,
      }),
    );
    for (const [w, d, x, z] of [
      [hw * 2 + 0.06, 0.07, 0, -hd],
      [hw * 2 + 0.06, 0.07, 0, hd],
      [0.07, hd * 2, -hw, 0],
      [0.07, hd * 2, hw, 0],
    ]) {
      const m = new THREE.Mesh(register(new THREE.BoxGeometry(w, 0.05, d)), frameMat);
      m.position.set(x, TILE_H + 0.02, z);
      frame.add(m);
    }
    frame.visible = false;
    frame.userData.material = frameMat;
    group.add(frame);
    const ownerBar = new THREE.Mesh(
      register(new THREE.BoxGeometry(width - 0.2, 0.07, 0.16)),
      register(new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false })),
    );
    ownerBar.position.set(0, TILE_H + 0.03, depth / 2 - 0.16);
    ownerBar.visible = false;
    group.add(ownerBar);
    const info = {
      tile,
      plan,
      group,
      mesh,
      top,
      surface,
      ownerBar,
      border: frame,
      photo: null,
      development: null,
      level: 0,
      depth,
      width,
      devAnchor: new THREE.Vector3(0, TILE_H, -depth / 2 + 0.4),
    };
    tiles.set(tile.id, info);
    const src = tile.mapId === 'india' ? INDIA_IMAGES[tile.name]?.image : null;
    if (src)
      ctx.requestImage(src, (image) => {
        info.photo = image;
        ctx.repaint(info);
      });
    // 3D props on corners
    if (tile.id === 0) {
      const arrow = new THREE.Shape();
      arrow.moveTo(-0.9, -0.2);
      arrow.lineTo(0.2, -0.2);
      arrow.lineTo(0.2, -0.55);
      arrow.lineTo(1, 0);
      arrow.lineTo(0.2, 0.55);
      arrow.lineTo(0.2, 0.2);
      arrow.lineTo(-0.9, 0.2);
      arrow.closePath();
      const arrowMesh = addMesh(
        new THREE.ExtrudeGeometry(arrow, {
          depth: 0.12,
          bevelEnabled: true,
          bevelSize: 0.03,
          bevelThickness: 0.03,
          bevelSegments: 2,
        }),
        mat('#fff6e2', { roughness: 0.3 }),
        0,
        TILE_H + 0.02,
        0.9,
        group,
      );
      arrowMesh.rotation.set(-Math.PI / 2, 0, Math.PI);
    }
    if (tile.id === 10) {
      const cage = new THREE.Group();
      const iron = mat('#2a2a2e', { metalness: 0.8, roughness: 0.35 });
      for (let i = -2; i <= 2; i++)
        addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), iron, i * 0.2, 0.35, 0.55, cage);
      for (const y of [0.04, 0.7])
        addMesh(new THREE.BoxGeometry(1, 0.05, 0.12), iron, 0, y, 0.55, cage);
      cage.position.set(0, TILE_H, 0.3);
      group.add(cage);
    }
    if (tile.id === 20) {
      const car = new THREE.Group();
      addMesh(
        new RoundedBoxGeometry(0.9, 0.22, 0.5, 2, 0.06),
        mat('#d6402f', { roughness: 0.25, metalness: 0.4 }),
        0,
        0.2,
        0,
        car,
      );
      addMesh(
        new RoundedBoxGeometry(0.5, 0.2, 0.42, 2, 0.06),
        mat('#d6402f', { roughness: 0.25, metalness: 0.4 }),
        -0.05,
        0.38,
        0,
        car,
      );
      for (const x of [-0.28, 0.28])
        for (const z of [-0.26, 0.26])
          addMesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14),
            mat('#1b1b1b'),
            x,
            0.1,
            z,
            car,
          ).rotation.x = Math.PI / 2;
      car.position.set(0, TILE_H, 0.3);
      car.rotation.y = 0.5;
      group.add(car);
    }
    if (tile.id === 30) {
      const post = new THREE.Group();
      addMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 10), mat('#f2f2f2'), 0, 0.55, 0, post);
      addMesh(
        new THREE.BoxGeometry(0.7, 0.3, 0.05),
        mat('#2f5fb0', { roughness: 0.4 }),
        0.35,
        1.0,
        0,
        post,
      );
      post.position.set(0, TILE_H, 0.3);
      group.add(post);
    }
  });

  const world = {
    kind: 'india',
    tiles,
    pickables,
    tileTop: TILE_H,
    pawnY: TILE_H + 0.01,
    pawnScale: 1.05,
    diceHome: [new THREE.Vector3(-0.9, 1.2, 8.2), new THREE.Vector3(0.9, 1.2, 8.2)],
    diceRest: 0.6 + 0.08,
    bounds: 17.5,
    camera: { lift: 1.3, elevation: 0.95, azimuth: 0, fov: 34, min: 6, max: 52 },
    bloom: { strength: 0.22, radius: 0.5, threshold: 0.92 },
    exposure: 1.05,
    plan: indiaPlan,
    piecePosition(id, index = 0, count = 1) {
      const plan = indiaPlan(id);
      const columns = Math.min(count, plan.width < plan.depth ? 2 : 4);
      const rows = Math.ceil(count / columns);
      return {
        x: plan.x + ((index % columns) - (columns - 1) / 2) * 0.55,
        z: plan.z + (Math.floor(index / columns) - (rows - 1) / 2) * 0.55,
      };
    },
    focusPoint(id) {
      const pin = pins.get(id);
      if (pin) return pin.getWorldPosition(new THREE.Vector3());
      const plan = indiaPlan(id);
      return new THREE.Vector3(plan.x, TILE_H, plan.z);
    },
    createPawn: (player) => createClassicPawn(player.color, register),
    createDevelopment: (level) => createClassicDevelopment(level, register),
    createDie: () => createDie((v) => dicePips(v, '#fbf4e1', '#7a1d12'), register, { rough: 0.3 }),
    paint(info, game, owner) {
      const owned = game.ownership[info.tile.id];
      paintCityTile(info.surface, info.tile, {
        owner,
        ownerColor: owner?.color,
        mortgaged: owned?.mortgaged,
        rules: game.rules,
        photo: info.photo,
      });
      info.ownerBar.visible = Boolean(owner);
      if (owner) info.ownerBar.material.color.set(owner.color);
    },
    style(info, { selected, hover, location, ownerMatch, dim }) {
      info.group.position.y = selected ? 0.12 : hover ? 0.05 : 0;
      info.border.visible = Boolean(location || ownerMatch || selected || hover);
      const color = location || ownerMatch || (selected ? '#ffd98a' : '#fff0c8');
      info.border.userData.material.color.set(color);
      info.border.userData.material.emissive.set(color);
      info.top.color.set(dim ? '#9a9382' : '#ffffff');
    },
    styleWorlds(game, selected, filter) {
      pins.forEach((pin, id) => {
        const owner = game.players.find((p) => p.id === game.ownership[id]?.owner);
        const dim = filter && owner?.id !== filter;
        const color = owner?.color || board[id].color;
        pin.userData.ring.material.color.set(color);
        pin.userData.base.material.color.set(color);
        pin.scale.setScalar(id === selected ? 1.6 : dim ? 0.75 : 1);
        pin.userData.monument.visible = !dim || id === selected;
      });
    },
    setDevelopment(info, level, animate) {
      if (info.development) ctx.disposeGroup(info.development);
      info.development = null;
      info.level = level;
      if (!level) return;
      const dev = createClassicDevelopment(level, register);
      dev.position.copy(info.devAnchor);
      info.group.add(dev);
      info.development = dev;
      if (animate)
        ctx.tween(dev.scale, {
          from: { y: 0.01 },
          to: { y: 1 },
          duration: 0.55,
          ease: 'back.out(1.3)',
        });
    },
    project() {
      return [];
    },
    planetPosition() {
      return null;
    },
    animate(time) {
      animated.forEach((fn) => fn(time));
    },
  };
  return world;
}
