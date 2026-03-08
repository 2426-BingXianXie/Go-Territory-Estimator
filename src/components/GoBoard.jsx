import Intersection from './Intersection.jsx'

function coordToLabel(row, col, size) {
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
  const colLabel = letters[col]
  const rowLabel = size - row
  return `${colLabel}${rowLabel}`
}

/** Star points (hoshi) – black dots at key intersections to help find positions. */
function getStarPoints(boardSize) {
  if (boardSize === 9) {
    return [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]]
  }
  if (boardSize === 13) {
    return [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9]]
  }
  if (boardSize === 19) {
    return [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15],
    ]
  }
  return []
}

export default function GoBoard({
  board,
  boardSize,
  currentPlayer,
  onIntersectionClick,
  lastCaptures = [],
  territoryMap,
  influenceMap,
  distanceMap,
  hint,
  pendingMove = null,
  disabled = false,
  showTerritoryEstimation = true,
}) {
  const handleClick = (row, col) => {
    if (disabled) return
    onIntersectionClick?.(row, col)
  }

  const capturedSet = new Set(
    lastCaptures.map(({ row, col }) => `${row},${col}`),
  )

  const hintKey = hint ? `${hint.row},${hint.col}` : null

  // Intersections sit at line crossings: (col/(n-1), row/(n-1)) for 0..n-1
  // Edge lines are included, so corners and sides are valid play points
  const n = boardSize
  const spacing = n > 1 ? 100 / (n - 1) : 0
  const starPointSet = new Set(
    getStarPoints(n).map(([r, c]) => `${r},${c}`),
  )

  return (
    <div className={`board-container${disabled ? ' disabled' : ''}`}>
      <div
        className="board-grid-lines"
        style={{ '--board-size': n }}
        aria-hidden="true"
      />
      <div className="board-grid">
        {board.map((rowData, rowIndex) =>
          rowData.map((value, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`intersection-wrapper${disabled ? ' disabled' : ''}`}
              style={{
                left: `${(colIndex / (n - 1)) * 100}%`,
                top: `${(rowIndex / (n - 1)) * 100}%`,
                width: `${spacing}%`,
                height: `${spacing}%`,
              }}
            >
              <Intersection
                row={rowIndex}
                col={colIndex}
                value={value}
                onClick={handleClick}
                isCapturedRecently={capturedSet.has(
                  `${rowIndex},${colIndex}`,
                )}
                territoryOwner={
                  territoryMap?.[rowIndex]?.[colIndex] ?? null
                }
                influenceValue={influenceMap?.[rowIndex]?.[colIndex] ?? 0}
                distanceToNearestStone={distanceMap?.[rowIndex]?.[colIndex] ?? 99}
                isHint={hintKey === `${rowIndex},${colIndex}`}
                isPendingMove={
                  pendingMove?.row === rowIndex && pendingMove?.col === colIndex
                }
                pendingMoveColor={pendingMove ? currentPlayer : null}
                isStarPoint={starPointSet.has(`${rowIndex},${colIndex}`)}
                showTerritoryEstimation={showTerritoryEstimation}
                ariaLabel={`Intersection ${coordToLabel(rowIndex, colIndex, boardSize)}`}
              />
            </div>
          )),
        )}
      </div>
    </div>
  )
}

