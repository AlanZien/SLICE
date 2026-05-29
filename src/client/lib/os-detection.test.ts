import { describe, it, expect } from 'vitest';
import { detectOs } from './os-detection';

/**
 * User-agent strings change subtly across vendors/versions; we test the
 * canonical forms returned by recent stable releases of each major browser.
 * The detector should NEVER throw — falling back to "unknown" is the only
 * correct behaviour when nothing matches, since the UI uses that to decide
 * to show both Mac and Windows buttons at equal weight.
 */

const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const WIN_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const WIN_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
const LINUX_FIREFOX =
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0';

describe('detectOs', () => {
  it('returns "mac" for Mac Chrome', () => {
    expect(detectOs(MAC_CHROME)).toBe('mac');
  });

  it('returns "mac" for Mac Safari', () => {
    expect(detectOs(MAC_SAFARI)).toBe('mac');
  });

  it('returns "windows" for Windows Chrome', () => {
    expect(detectOs(WIN_CHROME)).toBe('windows');
  });

  it('returns "windows" for Windows Edge', () => {
    expect(detectOs(WIN_EDGE)).toBe('windows');
  });

  it('returns "unknown" for Linux (we ship no Linux binary in v1)', () => {
    expect(detectOs(LINUX_FIREFOX)).toBe('unknown');
  });

  it('returns "unknown" for an empty string instead of throwing', () => {
    expect(detectOs('')).toBe('unknown');
  });
});
