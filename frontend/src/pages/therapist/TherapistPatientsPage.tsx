import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { therapistApi, type TherapistPatientItem } from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistEmptyState,
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';

export default function TherapistPatientsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TherapistPatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getPatients({
        search: search.trim() || undefined,
        status: status || undefined,
      });
      setRows(res.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load patients';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, [status]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPatients();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <TherapistPageShell title="My Patients" subtitle="Monitor patient activity, status, and continuity of care.">
      <TherapistCard className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-surface-card px-3 py-2">
            <Search className="h-4 w-4 text-ink-500" />
            <input
              placeholder="Search patients..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full border-0 bg-transparent p-0 text-sm text-ink-800 placeholder:text-ink-500 focus:ring-0"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-ink-100 bg-surface-card px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="New">New</option>
            <option value="Needs Follow-up">Needs Follow-up</option>
          </select>
        </div>
      </TherapistCard>

      {loading ? (
        <TherapistLoadingState title="Loading patients" description="Fetching your assigned patient list." />
      ) : error ? (
        <TherapistErrorState title="Could not load patients" description={error} onRetry={() => void loadPatients()} />
      ) : rows.length === 0 ? (
        <TherapistEmptyState title="No patients found" description="Try changing search or status filters." />
      ) : (
        <TherapistCard className="overflow-hidden">
          <TherapistTable
            columns={[
              { key: 'name', header: 'Patient', render: (row) => <span className="font-semibold">{row.name}</span> },
              { key: 'concern', header: 'Primary Concern', render: (row) => row.concern },
              { key: 'sessions', header: 'Sessions', render: (row) => row.sessions },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <TherapistBadge
                    label={row.status}
                    variant={row.status === 'Active' ? 'success' : row.status === 'New' ? 'sage' : 'warning'}
                  />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (row) => (
                  <div className="flex justify-end">
                    <TherapistButton
                      variant="secondary"
                      className="min-h-[34px] px-3 py-1 text-xs"
                      onClick={() => navigate(`/therapist/dashboard?patientId=${encodeURIComponent(row.id)}`)}
                    >
                      View Mood Insights
                    </TherapistButton>
                  </div>
                ),
              },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
          />
        </TherapistCard>
      )}
    </TherapistPageShell>
  );
}
