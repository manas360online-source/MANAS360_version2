import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, HelpCircle, LifeBuoy, MessageSquare } from 'lucide-react';
import { patientApi } from '../../api/patient';

type SupportSectionId = 'contact' | 'faq' | 'emergency' | 'tickets';

const sectionMeta = [
  { id: 'contact' as const, label: 'Contact Support', icon: MessageSquare },
  { id: 'faq' as const, label: 'FAQs', icon: HelpCircle },
  { id: 'emergency' as const, label: 'Emergency Contacts', icon: AlertTriangle },
  { id: 'tickets' as const, label: 'My Tickets', icon: LifeBuoy },
];

export default function SupportPage() {
  const [activeSection, setActiveSection] = useState<SupportSectionId>('contact');
  const [mobileOpen, setMobileOpen] = useState<SupportSectionId | null>('contact');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');

  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<Array<{ label: string; value: string }>>([]);
  const [tickets, setTickets] = useState<Array<{ id: string; title: string; message: string; status: string; createdAt: string }>>([]);

  const loadSupportCenter = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getSupportCenter();
      const data = (response as any)?.data ?? response ?? {};
      setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
      setEmergencyContacts(Array.isArray(data.emergencyContacts) ? data.emergencyContacts : []);
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load support data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSupportCenter();
  }, []);

  const submitTicket = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await patientApi.createSupportTicket({ subject, message, category, priority });
      setSuccess('Support ticket created successfully.');
      setSubject('');
      setMessage('');
      await loadSupportCenter();
      setActiveSection('tickets');
      setMobileOpen('tickets');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create support ticket.');
    } finally {
      setSaving(false);
    }
  };

  const renderContact = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm text-charcoal/80">
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2" />
        </label>
        <label className="text-sm text-charcoal/80">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2">
            <option value="general">General</option>
            <option value="account">Account</option>
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
          </select>
        </label>
        <label className="text-sm text-charcoal/80 md:col-span-2">
          Message
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2" />
        </label>
        <label className="text-sm text-charcoal/80 md:col-span-2">
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void submitTicket()}
        disabled={saving || !subject.trim() || !message.trim()}
        className="rounded-lg bg-calm-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {saving ? 'Submitting...' : 'Submit Ticket'}
      </button>
    </div>
  );

  const renderFaq = () => (
    <div className="space-y-3">
      {faqs.length === 0 ? (
        <div className="rounded-xl border border-calm-sage/20 bg-white/80 p-3 text-sm text-charcoal/70">No FAQs available right now.</div>
      ) : (
        faqs.map((faq) => (
          <div key={faq.id} className="rounded-xl border border-calm-sage/20 bg-white/80 p-4">
            <p className="text-sm font-semibold text-charcoal">{faq.question}</p>
            <p className="mt-1 text-sm text-charcoal/70">{faq.answer}</p>
          </div>
        ))
      )}
    </div>
  );

  const renderEmergency = () => (
    <div className="space-y-3">
      {emergencyContacts.length === 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">No emergency contacts found.</div>
      ) : (
        emergencyContacts.map((item, index) => (
          <div key={`emergency-${item.label}-${index}`} className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">{item.label}</p>
            <p className="mt-1 text-sm text-red-700">{item.value}</p>
          </div>
        ))
      )}
    </div>
  );

  const renderTickets = () => (
    <div className="space-y-3">
      {tickets.length === 0 ? (
        <div className="rounded-xl border border-calm-sage/20 bg-white/80 p-3 text-sm text-charcoal/70">No support tickets raised yet.</div>
      ) : (
        tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-xl border border-calm-sage/20 bg-white/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">{ticket.title}</p>
                <p className="mt-1 text-sm text-charcoal/70">{ticket.message}</p>
              </div>
              <span className="rounded-full bg-calm-sage/15 px-2 py-0.5 text-[11px] font-semibold text-calm-sage">{String(ticket.status || 'OPEN').toUpperCase()}</span>
            </div>
            <p className="mt-2 text-xs text-charcoal/55">Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}</p>
          </div>
        ))
      )}
    </div>
  );

  const renderSection = (section: SupportSectionId) => {
    switch (section) {
      case 'contact':
        return renderContact();
      case 'faq':
        return renderFaq();
      case 'emergency':
        return renderEmergency();
      case 'tickets':
        return renderTickets();
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-6">Loading support center...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-20 lg:pb-6">
      <section className="rounded-2xl border border-calm-sage/20 bg-white/95 px-5 py-4 shadow-soft-sm">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-calm-sage" />
          <h1 className="font-serif text-xl font-semibold text-charcoal">Support & Help</h1>
        </div>
        <p className="mt-1 text-sm text-charcoal/65">Get help, browse FAQs, raise tickets, and access emergency contacts.</p>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[64px_1fr] xl:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <div className="rounded-2xl border border-calm-sage/20 bg-white/95 p-2 shadow-soft-sm xl:p-3">
            <nav className="space-y-1" aria-label="Support sections">
              {sectionMeta.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition xl:px-3 ${
                      active ? 'bg-[#E8EFE6] text-charcoal' : 'text-charcoal/70 hover:bg-calm-sage/10'
                    }`}
                    title={section.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:inline">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="hidden md:block rounded-2xl border border-calm-sage/20 bg-white/95 p-4 shadow-soft-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-charcoal">{sectionMeta.find((section) => section.id === activeSection)?.label}</h2>
          </div>
          {renderSection(activeSection)}
        </section>

        <section className="space-y-2 md:hidden">
          {sectionMeta.map((section) => {
            const Icon = section.icon;
            const open = mobileOpen === section.id;
            return (
              <div key={section.id} className="overflow-hidden rounded-2xl border border-calm-sage/20 bg-white/95 shadow-soft-sm">
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => (prev === section.id ? null : section.id))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal">
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </span>
                  {open ? <ChevronUp className="h-4 w-4 text-charcoal/60" /> : <ChevronDown className="h-4 w-4 text-charcoal/60" />}
                </button>
                {open && <div className="space-y-3 border-t border-calm-sage/15 px-4 py-3">{renderSection(section.id)}</div>}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
