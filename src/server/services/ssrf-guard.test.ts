import { describe, it, expect } from 'vitest';
import { assertPublicUrl, SsrfError } from './ssrf-guard';

describe('assertPublicUrl', () => {
  it('accepts a normal public https URL', async () => {
    await expect(assertPublicUrl('https://api.stripe.com/v1')).resolves.toBeUndefined();
  });

  it('rejects loopback (127.0.0.1)', async () => {
    await expect(assertPublicUrl('http://127.0.0.1:3001/admin')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects localhost (resolves to loopback)', async () => {
    await expect(assertPublicUrl('http://localhost:8080')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects the cloud metadata IP (169.254.169.254)', async () => {
    await expect(
      assertPublicUrl('http://169.254.169.254/latest/meta-data/')
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects RFC1918 private ranges (10/8, 172.16/12, 192.168/16)', async () => {
    await expect(assertPublicUrl('http://10.0.0.5')).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicUrl('http://172.16.4.4')).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicUrl('http://192.168.1.1')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects IPv6 loopback (::1)', async () => {
    await expect(assertPublicUrl('http://[::1]:9000')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects IPv4-mapped IPv6 loopback', async () => {
    await expect(assertPublicUrl('http://[::ffff:127.0.0.1]')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects a malformed URL', async () => {
    await expect(assertPublicUrl('not-a-url')).rejects.toBeInstanceOf(SsrfError);
  });
});
