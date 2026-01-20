/**
 * Mutation Queue
 * Manages pending mutations for offline sync
 */

import { db, generateId, nowISO } from '../../db/client';
import {
  QueuedMutation,
  SyncableTable,
  MutationType,
  DEFAULT_SYNC_CONFIG,
} from './types';

// In-memory queue for simplicity - in production, use a dedicated SQLite table
let mutationQueue: QueuedMutation[] = [];
let queueListeners: ((queue: QueuedMutation[]) => void)[] = [];

/**
 * Add a mutation to the queue
 */
export function enqueueMutation(
  table: SyncableTable,
  type: MutationType,
  recordId: string,
  data: Record<string, unknown>
): QueuedMutation {
  const mutation: QueuedMutation = {
    id: generateId(),
    table,
    type,
    record_id: recordId,
    data,
    created_at: nowISO(),
    retry_count: 0,
    last_error: null,
    status: 'pending',
  };

  mutationQueue.push(mutation);
  notifyListeners();

  return mutation;
}

/**
 * Get all pending mutations
 */
export function getPendingMutations(): QueuedMutation[] {
  return mutationQueue.filter((m) => m.status === 'pending');
}

/**
 * Get all mutations for a specific table
 */
export function getMutationsForTable(table: SyncableTable): QueuedMutation[] {
  return mutationQueue.filter((m) => m.table === table && m.status === 'pending');
}

/**
 * Get mutation count
 */
export function getMutationCount(): number {
  return getPendingMutations().length;
}

/**
 * Mark a mutation as processing
 */
export function markMutationProcessing(mutationId: string): void {
  const mutation = mutationQueue.find((m) => m.id === mutationId);
  if (mutation) {
    mutation.status = 'processing';
    notifyListeners();
  }
}

/**
 * Mark a mutation as completed (remove from queue)
 */
export function completeMutation(mutationId: string): void {
  mutationQueue = mutationQueue.filter((m) => m.id !== mutationId);
  notifyListeners();
}

/**
 * Mark a mutation as failed and schedule retry
 */
export function failMutation(mutationId: string, error: string): void {
  const mutation = mutationQueue.find((m) => m.id === mutationId);
  if (mutation) {
    mutation.retry_count++;
    mutation.last_error = error;
    mutation.status =
      mutation.retry_count >= DEFAULT_SYNC_CONFIG.maxRetries ? 'failed' : 'pending';
    notifyListeners();
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(retryCount: number): number {
  const delay = DEFAULT_SYNC_CONFIG.baseRetryDelay * Math.pow(2, retryCount);
  return Math.min(delay, DEFAULT_SYNC_CONFIG.maxRetryDelay);
}

/**
 * Get mutations ready for retry (past their backoff delay)
 */
export function getMutationsReadyForRetry(): QueuedMutation[] {
  const now = Date.now();
  return mutationQueue.filter((m) => {
    if (m.status !== 'pending' || m.retry_count === 0) {
      return m.status === 'pending';
    }
    const createdAt = new Date(m.created_at).getTime();
    const delay = getRetryDelay(m.retry_count - 1);
    return now - createdAt >= delay;
  });
}

/**
 * Clear all mutations (for testing or reset)
 */
export function clearQueue(): void {
  mutationQueue = [];
  notifyListeners();
}

/**
 * Clear failed mutations
 */
export function clearFailedMutations(): void {
  mutationQueue = mutationQueue.filter((m) => m.status !== 'failed');
  notifyListeners();
}

/**
 * Subscribe to queue changes
 */
export function subscribeToQueue(
  listener: (queue: QueuedMutation[]) => void
): () => void {
  queueListeners.push(listener);
  return () => {
    queueListeners = queueListeners.filter((l) => l !== listener);
  };
}

/**
 * Notify listeners of queue changes
 */
function notifyListeners(): void {
  queueListeners.forEach((listener) => listener([...mutationQueue]));
}

/**
 * Get the next batch of mutations to process
 */
export function getNextBatch(batchSize: number = DEFAULT_SYNC_CONFIG.batchSize): QueuedMutation[] {
  const ready = getMutationsReadyForRetry();
  return ready.slice(0, batchSize);
}

/**
 * Requeue a failed mutation for retry
 */
export function requeueMutation(mutationId: string): boolean {
  const mutation = mutationQueue.find((m) => m.id === mutationId);
  if (mutation && mutation.status === 'failed') {
    mutation.status = 'pending';
    mutation.retry_count = 0;
    mutation.last_error = null;
    notifyListeners();
    return true;
  }
  return false;
}
