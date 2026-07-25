// FILE: src/engine/variants.ts

import type { VariantFlags } from './types';

/**
 * Defaults follow the best-attested traditional rules, with two deliberate
 * concessions to playability that are themselves attested:
 *
 *  - `loneStoneLoses`: a player down to one stone can never capture again
 *    (capture needs a flanking pair), so play is decided. Attested by the
 *    Palestinian and Jordanian codified rulesets.
 *  - `noProgressLimit`: not a folk rule, but the universal convention in
 *    digital implementations (Bodogemu uses 20, MAIC2020 uses 50) to stop
 *    drawn-out shuffling. Adjudicated on material.
 */
export const DEFAULT_VARIANT: VariantFlags = {
  centerIsSafe: true,
  chainCaptures: true,
  chainMustContinue: false,
  loneStoneLoses: true,
  blockade: 'opponentMovesAgain',
  firstMover: 'firstPlacer',
  noProgressLimit: 50,
  repetitionDraw: true,
};

/**
 * The Ludii/Digital Ludeme Project reference reading: no centre immunity, no
 * chain capture, pure elimination. The strictest scholarly interpretation.
 */
export const LUDII_VARIANT: VariantFlags = {
  centerIsSafe: false,
  chainCaptures: false,
  chainMustContinue: false,
  loneStoneLoses: false,
  blockade: 'opponentMovesAgain',
  firstMover: 'firstPlacer',
  noProgressLimit: 80,
  repetitionDraw: true,
};

/**
 * Lane (1836) / Bell: centre is safe, chains are mandatory, and a blockaded
 * player's opponent must sacrifice one of their own stones to open a path.
 */
export const CLASSIC_VARIANT: VariantFlags = {
  centerIsSafe: true,
  chainCaptures: true,
  chainMustContinue: true,
  loneStoneLoses: false,
  blockade: 'opponentRemovesOwnStone',
  firstMover: 'secondPlacer',
  noProgressLimit: 80,
  repetitionDraw: true,
};

export const VARIANT_PRESETS = {
  standard: DEFAULT_VARIANT,
  classic: CLASSIC_VARIANT,
  ludii: LUDII_VARIANT,
} as const;

export type VariantPresetName = keyof typeof VARIANT_PRESETS;

export function normalizeVariant(input?: Partial<VariantFlags> | null): VariantFlags {
  const merged = { ...DEFAULT_VARIANT, ...(input ?? {}) };
  const limit = Number(merged.noProgressLimit);
  return {
    centerIsSafe: Boolean(merged.centerIsSafe),
    chainCaptures: Boolean(merged.chainCaptures),
    // A mandatory chain is meaningless when chains are off.
    chainMustContinue: Boolean(merged.chainCaptures) && Boolean(merged.chainMustContinue),
    loneStoneLoses: Boolean(merged.loneStoneLoses),
    blockade:
      merged.blockade === 'opponentRemovesOwnStone' ||
      merged.blockade === 'blockedPlayerLoses'
        ? merged.blockade
        : 'opponentMovesAgain',
    firstMover: merged.firstMover === 'secondPlacer' ? 'secondPlacer' : 'firstPlacer',
    noProgressLimit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0,
    repetitionDraw: Boolean(merged.repetitionDraw),
  };
}
