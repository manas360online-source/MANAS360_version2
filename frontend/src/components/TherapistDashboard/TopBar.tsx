import React, { useState, useRef, useEffect } from 'react';
import { useDashboardDispatch } from '../../context/dashboardContext';

const TopBar: React.FC = () => {
  return (
    <header className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 rounded hover:bg-gray-100">☰</button>
        <div className="text-lg font-semibold">Sessions</div>
        <div className="text-sm text-gray-500">All active and scheduled sessions</div>
      </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">Search</div>
            <SearchInput />
            <div className="w-8 h-8 rounded-full bg-gray-200" />
          </div>
    </header>
  );
};

export default TopBar;

    const SearchInput: React.FC = () => {
      const dispatch = useDashboardDispatch();
      const [value, setValue] = useState('');
      const timer = useRef<number | null>(null);

      useEffect(() => {
        // debounce updates to filters
        if (timer.current) window.clearTimeout(timer.current);
        // small delay to avoid excessive dispatches
        timer.current = window.setTimeout(() => {
          dispatch({ type: 'setFilters', payload: { q: value || undefined, patient: value || undefined } });
        }, 350);
        return () => {
          if (timer.current) window.clearTimeout(timer.current);
        };
      }, [value, dispatch]);

      return (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
          placeholder="Search patients, sessions..."
          aria-label="Search sessions"
        />
      );
    };
