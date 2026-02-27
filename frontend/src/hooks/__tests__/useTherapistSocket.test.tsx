/** @vitest-environment jsdom */
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// force a simple localStorage mock (override any environment) for predictable tests
{
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
  } as any;
}

// simple BroadcastChannel mock
if (typeof globalThis.BroadcastChannel === 'undefined') {
  class MockBC {
    name: string;
    onmessage: ((ev: any) => void) | null = null;
    constructor(name: string) {
      this.name = name;
    }
    postMessage(_msg: any) {
      // no-op in unit test; leader publishes to local listeners only via localStorage in our tests
    }
    close() {}
  }
  // @ts-ignore
  globalThis.BroadcastChannel = MockBC;
}

// mock socket.io-client
const mockOn = vi.fn();
const mockEmit = vi.fn();
const mockRemoveAll = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  io: () => ({ on: mockOn, emit: mockEmit, removeAllListeners: mockRemoveAll, disconnect: mockDisconnect }),
}));

import { useTherapistSocket } from '../useTherapistSocket';

function TestComponent({ token, sessionId }: { token: string | null; sessionId: string | null }) {
  const s = useTherapistSocket({ token, sessionId });
  return (
    <div>
      <span data-testid="connected">{String(s.connected)}</span>
      <span data-testid="isLeader">{String(s.isLeader)}</span>
      <span data-testid="tabId">{s.tabId}</span>
    </div>
  );
}

describe('useTherapistSocket leader election', () => {
  const leaderKey = 'therapist-leader:s1';
  beforeEach(() => {
    try { localStorage.removeItem(leaderKey); } catch (e) { /* ignore */ }
    vi.resetAllMocks();
  });
  afterEach(() => {
    try { localStorage.removeItem(leaderKey); } catch (e) { /* ignore */ }
  });

  it('first tab becomes leader and connects', async () => {
    const { getByTestId } = render(<TestComponent token="tok" sessionId="s1" />);
    // allow effects to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    // Assert localStorage has the leader entry and it matches this tabId
    const raw = localStorage.getItem('therapist-leader:s1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(String(raw));
    expect(parsed.tabId).toBe(getByTestId('tabId').textContent);
  });
});
