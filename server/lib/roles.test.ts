import { describe, expect, it } from 'vitest';
import { resolveUserRole } from './roles.js';

describe('resolveUserRole', () => {
  it.each([
    ['business', 'business'],
    ['customer', 'customer'],
    [undefined, 'customer'],
    ['unknown', 'customer'],
  ])('resolves %s to %s', (value, expected) => {
    expect(resolveUserRole(value)).toBe(expected);
  });
});
