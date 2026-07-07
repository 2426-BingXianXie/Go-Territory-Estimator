export default function Intersection({
  row,
  col,
  value,
  onClick,
  ariaLabel,
  isCapturedRecently = false,
  territoryOwner = null,
  influenceValue = 0,
  distanceToNearestStone = 99,
  isHint = false,
  isPendingMove = false,
  pendingMoveColor = null,
  isStarPoint = false,
  showTerritoryEstimation = true,
}) {
  const handleClick = () => {
    onClick?.(row, col)
  }

  let stoneClass = ''
  if (value === 'B') stoneClass = 'stone stone-black'
  if (value === 'W') stoneClass = 'stone stone-white'

  let territoryClass = ''
  let influenceClass = ''
  if (showTerritoryEstimation && !value) {
    const OVERLAP_THRESHOLD = 1 // |influence| <= this → overlap (grey)
    const farFromStones = distanceToNearestStone > 3

    if (territoryOwner === 'B') {
      territoryClass = 'territory territory-black'
    } else if (territoryOwner === 'W') {
      territoryClass = 'territory territory-white'
    } else if (territoryOwner === 'B_weak') {
      // Weak territory (one color, open to edge): show faded, and only near
      // the influencing stones so a lone stone doesn't flood the whole board.
      territoryClass = farFromStones ? '' : 'territory territory-black-weak'
    } else if (territoryOwner === 'W_weak') {
      territoryClass = farFromStones ? '' : 'territory territory-white-weak'
    } else if (territoryOwner === 'N') {
      // Neutral region: use influence for visible feedback. Overlap → grey, else black/white. Far → empty.
      if (farFromStones) {
        territoryClass = 'territory territory-empty'
      } else if (influenceValue > OVERLAP_THRESHOLD) {
        territoryClass = 'territory territory-black'
      } else if (influenceValue < -OVERLAP_THRESHOLD) {
        territoryClass = 'territory territory-white'
      } else {
        territoryClass = 'territory territory-neutral'
      }
    } else if (farFromStones) {
      territoryClass = 'territory territory-empty'
    } else {
      // Undecided: use influence. Overlap (balanced) → grey.
      if (influenceValue > OVERLAP_THRESHOLD) {
        territoryClass = 'territory territory-black'
      } else if (influenceValue < -OVERLAP_THRESHOLD) {
        territoryClass = 'territory territory-white'
      } else {
        territoryClass = 'territory territory-neutral'
      }
    }
  }

  const showGhostStone = isPendingMove && !value && pendingMoveColor
  const ghostClass = showGhostStone
    ? `stone stone-${pendingMoveColor === 'B' ? 'black' : 'white'} stone-preview`
    : ''

  return (
    <button
      type="button"
      className={`intersection${isCapturedRecently ? ' captured-flash' : ''}`}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {territoryClass && <div className={territoryClass} />}
      {influenceClass && <div className={influenceClass} />}
      {isStarPoint &&
        !value &&
        (!showTerritoryEstimation ||
          (territoryClass !== 'territory territory-black' &&
            territoryClass !== 'territory territory-white')) && (
          <div className="star-point-dot" aria-hidden="true" />
        )}
      {stoneClass && <div className={stoneClass} />}
      {showGhostStone && <div className={ghostClass} aria-hidden="true" />}
      {isHint && !value && (
        <div className="hint-ring" aria-hidden="true" />
      )}
    </button>
  )
}

