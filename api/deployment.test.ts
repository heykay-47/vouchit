import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Vercel deployment configuration', () => {
  it('does not set X-Frame-Options from HTML meta tags', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).not.toMatch(/http-equiv=["']X-Frame-Options["']/i);
  });

  it('sets X-Frame-Options as an HTTP response header', () => {
    const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));

    expect(vercelConfig.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/(.*)',
          headers: expect.arrayContaining([
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          ]),
        }),
      ])
    );
  });

  it('compiles API entrypoint with Vercel NodeNext settings', () => {
    expect(() => {
      execFileSync(
        'npx',
        [
          'tsc',
          '--noEmit',
          '--module',
          'NodeNext',
          '--moduleResolution',
          'NodeNext',
          '--target',
          'ES2022',
          '--skipLibCheck',
          'api/[...path].ts',
        ],
        { cwd: process.cwd(), stdio: 'pipe' }
      );
    }).not.toThrow();
  });
});
