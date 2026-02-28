import React from 'react';

const QuickActions: React.FC = () => {
  return (
    <div className="fixed bottom-6 right-6 md:static md:mr-6">
      <div className="bg-white shadow-lg rounded-lg p-3 w-44">
        <div className="text-sm font-semibold mb-2">Quick Actions</div>
        <div className="flex flex-col gap-2">
          <button className="px-3 py-2 bg-indigo-600 text-white rounded">Start Session</button>
          <button className="px-3 py-2 border rounded">Send Message</button>
          <button className="px-3 py-2 border rounded">Export CSV</button>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
