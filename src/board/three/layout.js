export function tilePlan(id) {
  if (!Number.isInteger(id) || id < 0 || id > 39) throw new RangeError('Unknown board space');
  const row = id <= 10 ? 0 : id <= 20 ? id - 10 : id <= 30 ? 10 : 40 - id;
  const column = id <= 10 ? id : id <= 20 ? 10 : id <= 30 ? 30 - id : 0;
  const center = (index) => (index === 0 ? 1.5 : index === 10 ? 22.5 : 3 + (index - 1) * 2 + 1);
  return {
    x: center(column) - 12,
    z: center(row) - 12,
    width: column === 0 || column === 10 ? 3 : 2,
    depth: row === 0 || row === 10 ? 3 : 2,
  };
}
export function piecePosition(position, index = 0, count = 8) {
  const plan = tilePlan(position);
  const columns = Math.min(count, plan.width < plan.depth ? 2 : 4);
  const rows = Math.ceil(count / columns);
  return {
    x: plan.x + ((index % columns) - (columns - 1) / 2) * 0.55,
    z: plan.z + (Math.floor(index / columns) - (rows - 1) / 2) * 0.55,
  };
}
export function diceRotation(value) {
  return {
    1: [0, 0, 0],
    2: [-Math.PI / 2, 0, 0],
    3: [0, 0, -Math.PI / 2],
    4: [0, 0, Math.PI / 2],
    5: [Math.PI / 2, 0, 0],
    6: [0, 0, Math.PI],
  }[value];
}

export function scenePlan(id, classic = true) {
  const plan = tilePlan(id);
  if (classic)
    return {
      ...plan,
      rotation: id <= 10 ? Math.PI : id <= 20 ? Math.PI / 2 : id <= 30 ? 0 : -Math.PI / 2,
    };
  const angle = -Math.PI / 4 + (id * Math.PI) / 20;
  const radius = 10.8;
  return {
    x: Math.sin(angle) * radius,
    z: -Math.cos(angle) * radius,
    width: 2 * radius * Math.tan(Math.PI / 40) * 0.96,
    depth: 3,
    rotation: Math.PI - angle,
    radius,
  };
}

export function scenePiecePosition(position, index = 0, count = 1, classic = true) {
  if (classic) return piecePosition(position, index, count);
  const plan = scenePlan(position, false);
  const columns = Math.min(2, count),
    rows = Math.ceil(count / columns);
  const dx = ((index % columns) - (columns - 1) / 2) * 0.5;
  const dz = (Math.floor(index / columns) - (rows - 1) / 2) * 0.55;
  return {
    x: plan.x + dx * Math.cos(plan.rotation) + dz * Math.sin(plan.rotation),
    z: plan.z - dx * Math.sin(plan.rotation) + dz * Math.cos(plan.rotation),
  };
}
