import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

export function renderWithRouter(ui: ReactElement, route = '/'): RenderResult {
  window.history.pushState({}, '', route);
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}
