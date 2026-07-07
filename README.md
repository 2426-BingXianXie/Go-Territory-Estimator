# Go Territory Analyzer for Beginners

A web-based Go (Baduk) game with real-time territory estimation, designed to help beginners understand and improve their play.

**🔗 Live Demo: https://2426-bingxianxie.github.io/Go-Territory-Estimator/**

![Go Territory Analyzer](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)

## Features

- **Territory estimation** — Visual markers show estimated black/white territory, neutral areas, and overlap zones
- **Influence-based scoring** — Early-game score estimate using stone influence when no enclosed territory exists
- **Move preview** — First click shows how territory would change; second click places the stone
- **Toggle mode** — Turn territory estimation on or off during play
- **Star points (hoshi)** — Black dots at key intersections (3-3, 4-4, tengen) for quick placement
- **Live score overview** — Territory, captures, and total score update after every move
- **Surrender** — End the game early when you know you can't catch up
- **Save / Load** — Persist game state in the browser
- **Hints** — Beginner-friendly move suggestions
- **Undo / Redo** — Step through move history

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/2426-BingXianXie/Go-Territory-Estimator.git
cd Go-Territory-Estimator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

### Run Tests

```bash
npm test
```

## Project Structure

```
Go/
├── src/
│   ├── App.jsx              # Main app, state, handlers
│   ├── main.jsx
│   ├── styles.css
│   ├── components/
│   │   ├── GoBoard.jsx      # Board grid, star points
│   │   ├── Intersection.jsx # Single intersection (stone, territory, influence)
│   │   ├── Controls.jsx    # Reset, Surrender, Undo, etc.
│   │   ├── ScorePanel.jsx  # Territory, captures, totals
│   │   └── ExplanationPanel.jsx
│   └── engine/
│       ├── goEngine.js      # Game logic, territory, influence, scoring
│       └── goEngine.test.js
├── index.html
├── package.json
└── README.md
```

## Territory Estimation Rules

- **Black territory** — Empty regions touching only black stones
- **White territory** — Empty regions touching only white stones
- **Neutral** — Regions touching both colors (dame)
- **Overlap** — Balanced influence shown in grey
- **Weak territory** — Edge regions with one color; counted in estimate
- **Score** = Territory + Captured stones (+ Komi for White)

## Tech Stack

- **React 19** — UI
- **Vite 7** — Build tool
- **Vitest** — Testing

## License

MIT
