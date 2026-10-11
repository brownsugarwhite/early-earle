import { describe, expect, it } from 'vitest';
import { dokumentLesen, neuesDokument } from './dokument';

describe('Dokument', () => {
  it('übersteht die JSON-Rundreise', () => {
    const d = neuesDokument('Rex');
    d.posen = ['laufen'];
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('lehnt fremde Formate ab', () => {
    expect(() => dokumentLesen({ format: 'x' })).toThrow();
  });
});
