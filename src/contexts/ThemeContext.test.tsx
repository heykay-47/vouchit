import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeContext';

vi.mock('next-themes', () => ({
  ThemeProvider: ({
    children,
    attribute,
    defaultTheme,
    enableSystem,
    forcedTheme,
  }: {
    children: React.ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    forcedTheme?: string;
  }) => (
    <div
      data-testid="theme-provider"
      data-attribute={attribute}
      data-default-theme={defaultTheme}
      data-enable-system={String(enableSystem)}
      data-forced-theme={forcedTheme}
    >
      {children}
    </div>
  ),
}));

describe('ThemeProvider', () => {
  it('makes system, light, and dark themes reachable', () => {
    render(<ThemeProvider>content</ThemeProvider>);

    const provider = screen.getByTestId('theme-provider');
    expect(provider).toHaveAttribute('data-attribute', 'class');
    expect(provider).toHaveAttribute('data-default-theme', 'system');
    expect(provider).toHaveAttribute('data-enable-system', 'true');
    expect(provider).not.toHaveAttribute('data-forced-theme');
  });
});
