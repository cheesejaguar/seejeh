# Sound System Documentation

## Overview

The Seejeh game now includes a comprehensive sound system that provides audio feedback for all game actions using the Web Audio API. The sound system generates pleasant procedural sounds for enhanced game atmosphere.

## Features

### Sound Types
- **Place**: Warm wooden sound for stone placement
- **Move**: Smooth transition sound for stone movement  
- **Select**: Gentle feedback for stone selection
- **Capture**: Dramatic swoosh for capturing stones
- **Chain Capture**: Building excitement for chain captures
- **Win**: Triumphant chord progression for game victory
- **New Game**: Fresh optimistic tone for starting games
- **Invalid**: Gentle negative feedback for invalid moves

### Settings
- **Enable/Disable**: Users can toggle sound effects on/off
- **Volume Control**: Adjustable volume from 0-100%
- **Persistence**: Settings are saved to localStorage

### Integration
The sound system is integrated throughout the game:
- Stone placement and movement
- Captures and chain captures  
- Game start and victory
- Error feedback
- AI move feedback

### Technical Details
- Uses Web Audio API for high-quality procedural sound generation
- Fallback gracefully when Web Audio is not supported
- Automatically handles audio context suspension/resumption
- Optimized for performance with minimal CPU usage

### User Controls
Sound settings are available in the Settings modal:
- Sound Effects toggle switch
- Volume slider (only visible when sounds are enabled)
- Visual icons indicate current sound state

### Accessibility
- Respects user's prefers-reduced-motion setting
- Provides visual feedback alongside audio
- Never blocks game functionality if audio fails