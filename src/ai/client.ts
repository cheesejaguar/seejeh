// FILE: src/ai/client.ts
//
// Main-thread client for the AI worker.
//
// Falls back to running the search inline when Workers are unavailable (jsdom
// under test, or any environment where worker construction fails), so callers
// never need to branch.

import type { GameState } from '../engine';
import { findBestMove, type SearchOptions, type SearchResult } from './search';
import type { AIRequest, AIResponse } from './worker';

type Pending = {
  resolve: (result: SearchResult) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let workerUnavailable = false;
let nextId = 1;
const pending = new Map<number, Pending>();

function ensureWorker(): Worker | null {
  if (workerUnavailable) return null;
  if (worker) return worker;
  if (typeof Worker === 'undefined') {
    workerUnavailable = true;
    return null;
  }

  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<AIResponse>) => {
      const { id, ok, result, error } = event.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (ok && result) entry.resolve(result);
      else entry.reject(new Error(error ?? 'AI search failed'));
    };
    worker.onerror = () => {
      // A worker that fails to boot must not wedge the game; drop back to
      // inline search and resolve everything still outstanding.
      const outstanding = [...pending.values()];
      pending.clear();
      workerUnavailable = true;
      worker?.terminate();
      worker = null;
      for (const entry of outstanding) {
        entry.reject(new Error('AI worker crashed'));
      }
    };
    return worker;
  } catch {
    workerUnavailable = true;
    return null;
  }
}

/** True when the search is genuinely running off the main thread. */
export function isWorkerActive(): boolean {
  return worker !== null && !workerUnavailable;
}

/**
 * Computes the best move for the side to move.
 *
 * Always resolves — on any worker failure it retries inline rather than
 * leaving the game with no move to play.
 */
export async function requestBestMove(
  state: GameState,
  options: SearchOptions,
): Promise<SearchResult> {
  const active = ensureWorker();
  if (!active) return findBestMove(state, options);

  const id = nextId++;
  const request: AIRequest = { id, state, options };

  try {
    return await new Promise<SearchResult>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      active.postMessage(request);
    });
  } catch {
    // Structured-clone failure or a crashed worker: fall back inline.
    return findBestMove(state, options);
  }
}

/** Tears the worker down, e.g. on unmount or hot reload. */
export function disposeAIWorker(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}
