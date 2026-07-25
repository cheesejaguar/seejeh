// FILE: src/i18n/en.ts
//
// The English catalogue is the source of truth for the key set. `ar.ts` is
// typed as `Record<TranslationKey, string>`, so a missing or misspelled Arabic
// key is a COMPILE ERROR rather than a string that silently renders as its key.

export const en = {
  // --- Shell ---------------------------------------------------------------
  'app.title': 'Seejeh',
  'error.title': 'Something broke',
  'error.body':
    'The game hit an unexpected error and stopped. Your saved games and record are untouched — starting again is safe.',
  'error.retry': 'Try again',
  'error.reload': 'Reload',
  'app.subtitle': 'The Arabs’ chess — a 7×7 game of siege and dialogue',
  'app.boardName': 'Seb‘āwiyya · 7×7',

  'nav.play': 'Play',
  'nav.leaderboard': 'Leaderboard',
  'nav.about': 'About',
  'nav.settings': 'Settings',
  'nav.language': 'العربية',
  'nav.languageLabel': 'Switch language',
  'nav.theme': 'Toggle theme',
  'nav.close': 'Close',

  // --- Players and pieces --------------------------------------------------
  'player.Light': 'Pale',
  'player.Dark': 'Dark',
  'player.Light.long': 'Pale stones',
  'player.Dark.long': 'Dark stones',
  'player.you': 'You',
  'player.opponent': 'Opponent',

  // --- Phases and turn state ----------------------------------------------
  'phase.placement': 'Laying out',
  'phase.movement': 'The dialogue',
  'phase.chain': 'Chain capture',
  'phase.blockadeRemoval': 'Open a path',
  'phase.gameOver': 'Game over',

  'turn.yours': 'Your turn',
  'turn.opponent': 'Opponent’s turn',
  'turn.thinking': 'Thinking…',

  'status.placement': 'Place two stones. The eye at the centre stays empty.',
  'status.placementOne': 'Place one more stone.',
  'status.movement': 'Move one stone one step. Trap an enemy stone between two of yours to take it.',
  'status.openingForced': 'Only the eye is open. Your first move goes there.',
  'status.chain': 'You may take again with the same stone, or stop here.',
  'status.blockadeOpen': 'Your opponent is walled in. Move so they can move.',
  'status.blockadeRemove': 'Give up one of your own stones to open a path.',
  'status.blocked': 'You are walled in. Your opponent must open a path.',

  // --- Actions -------------------------------------------------------------
  'action.newGame': 'New game',
  'action.endChain': 'Stop here',
  'action.resign': 'Resign',
  'action.offerDraw': 'Offer a draw',
  'action.acceptDraw': 'Accept draw',
  'action.declineDraw': 'Decline',
  'action.confirmResign': 'Resign this game?',
  'action.confirmResignBody': 'Your opponent wins and the result is recorded.',
  'action.cancel': 'Cancel',
  'action.confirm': 'Confirm',

  'draw.sent': 'Draw offered. Waiting for a reply.',
  'draw.declined': 'Draw declined. Play continues.',

  // --- Counters ------------------------------------------------------------
  'count.stones': 'Stones',

  // --- Events --------------------------------------------------------------
  'event.captured.zero': 'Took no stones.',
  'event.captured.one': 'Took one stone.',
  'event.captured.two': 'Took two stones.',
  'event.captured.few': 'Took {{count}} stones.',
  'event.captured.many': 'Took {{count}} stones.',
  'event.captured.other': 'Took {{count}} stones.',
  'event.blockadeOpponent': 'Your opponent cannot move. You must open a path.',
  'event.blockadeYou': 'You cannot move. Your opponent must open a path.',

  // --- Rejections (one per engine RejectionCode) ---------------------------
  'reject.gameOver': 'This game has finished.',
  'reject.wrongPhase': 'You can’t do that right now.',
  'reject.outOfBounds': 'That square is off the board.',
  'reject.cellOccupied': 'That square is taken.',
  'reject.cellEmpty': 'There’s no stone there.',
  'reject.centerReserved': 'The eye stays empty while you lay out.',
  'reject.noStonesInHand': 'You have no stones left to place.',
  'reject.notYourStone': 'That isn’t your stone.',
  'reject.notAdjacent': 'Stones move one step, straight, never diagonally.',
  'reject.destinationOccupied': 'That square is taken.',
  'reject.mustMoveChainStone': 'Keep going with the same stone.',
  'reject.chainMoveMustCapture': 'A chain move has to take a stone.',
  'reject.chainIsMandatory': 'You must keep taking while you can.',
  'reject.notInChain': 'There’s no chain to stop.',
  'reject.mustRemoveOwnStone': 'Give up one of your own stones.',
  'reject.removalMustFreeOpponent': 'That wouldn’t open a path. Pick another stone.',
  'reject.mustOpenPath': 'Move so your opponent can move.',
  'reject.notYourTurn': 'It isn’t your turn.',

  // --- Outcomes ------------------------------------------------------------
  'outcome.youWin': 'You win',
  'outcome.youLose': 'You lose',
  'outcome.draw': 'Draw',
  'outcome.winnerIs': '{{player}} wins',

  'outcome.elimination': 'Every enemy stone was taken.',
  'outcome.loneStone': 'One stone left — it can never trap another.',
  'outcome.immobilized': 'No moves remained.',
  'outcome.resignation': '{{player}} resigned.',
  'outcome.material': 'Adjudicated on stones remaining.',
  'outcome.agreement': 'Agreed a draw.',
  'outcome.repetition': 'The same position came round three times.',
  'outcome.noProgress': 'No stone was taken for a long stretch.',
  'outcome.mutualBlockade': 'Neither side could move.',

  'outcome.ratingChange': 'Rating {{delta}}',
  'outcome.playAgain': 'Play again',
  'outcome.viewLeaderboard': 'See standings',

  // --- Settings ------------------------------------------------------------
  'settings.title': 'Settings',
  'settings.opponent': 'Opponent',
  'settings.difficulty': 'Difficulty',
  'settings.difficulty.beginner': 'Beginner',
  'settings.difficulty.easy': 'Easy',
  'settings.difficulty.medium': 'Steady',
  'settings.difficulty.hard': 'Ruthless',
  'settings.difficulty.beginnerHint': 'Plays loosely and misses traps.',
  'settings.difficulty.easyHint': 'Sees one move ahead.',
  'settings.difficulty.mediumHint': 'Looks several moves ahead.',
  'settings.difficulty.hardHint': 'Searches deeply and rarely blunders.',
  'settings.yourColourLocked': 'Locked while a game is running. Start a new game to switch sides.',
  'settings.yourColour': 'Your stones',

  'settings.presentation': 'Presentation',
  'settings.sound': 'Sound',
  'settings.volume': 'Volume',
  'settings.showCaptures': 'Preview captures',
  'settings.showCapturesHint': 'Highlights the stones a move would take.',
  'settings.animations': 'Animation',
  'settings.animations.full': 'Full',
  'settings.animations.reduced': 'Reduced',

  'settings.rules': 'Rules',

  'variant.centerIsSafe': 'The eye shelters',
  'variant.centerIsSafe.hint': 'A stone on the centre cannot be taken, but can still help take.',
  'variant.chainCaptures': 'Chain captures',
  'variant.chainCaptures.hint': 'After taking, the same stone may take again.',
  'variant.chainMustContinue': 'Chains are compulsory',
  'variant.chainMustContinue.hint': 'You must keep taking while a capture is available.',
  'variant.loneStoneLoses': 'One stone loses',
  'variant.loneStoneLoses.hint': 'A lone stone can never trap another, so the game ends.',
  'variant.blockade': 'When a player is walled in',
  'variant.blockade.opponentMovesAgain': 'Opponent opens a path',
  'variant.blockade.opponentRemovesOwnStone': 'Opponent gives up a stone',
  'variant.blockade.blockedPlayerLoses': 'The walled-in player loses',
  'variant.firstMover': 'Who moves first',
  'variant.firstMover.firstPlacer': 'Whoever laid out first',
  'variant.firstMover.secondPlacer': 'Whoever laid out second',
  'variant.noProgressLimit': 'Quiet-move limit',
  'variant.noProgressLimit.hint': 'Moves without a capture before the game is decided on stones. 0 turns this off.',
  'variant.repetitionDraw': 'Threefold repetition draws',

  'settings.data': 'Your data',
  'settings.export': 'Export',
  'settings.import': 'Import',
  'settings.clear': 'Delete everything',
  'settings.clearHint': 'Removes every profile, game and rating from this device.',
  'settings.imported': 'Imported.',
  'settings.importFailed': 'That file could not be read.',
  'settings.exported': 'Exported.',

  // --- Leaderboard ---------------------------------------------------------
  'board.title': 'Standings',
  'board.subtitle': 'You against the four opponents',
  'board.rank': 'Rank',
  'board.player': 'Player',
  'board.rating': 'Rating',
  'board.games': 'Games',
  'board.record': 'W / D / L',
  'board.winRate': 'Win rate',
  'board.you': 'you',
  'board.aiRung': 'opponent',

  'stats.title': 'Your record',
  'stats.rating': 'Rating',
  'stats.games': 'Games',
  'stats.winRate': 'Win rate',
  'stats.streak': 'Current streak',
  'stats.bestStreak': 'Best streak',
  'stats.avgLength': 'Average game',
  'stats.avgMoves': 'Average moves',
  'stats.captured': 'Stones taken',
  'stats.lost': 'Stones lost',
  'stats.byDifficulty': 'By opponent',
  'stats.records': 'Personal bests',
  'stats.fastestWin': 'Fastest win',
  'stats.fewestMoves': 'Fewest moves to win',
  'stats.largestCapture': 'Most taken in one move',
  'stats.mostRemaining': 'Most stones left in a win',
  'stats.highestRating': 'Highest rating',
  'stats.none': '—',

  'title.novice': 'Novice',
  'title.apprentice': 'Apprentice',
  'title.skilled': 'Skilled',
  'title.expert': 'Expert',
  'title.master': 'Master',
  'title.grandmaster': 'Grandmaster',

  'history.title': 'Recent games',
  'history.empty': 'Nothing here yet.',
  'history.won': 'Won',
  'history.lost': 'Lost',
  'history.drew': 'Drew',
  // The full plural family must be declared here because this catalogue is the
  // type source. English only ever selects `one`/`other`, but Arabic selects
  // zero/one/two/few/many/other, and every key must exist for ar.ts to compile.
  'history.moves.zero': '{{count}} moves',
  'history.moves.one': '{{count}} move',
  'history.moves.two': '{{count}} moves',
  'history.moves.few': '{{count}} moves',
  'history.moves.many': '{{count}} moves',
  'history.moves.other': '{{count}} moves',

  'profile.title': 'Profile',
  'profile.name': 'Name',
  'profile.guest': 'Guest',
  'profile.namePlaceholder': 'What should we call you?',
  'profile.save': 'Save',

  // --- About ---------------------------------------------------------------
  'about.title': 'About Seejeh',
  'about.heritage': 'Heritage',
  'about.heritageBody':
    'Seejeh — السِّيجة — is played across Egypt, Sudan and the Levant, and has been for a very long time. Traditionally the board is scratched into packed earth and the stones are pebbles, date pits or shards of pottery. In Upper Egypt the pieces are called kilāb, “dogs”, and the empty centre hole is ‘ayn al-dakk, the eye. The game opens when a dog steps into the eye; what follows is called al-muḥāwara, “the dialogue”.',
  'about.rules': 'How to play',
  'about.rule.layout':
    'Take turns placing two stones at a time until all 48 are down. The eye at the centre stays empty.',
  'about.rule.opening':
    'The eye is the only empty square, so the first move must step into it.',
  'about.rule.move': 'Move one stone one square, straight — never diagonally.',
  'about.rule.capture':
    'Trap a single enemy stone between two of yours and it is taken. Only the stone you move can trap; walking into a gap between two enemies is safe.',
  'about.rule.chain': 'If your move takes a stone, that same stone may move again and take again.',
  'about.rule.win': 'Take every enemy stone, or leave your opponent with just one.',
  'about.notes': 'On the rules',
  'about.notesBody':
    'Sources disagree on several points, so the ones that are genuinely contested are settings rather than assumptions. Capture takes exactly one stone per direction — sweeping a whole line is the rule of a different game. There is no “reduce your opponent to seven stones” rule in any source in any language.',
  'about.sources': 'Sources',
  'about.sourcesBody':
    'Lane (1836), Bolton (1890), Falkener (1892), Murray (1952), Bell (1979), the Ludii/Digital Ludeme Project ruleset, and Egyptian, Palestinian, Jordanian and Maghrebi accounts of living play.',

  // --- Accessibility -------------------------------------------------------
  'a11y.board': 'Seejeh board, 7 by 7',
  'a11y.cell': 'Row {{row}}, column {{col}}',
  'a11y.cellEye': 'Row {{row}}, column {{col}}, the eye',
  'a11y.empty': 'empty',
  'a11y.stone': '{{player}} stone',
  'a11y.selected': 'selected',
  'a11y.canPlace': 'can place here',
  'a11y.canMove': 'can move here',
  'a11y.wouldTake': 'this move would take a stone',
  'a11y.wouldBeTaken': 'would be taken',
  'a11y.canBeRemoved': 'can be given up',
  'a11y.movable': 'can be moved',
  'a11y.boardHelp': 'Use the arrow keys to move around the board, and Enter or Space to choose a square.',
  'a11y.liveRegion': 'Game commentary',
} as const;

export type TranslationKey = keyof typeof en;
export type Catalogue = Record<TranslationKey, string>;
