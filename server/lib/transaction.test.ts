import mongoose, { type ClientSession } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTransaction } from './transaction.js';

describe('withTransaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the callback result and ends its session after commit', async () => {
    const session = {
      withTransaction: vi.fn(async (work: () => Promise<void>) => work()),
      endSession: vi.fn(async () => undefined),
    } as unknown as ClientSession;
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(session);

    await expect(withTransaction(async (currentSession) => {
      expect(currentSession).toBe(session);
      return 'created';
    })).resolves.toBe('created');

    expect(session.withTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('ends its session and propagates callback errors', async () => {
    const failure = new Error('transaction failed');
    const session = {
      withTransaction: vi.fn(async (work: () => Promise<void>) => work()),
      endSession: vi.fn(async () => undefined),
    } as unknown as ClientSession;
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(session);

    await expect(withTransaction(async () => {
      throw failure;
    })).rejects.toBe(failure);

    expect(session.endSession).toHaveBeenCalledOnce();
  });
});
