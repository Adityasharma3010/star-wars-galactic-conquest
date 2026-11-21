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
  ctx.fillStyle = classic ? '#f9f1dc' : '#102638';
  ctx.fillRect(0, 0, w, h);
  if (image) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h * 0.65);
    ctx.clip();
    cover(ctx, image, w, h * 0.65);
    ctx.restore();
    const gradient = ctx.createLinearGradient(0, h * 0.32, 0, h * 0.7);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, classic ? '#f9f1dc' : '#102638');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, h * 0.32, w, h * 0.4);
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
    ctx.fillStyle = classic ? '#658371' : tile.type === 'force' ? '#c2a5ff' : '#a5dce9';
    ctx.fillText(symbols[tile.type] || '◆', w / 2, h * 0.41);
  }
  if (tile.color) {
    ctx.fillStyle = tile.color;
    ctx.fillRect(0, 0, w, h * 0.05);
  }
  if (owned) {
    ctx.fillStyle = ownerColor;
    ctx.fillRect(0, h * 0.945, w, h * 0.055);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(w * 0.108)}px Segoe UI, sans-serif`;
  ctx.fillStyle = classic ? '#264739' : '#f3f1e9';
  const name = lines(ctx, tile.name, w * 0.89).slice(0, 3);
  const top = h * 0.68 - (name.length - 1) * w * 0.061;
  name.forEach((line, i) => ctx.fillText(line, w / 2, top + i * w * 0.123));
  ctx.font = `600 ${Math.round(w * 0.073)}px Segoe UI, sans-serif`;
  ctx.fillStyle = classic ? '#a36d2f' : '#eec685';
  const price = tile.price
    ? `${classic ? '₹' : '◈'} ${tile.price}`
    : tile.id === 4
      ? '10% ' + (rules.taxBasis === 'wealth' ? 'WEALTH' : 'CASH')
      : tile.type === 'start'
        ? `COLLECT ${rules.startBonus}`
        : tile.type === 'tax'
          ? `${classic ? '₹' : '◈'} ${rules.luxuryTax}`
          : tile.label || 'DRAW A CARD';
  ctx.fillText(price, w / 2, h * 0.88, w * 0.91);
  if (owned?.mortgaged) {
    ctx.fillStyle = '#152539b0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${w * 0.1}px Segoe UI`;
    ctx.fillText('MORTGAGED', w / 2, h * 0.5);
  }
  surface.texture.needsUpdate = true;
}
export function paintCenter(surface, classic, image) {
  const { context: ctx, canvas } = surface,
    size = canvas.width;
  ctx.fillStyle = classic ? '#1d4538' : '#061e30';
  ctx.fillRect(0, 0, size, size);
  if (image) {
    cover(ctx, image, size, size);
    ctx.fillStyle = classic ? '#15382bb8' : '#071c32aa';
    ctx.fillRect(0, 0, size, size);
  }
  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.3,
    10,
    size * 0.5,
    size * 0.5,
    size * 0.65,
  );
  gradient.addColorStop(0, '#76b9ff22');
  gradient.addColorStop(1, '#03111bdb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = classic ? '#e5bd7433' : '#95d2ef33';
  ctx.lineWidth = 2;
  [size * 0.29, size * 0.36, size * 0.44].forEach((radius) => {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5cd82';
  ctx.font = `600 ${size * 0.022}px Segoe UI`;
  ctx.fillText(
    classic ? 'INDIAN CITY CAPITALS' : 'A GALAXY. A THOUSAND WORLDS.',
    size / 2,
    size * 0.86,
  );
  ctx.font = `800 ${size * 0.043}px Segoe UI`;
  ctx.fillStyle = '#fff4d5';
  ctx.fillText(classic ? 'INDIA' : 'GALACTIC', size / 2, size * 0.92);
  ctx.fillStyle = '#efc882';
  ctx.fillText(classic ? 'CITY CAPITALS' : 'CONQUEST', size / 2, size * 0.97);
  ctx.font = `500 ${size * 0.021}px Segoe UI`;
  ctx.fillStyle = '#b8dce6';
  ctx.fillText(
    classic ? 'CITY COLLECTION / INDIA' : 'HOLOGRAPHIC TACTICAL ARRAY',
    size / 2,
    size * 0.09,
  );
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
