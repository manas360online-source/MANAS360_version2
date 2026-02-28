import React from 'react';

type Props = {
  session: any;
  onOpen: (id: string) => void;
};

const SessionRow: React.FC<Props> = ({ session, onOpen }) => {
  return (
    <div tabIndex={0} role="button" aria-pressed="false" className="p-3 border-b flex items-center gap-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200" onKeyDown={(e) => { if (e.key === 'Enter') onOpen(session.id); }}>
      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="font-medium">{session.patientName}</div>
          <div className="text-xs text-gray-500">• {session.status}</div>
        </div>
        <div className="text-sm text-gray-500">Last: {session.lastMessageTime}</div>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 bg-indigo-600 text-white rounded text-sm" onClick={() => onOpen(session.id)}>Join</button>
        <button className="px-3 py-1 border rounded text-sm" onClick={() => onOpen(session.id)}>Details</button>
      </div>
    </div>
  );
};

export default SessionRow;
