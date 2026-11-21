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
export function piecePosition(position, index = 0) {
  const plan = tilePlan(position);
  return { x: plan.x + ((index % 4) - 1.5) * 0.48, z: plan.z + (index < 4 ? 0.34 : -0.34) };
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
