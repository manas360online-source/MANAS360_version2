import React, { createContext, useContext, useReducer } from 'react';

type Filters = {
  status?: string;
  therapistId?: string;
  q?: string;
  patient?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  sessionType?: string | null;
  completion?: 'complete' | 'incomplete' | 'all' | null;
};

type State = {
  filters: Filters;
  ui: { drawerOpen: boolean; selectedSessionId?: string };
};

const initialState: State = { filters: {}, ui: { drawerOpen: false } };

type Action =
  | { type: 'setFilters'; payload: Partial<State['filters']> }
  | { type: 'openDrawer'; payload?: { sessionId?: string } }
  | { type: 'closeDrawer' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setFilters':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'openDrawer':
      return { ...state, ui: { drawerOpen: true, selectedSessionId: action.payload?.sessionId } };
    case 'closeDrawer':
      return { ...state, ui: { ...state.ui, drawerOpen: false, selectedSessionId: undefined } };
    default:
      return state;
  }
}

const DashboardStateContext = createContext<State | undefined>(undefined);
const DashboardDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined);

export const DashboardProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <DashboardStateContext.Provider value={state}>
      <DashboardDispatchContext.Provider value={dispatch}>{children}</DashboardDispatchContext.Provider>
    </DashboardStateContext.Provider>
  );
};

export function useDashboardState() {
  const ctx = useContext(DashboardStateContext);
  if (!ctx) throw new Error('useDashboardState must be used within DashboardProvider');
  return ctx;
}

export function useDashboardDispatch() {
  const ctx = useContext(DashboardDispatchContext);
  if (!ctx) throw new Error('useDashboardDispatch must be used within DashboardProvider');
  return ctx;
}
