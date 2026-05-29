/**
 * Coarse-grained OS detection driven by `navigator.userAgent`. We only need
 * to distinguish "show Mac binary" from "show Windows binary" — anything
 * finer (Apple Silicon vs Intel, Win10 vs Win11) is left to the user via a
 * secondary control on the success screen.
 *
 * "unknown" is a first-class return — Linux users (or any UA we don't
 * recognise) see both buttons at equal weight rather than a fabricated
 * default. Tests pin every branch.
 */

export type DetectedOs = 'mac' | 'windows' | 'unknown';

export function detectOs(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): DetectedOs {
  if (!ua) return 'unknown';
  // Substring checks — UA tokens are stable across modern Chromium/WebKit/Gecko.
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  if (/Windows NT|Win64|WOW64/.test(ua)) return 'windows';
  return 'unknown';
}
