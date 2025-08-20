# Seejeh 7×7 - Traditional Board Game

A faithful implementation of the ancient Egyptian board game Seejeh (also known as Seega) built with React, TypeScript, and Vite. Features authentic 7×7 rules, bilingual Arabic/English support, and customizable rule variants.

![Seejeh Game Screenshot](https://via.placeholder.com/800x400?text=Seejeh+7x7+Game)

## 🎮 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

The game will be available at `http://localhost:5173`

## 🎯 Game Rules

### Overview
Seejeh is a two-player strategy game played on a 7×7 board. Players compete to capture opponent stones through strategic placement and movement.

### Gameplay Phases

#### 1. Placement Phase
- Players alternate placing **2 stones per turn**
- Total of 48 stones (24 per player)
- **Cannot place in center cell** during this phase
- Continue until all stones are placed

#### 2. Movement Phase
- Move **one stone orthogonally** (one step only)
- **No diagonal moves or jumping**
- Capture opponent stones via custodian capture
- Continue until one player is reduced to 7 or fewer stones

### Capture Rules

**Custodian Capture**: Sandwich one or more contiguous opponent stones between your pieces along orthogonal lines. All sandwiched stones are captured and removed.

**Chain Captures**: If your move captures stones, you may continue moving the same piece to make additional captures. You can stop the chain at any time.

**Safe Center**: The center cell is marked and stones placed there **cannot be captured**.

### Win Condition
Reduce your opponent to **7 or fewer stones** to win immediately.

### Special Rules

**Blockade**: If a player has no legal moves, the opponent removes one of the blocked player's stones, then the blocked player continues.

## ⚙️ Rule Variants

The game includes toggleable rule variants:

- **First Move Center**: First movement must enter the center cell
- **Anti-Shuttle**: Prevents repetitive back-and-forth movement
- **Blockade Removal**: Enable/disable blockade resolution

## 🌍 Language Support

- **English** (LTR layout)
- **Arabic** (RTL layout) 
- Full interface translation
- Culturally appropriate typography

## 🛠️ Technical Features

- **Pure TypeScript** game engine with comprehensive tests
- **Responsive design** - works on desktop and mobile
- **Keyboard navigation** - full accessibility support
- **Local persistence** - games auto-save to localStorage
- **Zero dependencies** for game logic
- **Hot-seat multiplayer** (two players, one device)

## 🏗️ Architecture

### Core Components

- **Game Engine** (`src/lib/rules.ts`) - Pure functions for game logic
- **State Management** (`src/state/gameStore.ts`) - Zustand store for UI state
- **Board Component** (`src/components/Board.tsx`) - Interactive game board
- **I18n System** (`src/i18n/`) - Bilingual support with RTL

### Key Design Principles

- **Pure functions** for all game logic (no side effects)
- **Immutable state** updates
- **Comprehensive error handling**
- **Separation of concerns** (UI vs game logic)
- **Accessibility first** design

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Tests cover:
- ✅ Valid/invalid moves and placements
- ✅ Single and multi-stone captures
- ✅ Chain capture mechanics
- ✅ Win condition detection
- ✅ Blockade scenarios
- ✅ Rule variant enforcement
- ✅ Center cell immunity

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Upload dist/ folder to Vercel
```

### Netlify
```bash
npm run build
# Drag dist/ folder to Netlify deploy
```

### GitHub Pages
```bash
npm run build
# Configure Pages to serve from dist/ folder
```

## 📚 Historical Background

Seejeh (Arabic: سيجة) is one of the world's oldest strategy games, with archaeological evidence dating back thousands of years in ancient Egypt. The game spread throughout North Africa and the Middle East, with regional variations in rules and board sizes.

The 7×7 variant implemented here represents the classical form as documented in historical sources and modern game research.

## 🔗 Sources & References

- Bell, R.C. (1979). *Board and Table Games from Many Civilizations*
- [Wikipedia: Seega](https://en.wikipedia.org/wiki/Seega)
- Murray, H.J.R. (1952). *A History of Board-Games Other Than Chess*

## 📄 License

MIT License - feel free to use this code for learning, modification, or commercial projects.

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional rule variants
- AI opponent implementation
- Online multiplayer support
- Enhanced accessibility features
- Performance optimizations

---

*Built with ❤️ using React, TypeScript, and modern web standards*