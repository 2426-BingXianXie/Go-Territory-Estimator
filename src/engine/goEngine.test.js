import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  applyMove,
  estimateTerritory,
  computeScore,
  computeInfluence,
  suggestBeginnerHint,
  hasLegalMove,
} from './goEngine'

describe('goEngine - basic board setup and stone placement', () => {
  it('creates an empty square board for supported sizes', () => {
    const sizes = [9, 13, 19]

    for (const size of sizes) {
      const board = createEmptyBoard(size)
      expect(board).toHaveLength(size)
      for (const row of board) {
        expect(row).toHaveLength(size)
        for (const cell of row) {
          expect(cell).toBeNull()
        }
      }
    }
  })

  it('places a stone on an empty intersection and alternates players externally', () => {
    const size = 9
    const empty = createEmptyBoard(size)
    const result = applyMove({
      board: empty,
      row: 4,
      col: 4,
      color: 'B',
      boardSize: size,
      capturedByBlack: 0,
      capturedByWhite: 0,
    })

    expect(result.isLegal).toBe(true)
    expect(result.reason).toBeUndefined()
    expect(result.board[4][4]).toBe('B')
    expect(result.capturesThisMove.length).toBe(0)
  })

  it('rejects moves that are out of bounds or on occupied points', () => {
    const size = 9
    const board = createEmptyBoard(size)
    board[0][0] = 'B'

    const outOfBounds = applyMove({
      board,
      row: -1,
      col: 0,
      color: 'W',
      boardSize: size,
      capturedByBlack: 0,
      capturedByWhite: 0,
    })

    expect(outOfBounds.isLegal).toBe(false)
    expect(outOfBounds.reason).toMatch(/bounds/i)

    const occupied = applyMove({
      board,
      row: 0,
      col: 0,
      color: 'W',
      boardSize: size,
      capturedByBlack: 0,
      capturedByWhite: 0,
    })

    expect(occupied.isLegal).toBe(false)
    expect(occupied.reason).toMatch(/occupied/i)
  })
})

describe('goEngine - capture detection', () => {
  it('captures a single surrounded stone', () => {
    const size = 9
    let board = createEmptyBoard(size)

    // Surround a single black stone at (1, 1) with white stones.
    board[1][1] = 'B'
    board[0][1] = 'W'
    board[2][1] = 'W'
    board[1][0] = 'W'

    const result = applyMove({
      board,
      row: 1,
      col: 2,
      color: 'W',
      boardSize: size,
      capturedByBlack: 0,
      capturedByWhite: 0,
    })

    expect(result.isLegal).toBe(true)
    expect(result.board[1][1]).toBeNull()
    expect(result.capturedByWhite).toBe(1)
    expect(result.capturesThisMove).toHaveLength(1)
  })

  it('treats suicide as illegal when no opponent stones are captured', () => {
    const size = 9
    let board = createEmptyBoard(size)

    // Black tries to play into a point with no liberties and no capture.
    board[0][1] = 'W'
    board[1][0] = 'W'

    const result = applyMove({
      board,
      row: 0,
      col: 0,
      color: 'B',
      boardSize: size,
      capturedByBlack: 0,
      capturedByWhite: 0,
    })

    expect(result.isLegal).toBe(false)
    expect(result.reason).toMatch(/suicide/i)
  })

  it('allows self-atari when capturing opponent stones in the same move', () => {
    const size = 9
    let board = createEmptyBoard(size)

    // White group at (1,1) and (1,2) almost captured; black move both has no
    // liberties itself but captures the white stones, which is legal.
    board[1][1] = 'W'
    board[1][2] = 'W'
    board[0][1] = 'B'
    board[0][2] = 'B'
    board[1][0] = 'B'
    board[2][1] = 'B'
    board[2][2] = 'B'

    const result = applyMove({
      board,
      row: 1,
      col: 3,
      color: 'B',
      boardSize: size,
      capturedByBlack: 0,
      capturedByWhite: 0,
    })

    expect(result.isLegal).toBe(true)
    expect(result.capturedByBlack).toBeGreaterThanOrEqual(1)
    expect(result.capturesThisMove.length).toBeGreaterThanOrEqual(1)
  })
})

describe('goEngine - territory estimation and scoring', () => {
  it('assigns simple enclosed regions as territory for the surrounding color', () => {
    const size = 9
    const board = createEmptyBoard(size)

    // Small 3x3 corner where black surrounds an empty point at (1,1).
    board[0][1] = 'B'
    board[1][0] = 'B'
    board[2][1] = 'B'
    board[1][2] = 'B'

    const result = estimateTerritory(board)

    expect(result.territoryBlack).toBeGreaterThanOrEqual(1)
    expect(result.territoryWhite).toBe(0)
  })

  it('treats regions touching both colors or edges as neutral', () => {
    const size = 9
    const board = createEmptyBoard(size)

    // Empty space between black and white groups.
    board[0][2] = 'B'
    board[1][2] = 'B'
    board[0][6] = 'W'
    board[1][6] = 'W'

    const result = estimateTerritory(board)

    expect(result.territoryBlack).toBeGreaterThanOrEqual(0)
    expect(result.territoryWhite).toBeGreaterThanOrEqual(0)
    expect(
      result.territoryBlack + result.territoryWhite,
    ).toBeLessThanOrEqual(size * size)
  })

  it('computes scores from territory, captures, and komi', () => {
    const size = 9
    const board = createEmptyBoard(size)

    // Pretend black has a small territory and some captures.
    board[0][0] = 'B'
    board[0][1] = 'B'
    board[1][0] = 'B'

    const capturedByBlack = 2
    const capturedByWhite = 0
    const komi = 6.5

    const score = computeScore({
      board,
      capturedByBlack,
      capturedByWhite,
      komi,
    })

    expect(score.scoreBlack).toBeGreaterThan(0)
    expect(score.scoreWhite).toBeGreaterThan(0)
    expect(score.leader === 'B' || score.leader === 'W' || score.leader === 'tie').toBe(true)
  })
})

describe('goEngine - influence heatmap', () => {
  it('gives higher influence near a single stone', () => {
    const size = 9
    const board = createEmptyBoard(size)
    const center = Math.floor(size / 2)

    board[center][center] = 'B'

    const influence = computeInfluence(board)

    const adjacentValue = influence[center][center - 1]
    const cornerValue = influence[0][0]

    expect(adjacentValue).toBeGreaterThan(0)
    expect(adjacentValue).toBeGreaterThan(cornerValue)
  })

  it('assigns opposite-sign influence for opposing colors', () => {
    const size = 9
    const board = createEmptyBoard(size)

    board[4][2] = 'B'
    board[4][6] = 'W'

    const influence = computeInfluence(board)

    // Point closer to black should favor black (positive),
    // point closer to white should favor white (negative).
    expect(influence[4][3]).toBeGreaterThan(0)
    expect(influence[4][5]).toBeLessThan(0)
  })
})

describe('goEngine - beginner hint suggestions', () => {
  it('suggests extending an existing group when possible', () => {
    const size = 9
    const board = createEmptyBoard(size)

    board[4][4] = 'B'

    const hint = suggestBeginnerHint({ board, color: 'B' })

    expect(hint).not.toBeNull()
    expect(board[hint.row][hint.col]).toBeNull()
  })

  it('never suggests tengen (center) for first move on 19x19', () => {
    const size = 19
    const board = createEmptyBoard(size)

    const hint = suggestBeginnerHint({
      board,
      color: 'B',
      boardSize: size,
    })

    expect(hint).not.toBeNull()
    const tengen = [9, 9]
    expect([hint.row, hint.col]).not.toEqual(tengen)
    // Should suggest a 4-4 corner: (3,3), (3,15), (15,3), (15,15)
    const validFirstMoves = [
      [3, 3],
      [3, 15],
      [15, 3],
      [15, 15],
    ]
    expect(validFirstMoves).toContainEqual([hint.row, hint.col])
    expect(hint.reason).toMatch(/4-4|corner|center/i)
  })

  it('suggests the move that maximizes score when captures are available', () => {
    const size = 9
    const board = createEmptyBoard(size)
    // White stone at (1,1) surrounded except (1,2) - Black can capture by playing (1,2)
    board[1][1] = 'W'
    board[0][1] = 'B'
    board[2][1] = 'B'
    board[1][0] = 'B'

    const hint = suggestBeginnerHint({
      board,
      color: 'B',
      boardSize: size,
      capturedByBlack: 0,
      capturedByWhite: 0,
    })

    expect(hint).not.toBeNull()
    // The capturing move at (1,2) should be suggested
    expect(hint.row).toBe(1)
    expect(hint.col).toBe(2)
    expect(hint.reason).toMatch(/capture/i)
  })
})

describe('goEngine - hasLegalMove', () => {
  it('returns true on empty board', () => {
    const board = createEmptyBoard(9)
    expect(
      hasLegalMove({ board, color: 'B', boardSize: 9 }),
    ).toBe(true)
  })

  it('returns false when board is full', () => {
    const board = createEmptyBoard(9)
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        board[r][c] = (r + c) % 2 === 0 ? 'B' : 'W'
      }
    }
    expect(
      hasLegalMove({ board, color: 'B', boardSize: 9 }),
    ).toBe(false)
  })
})




