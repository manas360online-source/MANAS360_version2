/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null, search: '' }),
  };
});

const useAuthMock = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
  getDefaultRouteForRole: () => '/dashboard',
}));

import LoginWidget from './LoginWidget';

const buildAuthState = () => ({
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
});

describe('LoginWidget', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useAuthMock.mockReturnValue(buildAuthState());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders login form by default without role dropdown', () => {
    render(<LoginWidget />);

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.queryByLabelText('Role')).toBeNull();
  });

  it('renders register fields (including role dropdown) when initialMode is register', () => {
    render(<LoginWidget initialMode="register" />);

    expect(screen.getByLabelText('Full Name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm Password')).toBeTruthy();
    expect(screen.getByLabelText('Role')).toBeTruthy();
  });

  it('toggles from login to register in the same component', () => {
    render(<LoginWidget initialMode="login" />);

    expect(screen.queryByLabelText('Role')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByLabelText('Role')).toBeTruthy();
  });
});

