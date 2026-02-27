import { sanitizeResponseData as _sanitize } from '../services/session-export.service';
import { decryptSessionNote, encryptSessionNote } from '../utils/encryption';

describe('session export sanitization', () => {
  it('redacts encrypted fields', () => {
    const data = { text: 'hello', encryptedContent: 'abc', nested: { iv: 'iv', authTag: 'tag' } };
    // @ts-ignore - import of function for test shim
    const sanitized = (_sanitize as any)(data);
    expect(sanitized.encryptedContent).toBe('[REDACTED]');
    expect(sanitized.nested.iv).toBe('[REDACTED]');
  });

  it('can decrypt and re-encrypt session notes', () => {
    const plain = 'secret note';
    const enc = encryptSessionNote(plain);
    const dec = decryptSessionNote(enc);
    expect(dec).toBe(plain);
  });
});
