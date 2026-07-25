// FILE: src/ai/worker.ts
//
// Web Worker entry point for the Seejeh AI. The search runs here so that even
// the deepest difficulty never blocks rendering or input — the previous AI ran
// synchronously on the main thread and froze the UI for up to a second a move.

import { findBestMove, type SearchOptions } from './search';
import type { GameState } from '../engine';

export interface AIRequest {
  id: number;
  state: GameState;
  options: SearchOptions;
}

export interface AIResponse {
  id: number;
  ok: boolean;
  result?: ReturnType<typeof findBestMove>;
  error?: string;
}

// `GameState` holds a Uint8Array plus plain objects, all of which the
// structured clone algorithm handles, so no manual serialisation is needed.
self.onmessage = (event: MessageEvent<AIRequest>) => {
  const { id, state, options } = event.data;
  try {
    const result = findBestMove(state, options);
    const response: AIResponse = { id, ok: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: AIResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
