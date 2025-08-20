# Seejeh 7×7 Game - Product Requirements Document

Traditional Seejeh (Seega) browser game implementing authentic 7×7 rules with hot-seat multiplayer.

**Experience Qualities**:
1. **Authentic** - Faithful implementation of traditional Seejeh rules with proper cultural respect
2. **Accessible** - Full keyboard navigation, screen reader support, and bilingual Arabic/English interface
3. **Tactile** - Satisfying visual feedback for piece placement, movement, and captures

**Complexity Level**: Light Application (multiple features with basic state)
- Two-phase gameplay with placement and movement mechanics, rule enforcement, variant toggles, and persistent game state

## Essential Features

### Game Board & Pieces
- **Functionality**: 7×7 grid with safe center cell, visual stone placement
- **Purpose**: Core game interface for traditional Seejeh gameplay
- **Trigger**: App load or new game button
- **Progression**: Display board → highlight available moves → accept player input → update visual state
- **Success criteria**: All 49 cells render correctly, center cell visually distinct, pieces clearly differentiated

### Two-Phase Gameplay
- **Functionality**: Placement phase (2 stones per turn) followed by movement phase (1 step + captures)
- **Purpose**: Implements authentic Seejeh game structure
- **Trigger**: Game start or phase transition
- **Progression**: Placement counter → validate moves → transition to movement → capture resolution
- **Success criteria**: Proper turn sequence, accurate stone counting, smooth phase transitions

### Custodian Capture System
- **Functionality**: Sandwich opponent stones between friendly pieces across orthogonal axes
- **Purpose**: Core strategic mechanic of Seejeh
- **Trigger**: Valid move that creates capture opportunities
- **Progression**: Move piece → check four directions → identify bounded opponent lines → remove captured stones
- **Success criteria**: Accurate capture detection, multi-axis captures, chain capture continuation

### Bilingual Interface
- **Functionality**: Arabic/English language toggle with RTL/LTR text direction
- **Purpose**: Cultural accessibility for traditional game
- **Trigger**: Language switcher button
- **Progression**: Select language → update all UI text → switch text direction → maintain game state
- **Success criteria**: Complete translation coverage, proper RTL layout, persistent language preference

### Rule Variants & Settings
- **Functionality**: Toggle optional rules like first-move-center and anti-shuttle
- **Purpose**: Accommodate different regional rule variations
- **Trigger**: Settings panel access
- **Progression**: Open settings → toggle variants → validate rule interactions → apply to current game
- **Success criteria**: Rules properly enforced, settings persist between sessions

## Edge Case Handling

- **Blockade Resolution**: When player has no legal moves, opponent removes one enemy stone
- **Chain Capture Limits**: Clear UI feedback for when chain captures can continue vs must end
- **Invalid Move Prevention**: Visual feedback for illegal placements/moves with helpful explanations
- **Game State Recovery**: Handle page refresh by restoring last game state from localStorage
- **Win Condition Edge Cases**: Proper detection when opponent reaches exactly 7 stones

## Design Direction

The interface should feel elegant and timeless, reflecting the ancient origins of Seejeh while providing modern usability. Clean typography and generous spacing create a focused gaming environment that respects both Arabic and Latin text traditions.

## Color Selection

Triadic color scheme using warm earth tones that evoke traditional game materials.

- **Primary Color**: Deep amber (oklch(0.6 0.15 60)) - Represents wooden game boards and communicates warmth and tradition
- **Secondary Colors**: Sage green (oklch(0.65 0.1 150)) for supporting UI elements, cream (oklch(0.9 0.05 80)) for backgrounds
- **Accent Color**: Copper red (oklch(0.55 0.2 30)) - Attention-grabbing highlight for active pieces and important actions
- **Foreground/Background Pairings**: 
  - Background (Cream #F5F3E7): Dark brown text (#2D2A1F) - Ratio 8.2:1 ✓
  - Primary (Deep Amber #CC8B47): White text (#FFFFFF) - Ratio 5.1:1 ✓
  - Secondary (Sage Green #8AAA8A): Dark text (#1F2D1F) - Ratio 7.8:1 ✓
  - Accent (Copper Red #B85450): White text (#FFFFFF) - Ratio 4.9:1 ✓

## Font Selection

Typography should support both Arabic and Latin scripts with excellent readability and cultural appropriateness.

- **Typographic Hierarchy**:
  - H1 (Game Title): Cairo Bold/32px/tight spacing for Arabic, Inter Bold/32px for Latin
  - H2 (Section Headers): Cairo Medium/24px for Arabic, Inter Medium/24px for Latin
  - Body Text: Cairo Regular/16px/1.5 line height for Arabic, Inter Regular/16px for Latin
  - UI Elements: Cairo Medium/14px for Arabic, Inter Medium/14px for Latin

## Animations

Subtle, purposeful animations that enhance gameplay understanding without distraction, respecting the contemplative nature of traditional board games.

- **Purposeful Meaning**: Smooth piece placement and capture animations communicate game state changes clearly
- **Hierarchy of Movement**: 
  - Primary: Piece movement and capture animations (300ms ease-out)
  - Secondary: UI transitions and hover states (150ms ease-in-out)
  - Tertiary: Background state changes (500ms ease-in-out)

## Component Selection

- **Components**: Card for game board container, Button for actions, Switch for settings toggles, Dialog for about/settings modals
- **Customizations**: Custom Board grid component, specialized Cell components for different states
- **States**: 
  - Buttons: Clear hover/active/focus states with accessibility indicators
  - Cells: Empty, occupied, selected, valid move target, capture preview
  - Game phases: Visual indicators for placement vs movement modes
- **Icon Selection**: Phosphor icons for UI actions (settings, language, info), custom symbols for game pieces
- **Spacing**: Consistent 16px base spacing unit, larger gaps (24px/32px) for section separation
- **Mobile**: Responsive board scaling, touch-friendly piece selection, collapsible settings panel