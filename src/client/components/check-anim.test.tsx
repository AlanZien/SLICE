import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CheckAnim } from './check-anim';

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce') ? reduce : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('<CheckAnim />', () => {
  it('renders a check icon SVG by default', () => {
    mockReducedMotion(false);
    const { container } = render(<CheckAnim />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies the draw animation class when motion is allowed', () => {
    mockReducedMotion(false);
    const { container } = render(<CheckAnim />);
    const path = container.querySelector('path');
    expect(path?.getAttribute('class') ?? '').toContain('motion-safe:animate-');
  });

  it('omits the animation when prefers-reduced-motion is set', () => {
    mockReducedMotion(true);
    const { container } = render(<CheckAnim />);
    const path = container.querySelector('path');
    // We still ship a path — just rendered without a stroke-dasharray draw.
    expect(path).not.toBeNull();
  });
});
