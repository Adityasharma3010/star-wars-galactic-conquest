import * as THREE from 'three';

/* Small helpers shared by both 3D table themes. */

export function makeSurface(width, height, anisotropy = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return { canvas, texture, ctx: canvas.getContext('2d') };
}

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const result = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      result.push(line);
      line = word;
    } else line = next;
  }
  if (line) result.push(line);
  return result;
}

export function drawCover(ctx, image, x, y, w, h, radius = 0) {
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const ratio = Math.max(w / image.width, h / image.height);
  const iw = image.width * ratio,
    ih = image.height * ratio;
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

/**
 * A beveled slab whose base sits on y = 0 and whose top face sits on y = height.
 * `points` are [x, z] pairs in tile-local space. `uvOf(x, z)` maps the top face to a texture.
 * Material groups: 0 = caps (use the painted material), 1 = sides.
 */
export function slabGeometry(points, height, bevel, uvOf) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const thickness = Math.max(0.001, height - bevel * 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  const position = geometry.attributes.position,
    normal = geometry.attributes.normal,
    uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    if (normal.getY(i) > 0.5) {
      const [u, v] = uvOf(position.getX(i), position.getZ(i));
      uv.setXY(i, u, v);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft radial glow sprite texture (used for bloom-friendly halos and light pools). */
export function glowTexture(register) {
  const { canvas, texture, ctx } = makeSurface(128, 128, 1);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  texture.needsUpdate = true;
  return register(texture);
}

export function dicePips(value, face = '#f6f0e1', pip = '#14202c', size = 256) {
  const { canvas, texture, ctx } = makeSurface(size, size, 8);
  ctx.fillStyle = face;
  ctx.fillRect(0, 0, size, size);
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.1,
    size / 2,
    size / 2,
    size * 0.75,
  );
  g.addColorStop(0, 'rgba(255,255,255,0.0)');
  g.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const positions = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }[value];
  ctx.fillStyle = pip;
  const step = size / 4;
  for (const index of positions) {
    ctx.beginPath();
    ctx.arc(
      step + (index % 3) * step,
      step + Math.floor(index / 3) * step,
      size * 0.075,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  texture.needsUpdate = true;
  return texture;
}
