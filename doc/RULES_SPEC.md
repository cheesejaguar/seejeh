# Seejeh (السيجة) 7×7 — Canonical Rules Specification

**Status:** normative. This document is the single source of truth for the rewrite. Where the historical record genuinely conflicts, one option is named **DEFAULT** and the alternatives are exposed as toggles. Where the current app deviates from every known source, that is flagged as **[APP DEVIATION]** and the change is mandatory.

**Scope:** 7×7 board (`Seb'áwee` / سبعاوية), 24 stones per player. This is the form that carries the name *Seejeh* in modern Levantine, Jordanian and Palestinian usage, and is Ludii ruleset DLP.GameRulesets.589.

---

## Part 0 — Executive summary of decisions

| # | Question | Ruling | Confidence |
|---|---|---|---|
| 1 | Board / stones | 7×7 = 49 cells, 24 stones each, 48 total, centre left empty | **Certain** |
| 2 | Placement | 2 stones per turn, alternating, centre barred, no captures | **Certain** |
| 3 | Who places first | Player 1 (challenger / previous winner). Not fixed by tradition; app decides. | Convention |
| 4 | Who moves first | **The player who placed FIRST** (= Player 1) | Disputed → decided |
| 5 | First move into centre | **Emergent, not a rule.** One empty cell ⇒ forced. Do not special-case. | **Certain** |
| 6 | **Capture** | **Exactly ONE enemy stone per direction.** Never a contiguous line. | **Certain** |
| 7 | Moving into a sandwich | **Safe.** Only the mover's arriving stone can trigger captures. | **Certain** |
| 8 | Centre safety | Centre stone immune as a *victim*; still acts as a flanker for either side. | Disputed → decided (default ON) |
| 9 | Multi-direction capture | Yes — up to **3** stones in one move (the origin direction is empty) | **Certain** |
| 10 | Chain capture | Yes; **same stone**; every step must itself capture; **declinable** | Majority / disputed |
| 11 | Blockade | **Opponent must open a path** (extra turn, restricted to unblocking moves). Nobody is penalised. | **Certain** on principle |
| 12 | Win | Opponent reduced to **≤ 1 stone** (default) or 0 (toggle) | Majority |
| 13 | "7 or fewer stones" win | **INVENTION.** Attested in zero sources worldwide, in any language. Remove. | **Certain** |
| 14 | Draw | Threefold repetition; 50-ply no-capture adjudication (more stones wins, tie = draw) | Modern necessity |

Three rules in the current app are unattested and must change: **whole-line capture**, the **7-stone win threshold**, and the **blockade rule that penalises the blocked player**. Details in Part 4.

---

## Part 1 — Rule-by-rule rulings

### 1.1 Board size and stones per player

**Authentic answer.** The 7×7 board has 49 cells. Each player has **24 stones**; 48 stones fill every cell except the centre. Attested universally: Bolton 1890 ("forty-nine squares with forty-eight men"), Ludii `(item "7x7" <7> <24>)`, Aljaafreh & Al-Oudat 2019, seja.ps («يمتلك كل لاعب ٢٤ حجرا»), Tunisian and Algerian field reportage («لكلّ منهما 24 كلبًا»), the 1975 commercial Seejeh set.

**Confidence: certain.** Note for honesty in the About screen: Lane (1836), the source of the name *seb'áwee*, never states a piece count for 7×7; the 24 figure is the (cells−1)/2 formula, which every later source and every living Arabic tradition confirms. Sibling sizes: 5×5 = 12 each, 9×9 = 40 each.

**Geometry.** Index cells `i = r*7 + c`, `r,c ∈ [0,6]`. `CENTER = 24` (r=3, c=3).

---

### 1.2 Placement phase (التوزيع)

**Authentic answer, universal on all three points:**

1. Players alternate placing **exactly two stones per turn**. Lane: "they then alternately place two kelbs"; Falkener; Bolton; seja.ps «زوجياً (حجرين في كل مرة)»; Ludii `(then (if ("NewTurn") (moveAgain)))`.
2. The **centre cell must remain empty** for the whole phase. Ludii `(to (difference (sites Empty) (centrePoint)))`. In Upper Egypt the centre has a proper name, **عين الدَّك / عين الديك**, and leaving it empty is the defining feature of the setup.
3. **No captures occur during placement.** Sandwiches formed while placing are inert and are *not* resolved when the phase ends. Falkener states it explicitly; Ludii's placement phase has no capture ludeme.

Because 24 is even, each player takes exactly **12 placement turns**; there is never a one-stone remainder.

**Who places first.** No historical source fixes this by right — Falkener says "determined by lot", Bell says "at random". Modern codified practice does fix it: seja.ps makes the challenger Player 1 and gives the previous winner the right to start the next game.

> **DEFAULT:** Player 1 places first. In a single game, Player 1 is whichever side the user selects (or the host in multiplayer). In a match/series, **the winner of the previous game starts the next** — this is the living Levantine convention and costs nothing to implement.

**Optional placement constraint (OFF by default).** The 1975 commercial set requires the first player to place at least one stone orthogonally adjacent to the centre, guaranteeing they have an opening move. This is unnecessary — the blockade rule (§1.9) handles the degenerate case cleanly — and it is a commercial invention. Do not enable it.

**Prescribed opening cells: do NOT implement.** Lane prescribes fixed first placements (a,a / b,b), but Bolton's own field account explicitly contradicts him ("either on adjoining or far separated squares, as he chooses"), and Falkener reports the Bedouin preference as a *custom*, not a rule. Free placement from the first stone.

---

### 1.3 Who moves first, and the centre opening

**The conflict.** This is genuinely evenly split in English-language sources:

- **Camp A — first placer moves first:** Lane (implied), Bolton ("Then the first player moves one of his kelbs"), Ludii (turn order simply continues), Wikipedia, the 1975 Seejeh set (Tels place first *and* move first), Aljaafreh & Al-Oudat.
- **Camp B — last placer (Player 2) moves first**, as tempo compensation: Bell 1979 and everything downstream (Cyningstan, NRICH, Board and Pieces, jpneto, bodogemu, bead.game, the Google Play Seega app).

**The tiebreaker is Arabic.** Every Arabic-language source — seja.ps, kayftal3ab, the Egyptian and Algerian field accounts — has Player 1 both placing and moving first: «يبدأ اللاعب الأول اللعب بنقل حجارته». No Arabic source reverses it. Combined with Camp A being the position of both 19th-century primary sources and the reference implementation:

> **DEFAULT: the player who placed first moves first.** Camp B is offered as the toggle `firstMover: 'FIRST_PLACER' | 'LAST_PLACER'`, labelled "Bell variant (second player opens)".

**First move into the centre.** This is **not a rule and must not be implemented as one.** Bolton names it correctly as a geometric consequence: "*Obviously* the first move must be into the middle square of the field" — the centre is the only empty cell on a 48-stone board, so *every* legal first move goes there under either camp. Bell/Cyningstan and Ludii encode no such rule precisely because none is needed.

> **Implementation:** delete the `firstMoveCenter` toggle. Replace it with a runtime **assertion** in tests: at the first movement-phase ply, every generated legal move has `to === CENTER`. If that assertion ever fails, the placement phase is buggy.
>
> A first move into the centre **may capture** normally (it lands adjacent to enemy stones with friendly stones beyond). Do not suppress captures on move 1.

---

### 1.4 CAPTURE — the decisive ruling

> ## Capture removes **exactly ONE** enemy stone per direction. Whole-line / contiguous-run capture is **not Seejeh** and must be removed from the engine.

**Evidence, and it is not close:**

- **Lane 1836:** "…that there shall be, between it and another of his, **one** of his adversary's kelbs. This, by so doing, he takes."
- **Bolton 1890:** "Each player tries to move so as to catch **one** of his adversary's kelbs between two of his own."
- **Falkener 1892:** "A kelb is taken by placing one on each side of it, as if manacling it."
- **Ludii reference implementation:** `("CustodialCapture" Orthogonal (max 1))`. This is the strongest single piece of evidence available: Ludii's `CustodialCapture` ludeme captures an *unbounded* line by default, so the `(max 1)` cap is a deliberate, explicit, machine-checkable modelling decision by the Digital Ludeme Project.
- **Historic Games Club**, stating the negative case by name: "Only a single piece (**NOT two enemy pieces next to each other**) can be sandwiched between your two pieces in any one direction."
- **Murray 1952** classifies Seega under *interception capture*, alongside Ludus Latrunculorum — a single-piece capture family — explicitly distinct from the line-capture family.
- **Arabic oral/ethnographic sources are singular without exception:** «كل كلب يقع بين كلبين للخصم يصبح ميتًا» (Tunisia, Kasserine); «تحصر كلب المنافس بين كلبين لك» (Minya, Egypt); «محاصرة حجرة المنافس بين حجرتين له» (Algeria).

**The only dissent** is the modern Palestinian app ruleset seja.ps: «وقوع حجر او أكثر من حجارة الخصم بين حجرين» ("one **or more** of the opponent's stones between two of the player's stones"), plus a garbled Jordanian retelling capping it at two. The seja.ps phrasing is genuinely ambiguous in Arabic and almost certainly means "one or more stones captured in total across directions" — which is the multi-direction rule of §1.6, not line capture. It is a 21st-century app text, not testimony. It does not outweigh Lane, Bolton, Falkener, Murray, Bell, Ludii and every Egyptian/Maghrebi informant.

**Whole-line capture is the rule of Hasami Shogi**, a different game. Conflating them is a known category error. It also materially breaks balance: line capture makes the game wildly swingy and collapses the mid-game.

**Normative capture predicate.** After the mover's stone arrives at cell `D`, for each orthogonal direction `d ∈ {N,S,E,W}`:

```
A = D + d          // must be on-board and on the same rank/file as D
B = D + 2d         // must be on-board and on the same rank/file as D
capture A  ⟺  board[A] == opponent(mover)
            ∧ board[B] == mover
            ∧ ¬(centreSafety ∧ A == CENTER)
```

Compute the full capture set **first**, then remove all of them simultaneously. (No interaction is possible — flankers are always the mover's own stones and are never captured — but specify it for determinism.)

This single predicate produces, for free and without extra rules: self-move safety (§1.5), multi-direction capture (§1.6), the max-3 bound, and correct edge/corner behaviour.

---

### 1.5 Immunity when moving into a sandwich

**Authentic answer: a stone that moves (or is placed) of its own accord between two enemy stones is NOT captured.** The sandwich must be *closed* by the opponent on the opponent's own turn.

Universal. Bolton: "If, however, in moving, one player places his own kelb between two of his opponent's, he suffers no loss; a capture must be forced by the opponent." Falkener extends it to placement. Bell/Cyningstan: "One of the enemies must move away and back again to effect a capture." Egyptian folk testimony (Minya): «لو واحد حط كلب من كلابه بين كلبين المنافس … مش ها يطلع». NRICH calls the sandwich square "safe ground".

**Confidence: certain.** The capture predicate in §1.4 already guarantees this, because captures are evaluated **only** from the arriving stone `D` outward, and only against stones of the non-mover. Never scan the whole board for sandwiches. Property test: *after any legal action, no stone belonging to the player who just moved is ever removed.*

---

### 1.6 Centre square safety, and whether it blocks a capture line

**The conflict.** Centre immunity is attested in Bell 1979 and everything downstream of it (Cyningstan, NRICH, Board and Pieces, jpneto, bodogemu, bead.game, MAIC2020, most consumer apps). It is attested in **no** 19th-century source, and in **no** indigenous Arabic source; Lane closes with "These are the only rules of the game" and Bolton with "these were all the rules they seemed to have". Ludii does not implement it. The one Arabic source that states it (an App Store listing) is a translation of the Anglophone Bell rules, not independent testimony.

**Ruling:** the *authentic* traditional answer is that the centre confers **no** immunity; the *standard modern* answer is that it does.

> **DEFAULT: centre safety ON**, exposed as `centreSafety: boolean`. Rationale: it is the overwhelming majority convention in every ruleset a player is likely to have met, it is the current app's behaviour (no gratuitous churn), and it makes the centre — around which the entire opening revolves — a meaningful asset rather than a stone that dies on move 2. Ship it under a preset named **"Standard (Bell)"** with a second preset **"Historical (Lane/Bolton)"** that turns it off, and say so honestly in the rules screen. Do **not** label centre immunity as an Arabic-tradition rule; it isn't one.

**Does a protected centre stone block a capture line?** Under single-stone capture **the question does not arise**, and this is a further argument for §1.4. Resolve it precisely as follows:

- The centre stone is immune **only as a victim**: it is never a member of the capture set.
- The centre stone is a **fully normal flanker for either side**: a stone standing on the centre may serve as the `B` anchor that captures an adjacent enemy, and an enemy stone on the centre may serve as the `A`… no — `A` on the centre is exactly the immunity case above.
- A stone standing **adjacent to** the centre is capturable normally, including when the centre stone is one of the two flankers.
- Bell/bead.game state this explicitly: "immune from capture, but it may itself be used to capture enemy pieces."

There is no "blocking" scenario because the sandwiched run is always exactly one cell long. Encode immunity as the single clause `¬(centreSafety ∧ A == CENTER)` in the capture predicate — nowhere else.

---

### 1.7 Simultaneous captures in multiple directions

**Authentic answer: yes.** One move may close sandwiches in several directions at once; each direction still yields exactly one stone.

- Bell/Cyningstan rule 10: "If, when moving a piece, two or three enemies become simultaneously trapped, then all these trapped enemies are captured."
- **Empirically demonstrated** in Falkener's 1892 transcribed games: `43—33+23, 32` and `21—31+32, 41` are single moves capturing two enemies in two different directions.
- Historic Games Club, NRICH, Board and Pieces, Kharbga ("up to three soldiers"), Ludii (the ludeme applies to all orthogonal directions independently).
- No source anywhere forbids it.

**Maximum is 3.** The stone moved from `S` to `D`; `S` is now empty, so the direction `D→S` can never yield a capture. On an edge cell the max is 2, in a corner 1. State this as a property-test invariant: `0 ≤ |captureSet| ≤ 3`, and `|captureSet| ≤ deg(D) − 1`.

**Confidence: certain.**

---

### 1.8 Chain / repeat capture (الأكل المتتابع)

Three sub-questions, decided separately.

**(a) Does a chain exist? YES.** Universal among textual sources. Lane: "as long as he can immediately make another capture by such means, he does so, without allowing his adversary to move." Bolton, Falkener, Bell, NRICH, Wikipedia, jpneto, Kharbga, seja.ps «ويستمر اللاعب … بشكل متتابع وبنفس الحجر». (Ludii and MAIC2020 omit chains entirely — treat their silence as model incompleteness, not evidence; Ludii's own cited sources all have it.)

**(b) Must every step itself capture? YES, universally.** A chain continuation that does not capture is illegal. There is no dissent on this point in any source.

**(c) Same stone, or any stone?** Same stone. Falkener derives it explicitly from Bolton's worked example ("the player may make another move with **the same piece**"); Bell, NRICH, Board and Pieces, jpneto and seja.ps «بنفس الحجر» all agree. Only the 1975 commercial set allows any piece.
> **DEFAULT: same stone.** Toggle `chainSameStone: boolean`, default `true`.

**(d) May the player decline?** Genuinely disputed. Mandatory: Lane ("he does so"), Board and Pieces, NRICH, seja.ps. Optional: Bolton ("**has the right** to do so"), Falkener ("**may** make another move"), Bell ("**may** continue"), the 1975 set ("**can** move").
> **DEFAULT: declinable (optional).** Justification: it is the reading of Bolton, Falkener and Bell — i.e. the three sources that address the question *as* a question rather than in passing — it is a real strategic decision (continuing displaces your stone and can dissolve your own formations), it never forces a player into a bad move, and it is the current app's behaviour. Toggle `chainMandatory: boolean`, default `false`.

**Bounds.** Every chain step captures ≥1 enemy stone, so a chain is at most 24 steps and always terminates. Property test: `chainLength ≤ enemyStonesAtTurnStart`.

**Engine note.** A chain means one *turn* spans multiple *moves*. The search must model a complete turn (initial move + chain) as one minimax decision node, or the alternation is simply wrong. With declinable chains, each step branches continue/stop.

**Not implemented:** Bolton's own house rule that the chain lapses once the captured stone has been set down. He states it is his invention to limit deliberation, not a Bedouin rule. Handle deliberation with a clock instead.

---

### 1.9 Blockade / no legal move (الحصار وإغلاق المنافذ)

**Authentic answer: the blocked player is never penalised. The opponent must open a path.**

The corpus offers five resolutions:

| | Rule | Sources |
|---|---|---|
| A | Opponent **removes one of their OWN stones** to open a way | Lane 1836 (explicit, and generalised to the whole game); Bolton (as one of two alternatives) |
| **B** | **Opponent takes extra turn(s) and must create an opening**; blocked player simply doesn't move | Falkener (who explicitly *rejects* A: "we have not met with this necessity … read — by **moving** one of his own pieces"); Bolton (alternative); Bell/Cyningstan r.7; NRICH; jpneto; bodogemu; bead.game; Pritchard 1994; MAIC2020 |
| C | Blocked player **loses** | Wikipedia (per Aljaafreh 2019); seja.ps, but **asymmetrically**: Player 1 blocked ⇒ loses; Player 2 blocked ⇒ Player 1 must open in exactly one move |
| D | Opponent chooses which of the *blocker's* pieces is removed | Fouze & Amit 2017 via Wikipedia |
| E | Declared blockade: Tels remove 2, Jugs remove 1 | 1975 commercial set only |

> **DEFAULT: Rule B.** It is the plurality position, it is Falkener's considered correction of Lane after actually playing the game, and it is the only rule that neither destroys material arbitrarily nor ends the game on a technicality. Toggles offered for A and C.

**[APP DEVIATION]** The current app removes a stone belonging to the **blocked** player. This appears in **no source in any language**. Every attested removal rule takes stones from the player who *benefits* from the blockade (Lane: the blocker removes his own; Seejeh 1975: the first player pays double). Wikipedia's "opponent removes a blocking piece" means a piece *doing the blocking* — i.e. the blocker's own. This rule must be removed.

**Normative implementation of Rule B** (this is the MAIC2020 `get_unstucked_piece` approach, cleaned up):

```
At the moment the turn would pass to player P:
  if legalMoves(P) is non-empty:  P moves normally.
  else:
     turn stays with / returns to Q, and mustUnblock := true
     Q's legal first-moves are filtered to those which, after the move
       and its captures are applied, leave P with ≥ 1 legal move.
     If that filtered set is empty, Q moves unrestricted (mustUnblock stays true).
     While mustUnblock and Q is chaining, chain continuations are likewise
       filtered to those that keep P unblocked, when such continuations exist.
     After Q's turn completes, re-evaluate. Repeat.
  if BOTH players have no legal move: terminal — see §1.11.
```

The filter is what makes "must create an opening" real; a free unrestricted extra turn lets Q shuffle forever, since Q profits from P being stuck. The no-progress counter (§1.11) still ticks during unblocking turns and is the backstop.

**Important edge case — an immediately blocked first mover.** At the start of the movement phase there is exactly one empty cell (the centre) with exactly four orthogonal neighbours. If all four belong to the opponent, the player entitled to move first has **zero** legal moves. This is legal and reachable; the blockade rule fires on ply 1. The opponent always has a move (they own ≥1 centre-neighbour), and their move vacates a cell adjacent to the centre. Test this case explicitly.

**Not implemented by default (but documented as toggles for an Arabic-authentic preset):**
- **الفِدية (ransom)** — seja.ps: Player 2 only may, at any time, trade one of their own stones for two of Player 1's, to offset the first-player advantage. Genuinely codified in the living Palestinian ruleset and has no Western counterpart. Off by default; it is app-specific, asymmetric, and needs a negotiation UI.
- **Falkener's surrender-by-encirclement:** "A player surrounded by the enemy, and refusing to come out, surrenders the game." Subsumed by the resign action.

---

### 1.10 Win condition — and the verdict on "7 or fewer stones"

> ## **VERDICT: the "reduced to 7 or fewer stones" win condition is an INVENTION with no basis in any source, in any language, anywhere.**

Three independent research passes searched for it specifically: Lane, Bolton, Falkener, Murray, Bell, Cyningstan, Ludii, NRICH, Board and Pieces, Historic Games Club, jpneto, bead.game, bodogemu, Kharbga, Wikipedia (EN and AR), BGG, Google Play/App Store listings, the academic literature, and Egyptian, Palestinian, Jordanian, Saudi, Libyan, Tunisian and Algerian Arabic sources. Targeted Arabic searches for «سبع حجارة» / «سبعة أحجار» in a Seejeh context return only the unrelated children's game السبع طوبات. The only three occurrences on the internet are `README.md:42`, `README.md:53` and `src/tests/rules.spec.ts:214` **in this repository.**

**The only numeric threshold attested anywhere is ONE**, and it has a mathematical justification: capture requires two of your own stones (the arriving stone plus a flanker), so **a player reduced to one stone can never capture again and can never win**. Bolton: "until one or the other player has lost all but one of his kelbs." Historic Games Club gives exactly that rationale. seja.ps: «عند التخلص من جميع الحجارة او بقاء حجر واحد». Wikipedia notes it as a variant. The alternative is strict annihilation (Ludii `("CaptureAll" Next)`, Bell, NRICH, jpneto).

> **DEFAULT: `eliminationThreshold = 1`.** A player whose stone count drops to **≤ 1** loses immediately. Toggle to `0` for the strict Ludii/Bell ruleset. This is authentic (Bolton, seja.ps), mathematically sound, and eliminates the pointless mop-up phase that the invented 7-stone rule was presumably trying to short-circuit.

**Also winning:**
- **Resignation** — universally attested and culturally specific: after placement, a player who sees he is already lost "uproots the game", **قلع اللعبة**. Model as an explicit action.
- **Adjudication** on the no-progress limit — more stones wins (§1.11).

**Not enabled by default:** win by total immobilisation of the opponent (`blockadeRule = 'BLOCKED_LOSES'`), which contradicts the default blockade rule; and seja.ps's think-time forfeit and scoring formula, which are app-competition features, not rules of Seejeh.

---

### 1.11 Draws, repetition, and no-progress

Lane and Bolton are **entirely silent** on draws. Ludii encodes none — and its own playout statistics for the 7×7 ruleset report **DrawFrequency 21%**, so an implementation that has no draw handling will hang or shuffle in one game in five.

Attested conventions:
- **Impregnable barrier** — if a player walls off a region containing only their own stones, the position is dead. Bell/Cyningstan: default draw, but players "may agree beforehand that such a situation gives victory to the player with the most pieces remaining." NRICH: most stones wins, equal = draw. Board and Pieces: "Draws are frequent."
- **Both players blocked** — Falkener: "If both parties are blocked up, it is a drawn game."
- **Repetition / see-saw** — Falkener identifies it as a structural defect and proposes forbidding a third repetition. seja.ps converts repetition into a **loss** for the repeater. bodogemu uses a no-progress cutoff: no capture in 20 moves ⇒ more stones wins. MAIC2020 uses `boring_limit = 50`.

> **DEFAULTS (all ON):**
> 1. **No-progress adjudication.** If **50 plies** pass with no capture, the game ends: the player with more stones on the board wins; equal ⇒ **draw**. This single rule subsumes the barrier convention, the see-saw problem, and blockade shuffling, and it guarantees termination. It is the honest, attested-in-spirit replacement for the invented 7-stone threshold.
> 2. **Threefold repetition ⇒ draw.** Same board position with the same side to move, occurring three times. (Because captures are irreversible and material is monotonically non-increasing, repetition can only ever occur inside a no-capture window — so this is a strictly earlier trigger than rule 1, never a conflicting one.)
> 3. **Both players blocked ⇒** adjudicate by material, draw if equal (Falkener, generalised).
> 4. **Draw by agreement** — offer/accept.

Delete the app's ad-hoc "Anti-Shuttle" toggle; rules 1 and 2 replace it with standard, testable machinery. The no-progress counter **must live in the searched game state**, not in the UI, or the engine will shuffle forever in locked positions.

---

## Part 2 — The state machine (normative)

### 2.1 State

```ts
type Player = 1 | 2;
type Cell   = 0 | 1 | 2;          // 0 = empty
const N = 7, SIZE = 49, CENTER = 24;

interface GameState {
  config:   RuleConfig;
  board:    Cell[];                    // length 49
  phase:    'PLACEMENT' | 'MOVEMENT' | 'GAME_OVER';
  turn:     Player;                    // side to act
  hand:     Record<Player, number>;    // stones not yet placed; starts {1:24, 2:24}
  placedThisTurn: 0 | 1;               // PLACEMENT only
  chainFrom: number | null;            // MOVEMENT: index the chain must continue from
  turnDidCapture: boolean;             // any capture during the current turn (incl. chain)
  mustUnblock: boolean;                // mover is under the open-a-path obligation
  plySinceCapture: number;
  repetition: Map<PositionKey, number>;
  onBoard:  Record<Player, number>;    // derived cache: stones currently on board
  result:   Result | null;             // { winner: Player | null, reason: ReasonCode }
}
```

`PositionKey = hash(board) ⊕ turn`. Include only `board` and `turn`; not `chainFrom`, `mustUnblock`, or counters.

Derived helper: `stonesTotal(p) = onBoard[p] + hand[p]`.

### 2.2 Actions

```ts
type Action =
  | { t: 'PLACE',      cell: number }
  | { t: 'MOVE',       from: number, to: number }
  | { t: 'CHAIN_MOVE', from: number, to: number }
  | { t: 'END_CHAIN' }
  | { t: 'RESIGN' }
  | { t: 'OFFER_DRAW' } | { t: 'ACCEPT_DRAW' };
```

`RESIGN` is legal in any non-terminal state and always transitions to `GAME_OVER` with the opponent as winner, reason `RESIGN`.

### 2.3 Primitives

```
neighbours(i)      // orthogonal, on-board, no rank/file wraparound
                   //   N: i-7 if r>0 ; S: i+7 if r<6 ; W: i-1 if c>0 ; E: i+1 if c<6
opponent(p)        // 3 - p

captureSet(board, D, mover, cfg) -> number[]
  out = []
  for each direction d with A = step(D,d) and B = step(A,d) both on-board and colinear:
     if board[A] == opponent(mover)
        and board[B] == mover
        and not (cfg.centreSafety and A == CENTER):
        out.push(A)
  return out                                  // |out| ∈ [0,3]

simpleMoves(board, p) -> {from,to}[]
  for each i with board[i] == p, for each j in neighbours(i) with board[j] == 0

capturingMovesFrom(board, i, p, cfg) -> {from,to}[]
  those j in neighbours(i) with board[j] == 0 and captureSet(applyStep(board,i,j), j, p, cfg) ≠ ∅
```

`applyStep(board,i,j)` = copy with `board[i]=0, board[j]=p`.

### 2.4 Phase: PLACEMENT

**Entry.** `board` all empty, `hand = {1:24, 2:24}`, `turn = firstPlacer`, `placedThisTurn = 0`, `phase = 'PLACEMENT'`.

**Legal actions.** Only `PLACE(cell)`, where:
```
board[cell] == 0  ∧  cell != CENTER  ∧  hand[turn] > 0
```
`RESIGN` also legal. No `MOVE`. No captures are computed, ever, in this phase.

**Transition on `PLACE(cell)`:**
```
board[cell] = turn
hand[turn] -= 1
onBoard[turn] += 1
if placedThisTurn == 0:
    placedThisTurn = 1                       // same player places their second stone
else:
    placedThisTurn = 0
    if hand[1] == 0 and hand[2] == 0:
        phase = 'MOVEMENT'
        turn  = (cfg.firstMover == 'FIRST_PLACER') ? firstPlacer : opponent(firstPlacer)
        plySinceCapture = 0
        recordRepetition()
        runBlockadeCheck()                   // §2.7 — may immediately hand the turn back
    else:
        turn = opponent(turn)
```
Because both hands start at 24 (even), `hand[1]` and `hand[2]` reach 0 on the same turn boundary; the phase transition is unambiguous.

**Invariants.** `board[CENTER] == 0` throughout. At the moment `phase` becomes `MOVEMENT`: exactly one cell is empty and it is `CENTER`; `onBoard = {1:24, 2:24}`.

### 2.5 Phase: MOVEMENT — a normal (non-chain) turn

**Legal actions when `chainFrom == null`:**
```
MOVE(from,to)  where  board[from] == turn
                    ∧ to ∈ neighbours(from)
                    ∧ board[to] == 0
                    ∧ (¬mustUnblock ∨ moveIsUnblocking(from,to) ∨ noUnblockingMoveExists)
```
`moveIsUnblocking(from,to)` ≡ after applying the step and its captures, `simpleMoves(board, opponent(turn))` is non-empty.

**Transition on `MOVE(from,to)`:**
```
1. board[from] = 0 ; board[to] = turn
2. caps = captureSet(board, to, turn, cfg)
3. remove all caps simultaneously:
       for a in caps: board[a] = 0 ; onBoard[opponent(turn)] -= 1
4. if caps.length > 0:
       turnDidCapture = true
       if cfg.chainCapture and capturingMovesFrom(board, to, turn, cfg) is non-empty:
            chainFrom = to
            return                       // turn does NOT pass; state stays with `turn`
5. endTurn()
```

### 2.6 MOVEMENT — chain state (`chainFrom != null`)

**Legal actions:**
```
CHAIN_MOVE(from,to)  where  from == chainFrom (if cfg.chainSameStone)
                          ∧ board[from] == turn
                          ∧ to ∈ neighbours(from) ∧ board[to] == 0
                          ∧ captureSet(after step, to, turn, cfg) ≠ ∅
                          ∧ (¬mustUnblock ∨ keeps opponent unblocked, when possible)

END_CHAIN            legal iff ¬cfg.chainMandatory
```
If `cfg.chainSameStone == false` (commercial variant), `from` may be any stone of `turn` provided the move captures.

**Transition on `CHAIN_MOVE`:** identical to steps 1–4 of `MOVE`, re-evaluating `chainFrom`. If no further capturing move exists from the new square, `chainFrom = null` and `endTurn()` runs automatically — the player is never asked to end a chain that cannot continue.

**Transition on `END_CHAIN`:** `chainFrom = null; endTurn()`.

**Invariant.** The state can never sit in `chainFrom != null` with an empty legal-action set: either a capturing continuation exists, or `endTurn()` already fired.

**Termination.** Each chain step strictly decreases `onBoard[opponent]`, so a chain is finite (≤ 24 steps).

### 2.7 `endTurn()` — terminal checks and hand-off

Executed in exactly this order:

```
1. chainFrom = null ; mustUnblock = false
2. plySinceCapture = turnDidCapture ? 0 : plySinceCapture + 1
   turnDidCapture = false
3. WIN CHECK
     if onBoard[opponent(turn)] <= cfg.eliminationThreshold:
         return finish(winner = turn, reason = 'ELIMINATION')
4. turn = opponent(turn)
5. REPETITION
     key = hash(board, turn) ; repetition[key] += 1
     if repetition[key] >= 3:  return finish(winner = null, reason = 'REPETITION')
6. NO-PROGRESS
     if plySinceCapture >= cfg.noProgressLimit:  return adjudicateByMaterial()
7. BLOCKADE CHECK (loop)
     runBlockadeCheck()
```

```
adjudicateByMaterial():
    if onBoard[1] > onBoard[2] -> finish(1,'ADJUDICATION')
    if onBoard[2] > onBoard[1] -> finish(2,'ADJUDICATION')
    finish(null,'ADJUDICATION_DRAW')

runBlockadeCheck():
    P = turn ; Q = opponent(turn)
    if simpleMoves(board,P) is non-empty: return          // normal
    switch cfg.blockadeRule:
      'OPPONENT_OPENS':                                    // DEFAULT
          if simpleMoves(board,Q) is empty:
              return adjudicateByMaterial()                // both stuck
          turn = Q ; mustUnblock = true ; return
      'BLOCKED_LOSES':
          return finish(Q, 'BLOCKADE')
      'OPPONENT_REMOVES_OWN':                              // Lane
          turn = Q ; mustUnblock = true ; pendingSacrifice = true ; return
```

Under `OPPONENT_REMOVES_OWN`, Q's turn consists of a single `REMOVE_OWN(cell)` action: `board[cell] == Q`, and after removal `P` has ≥1 legal move (if no such cell exists, any own stone may be removed and the check repeats). Removal counts as a lost stone for Q and does not reset `plySinceCapture`.

Note: `mustUnblock` persists across consecutive Q turns until P is unblocked. Each such turn increments `plySinceCapture` unless it captures, so the no-progress rule bounds the loop.

### 2.8 Property-based test invariants

Assert these after **every** action, over random legal playouts:

**Structural**
1. `board.length == 49`; every cell ∈ {0,1,2}.
2. `onBoard[p] == count(board == p)` for both p.
3. `stonesTotal(1) ≤ 24` and `stonesTotal(2) ≤ 24`; both are monotonically non-increasing over the game.
4. In `PLACEMENT`: `board[CENTER] == 0`, and `onBoard[1] + onBoard[2] + hand[1] + hand[2] == 48`.
5. On entering `MOVEMENT`: exactly one empty cell, and it is `CENTER`; `onBoard == {1:24, 2:24}`.

**Movement / capture**
6. A `MOVE`/`CHAIN_MOVE` changes exactly one stone's position, by exactly one orthogonal step, never wrapping rows (`|c_from − c_to| + |r_from − r_to| == 1`).
7. No stone belonging to the player who just acted is ever removed. *(self-move safety)*
8. `0 ≤ |captureSet| ≤ 3`, and `|captureSet| ≤ deg(to) − 1`.
9. Every captured stone is orthogonally adjacent to `to`. *(rules out line capture — this is the regression test for the old behaviour)*
10. With `centreSafety` ON, `CENTER ∉ captureSet` always; with it OFF, `CENTER` is capturable like any cell.
11. Captures only ever occur in `MOVEMENT`; `PLACE` never changes the opponent's stone count.
12. Every `CHAIN_MOVE` captures ≥ 1.
13. Chain length ≤ opponent's stone count at the start of the turn.

**Liveness / termination**
14. In any non-terminal state, the legal-action set is non-empty.
15. Every random playout terminates in < 4000 plies. *(guaranteed by the no-progress limit)*
16. If a player has no legal move under `OPPONENT_OPENS`, the turn passes to the opponent and **no stone is removed by that fact alone**.
17. `plySinceCapture == 0` immediately after any turn that captured.
18. `result != null` ⟺ `phase == 'GAME_OVER'`, and the state is frozen thereafter.

**Determinism**
19. `apply(state, action)` is pure; equal inputs give byte-identical outputs; no dependence on capture-set iteration order.

---

## Part 3 — User-toggleable variants

Ship two **presets** plus individual toggles. Preset selection sets all values at once; individual overrides put the ruleset into "Custom".

| Key | Type | **DEFAULT** | Alternatives | Notes |
|---|---|---|---|---|
| `boardSize` | 5 \| 7 \| 9 | **7** | 5, 9 | Stones = (n²−1)/2 → 12 / 24 / 40 |
| `firstPlacer` | 1 \| 2 | **1** | 2 | In a series: previous winner (Levantine convention) |
| `firstMover` | `FIRST_PLACER` \| `LAST_PLACER` | **`FIRST_PLACER`** | Bell variant | Genuinely disputed; Arabic sources are unanimous for the default |
| `captureRun` | 1 | **1 (fixed)** | — | **Not a toggle.** Line capture is not Seejeh. |
| `centreSafety` | bool | **true** | false ("Historical") | Bell-era; absent from Lane/Bolton/Ludii/Arabic sources |
| `chainCapture` | bool | **true** | false (Ludii model) | |
| `chainSameStone` | bool | **true** | false (Seejeh 1975) | |
| `chainMandatory` | bool | **false** | true (Lane/seja.ps) | |
| `blockadeRule` | `OPPONENT_OPENS` \| `OPPONENT_REMOVES_OWN` \| `BLOCKED_LOSES` | **`OPPONENT_OPENS`** | Lane / Wikipedia-Aljaafreh | |
| `eliminationThreshold` | 0 \| 1 | **1** | 0 (Ludii/Bell) | 1 = Bolton "all but one"; a lone stone can never capture |
| `noProgressLimit` | int | **50** plies | 20 (bodogemu), off | Adjudicate by material, tie = draw |
| `repetitionDraw` | bool | **true** | false | Threefold ⇒ draw |
| `ransomFidya` | bool | **false** | true | seja.ps الفِدية; Player 2 only, 1-for-2 |
| `mustPlaceNextToCentre` | bool | **false** | true | Seejeh 1975 commercial constraint |

**Presets**
- **"سبعاوية — القياسية" / "Seb'áwee — Standard"** *(default)*: the table above.
- **"التاريخية — لين وبولتون" / "Historical (Lane & Bolton, 19th c.)"**: `centreSafety = false`, `chainMandatory = true`, `blockadeRule = 'OPPONENT_REMOVES_OWN'`, `eliminationThreshold = 1`.
- *(optional third)* **"الفلسطينية — سيجة" / "Levantine (seja.ps)"**: `chainMandatory = true`, `centreSafety = false`, `ransomFidya = true`, `eliminationThreshold = 1`, asymmetric blockade.

**Removed toggles:** `firstMoveCenter` (a no-op — see §1.3; keep only as a test assertion) and `antiShuttle` (replaced by `repetitionDraw` + `noProgressLimit`).

---

## Part 4 — Deliberate changes from the current app

These three are not refinements; they are corrections of unattested rules. Each must be a documented, intentional change in the rewrite.

### 4.1 Whole-line capture → single-stone capture **[BREAKING]**
- **Current:** `README.md:40` — "Sandwich **one or more contiguous** opponent stones… All sandwiched stones are captured."
- **Correct:** exactly one stone per direction, max three per move.
- **Evidence:** Lane, Bolton, Falkener, Murray, Bell, Historic Games Club (explicitly negating the current rule), every Egyptian/Tunisian/Algerian informant, and Ludii's machine-readable `(max 1)`.
- **Impact:** this is the largest gameplay change. Line capture makes the game far swingier and much shorter; expect materially different balance, longer games, and an AI evaluation that must be retuned. Regression test = invariant #9.

### 4.2 "7 or fewer stones" win → elimination at ≤1, plus no-progress adjudication **[BREAKING]**
- **Current:** `README.md:42, 53`, `src/tests/rules.spec.ts:214`.
- **Correct:** win at `onBoard[opponent] ≤ 1`; plus 50-ply no-capture adjudication by material.
- **Evidence:** unattested in any source, in any language. The legitimate concern it addresses — an endless mop-up — is solved properly by the no-progress rule, which is what real digital implementations (bodogemu, MAIC2020) do.
- **Impact:** games run longer and can now be decided by material adjudication or drawn. Update all affected tests; do not port the old assertion.

### 4.3 Blockade penalises the wrong player **[BREAKING]**
- **Current:** `README.md` — "the opponent removes one of the **blocked** player's stones."
- **Correct:** the opponent must open a path (restricted extra turn); nobody loses a stone.
- **Evidence:** every attested variant either costs the *blocker* a stone (Lane) or costs nothing (Falkener, Bell, and the majority). Penalising the victim inverts the rule and is unattested.

### 4.4 Non-breaking cleanups
- Delete the `firstMoveCenter` toggle; convert to a test assertion.
- Delete `antiShuttle`; replace with threefold-repetition draw + no-progress limit.
- Keep centre safety ON, but re-label it honestly in the rules screen as the standard modern rule, not the historical or Arabic one, and expose the Historical preset that disables it.
- Keep declinable chains, but require every chain step to capture and (by default) to use the same stone.

---

## Part 5 — Arabic terminology for the UI

Register matters. Prefer the words players actually say; the app-Arabic terms (`أسر`, `التخلص من الحجارة`, `قطعة`) are grammatically correct but read as translationese to a native speaker.

| Concept | **Use this** | Also acceptable / heritage | Avoid |
|---|---|---|---|
| Game name | **السِّيجة** | *seejeh* / *seega*; subtitle «شطرنج العرب» ("the Arabs' chess"). Regional: الخَرْبقة (Tunisia), الخْرِيبقة (Algeria), الشِّيزة (Gulf/Bedouin) | "سيجا" |
| Board form (7×7) | **سبعاوية** | «لوح ٧×٧» | |
| A stone / piece | **حَجَر** / pl. **حِجارة** (neutral, MSA) | **كَلْب / كِلاب** ("dogs" — Egypt & Maghreb, the idiomatic folk term); **جِرو / جِراء، جَراوة** ("puppies" — Jordan/Palestine) | **قِطعة** — generic, reads as translation |
| The two sides | **اللاعب الأول / اللاعب الثاني** | Visual labels: **الحجارة الفاتحة / الحجارة الداكنة**; shape labels for accessibility: **المدبَّبة / المدوَّرة** | "أبيض/أسود" (chess-flavoured) |
| Board | **الرُّقعة** (traditional) | **اللوحة** (modern/app) | |
| Cell | **خانة** (most idiomatic) | **مربّع**; **حُفرة** when styled as the dug-in-sand board; **دار** (Algeria) | |
| Centre / safe square | **المربّع الأوسط** | Heritage flavour, worth surfacing: **عين الدَّك / عين الديك** (Upper Egypt). If centre safety is on: **«المربّع الأوسط محصَّن»** | |
| Placement phase | **مرحلة التوزيع** | folk verb **رَصّ** («رصّ الحجارة» / «رصّ الكلاب»); **تنزيل الحجارة** | |
| Movement phase | **مرحلة التحريك واللعب** | classical Upper-Egyptian name for the capturing phase: **المحاوَرة**; **مرحلة الأكل** | |
| A move | **حركة**; to slide a stone: **إزاحة** | | |
| Whose turn | **الدَّور** — «اللاعب صاحب الدور»; banner: **«دورك»** / **«دور الخصم»** | | |
| Capture (verb/noun) | **أَكَل / الأكل** — «أكل حجر الخصم» | **حَصْر / محاصرة** (setting up the trap); toast on capture: **«كلبك مات!»** / **«جروك مات!»**, full call **«كش كلبك مات»** | **أَسْر** — correct but bookish |
| Captured stones counter | **الحجارة المأكولة** | | |
| Chain capture | **الأكل المتتابع** | «أكمل الأكل بنفس الحجر»; button to decline: **«اكتفِ»** / **«إنهاء الدور»** | |
| Blockade | **الحِصار** / **إغلاق المنافذ**; blocked player = **مَحصور** | Prompt to the opponent: **«افتح له الطريق»** | |
| Ransom (if enabled) | **الفِدية** | | |
| Win | **فوز** — «فاز اللاعب الأول»; on elimination: **«أُكلت جميع حجارة الخصم»** | | |
| Draw | **تعادل** | «انتهت اللعبة بالتعادل» | |
| Resign | **قَلْع اللعبة** (folk, vivid, well attested) | **الانسحاب** (neutral modern) — use this for the button, `قلع اللعبة` in the confirmation copy | |
| Undo / restart | **تراجُع** / **لعبة جديدة** | | |

**Two cultural notes worth building in.** (1) Resignation *immediately after placement* is a well-attested, normal move — a player who sees he is already surrounded «يقلع اللعبة». Make resign reachable and non-shameful from the first movement ply. (2) The codified rules of the game explicitly permit **spectators to advise the players**: «تسمح قوانين اللعبة بتدخل الجمهور ومساعدة اللاعبين». If a spectator mode is ever built, kibitzing is authentic, not cheating.

---

## Part 6 — Notes for the engine (non-normative but load-bearing)

- **Branching factor, measured** over 1,198,707 positions from 3,000 random 7×7 playouts: **mean b = 19.8**, peak 22.1. It tracks empty cells almost linearly (`b ≈ 1.6 × empties`, saturating ~22), because every move is *friendly stone → adjacent empty cell*.
- **The opening is nearly free to search.** The movement phase begins with exactly one empty cell, so the first plies have `b = 2–4`. Search them exhaustively and deeply at no cost.
- **Depth budget.** With `b ≈ 20`, well-ordered alpha-beta has effective `b ≈ 4.5`. Typed-array board + 0.5–2M nodes/s in JS ⇒ ~depth 8 at a 250 ms budget, ~depth 9–10 at 1 s. Depth 6–8 is safe on mid-range mobile. Use iterative deepening + transposition table + killer/history ordering + hard wall-clock cutoff, in a Web Worker.
- **Two Seejeh-specific search traps.** (a) A chain makes one *turn* span several *moves* — model a full turn as one decision node or minimax alternation is wrong; with declinable chains each step branches continue/stop. (b) `plySinceCapture` and the repetition table must be part of the searched state, or the engine will shuffle forever in locked positions.
- **Evaluation terms** (no published Seega eval exists; derive from the rules): material difference (dominant — the win condition is annihilation), own stones currently flankable (enemy on one side, empty on the opposite side), centre occupancy (worth more when `centreSafety` is on), mobility (free — the move list is already generated), and mutually-protecting clusters.
- **Prior art:** Aljaafreh & Al-Oudat 2019 split the problem — deep-RL self-play for placement, **minimax** for movement. That two-stage split is worth copying; placement and movement are genuinely different search problems. MAIC2020 (Python, timed head-to-head agents) is a directly readable reference implementation, including `get_unstucked_piece` for the blockade rule — but note it hardcodes 14 pieces for 7×7, which is wrong; do not copy its piece counts, and it implements neither chains nor blockade-as-specified-here.

---

## Part 7 — Provenance statement to surface in the app

Recommended text for the rules/about screen, since this ruleset makes explicit choices:

> This implementation follows the 7×7 *seb'áwee* form of Seejeh with 24 stones per player. Capture takes **one** stone per direction, as described by Lane (1836), Bolton (1890), Falkener (1892), Murray (1952) and the Digital Ludeme Project, and as played today in Egypt, Tunisia and Algeria. Where sources disagree — who opens the movement phase, whether the centre square protects a stone, whether a capture chain may be declined, how a blockade is resolved — the app names its choice and lets you change it. Some rules found in other digital versions of Seejeh have no source in the historical or living tradition and are not implemented here.