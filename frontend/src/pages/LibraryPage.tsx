import { useEffect, useState } from 'react';
import { listLibrary, cloneLibraryTemplate } from '../api/session.api';

function TemplateCard({ t, onClone }: any) {
  return (
    <div className="responsive-card">
      <div className="font-semibold">{t.title}</div>
      <div className="text-sm text-gray-600">{t.description}</div>
      <div className="flex gap-2 mt-2">
        {t.tags.map((tag: string) => <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded">{tag}</span>)}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="responsive-action-btn border rounded-xl" onClick={() => onClone(t.id)}>Clone</button>
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
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <input className="border rounded px-2 py-1 flex-1" value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates" />
        <button className="responsive-action-btn bg-blue-600 text-white rounded-xl" onClick={doSearch}>Search</button>
      </div>

      <div className="responsive-grid-3">
        {items.map(t => <TemplateCard key={t.id} t={t} onClone={onClone} />)}
      </div>
      </div>
    </div>
  );
}
