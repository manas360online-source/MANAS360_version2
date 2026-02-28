import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import FiltersPanel from './FiltersPanel';
import AnalyticsSummary from './AnalyticsSummary';
import SessionList from './SessionList';
import QuickActions from './QuickActions';
import SessionDetailsDrawer from './SessionDetailsDrawer';
import { DashboardProvider } from '../../context/dashboardContext';

const TherapistDashboardPage: React.FC = () => {
  return (
    <DashboardProvider>
      <div className="min-h-screen flex bg-gray-50 text-gray-800">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex flex-1 gap-6 p-6">
            <aside className="w-80 hidden lg:block">
              <FiltersPanel />
              <div className="mt-6">
                <AnalyticsSummary />
              </div>
            </aside>

            <main className="flex-1 bg-white rounded-lg shadow-sm p-4 overflow-hidden relative">
              <SessionList />
              <SessionDetailsDrawer />
            </main>
          </div>
        </div>
        <QuickActions />
      </div>
    </DashboardProvider>
  );
};

export default TherapistDashboardPage;
