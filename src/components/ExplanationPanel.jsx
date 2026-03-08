const TERRITORY_HELP = (
  <div className="territory-help">
    <p><strong>Territory rules:</strong></p>
    <ul>
      <li><strong>Black/White square</strong> — Area surrounded by one color. Counts in score.</li>
      <li><strong>Gray square</strong> — Both players can enter (neutral). Does not count.</li>
      <li><strong>Empty square + tint</strong> — Open area with influence: orange = Black influence, blue = White (distance decay: 4/2/1 pts).</li>
    </ul>
    <p>Score = Territory + Captured stones. Estimation may change during the game.</p>
  </div>
)

export default function ExplanationPanel({ messages }) {
  const hasMessages = messages && messages.length > 0

  return (
    <div className="panel explanation-panel">
      <h2>Explanations</h2>
      {hasMessages ? (
        <ul className="explanations-list">
          {messages.map((msg, index) => (
            <li key={index}>{msg.message ?? msg}</li>
          ))}
        </ul>
      ) : (
        <p>Play a move to see explanations about legality, captures, and scoring.</p>
      )}
      {TERRITORY_HELP}
    </div>
  )
}

