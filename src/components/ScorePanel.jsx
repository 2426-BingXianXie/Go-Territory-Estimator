export default function ScorePanel({
  currentPlayer,
  boardSize,
  score,
  gameOver,
  winner,
  hasPendingMove = false,
}) {
  const {
    territoryBlack,
    territoryWhite,
    capturedByBlack,
    capturedByWhite,
    komi,
    scoreBlack,
    scoreWhite,
    leader,
    lead,
  } = score

  const leaderLabel =
    leader === 'B' ? 'Black' : leader === 'W' ? 'White' : 'Neither player'

  const leadText =
    leader === 'tie'
      ? 'The game is currently tied.'
      : `${leaderLabel} is ahead by ${lead.toFixed(1)} point${
          Math.abs(lead - 1) < 1e-3 ? '' : 's'
        }.`

  return (
    <div className="panel score-panel">
      <h2>Score Overview</h2>
      {gameOver ? (
        <p className="game-over-message">
          <strong>Game Over!</strong>{' '}
          {winner
            ? `${winner} wins by ${lead.toFixed(1)} point${Math.abs(lead - 1) < 1e-3 ? '' : 's'}.`
            : 'Tie game.'}
        </p>
      ) : (
        <>
          <p className="score-estimated-note">
            <strong>{hasPendingMove ? 'Preview' : 'Estimated'}</strong> —{' '}
            {hasPendingMove
              ? 'score if you play the selected move.'
              : 'updates after each move.'}
          </p>
          <p className="current-player">
            Next to play:{' '}
            <span className={currentPlayer === 'B' ? 'player-black' : 'player-white'}>
              {currentPlayer === 'B' ? 'Black' : 'White'}
            </span>
          </p>
        </>
      )}
      <div className="score-row">
        <span className="player-black">Black territory:</span>
        <span>{territoryBlack}</span>
      </div>
      <div className="score-row">
        <span className="player-white">White territory:</span>
        <span>{territoryWhite}</span>
      </div>
      <div className="score-row">
        <span className="player-black">Black captures:</span>
        <span>{capturedByBlack}</span>
      </div>
      <div className="score-row">
        <span className="player-white">White captures:</span>
        <span>{capturedByWhite}</span>
      </div>
      <div className="score-row">
        <span className="player-white">Komi (for White):</span>
        <span>{komi}</span>
      </div>
      <div className="score-row">
        <span className="player-black">Total Black:</span>
        <span>{scoreBlack.toFixed(1)}</span>
      </div>
      <div className="score-row">
        <span className="player-white">Total White:</span>
        <span>{scoreWhite.toFixed(1)}</span>
      </div>
      <p className="score-note">
        {gameOver ? 'Final: ' : 'Estimated: '}
        {leadText} Board size: {boardSize} × {boardSize}.
      </p>
    </div>
  )
}

