import { useEffect, useState } from 'react';
import { listTemplateVersions, duplicateTemplateVersion } from '../api/session.api';

export default function VersionHistory({ templateId }: { templateId: string }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [diff] = useState<any[] | null>(null);

  useEffect(() => {
    if (!templateId) return;
    listTemplateVersions(templateId).then((r) => setVersions(r.data || r));
  }, [templateId]);

  const onDuplicate = async (vId: string) => {
    await duplicateTemplateVersion(templateId, vId, false);
    const r = await listTemplateVersions(templateId);
    setVersions(r.data || r);
  };

  // compare helper removed from current UI; keep diff state for future use

  return (
    <div className="border rounded p-3">
      <div className="font-semibold mb-2">Version History</div>
      <ul className="space-y-2">
        {versions.map((v: any) => (
          <li key={v.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm">v{v.version} — {v.title || ''}</div>
              <div className="text-xs text-gray-500">{v.createdBy} · {new Date(v.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded text-sm" onClick={() => onDuplicate(v.id)}>Duplicate</button>
            </div>
          </li>
        ))}
      </ul>

      {diff && (
        <div className="mt-4">
          <div className="font-semibold">Diff</div>
          <pre className="text-xs max-h-64 overflow-auto bg-gray-50 p-2">{JSON.stringify(diff, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
