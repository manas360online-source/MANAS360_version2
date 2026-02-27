import { useEffect, useState } from 'react';
import { listLibrary, cloneLibraryTemplate } from '../api/session.api';

function TemplateCard({ t, onClone }: any) {
  return (
    <div className="border rounded p-3">
      <div className="font-semibold">{t.title}</div>
      <div className="text-sm text-gray-600">{t.description}</div>
      <div className="flex gap-2 mt-2">
        {t.tags.map((tag: string) => <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded">{tag}</span>)}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-2 py-1 border rounded" onClick={() => onClone(t.id)}>Clone</button>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    listLibrary({ q: '' }).then((r) => setItems(r.data || r));
  }, []);

  const doSearch = async () => {
    const r = await listLibrary({ q });
    setItems(r.data || r);
  };

  const onClone = async (id: string) => {
    const res = await cloneLibraryTemplate(id, { makePrivate: false });
    if (res.data) {
      // navigate to builder or show toast — for now refetch list
      const r = await listLibrary({ q: '' });
      setItems(r.data || r);
      alert('Template cloned: ' + res.data.id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <input className="border rounded px-2 py-1 flex-1" value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates" />
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={doSearch}>Search</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {items.map(t => <TemplateCard key={t.id} t={t} onClone={onClone} />)}
      </div>
    </div>
  );
}
