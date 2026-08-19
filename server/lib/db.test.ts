import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
    set: vi.fn(),
  },
}));

describe('connectDb', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(mongoose.connect).mockReset();
    process.env.MONGODB_URI = 'mongodb://example.test/vouchit';
    delete (globalThis as typeof globalThis & { mongooseConnection?: Promise<typeof mongoose> }).mongooseConnection;
  });

  it('retries after an initial connection failure', async () => {
    vi.mocked(mongoose.connect)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(mongoose);

    const { connectDb } = await import('./db.js');

    await expect(connectDb()).rejects.toThrow('network down');
    await expect(connectDb()).resolves.toBe(mongoose);
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });
});
