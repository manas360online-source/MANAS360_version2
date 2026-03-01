import React from 'react';

interface SessionQuickActionsProps {
  sessionId: string;
  templateId?: string;
}

const SessionQuickActions: React.FC<SessionQuickActionsProps> = ({
  sessionId,
  templateId,
}) => {
  const handleOpenTemplate = () => {
    if (!templateId) return;
    window.location.href = `/templates/${encodeURIComponent(templateId)}`;
  };

  return (
    <div className="flex items-center gap-2" aria-label={`Quick actions for session ${sessionId}`}>
      <button
        type="button"
        onClick={handleOpenTemplate}
        disabled={!templateId}
        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Template
      </button>
    </div>
  );
};

export default SessionQuickActions;
