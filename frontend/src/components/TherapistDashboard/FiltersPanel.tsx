import React from 'react';
import { useDashboardDispatch, useDashboardState } from '../../context/dashboardContext';

const FiltersPanel: React.FC = () => {
  const state = useDashboardState();
  const dispatch = useDashboardDispatch();

  return (
    <div className="bg-white p-4 rounded-md border">
      <h3 className="text-sm font-semibold mb-3">Filters</h3>
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-gray-600">Status</label>
          <select className="w-full border rounded px-2 py-1" value={state.filters.status || ''} onChange={(e) => dispatch({ type: 'setFilters', payload: { status: e.target.value || undefined } })}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600">Therapist</label>
          <input className="w-full border rounded px-2 py-1" placeholder="Therapist name" onBlur={(e) => dispatch({ type: 'setFilters', payload: { therapistId: e.target.value || undefined } })} />
        </div>

        <div>
          <label className="block text-xs text-gray-600">Search</label>
          <input className="w-full border rounded px-2 py-1" placeholder="Patient or session" onBlur={(e) => dispatch({ type: 'setFilters', payload: { q: e.target.value || undefined } })} />
        </div>
      </div>
    </div>
  );
};

export default FiltersPanel;
