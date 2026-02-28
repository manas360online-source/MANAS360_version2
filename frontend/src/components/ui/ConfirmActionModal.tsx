import React from 'react';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
};

const ConfirmActionModal: React.FC<Props> = ({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, busy }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-lg w-full max-w-lg p-4">
        <div className="text-lg font-semibold mb-2">{title}</div>
        {description ? <div className="text-sm text-gray-600 mb-4">{description}</div> : null}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="px-3 py-1 border rounded text-sm">{cancelLabel}</button>
          <button onClick={() => void onConfirm()} disabled={busy} className="px-3 py-1 bg-red-600 text-white rounded text-sm">{busy ? 'Working...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
