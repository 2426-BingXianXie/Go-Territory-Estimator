export function createEmptyBoard(boardSize) {
  if (![9, 13, 19].includes(boardSize)) {
    throw new Error(`Unsupported board size: ${boardSize}`)
  }

  return Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => null),
  )
}

function getNeighbors(row, col, boardSize) {
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]

  return deltas
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(
      ([r, c]) => r >= 0 && r < boardSize && c >= 0 && c < boardSize,
    )
}

function getGroup(board, startRow, startCol, boardSize) {
  const color = board[startRow][startCol]
  if (!color) return []

  const stack = [[startRow, startCol]]
  const visited = new Set()
  const group = []

  while (stack.length > 0) {
    const [row, col] = stack.pop()
    const key = `${row},${col}`
    if (visited.has(key)) continue
    visited.add(key)
    group.push([row, col])

    for (const [nr, nc] of getNeighbors(row, col, boardSize)) {
      if (board[nr][nc] === color) {
        const nKey = `${nr},${nc}`
        if (!visited.has(nKey)) {
          stack.push([nr, nc])
        }
      }
    }
  }

  return group
}

function getLiberties(board, group, boardSize) {
  const liberties = new Set()

  for (const [row, col] of group) {
    for (const [nr, nc] of getNeighbors(row, col, boardSize)) {
      if (board[nr][nc] === null) {
        liberties.add(`${nr},${nc}`)
      }
    }
  }

  return liberties
}

export function applyMove({
  board,
  row,
  col,
  color,
  boardSize,
  capturedByBlack,
  capturedByWhite,
}) {
  const inBounds =
    row >= 0 && row < boardSize &&
    col >= 0 && col < boardSize

  if (!inBounds) {
    return {
      board,
      capturedByBlack,
      capturedByWhite,
      isLegal: false,
      reason: 'Move is out of bounds.',
      capturesThisMove: [],
    }
  }

  if (board[row][col] !== null) {
    return {
      board,
      capturedByBlack,
      capturedByWhite,
      isLegal: false,
      reason: 'That point is already occupied.',
      capturesThisMove: [],
    }
  }

  const nextBoard = board.map((r) => r.slice())
  nextBoard[row][col] = color

  const opponentColor = color === 'B' ? 'W' : 'B'
  const capturedCoords = []
  let nextCapturedByBlack = capturedByBlack
  let nextCapturedByWhite = capturedByWhite

  // Check adjacent opponent groups for capture.
  for (const [nr, nc] of getNeighbors(row, col, boardSize)) {
    if (nextBoard[nr][nc] !== opponentColor) continue

    const group = getGroup(nextBoard, nr, nc, boardSize)
    const liberties = getLiberties(nextBoard, group, boardSize)

    if (liberties.size === 0) {
      for (const [gr, gc] of group) {
        nextBoard[gr][gc] = null
        capturedCoords.push({ row: gr, col: gc, color: opponentColor })
      }
      if (color === 'B') {
        nextCapturedByBlack += group.length
      } else {
        nextCapturedByWhite += group.length
      }
    }
  }

  // Check for suicide: if the newly placed stone group has no liberties
  // and no opponent stones were captured, the move is illegal.
  const placedGroup = getGroup(nextBoard, row, col, boardSize)
  const placedLiberties = getLiberties(nextBoard, placedGroup, boardSize)

  if (placedLiberties.size === 0 && capturedCoords.length === 0) {
    return {
      board,
      capturedByBlack,
      capturedByWhite,
      isLegal: false,
      reason: 'Suicide is not allowed: this move would leave your group with no liberties.',
      capturesThisMove: [],
    }
  }

  return {
    board: nextBoard,
    capturedByBlack: nextCapturedByBlack,
    capturedByWhite: nextCapturedByWhite,
    isLegal: true,
    reason: undefined,
    capturesThisMove: capturedCoords,
  }
}

/**
 * Remove dead stones (groups in atari whose single liberty is surrounded by opponent).
 * Returns a new board with dead groups cleared so territory counts correctly.
 */
function removeDeadStones(board) {
  const boardSize = board.length
  let working = board.map((r) => r.slice())
  let changed = true
  while (changed) {
    changed = false
    const processed = new Set()
    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        if (working[row][col] === null) continue
        const key = `${row},${col}`
        if (processed.has(key)) continue

        const group = getGroup(working, row, col, boardSize)
        for (const [r, c] of group) processed.add(`${r},${c}`)

        const liberties = getLiberties(working, group, boardSize)
        if (liberties.size !== 1) continue

        const [[lr, lc]] = [...liberties].map((s) => {
          const [a, b] = s.split(',').map(Number)
          return [a, b]
        })
        const color = working[row][col]
        const opponent = color === 'B' ? 'W' : 'B'

        const boardWithoutGroup = working.map((r) => r.slice())
        for (const [gr, gc] of group) {
          boardWithoutGroup[gr][gc] = null
        }

        const emptyVisited = new Set()
        const queue = [[lr, lc]]
        const neighborColors = new Set()
        let touchesEdge = false
        while (queue.length > 0) {
          const [r, c] = queue.shift()
          const rKey = `${r},${c}`
          if (emptyVisited.has(rKey)) continue
          emptyVisited.add(rKey)
          if (r === 0 || c === 0 || r === boardSize - 1 || c === boardSize - 1) {
            touchesEdge = true
          }
          for (const [nr, nc] of getNeighbors(r, c, boardSize)) {
            const v = boardWithoutGroup[nr][nc]
            if (v === null) {
              const nKey = `${nr},${nc}`
              if (!emptyVisited.has(nKey)) queue.push([nr, nc])
            } else {
              neighborColors.add(v)
            }
          }
        }
        if (
          !touchesEdge &&
          neighborColors.size === 1 &&
          neighborColors.has(opponent)
        ) {
          for (const [gr, gc] of group) {
            working[gr][gc] = null
          }
          changed = true
        }
      }
    }
  }
  return working
}

/**
 * Territory estimation per spec:
 * - Strong: fully surrounded by one color → counts in score
 * - Weak: touches edge but only one color on border → does not count, shown light
 * - Neutral: both colors touch → does not count, shown gray
 * - Undecided: no stones touch (open area) → shown nothing
 */
export function estimateTerritory(board) {
  const boardWithDeadRemoved = removeDeadStones(board)
  const boardSize = boardWithDeadRemoved.length
  const visited = new Set()
  let territoryBlack = 0
  let territoryWhite = 0
  const ownership = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => null),
  )

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (boardWithDeadRemoved[row][col] !== null) continue
      const key = `${row},${col}`
      if (visited.has(key)) continue

      const queue = [[row, col]]
      const region = []
      const neighborColors = new Set()
      let touchesEdge = false

      while (queue.length > 0) {
        const [r, c] = queue.shift()
        const rKey = `${r},${c}`
        if (visited.has(rKey)) continue
        visited.add(rKey)
        region.push([r, c])

        if (r === 0 || c === 0 || r === boardSize - 1 || c === boardSize - 1) {
          touchesEdge = true
        }

        for (const [nr, nc] of getNeighbors(r, c, boardSize)) {
          const value = boardWithDeadRemoved[nr][nc]
          if (value === null) {
            const nKey = `${nr},${nc}`
            if (!visited.has(nKey)) {
              queue.push([nr, nc])
            }
          } else {
            neighborColors.add(value)
          }
        }
      }

      let owner = null
      if (neighborColors.size === 1) {
        const [onlyColor] = [...neighborColors]
        owner = touchesEdge ? `${onlyColor}_weak` : onlyColor
      } else if (neighborColors.size === 2) {
        owner = 'N'
      }
      // neighborColors.size === 0: open area, undecided → owner stays null

      if (owner === 'B' || owner === 'B_weak') {
        territoryBlack += region.length
      } else if (owner === 'W' || owner === 'W_weak') {
        territoryWhite += region.length
      }

      for (const [r, c] of region) {
        ownership[r][c] = owner
      }
    }
  }

  return {
    territoryBlack,
    territoryWhite,
    ownership,
  }
}

export function computeScore({
  board,
  capturedByBlack,
  capturedByWhite,
  komi = 6.5,
}) {
  const { territoryBlack, territoryWhite } = estimateTerritory(board)

  // When no strict/weak territory yet, use influence-based estimate so score updates during play
  let terrBlack = territoryBlack
  let terrWhite = territoryWhite
  if (territoryBlack === 0 && territoryWhite === 0 && board.some((row) => row.some((c) => c !== null))) {
    const influence = computeInfluence(board)
    for (let r = 0; r < board.length; r += 1) {
      for (let c = 0; c < board.length; c += 1) {
        if (board[r][c] === null) {
          if (influence[r][c] > 0) terrBlack += 1
          else if (influence[r][c] < 0) terrWhite += 1
        }
      }
    }
  }

  const scoreBlack = terrBlack + capturedByBlack
  const scoreWhite = terrWhite + capturedByWhite + komi

  let leader = 'tie'
  let lead = 0

  if (scoreBlack > scoreWhite) {
    leader = 'B'
    lead = scoreBlack - scoreWhite
  } else if (scoreWhite > scoreBlack) {
    leader = 'W'
    lead = scoreWhite - scoreBlack
  }

  return {
    territoryBlack: terrBlack,
    territoryWhite: terrWhite,
    capturedByBlack,
    capturedByWhite,
    komi,
    scoreBlack,
    scoreWhite,
    leader,
    lead,
  }
}

/**
 * Returns true if the given player has at least one legal move.
 */
export function hasLegalMove({ board, color, boardSize, capturedByBlack, capturedByWhite }) {
  const size = boardSize ?? board.length
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (board[r][c] !== null) continue
      const result = applyMove({
        board,
        row: r,
        col: c,
        color,
        boardSize: size,
        capturedByBlack: capturedByBlack ?? 0,
        capturedByWhite: capturedByWhite ?? 0,
      })
      if (result.isLegal) return true
    }
  }
  return false
}

/**
 * Minimum Manhattan distance from each intersection to the nearest stone.
 * Cells with stones return 0.
 */
export function computeMinDistanceToStones(board) {
  const boardSize = board.length
  const distances = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => boardSize * 2),
  )

  const stones = []
  for (let r = 0; r < boardSize; r += 1) {
    for (let c = 0; c < boardSize; c += 1) {
      if (board[r][c] === 'B' || board[r][c] === 'W') {
        stones.push({ row: r, col: c })
      }
    }
  }

  for (let r = 0; r < boardSize; r += 1) {
    for (let c = 0; c < boardSize; c += 1) {
      if (board[r][c] !== null) {
        distances[r][c] = 0
        continue
      }
      let minDist = boardSize * 2
      for (const stone of stones) {
        const d = Math.abs(r - stone.row) + Math.abs(c - stone.col)
        if (d < minDist) minDist = d
      }
      distances[r][c] = minDist
    }
  }
  return distances
}

/**
 * Influence estimation per spec: each stone contributes influence to nearby
 * intersections. Decay: distance 1 → 4 pts, distance 2 → 2 pts, distance 3 → 1 pt.
 * Positive = Black influence, Negative = White influence.
 */
export function computeInfluence(board) {
  const boardSize = board.length
  const influence = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => 0),
  )

  const stones = []
  for (let r = 0; r < boardSize; r += 1) {
    for (let c = 0; c < boardSize; c += 1) {
      const value = board[r][c]
      if (value === 'B' || value === 'W') {
        stones.push({ row: r, col: c, color: value })
      }
    }
  }

  if (stones.length === 0) return influence

  for (let r = 0; r < boardSize; r += 1) {
    for (let c = 0; c < boardSize; c += 1) {
      let sum = 0
      for (const stone of stones) {
        const dist = Math.abs(r - stone.row) + Math.abs(c - stone.col)
        let weight = 0
        if (dist === 1) weight = 4
        else if (dist === 2) weight = 2
        else if (dist === 3) weight = 1
        const sign = stone.color === 'B' ? 1 : -1
        sum += sign * weight
      }
      influence[r][c] = sum
    }
  }

  return influence
}

/**
 * Conventional 4-4 (komoku) corner points for first move.
 * In real Go, Black almost never plays tengen (center) first on 19×19.
 * These are the standard opening points: 4th line from each corner.
 */
function getOpeningPoints(boardSize) {
  if (boardSize === 9) {
    return [[2, 2], [2, 6], [6, 2], [6, 6]]
  }
  if (boardSize === 13) {
    return [[3, 3], [3, 9], [9, 3], [9, 9]]
  }
  if (boardSize === 19) {
    return [[3, 3], [3, 15], [15, 3], [15, 15]]
  }
  return []
}

function isEmptyBoard(board) {
  const size = board.length
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (board[r][c] !== null) return false
    }
  }
  return true
}

export function suggestBeginnerHint({
  board,
  color,
  boardSize,
  capturedByBlack = 0,
  capturedByWhite = 0,
  komi = 6.5,
}) {
  const size = boardSize ?? board.length

  // 1. First move: use conventional 4-4 corner points, never tengen (center).
  if (isEmptyBoard(board)) {
    const openingPoints = getOpeningPoints(size)
    for (const [r, c] of openingPoints) {
      if (board[r][c] === null) {
        return {
          row: r,
          col: c,
          reason: 'Conventional opening: play at a 4-4 corner point. In real Go, Black almost never plays in the center first.',
        }
      }
    }
  }

  // 2. Score-based hint: evaluate all legal moves, pick the one that maximizes
  // the current player's score (best path to increase score).
  let bestMove = null
  let bestScoreDiff = -Infinity
  let bestReason = ''

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (board[r][c] !== null) continue

      const result = applyMove({
        board,
        row: r,
        col: c,
        color,
        boardSize: size,
        capturedByBlack,
        capturedByWhite,
      })

      if (!result.isLegal) continue

      const scoreAfter = computeScore({
        board: result.board,
        capturedByBlack: result.capturedByBlack,
        capturedByWhite: result.capturedByWhite,
        komi,
      })

      const myScore = color === 'B' ? scoreAfter.scoreBlack : scoreAfter.scoreWhite
      const oppScore = color === 'B' ? scoreAfter.scoreWhite : scoreAfter.scoreBlack
      const scoreDiff = myScore - oppScore

      if (scoreDiff > bestScoreDiff) {
        bestScoreDiff = scoreDiff
        bestMove = { row: r, col: c }
        const captureGain =
          color === 'B'
            ? result.capturedByBlack - capturedByBlack
            : result.capturedByWhite - capturedByWhite
        if (captureGain > 0) {
          bestReason = `This move captures ${captureGain} stone(s) and improves your score. Best option to get ahead.`
        } else if (scoreDiff > 0) {
          bestReason = `This move gives the best score improvement. You would lead by ${scoreDiff.toFixed(1)} points after.`
        } else {
          bestReason = `This move minimizes the deficit (best available). You would trail by ${Math.abs(scoreDiff).toFixed(1)} points after.`
        }
      }
    }
  }

  if (bestMove) {
    return {
      row: bestMove.row,
      col: bestMove.col,
      reason: bestReason,
    }
  }

  return null
}




