import * as THREE from 'three';
import { REFERENCE_IMAGES } from '../../assets/referenceImages.js';
import INDIA_IMAGES from '../../assets/indiaImages.json';

export function tileImage(tile) {
  if (tile.mapId === 'india') return INDIA_IMAGES[tile.name]?.image;
  const vehicle = {
    5: 'millennium-falcon',
    15: 'star-destroyer',
    25: 'blockade-runner',
    35: 'executor',
  };
  const url = (REFERENCE_IMAGES[tile.name] || REFERENCE_IMAGES[vehicle[tile.id]])?.image;
  return url ? url + (url.includes('?') ? '&' : '?') + 'width=512' : undefined;
}
export function canvasSurface(width = 384, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture, context: canvas.getContext('2d') };
}
function lines(context, text, maxWidth) {
  const words = text.split(' '),
    result = [];
  let line = '';
  for (const word of words) {
    if (context.measureText(word).width > maxWidth) {
      if (line) {
        result.push(line);
        line = '';
      }
      let fragment = '';
      for (const character of word) {
        if (context.measureText(fragment + character).width > maxWidth) {
          result.push(fragment);
          fragment = '';
        }
        fragment += character;
      }
      line = fragment;
    } else if (line && context.measureText(line + ' ' + word).width > maxWidth) {
      result.push(line);
      line = word;
    } else line = line ? line + ' ' + word : word;
  }
  if (line) result.push(line);
  return result;
}
function cover(context, image, width, height) {
  const ratio = Math.max(width / image.width, height / image.height);
  const w = image.width * ratio,
    h = image.height * ratio;
  context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}
export function paintTile(
  surface,
  tile,
  classic,
  image,
  owned,
  ownerColor,
  rules,
  projected = false,
) {
  const { context: ctx, canvas } = surface,
    w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = classic ? '#fbf3dd' : '#0d2937';
  ctx.fillRect(0, 0, w, h);
  if (image) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(w * 0.13, h * 0.4, w * 0.74, h * 0.27);
    ctx.clip();
    ctx.translate(w * 0.13, h * 0.4);
    cover(ctx, image, w * 0.74, h * 0.27);
    ctx.restore();
    if (!classic) {
      ctx.fillStyle = '#286f843b';
      ctx.fillRect(w * 0.13, h * 0.4, w * 0.74, h * 0.27);
    }
  } else if (!projected) {
    const symbols = {
      force: '✦',
      galactic: '◉',
      start: '↗',
      tax: classic ? '₹' : '◈',
      utility: '⚡',
      detention: '▣',
      parking: '◎',
      goDetention: '⚑',
    };
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(h * 0.23)}px Segoe UI, sans-serif`;
    ctx.fillStyle = classic ? '#365347' : '#9dcde0';
    ctx.fillText(symbols[tile.type] || '◆', w / 2, h * 0.56);
  }
  if (tile.color) {
    ctx.fillStyle = tile.color;
    ctx.fillRect(0, 0, w, h * 0.14);
    ctx.strokeStyle = '#233e3855';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h * 0.14);
  }
  if (owned) {
    ctx.fillStyle = ownerColor;
    ctx.fillRect(0, h * 0.958, w, h * 0.042);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(w * 0.12)}px Segoe UI, sans-serif`;
  ctx.fillStyle = classic ? '#263d38' : '#d6eee7';
  const name = lines(ctx, tile.name, w * 0.89).slice(0, 3);
  const top = h * 0.28 - (name.length - 1) * w * 0.061;
  name.forEach((line, i) => ctx.fillText(line, w / 2, top + i * w * 0.123));
  ctx.font = `600 ${Math.round(w * 0.1)}px Segoe UI, sans-serif`;
  ctx.fillStyle = classic ? '#334b41' : '#94cbd7';
  const price = tile.price
    ? `${classic ? '₹' : '◈'} ${tile.price}`
    : tile.id === 4
      ? '10% ' + (rules.taxBasis === 'wealth' ? 'WEALTH' : 'CASH')
      : tile.type === 'start'
        ? `COLLECT ${rules.startBonus}`
        : tile.type === 'tax'
          ? `${classic ? '₹' : '◈'} ${rules.luxuryTax}`
          : tile.label || 'DRAW A CARD';
  ctx.fillText(price, w / 2, h * 0.82, w * 0.91);
  if (owned?.mortgaged) {
    ctx.fillStyle = '#e2d3bacc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7c433b';
    ctx.font = `bold ${w * 0.1}px Segoe UI`;
    ctx.fillText('MORTGAGED', w / 2, h * 0.5);
  }
  surface.texture.needsUpdate = true;
}
export function paintCenter(surface, classic) {
  const { context: ctx, canvas } = surface;
  const size = canvas.width;
  ctx.fillStyle = classic ? '#315448' : '#234a49';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = y % 9 === 0 ? '#ffffff04' : '#00000004';
    ctx.fillRect(0, y, size, 1);
  }
  ctx.strokeStyle = '#d2bd8350';
  ctx.lineWidth = 3;
  ctx.strokeRect(size * 0.025, size * 0.025, size * 0.95, size * 0.95);
  ctx.strokeStyle = '#d2bd8325';
  ctx.lineWidth = 1;
  ctx.strokeRect(size * 0.038, size * 0.038, size * 0.924, size * 0.924);
  ctx.save();
  ctx.translate(size * 0.5, size * 0.3);
  ctx.rotate(-0.12);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#142f2a';
  ctx.fillRect(-size * 0.335, -size * 0.112, size * 0.67, size * 0.24);
  ctx.strokeStyle = '#dcc799';
  ctx.lineWidth = 4;
  ctx.strokeRect(-size * 0.335, -size * 0.112, size * 0.67, size * 0.24);
  ctx.fillStyle = '#f2e5c4';
  ctx.font = '800 ' + size * 0.081 + 'px Georgia, serif';
  ctx.fillText(classic ? 'MONOPOLY' : 'GALACTIC', 0, -size * 0.005);
  ctx.font = '700 ' + size * 0.035 + 'px Segoe UI, sans-serif';
  ctx.fillStyle = '#d9c68e';
  ctx.fillText(classic ? 'INDIA · CITY CAPITALS' : 'CONQUEST', 0, size * 0.075);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c4cbb2';
  ctx.font = '500 ' + size * 0.02 + 'px Segoe UI, sans-serif';
  ctx.fillText('40 SPACES · 2–8 PLAYERS', size * 0.5, size * 0.48);
  ctx.font = '500 ' + size * 0.018 + 'px Segoe UI, sans-serif';
  ctx.fillStyle = '#e4d3a580';
  ctx.fillText(classic ? 'BUY · BUILD · TRADE' : 'CLAIM · BUILD · TRADE', size * 0.5, size * 0.93);
  surface.texture.needsUpdate = true;
}
export function diceSurface(value) {
  const surface = canvasSurface(128, 128),
    ctx = surface.context;
  ctx.fillStyle = '#fff8e8';
  ctx.fillRect(0, 0, 128, 128);
  const positions = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  ctx.fillStyle = '#133244';
  positions[value].forEach((index) => {
    ctx.beginPath();
    ctx.arc(32 + (index % 3) * 32, 32 + Math.floor(index / 3) * 32, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  surface.texture.needsUpdate = true;
  return surface;
}
