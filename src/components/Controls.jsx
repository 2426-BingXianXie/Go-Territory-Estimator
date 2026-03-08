export default function Controls({
  boardSize,
  onBoardSizeChange,
  onReset,
  onSurrender,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onHint,
  onPass,
  gameOver,
  territoryEstimationEnabled = true,
  onTerritoryEstimationToggle,
}) {
  const handleSizeChange = (event) => {
    const size = Number(event.target.value)
    if (size && onBoardSizeChange) {
      onBoardSizeChange(size)
    }
  }

  return (
    <div className="controls">
      <div className="control-group">
        <label
          htmlFor="territory-toggle"
          className="control-toggle"
          title="Show/hide territory estimation squares on the board"
        >
          <input
            id="territory-toggle"
            type="checkbox"
            checked={territoryEstimationEnabled}
            onChange={onTerritoryEstimationToggle}
          />
          <span>Territory estimation</span>
        </label>
      </div>
      <div className="control-group">
        <label htmlFor="board-size">Board size</label>
        <select
          id="board-size"
          value={boardSize}
          onChange={handleSizeChange}
        >
          <option value={9}>9 × 9</option>
          <option value={13}>13 × 13</option>
          <option value={19}>19 × 19</option>
        </select>
      </div>
      <div className="control-buttons">
        <button type="button" onClick={onReset}>
          Reset
        </button>
        <button type="button" onClick={onSurrender} disabled={gameOver}>
          Surrender
        </button>
        <button type="button" onClick={onUndo}>
          Undo
        </button>
        <button type="button" onClick={onRedo}>
          Redo
        </button>
        <button type="button" onClick={onHint} disabled={gameOver}>
          Hint
        </button>
        <button type="button" onClick={onPass} disabled={gameOver}>
          Pass
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button type="button" onClick={onLoad}>
          Load
        </button>
      </div>
    </div>
  )
}

