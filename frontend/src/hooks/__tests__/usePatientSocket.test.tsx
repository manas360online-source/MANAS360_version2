/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
// mock socket.io-client
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockRemoveAll = vi.fn();
const mockDisconnect = vi.fn();
vi.mock('socket.io-client', () => ({ io: () => ({ on: mockOn, emit: mockEmit, removeAllListeners: mockRemoveAll, disconnect: mockDisconnect, connected: true }) }));

import { usePatientSocket } from '../usePatientSocket';

function TestComp() {
  const { sendAnswer } = usePatientSocket({ token: 't', sessionId: 's1' });
  // expose on window for test access
  // @ts-ignore
  (globalThis as any).__send = sendAnswer;
  return null;
}

describe('usePatientSocket', () => {
  it('prevents duplicate submissions by questionId', () => {
    render(<TestComp />);
    // @ts-ignore
    const send = (globalThis as any).__send as (q: string, a: any) => any;
    const r1 = send('q1', { x: 1 });
    expect(r1.ok).toBe(true);
    const r2 = send('q1', { x: 2 });
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe('duplicate');
  });
});
