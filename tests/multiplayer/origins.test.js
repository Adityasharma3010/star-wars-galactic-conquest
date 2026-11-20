import { it, expect } from 'vitest';
import { allowedOrigin } from '../../supabase/functions/galactic-api/origins.js';
it('accepts configured production hosts and enabled private LAN game addresses', () => {
  expect(allowedOrigin('https://game.example.com', ['https://game.example.com'])).toBe(true);
  expect(allowedOrigin('http://192.168.1.14:5174', [], true)).toBe(true);
  expect(allowedOrigin('http://10.1.2.3:5173', [], true)).toBe(true);
  expect(allowedOrigin('http://172.31.0.5:5174', [], true)).toBe(true);
  expect(allowedOrigin('http://192.168.1.14:5174', [], false)).toBe(false);
});
it('rejects unrelated sites, public IPs, malformed origins and other ports', () => {
  for (const origin of [
    'https://evil.example',
    'http://192.168.1.14.evil.example:5174',
    'http://8.8.8.8:5174',
    'http://172.32.0.1:5174',
    'http://192.168.1.14:9999',
    'http://192.168.1.14:5174/path',
  ])
    expect(allowedOrigin(origin, [], true)).toBe(false);
});
