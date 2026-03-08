import { useMemo, useState } from 'react'
import {
  createEmptyBoard,
  applyMove,
  computeScore,
  estimateTerritory,
  computeInfluence,
  computeMinDistanceToStones,
  suggestBeginnerHint,
} from './engine/goEngine.js'
import GoBoard from './components/GoBoard.jsx'
import Controls from './components/Controls.jsx'
import ExplanationPanel from './components/ExplanationPanel.jsx'
import ScorePanel from './components/ScorePanel.jsx'
import './styles.css'

const DEFAULT_BOARD_SIZE = 9

function createInitialState(boardSize) {
  return {
    boardSize,
    board: createEmptyBoard(boardSize),
    currentPlayer: 'B',
    capturedByBlack: 0,
    capturedByWhite: 0,
    moveHistory: [],
    explanations: [],
    lastCaptures: [],
    history: [],
    future: [],
    hint: null,
    consecutivePasses: 0,
    gameOver: false,
    winner: null,
    pendingMove: null,
  }
}

function App() {
  const [state, setState] = useState(() =>
    createInitialState(DEFAULT_BOARD_SIZE),
  )
  const [territoryEstimationEnabled, setTerritoryEstimationEnabled] =
    useState(() => {
      if (typeof window === 'undefined') return true
      const stored = window.localStorage.getItem('go-territory-estimation-on')
      return stored !== 'false'
    })

  const handleTerritoryEstimationToggle = () => {
    setTerritoryEstimationEnabled((v) => {
      const next = !v
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('go-territory-estimation-on', String(next))
      }
      return next
    })
  }

  const {
    boardSize,
    board,
    currentPlayer,
    capturedByBlack,
    capturedByWhite,
    explanations,
    lastCaptures,
    history,
    future,
    hint,
    moveHistory,
    consecutivePasses,
    gameOver,
    winner,
    pendingMove,
  } = state

  /** Recompute territory every render so squares and score always reflect current board (per "Update Rule After Each Move"). */
  const territory = estimateTerritory(board)

  /** When there is a pending move, show territory as it would be after placing there. */
  const territoryMapToShow = (() => {
    if (!pendingMove) return territory.ownership
    const result = applyMove({
      board,
      row: pendingMove.row,
      col: pendingMove.col,
      color: currentPlayer,
      boardSize,
      capturedByBlack,
      capturedByWhite,
    })
    if (!result.isLegal) return territory.ownership
    return estimateTerritory(result.board).ownership
  })()

  const score = computeScore({
    board,
    capturedByBlack,
    capturedByWhite,
    komi: 6.5,
  })

  /** When pending move exists, show score as it would be after that move (live preview). */
  const scoreToShow = (() => {
    if (!pendingMove) return score
    const result = applyMove({
      board,
      row: pendingMove.row,
      col: pendingMove.col,
      color: currentPlayer,
      boardSize,
      capturedByBlack,
      capturedByWhite,
    })
    if (!result.isLegal) return score
    return computeScore({
      board: result.board,
      capturedByBlack: result.capturedByBlack,
      capturedByWhite: result.capturedByWhite,
      komi: 6.5,
    })
  })()

  const pushExplanation = (message) => {
    setState((prev) => ({
      ...prev,
      explanations: [...prev.explanations, { message }],
    }))
  }

  const influence = useMemo(
    () => computeInfluence(board),
    [board],
  )

  const influenceMapToShow = useMemo(() => {
    if (!pendingMove) return influence
    const result = applyMove({
      board,
      row: pendingMove.row,
      col: pendingMove.col,
      color: currentPlayer,
      boardSize,
      capturedByBlack,
      capturedByWhite,
    })
    if (!result.isLegal) return influence
    return computeInfluence(result.board)
  }, [
    board,
    currentPlayer,
    boardSize,
    capturedByBlack,
    capturedByWhite,
    pendingMove?.row,
    pendingMove?.col,
    influence,
  ])

  const distanceMap = useMemo(
    () => computeMinDistanceToStones(board),
    [board],
  )

  const distanceMapToShow = useMemo(() => {
    if (!pendingMove) return distanceMap
    const result = applyMove({
      board,
      row: pendingMove.row,
      col: pendingMove.col,
      color: currentPlayer,
      boardSize,
      capturedByBlack,
      capturedByWhite,
    })
    if (!result.isLegal) return distanceMap
    return computeMinDistanceToStones(result.board)
  }, [
    board,
    currentPlayer,
    boardSize,
    capturedByBlack,
    capturedByWhite,
    pendingMove?.row,
    pendingMove?.col,
    distanceMap,
  ])

  const handleBoardSizeChange = (size) => {
    setState(createInitialState(size))
    pushExplanation(`Board reset to ${size}×${size}. Black plays first.`)
  }

  const handleReset = () => {
    setState((prev) => createInitialState(prev.boardSize))
    pushExplanation(
      `Board reset to ${state.boardSize}×${state.boardSize}. Black plays first.`,
    )
  }

  const handleSurrender = () => {
    if (gameOver) return
    const winnerColor = currentPlayer === 'B' ? 'White' : 'Black'
    setState((prev) => ({
      ...prev,
      gameOver: true,
      winner: winnerColor,
      pendingMove: null,
      explanations: [
        ...prev.explanations,
        { message: `${currentPlayer === 'B' ? 'Black' : 'White'} surrendered. ${winnerColor} wins. Reset to start a new game.` },
      ],
    }))
  }

  /** First click: show territory preview. Second click (same spot): place stone. */
  const handleIntersectionClick = (row, col) => {
    if (gameOver) return
    if (board[row][col] !== null) {
      setState((prev) => ({ ...prev, pendingMove: null }))
      return
    }
    if (pendingMove && pendingMove.row === row && pendingMove.col === col) {
      handlePlayMove(row, col)
      return
    }
    const previewResult = applyMove({
      board,
      row,
      col,
      color: currentPlayer,
      boardSize,
      capturedByBlack,
      capturedByWhite,
    })
    if (!previewResult.isLegal) {
      pushExplanation(previewResult.reason || 'Illegal move.')
      return
    }
    setState((prev) => ({
      ...prev,
      pendingMove: { row, col },
      explanations: [
        ...prev.explanations,
        { message: 'Click the same spot again to place your stone.' },
      ],
    }))
  }

  const handlePlayMove = (row, col) => {
    if (gameOver) return

    const result = applyMove({
      board,
      row,
      col,
      color: currentPlayer,
      boardSize,
      capturedByBlack,
      capturedByWhite,
    })

    if (!result.isLegal) {
      setState((prev) => ({ ...prev, pendingMove: null }))
      pushExplanation(result.reason || 'Illegal move.')
      return
    }

    const nextPlayer = currentPlayer === 'B' ? 'W' : 'B'
    const boardFull = result.board.every((row) =>
      row.every((cell) => cell !== null),
    )

    if (boardFull) {
      const finalScore = computeScore({
        board: result.board,
        capturedByBlack: result.capturedByBlack,
        capturedByWhite: result.capturedByWhite,
        komi: 6.5,
      })
      const winnerColor =
        finalScore.leader === 'B'
          ? 'Black'
          : finalScore.leader === 'W'
            ? 'White'
            : null
      setState((prev) => ({
        ...prev,
        board: result.board,
        capturedByBlack: result.capturedByBlack,
        capturedByWhite: result.capturedByWhite,
        currentPlayer: nextPlayer,
        lastCaptures: result.capturesThisMove,
        consecutivePasses: 0,
        gameOver: true,
        winner: winnerColor,
        pendingMove: null,
        history: [
          ...prev.history,
          {
            board: prev.board,
            currentPlayer: prev.currentPlayer,
            capturedByBlack: prev.capturedByBlack,
            capturedByWhite: prev.capturedByWhite,
            moveHistory: prev.moveHistory,
          },
        ],
        future: [],
        hint: null,
        moveHistory: [
          ...prev.moveHistory,
          { row, col, color: currentPlayer, captures: result.capturesThisMove },
        ],
        explanations: [
          ...prev.explanations,
          {
            message: `Board is full. Game over! ${winnerColor ? `${winnerColor} wins.` : 'Tie.'}`,
          },
        ],
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      board: result.board,
      capturedByBlack: result.capturedByBlack,
      capturedByWhite: result.capturedByWhite,
      currentPlayer: nextPlayer,
      lastCaptures: result.capturesThisMove,
      consecutivePasses: 0,
      pendingMove: null,
      history: [
        ...prev.history,
        {
          board: prev.board,
          currentPlayer: prev.currentPlayer,
          capturedByBlack: prev.capturedByBlack,
          capturedByWhite: prev.capturedByWhite,
          moveHistory: prev.moveHistory,
        },
      ],
      future: [],
      hint: null,
      moveHistory: [
        ...prev.moveHistory,
        { row, col, color: currentPlayer, captures: result.capturesThisMove },
      ],
      explanations: [
        ...prev.explanations,
        {
          message: `${currentPlayer === 'B' ? 'Black' : 'White'} played at (${row + 1}, ${
            col + 1
          }).`,
        },
      ],
    }))
  }

  const handlePass = () => {
    if (gameOver) return

    const nextPlayer = currentPlayer === 'B' ? 'W' : 'B'
    const passesAfter = (consecutivePasses ?? 0) + 1

    if (passesAfter >= 2) {
      const finalScore = computeScore({
        board,
        capturedByBlack,
        capturedByWhite,
        komi: 6.5,
      })
      const winnerColor =
        finalScore.leader === 'B'
          ? 'Black'
          : finalScore.leader === 'W'
            ? 'White'
            : null
      setState((prev) => ({
        ...prev,
        currentPlayer: nextPlayer,
        consecutivePasses: passesAfter,
        gameOver: true,
        winner: winnerColor,
        explanations: [
          ...prev.explanations,
          {
            message: `Both players passed. Game over! ${winnerColor ? `${winnerColor} wins by ${finalScore.lead.toFixed(1)} points.` : 'Tie game.'}`,
          },
        ],
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      currentPlayer: nextPlayer,
      consecutivePasses: passesAfter,
      explanations: [
        ...prev.explanations,
        {
          message: `${currentPlayer === 'B' ? 'Black' : 'White'} passed.`,
        },
      ],
    }))
  }

  const handleUndo = () => {
    setState((prev) => {
      if (prev.history.length === 0) {
        return prev
      }
      const lastSnapshot = prev.history[prev.history.length - 1]
      const remainingHistory = prev.history.slice(0, -1)
      const futureEntry = {
        board: prev.board,
        currentPlayer: prev.currentPlayer,
        capturedByBlack: prev.capturedByBlack,
        capturedByWhite: prev.capturedByWhite,
        moveHistory: prev.moveHistory,
      }

      return {
        ...prev,
        board: lastSnapshot.board,
        currentPlayer: lastSnapshot.currentPlayer,
        capturedByBlack: lastSnapshot.capturedByBlack,
        capturedByWhite: lastSnapshot.capturedByWhite,
        moveHistory: lastSnapshot.moveHistory,
        history: remainingHistory,
        future: [futureEntry, ...prev.future],
        lastCaptures: [],
        hint: null,
        pendingMove: null,
        gameOver: false,
        winner: null,
        consecutivePasses: 0,
      }
    })
    pushExplanation('Undid the last move.')
  }

  const handleRedo = () => {
    setState((prev) => {
      if (prev.future.length === 0) {
        return prev
      }
      const [nextSnapshot, ...restFuture] = prev.future
      const historyEntry = {
        board: prev.board,
        currentPlayer: prev.currentPlayer,
        capturedByBlack: prev.capturedByBlack,
        capturedByWhite: prev.capturedByWhite,
        moveHistory: prev.moveHistory,
      }

      return {
        ...prev,
        board: nextSnapshot.board,
        currentPlayer: nextSnapshot.currentPlayer,
        capturedByBlack: nextSnapshot.capturedByBlack,
        capturedByWhite: nextSnapshot.capturedByWhite,
        moveHistory: nextSnapshot.moveHistory,
        history: [...prev.history, historyEntry],
        future: restFuture,
        lastCaptures: [],
        hint: null,
        pendingMove: null,
        gameOver: false,
        winner: null,
        consecutivePasses: 0,
      }
    })
    pushExplanation('Redid the next move.')
  }

  const handleSave = () => {
    if (typeof window === 'undefined') return
    const toSave = {
      boardSize,
      board,
      currentPlayer,
      capturedByBlack,
      capturedByWhite,
      moveHistory,
    }
    window.localStorage.setItem(
      'go-territory-analyzer-state',
      JSON.stringify(toSave),
    )
    pushExplanation('Game state saved locally (this browser only).')
  }

  const handleLoad = () => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('go-territory-analyzer-state')
    if (!raw) {
      pushExplanation('No saved game found.')
      return
    }
    try {
      const data = JSON.parse(raw)
      setState((prev) => ({
        ...prev,
        boardSize: data.boardSize ?? prev.boardSize,
        board: data.board ?? prev.board,
        currentPlayer: data.currentPlayer ?? prev.currentPlayer,
        capturedByBlack: data.capturedByBlack ?? prev.capturedByBlack,
        capturedByWhite: data.capturedByWhite ?? prev.capturedByWhite,
        moveHistory: data.moveHistory ?? prev.moveHistory,
        history: [],
        future: [],
        lastCaptures: [],
        hint: null,
        pendingMove: null,
        gameOver: false,
        winner: null,
        consecutivePasses: 0,
      }))
      pushExplanation('Loaded saved game state.')
    } catch {
      pushExplanation('Could not load saved game state.')
    }
  }

  const handleHint = () => {
    const hintResult = suggestBeginnerHint({
      board,
      color: currentPlayer,
      boardSize,
      capturedByBlack,
      capturedByWhite,
    })
    if (!hintResult) {
      pushExplanation('No hint available: the board is full.')
      return
    }
    setState((prev) => ({
      ...prev,
      hint: { row: hintResult.row, col: hintResult.col },
    }))
    pushExplanation(hintResult.reason)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Go Territory Analyzer for Beginners</h1>
        <p className="subtitle">
          First click shows how territory would change; second click on the same
          spot places your stone. Small squares show Black/White territory.
        </p>
      </header>
      <main className="layout">
        <section className="left-column">
          <GoBoard
            board={board}
            boardSize={boardSize}
            currentPlayer={currentPlayer}
            onIntersectionClick={handleIntersectionClick}
            lastCaptures={lastCaptures}
            territoryMap={territoryEstimationEnabled ? territoryMapToShow : null}
            influenceMap={territoryEstimationEnabled ? influenceMapToShow : null}
            distanceMap={distanceMapToShow}
            hint={hint}
            pendingMove={pendingMove}
            disabled={gameOver}
            showTerritoryEstimation={territoryEstimationEnabled}
          />
          <Controls
            boardSize={boardSize}
            onBoardSizeChange={handleBoardSizeChange}
            onReset={handleReset}
            territoryEstimationEnabled={territoryEstimationEnabled}
            onTerritoryEstimationToggle={handleTerritoryEstimationToggle}
            onSurrender={handleSurrender}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSave={handleSave}
            onLoad={handleLoad}
            onHint={handleHint}
            onPass={handlePass}
            gameOver={gameOver}
          />
        </section>
        <section className="right-column">
          <ScorePanel
            currentPlayer={currentPlayer}
            boardSize={boardSize}
            score={scoreToShow}
            gameOver={gameOver}
            winner={winner}
            hasPendingMove={!!pendingMove}
          />
          <ExplanationPanel messages={explanations.slice(-4)} />
        </section>
      </main>
    </div>
  )
}

export default App
