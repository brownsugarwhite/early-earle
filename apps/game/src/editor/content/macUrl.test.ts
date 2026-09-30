import { describe, expect, it } from 'vitest';
import { DEFAULT_MAC_URL, normalizeMacUrl } from './macUrl';

describe('normalizeMacUrl (Mac-Adresse in der Werkstatt)', () => {
  it('adds scheme and the dev port to a bare address', () => {
    expect(normalizeMacUrl('192.168.1.55')).toBe(DEFAULT_MAC_URL);
    expect(normalizeMacUrl('  florians-mac.local ')).toBe('http://florians-mac.local:5174');
  });

  it('keeps an explicit scheme and port, drops paths and slashes', () => {
    expect(normalizeMacUrl('http://192.168.1.55:5174/')).toBe('http://192.168.1.55:5174');
    expect(normalizeMacUrl('http://192.168.1.20:5180/__content/levels')).toBe('http://192.168.1.20:5180');
    expect(normalizeMacUrl('https://mac.local:5173')).toBe('https://mac.local:5173');
    expect(normalizeMacUrl('10.0.0.2:8080?x=1')).toBe('http://10.0.0.2:8080');
  });

  it('rejects empty input and other schemes', () => {
    expect(normalizeMacUrl('')).toBeNull();
    expect(normalizeMacUrl('   ')).toBeNull();
    expect(normalizeMacUrl('ftp://192.168.1.55')).toBeNull();
    expect(normalizeMacUrl('javascript://alert(1)')).toBeNull();
  });
});
