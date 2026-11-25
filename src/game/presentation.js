/**
 * Presentation staging (frontend only).
 *
 * The engine resolves a whole roll in one transition: the pawn moves, rent/tax is paid, a card is
 * drawn and any card movement is applied. That is correct for the rules but looks wrong on screen:
 * balances change before the pawn has arrived. `planStages` splits one authoritative state into a
 * sequence of display states so the UI can show: travel -> landing -> card -> card travel -> result.
 * Nothing here changes game rules or what the server stores.
 */

const copy = (value) => JSON.parse(JSON.stringify(value));

export function travelMs(steps, reduced = false) {
  return reduced ? 250 : Math.max(450, steps * 290 + 650);
}

/**
 * @returns {null | { stages: Array<{kind:string,state:object,steps?:number}>, final: object }}
 */
export function planStages(old, next) {
  if (!old || !next || old.id !== next.id) return null;
  if (!Number.isInteger(old.version) || next.version !== old.version + 1) return null;
  if (next.lastActionType !== 'ROLL' || !next.movement || !next.movement.path?.length) return null;
  const movement = next.movement;
  const rollSteps = next.dice[0] + next.dice[1];
  if (movement.path.length < rollSteps || rollSteps < 2) return null;
  const mover = next.players.find((p) => p.id === movement.player);
  if (!mover) return null;

  const travelPath = movement.path.slice(0, rollSteps);
  const extraPath = movement.path.slice(rollSteps);
  const landing = travelPath.at(-1);

  // Stage 1: the dice move only. Money, owners, cards and the log stay as they were.
  const travel = copy(old);
  travel.dice = next.dice;
  travel.lastActionType = 'ROLL';
  travel.presentation = 'travel';
  travel.version = next.version - 0.8;
  travel.animationUntil = next.animationUntil;
  travel.movement = {
    player: movement.player,
    from: movement.from,
    steps: rollSteps,
    back: false,
    path: travelPath,
  };
  travel.players.find((p) => p.id === movement.player).position = landing;

  const stages = [{ kind: 'travel', state: travel, steps: rollSteps }];

  // Stage 2: the pawn has landed and a card (if any) is revealed. Effects are not applied yet.
  const known = new Set((old.events || []).map((e) => e.id));
  const cardIndex = (next.events || []).findIndex((e) => e.type === 'card' && !known.has(e.id));
  let resting = travel;
  if (cardIndex >= 0) {
    const reveal = copy(travel);
    reveal.movement = null;
    reveal.presentation = 'card';
    reveal.version = next.version - 0.6;
    reveal.events = next.events.slice(0, cardIndex + 1);
    reveal.lastCard = next.lastCard;
    stages.push({ kind: 'card', state: reveal });
    resting = reveal;
  }

  // Stage 3: a card that moves the pawn again starts from the landing tile.
  if (extraPath.length) {
    const hop = copy(resting);
    hop.version = next.version - 0.4;
    hop.presentation = 'hop';
    hop.movement = {
      player: movement.player,
      from: landing,
      steps: extraPath.length,
      back: movement.back,
      path: extraPath,
    };
    hop.players.find((p) => p.id === movement.player).position = mover.position;
    stages.push({ kind: 'travel', state: hop, steps: extraPath.length });
  }

  // Final: the real state. The pawn has already travelled, so it must not animate again.
  const final = copy(next);
  final.movement = null;
  final.presentation = 'final';
  return { stages, final };
}
