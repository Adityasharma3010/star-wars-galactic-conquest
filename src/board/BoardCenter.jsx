import TurnConsole from './TurnConsole.jsx';

export default function BoardCenter({ game, moving }) {
  return (
    <div className="board-center clean-center">
      <TurnConsole moving={moving} clean />
      <div className="center-activity" aria-label="Recent match activity">
        {game.events
          .slice(-4)
          .reverse()
          .map((event) => (
            <p key={event.id}>{event.text}</p>
          ))}
      </div>
    </div>
  );
}
