import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <nav className="w-60 bg-white border-r h-screen sticky top-0 p-4 hidden md:block">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-indigo-700">MANAS360</div>
        <div className="text-sm text-gray-500 mt-1">Therapist Console</div>
      </div>

      <ul className="space-y-2">
        <li>
          <a className="flex items-center gap-3 p-2 rounded hover:bg-gray-50" href="#">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            <span>Sessions</span>
          </a>
        </li>
        <li>
          <a className="flex items-center gap-3 p-2 rounded hover:bg-gray-50" href="#">
            <span>Patients</span>
          </a>
        </li>
        <li>
          <Link to="/therapist/analytics" className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
            <span>Analytics</span>
          </Link>
        </li>
        <li>
          <a className="flex items-center gap-3 p-2 rounded hover:bg-gray-50" href="#">
            <span>Settings</span>
          </a>
        </li>
      </ul>

      <div className="mt-8 text-xs text-gray-500">Account</div>
      <div className="mt-2">
        <div className="flex items-center gap-3 p-2 rounded">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div>
            <div className="text-sm font-medium">Dr. Sharma</div>
            <div className="text-xs text-gray-500">Therapist</div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
