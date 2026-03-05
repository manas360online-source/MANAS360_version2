import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Eye,
  Gauge,
  Globe,
  Settings2,
  Shield,
  SlidersHorizontal,
  User,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';
import { http } from '../../lib/http';

type SectionId =
  | 'profile'
  | 'notifications'
  | 'privacy'
  | 'accessibility'
  | 'preferences'
  | 'therapy'
  | 'billing'
  | 'security';

type SettingsState = {
  profile: {
    name: string;
    email: string;
    phone: string;
    gender: string;
    location: string;
    bio: string;
    showNameToProviders: boolean;
  };
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    appointmentReminder: boolean;
    labResults: boolean;
    prescriptionAlerts: boolean;
    therapistMessages: boolean;
    billing: boolean;
    wellnessUpdates: boolean;
    crisisAlerts: boolean;
    communityActivity: boolean;
  };
  privacy: {
    visibility: 'public' | 'private' | 'therapist_only';
    shareWithTherapist: boolean;
    shareWithPsychiatrist: boolean;
    shareWithCoach: boolean;
    allowMoodTracking: boolean;
    allowAiSuggestions: boolean;
    allowBehavioralInsights: boolean;
  };
  accessibility: {
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    language: 'English' | 'Hindi' | 'Kannada';
    highContrast: boolean;
  };
  preferences: {
    timezone: string;
    reminderFrequency: 'daily' | 'weekly' | 'custom';
    moodReminder: boolean;
    therapyExerciseReminder: boolean;
    medicationReminder: boolean;
    dailyCheckInReminder: boolean;
  };
  therapy: {
    preferredTherapistGender: 'any' | 'female' | 'male';
    preferredTherapyType: 'CBT' | 'Mindfulness' | 'Coaching';
    sessionMode: 'Video' | 'Chat' | 'Audio';
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelationship: string;
  };
  security: {
    twoFactorEnabled: boolean;
  };
};

const STORAGE_KEY = 'manas360-patient-settings-v1';

const defaultState: SettingsState = {
  profile: {
    name: '',
    email: '',
    phone: '',
    gender: '',
    location: '',
    bio: '',
    showNameToProviders: true,
  },
  notifications: {
    push: true,
    email: true,
    sms: false,
    appointmentReminder: true,
    labResults: true,
    prescriptionAlerts: true,
    therapistMessages: true,
    billing: true,
    wellnessUpdates: true,
    crisisAlerts: true,
    communityActivity: false,
  },
  privacy: {
    visibility: 'therapist_only',
    shareWithTherapist: true,
    shareWithPsychiatrist: false,
    shareWithCoach: false,
    allowMoodTracking: true,
    allowAiSuggestions: true,
    allowBehavioralInsights: true,
  },
  accessibility: {
    theme: 'light',
    fontSize: 'medium',
    language: 'English',
    highContrast: false,
  },
  preferences: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    reminderFrequency: 'daily',
    moodReminder: true,
    therapyExerciseReminder: true,
    medicationReminder: false,
    dailyCheckInReminder: true,
  },
  therapy: {
    preferredTherapistGender: 'any',
    preferredTherapyType: 'CBT',
    sessionMode: 'Video',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
  },
  security: {
    twoFactorEnabled: false,
  },
};

const sectionMeta = [
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'privacy' as const, label: 'Privacy', icon: Eye },
  { id: 'accessibility' as const, label: 'Accessibility', icon: Gauge },
  { id: 'preferences' as const, label: 'Preferences', icon: SlidersHorizontal },
  { id: 'therapy' as const, label: 'Therapy Preferences', icon: Globe },
  { id: 'billing' as const, label: 'Billing & Subscription', icon: Wallet },
  { id: 'security' as const, label: 'Security', icon: Shield },
];

const parseStored = (): Partial<SettingsState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [state, setState] = useState<SettingsState>(defaultState);
  const [savedState, setSavedState] = useState<SettingsState>(defaultState);
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [mobileOpen, setMobileOpen] = useState<SectionId | null>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<{
    subscription: any | null;
    paymentMethod: any | null;
    invoices: any[];
  }>({ subscription: null, paymentMethod: null, invoices: [] });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Array<{ id: string; device?: string; ipAddress?: string; createdAt?: string; lastActiveAt?: string; isCurrent?: boolean }>>([]);

  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);
      setError(null);
      try {
        const fromStorage = parseStored();
        let merged = { ...defaultState, ...fromStorage } as SettingsState;
        const [me, settingsRes] = await Promise.all([
          http.get('/v1/users/me'),
          patientApi.getSettings().catch(() => null),
        ]);
        const profile = me.data?.data ?? me.data;
        const serverSettings = (settingsRes as any)?.data?.settings ?? (settingsRes as any)?.settings ?? null;

        if (serverSettings && typeof serverSettings === 'object') {
          merged = {
            ...merged,
            ...serverSettings,
            profile: {
              ...merged.profile,
              ...(serverSettings.profile || {}),
            },
            notifications: {
              ...merged.notifications,
              ...(serverSettings.notifications || {}),
            },
            privacy: {
              ...merged.privacy,
              ...(serverSettings.privacy || {}),
            },
            accessibility: {
              ...merged.accessibility,
              ...(serverSettings.accessibility || {}),
            },
            preferences: {
              ...merged.preferences,
              ...(serverSettings.preferences || {}),
            },
            therapy: {
              ...merged.therapy,
              ...(serverSettings.therapy || {}),
            },
            security: {
              ...merged.security,
              ...(serverSettings.security || {}),
            },
          };
        }

        const normalizedName = String(profile?.name || `${profile?.firstName || ''} ${profile?.lastName || ''}` || '').trim();
        merged = {
          ...merged,
          profile: {
            ...merged.profile,
            name: normalizedName,
            email: String(profile?.email || ''),
            phone: String(profile?.phone || ''),
            showNameToProviders: typeof profile?.showNameToProviders === 'boolean' ? profile.showNameToProviders : true,
          },
        };
        setState(merged);
        setSavedState(merged);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    void hydrate();
  }, []);

  useEffect(() => {
    const sectionVisible = activeSection === 'billing' || mobileOpen === 'billing';
    if (!sectionVisible) return;

    const loadBillingData = async () => {
      setBillingLoading(true);
      setBillingError(null);
      try {
        const [subscriptionRes, paymentRes, invoicesRes] = await Promise.all([
          patientApi.getSubscription().catch(() => null),
          patientApi.getPaymentMethod().catch(() => null),
          patientApi.getInvoices().catch(() => null),
        ]);

        const subscription = (subscriptionRes as any)?.data ?? subscriptionRes ?? null;
        const paymentMethod = (paymentRes as any)?.data ?? paymentRes ?? null;
        const invoices = (invoicesRes as any)?.data ?? invoicesRes ?? [];

        setBillingData({
          subscription,
          paymentMethod,
          invoices: Array.isArray(invoices) ? invoices : [],
        });
      } catch (err: any) {
        setBillingError(err?.response?.data?.message || err?.message || 'Failed to load billing details.');
      } finally {
        setBillingLoading(false);
      }
    };

    void loadBillingData();
  }, [activeSection, mobileOpen]);

  const sectionDirty = (section: SectionId): boolean =>
    JSON.stringify(state[section as keyof SettingsState]) !== JSON.stringify(savedState[section as keyof SettingsState]);

  const anyDirty = useMemo(() => sectionMeta.some((section) => sectionDirty(section.id)), [state, savedState]);

  const persistLocal = (next: SettingsState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveSection = async (section: SectionId) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (section === 'profile') {
        const name = state.profile.name.trim();
        const phone = state.profile.phone.trim();
        const email = state.profile.email.trim();
        if (!email && !phone) {
          throw new Error('At least Email or Phone is required.');
        }
        const payload = {
          name,
          phone,
          showNameToProviders: state.profile.showNameToProviders,
        };
        const res = await http.patch('/v1/users/me', payload);
        const updated = res.data?.data ?? res.data;
        const updatedState: SettingsState = {
          ...state,
          profile: {
            ...state.profile,
            name: String(updated?.name || name),
            email: String(updated?.email || email),
            phone: String(updated?.phone || phone),
            showNameToProviders:
              typeof updated?.showNameToProviders === 'boolean'
                ? updated.showNameToProviders
                : state.profile.showNameToProviders,
          },
        };
        setState(updatedState);
        setSavedState(updatedState);
        persistLocal(updatedState);
        setSuccess('Profile settings saved successfully.');
      } else {
        const next = { ...state };
        await patientApi.updateSettings(next);
        setSavedState(next);
        persistLocal(next);
        setSuccess('Settings saved successfully.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const discardSection = (section: SectionId) => {
    setState((prev) => ({ ...prev, [section]: savedState[section as keyof SettingsState] }));
    setSuccess(null);
    setError(null);
  };

  const renderSwitch = (value: boolean, onToggle: () => void, label: string, subLabel?: string) => (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-calm-sage/20 bg-white/80 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-charcoal">{label}</p>
        {subLabel && <p className="mt-0.5 text-xs text-charcoal/60">{subLabel}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${value ? 'bg-calm-sage' : 'bg-calm-sage/35'}`}
        aria-pressed={value}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm text-charcoal/80">
          Name
          <input
            value={state.profile.name}
            onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, name: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80">
          Email
          <input value={state.profile.email} readOnly className="mt-1 w-full rounded-xl border border-calm-sage/20 bg-[#F5F3F0] px-3 py-2" />
        </label>
        <label className="text-sm text-charcoal/80">
          Phone
          <input
            value={state.profile.phone}
            onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, phone: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80">
          Gender
          <input
            value={state.profile.gender}
            onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, gender: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80 md:col-span-2">
          Location
          <input
            value={state.profile.location}
            onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, location: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80 md:col-span-2">
          Bio
          <textarea
            value={state.profile.bio}
            onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, bio: event.target.value } }))}
            rows={3}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
      </div>
      {renderSwitch(
        state.profile.showNameToProviders,
        () => setState((prev) => ({ ...prev, profile: { ...prev.profile, showNameToProviders: !prev.profile.showNameToProviders } })),
        'Show my name to providers',
        'Turn off to appear as Anonymous Patient in provider views.',
      )}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-3">
      {renderSwitch(state.notifications.push, () => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, push: !prev.notifications.push } })), 'Push Notifications')}
      {renderSwitch(state.notifications.email, () => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, email: !prev.notifications.email } })), 'Email Notifications')}
      {renderSwitch(state.notifications.sms, () => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, sms: !prev.notifications.sms } })), 'SMS Notifications')}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          ['appointmentReminder', 'Appointment reminders'],
          ['labResults', 'New lab results'],
          ['prescriptionAlerts', 'Prescription refill alerts'],
          ['therapistMessages', 'Therapist secure messages'],
          ['billing', 'Billing invoices'],
          ['wellnessUpdates', 'Wellness updates'],
          ['crisisAlerts', 'Crisis alerts'],
          ['communityActivity', 'Community activity'],
        ].map(([key, label]) => (
          <div key={`notif-${key}`}>
            {renderSwitch(
              Boolean((state.notifications as any)[key]),
              () => setState((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: !(prev.notifications as any)[key] } })),
              label,
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-calm-sage/20 bg-white/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60">Visibility</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ['public', 'Public'],
            ['private', 'Private'],
            ['therapist_only', 'Therapist only'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, visibility: value as any } }))}
              className={`rounded-lg border px-3 py-2 text-sm ${state.privacy.visibility === value ? 'border-calm-sage bg-[#E8EFE6] text-charcoal' : 'border-calm-sage/20 text-charcoal/70'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {renderSwitch(state.privacy.shareWithTherapist, () => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, shareWithTherapist: !prev.privacy.shareWithTherapist } })), 'Share with therapist')}
        {renderSwitch(state.privacy.shareWithPsychiatrist, () => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, shareWithPsychiatrist: !prev.privacy.shareWithPsychiatrist } })), 'Share with psychiatrist')}
        {renderSwitch(state.privacy.shareWithCoach, () => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, shareWithCoach: !prev.privacy.shareWithCoach } })), 'Share with coach')}
        {renderSwitch(state.privacy.allowMoodTracking, () => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, allowMoodTracking: !prev.privacy.allowMoodTracking } })), 'Allow mood tracking')}
        {renderSwitch(state.privacy.allowAiSuggestions, () => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, allowAiSuggestions: !prev.privacy.allowAiSuggestions } })), 'Allow AI suggestions')}
        {renderSwitch(state.privacy.allowBehavioralInsights, () => setState((prev) => ({ ...prev, privacy: { ...prev.privacy, allowBehavioralInsights: !prev.privacy.allowBehavioralInsights } })), 'Allow behavioral insights')}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal/80">Export Personal Data</button>
        <button type="button" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Delete Account</button>
      </div>
    </div>
  );

  const renderAccessibility = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm text-charcoal/80">
          Theme
          <select
            value={state.accessibility.theme}
            onChange={(event) => setState((prev) => ({ ...prev, accessibility: { ...prev.accessibility, theme: event.target.value as any } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="text-sm text-charcoal/80">
          Font Size
          <select
            value={state.accessibility.fontSize}
            onChange={(event) => setState((prev) => ({ ...prev, accessibility: { ...prev.accessibility, fontSize: event.target.value as any } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label className="text-sm text-charcoal/80">
          Language
          <select
            value={state.accessibility.language}
            onChange={(event) => setState((prev) => ({ ...prev, accessibility: { ...prev.accessibility, language: event.target.value as any } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Kannada">Kannada</option>
          </select>
        </label>
      </div>
      {renderSwitch(state.accessibility.highContrast, () => setState((prev) => ({ ...prev, accessibility: { ...prev.accessibility, highContrast: !prev.accessibility.highContrast } })), 'High contrast mode')}
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm text-charcoal/80">
          Timezone
          <input
            value={state.preferences.timezone}
            onChange={(event) => setState((prev) => ({ ...prev, preferences: { ...prev.preferences, timezone: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80">
          Reminder Frequency
          <select
            value={state.preferences.reminderFrequency}
            onChange={(event) => setState((prev) => ({ ...prev, preferences: { ...prev.preferences, reminderFrequency: event.target.value as any } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {renderSwitch(state.preferences.moodReminder, () => setState((prev) => ({ ...prev, preferences: { ...prev.preferences, moodReminder: !prev.preferences.moodReminder } })), 'Mood tracking reminder')}
        {renderSwitch(state.preferences.therapyExerciseReminder, () => setState((prev) => ({ ...prev, preferences: { ...prev.preferences, therapyExerciseReminder: !prev.preferences.therapyExerciseReminder } })), 'Therapy exercise reminder')}
        {renderSwitch(state.preferences.medicationReminder, () => setState((prev) => ({ ...prev, preferences: { ...prev.preferences, medicationReminder: !prev.preferences.medicationReminder } })), 'Medication reminder')}
        {renderSwitch(state.preferences.dailyCheckInReminder, () => setState((prev) => ({ ...prev, preferences: { ...prev.preferences, dailyCheckInReminder: !prev.preferences.dailyCheckInReminder } })), 'Daily check-in reminder')}
      </div>
    </div>
  );

  const renderTherapy = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm text-charcoal/80">
          Preferred Therapist Gender
          <select
            value={state.therapy.preferredTherapistGender}
            onChange={(event) => setState((prev) => ({ ...prev, therapy: { ...prev.therapy, preferredTherapistGender: event.target.value as any } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          >
            <option value="any">Any</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <label className="text-sm text-charcoal/80">
          Preferred Therapy Type
          <select
            value={state.therapy.preferredTherapyType}
            onChange={(event) => setState((prev) => ({ ...prev, therapy: { ...prev.therapy, preferredTherapyType: event.target.value as any } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          >
            <option value="CBT">CBT</option>
            <option value="Mindfulness">Mindfulness</option>
            <option value="Coaching">Coaching</option>
          </select>
        </label>
        <label className="text-sm text-charcoal/80">
          Session Mode
          <select
            value={state.therapy.sessionMode}
            onChange={(event) => setState((prev) => ({ ...prev, therapy: { ...prev.therapy, sessionMode: event.target.value as any } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          >
            <option value="Video">Video</option>
            <option value="Chat">Chat</option>
            <option value="Audio">Audio</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm text-charcoal/80">
          Emergency Contact Name
          <input
            value={state.therapy.emergencyName}
            onChange={(event) => setState((prev) => ({ ...prev, therapy: { ...prev.therapy, emergencyName: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80">
          Emergency Contact Phone
          <input
            value={state.therapy.emergencyPhone}
            onChange={(event) => setState((prev) => ({ ...prev, therapy: { ...prev.therapy, emergencyPhone: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80">
          Relationship
          <input
            value={state.therapy.emergencyRelationship}
            onChange={(event) => setState((prev) => ({ ...prev, therapy: { ...prev.therapy, emergencyRelationship: event.target.value } }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-4">
      {billingError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{billingError}</div>}
      {billingLoading ? (
        <div className="rounded-xl border border-calm-sage/20 bg-white/80 p-4 text-sm text-charcoal/70">Loading billing details...</div>
      ) : (
        <>
          <div className="rounded-xl border border-calm-sage/20 bg-white/80 p-4">
            <p className="text-sm font-semibold text-charcoal">Current Plan</p>
            <p className="mt-1 text-sm text-charcoal/75">
              {(billingData.subscription?.planName || billingData.subscription?.planType || 'No active plan')} •{' '}
              {String(billingData.subscription?.status || 'unknown').toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-charcoal/60">
              Renewal: {billingData.subscription?.renewalDate ? new Date(billingData.subscription.renewalDate).toLocaleDateString() : 'N/A'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await patientApi.upgradeSubscription();
                  setSuccess('Subscription upgraded successfully.');
                  setActiveSection('billing');
                }}
                className="rounded-lg bg-calm-sage px-3 py-2 text-sm font-semibold text-white"
              >
                Upgrade Plan
              </button>
              <button
                type="button"
                onClick={async () => {
                  await patientApi.downgradeSubscription();
                  setSuccess('Subscription downgraded successfully.');
                  setActiveSection('billing');
                }}
                className="rounded-lg border border-calm-sage/25 bg-white px-3 py-2 text-sm text-charcoal/80"
              >
                Downgrade Plan
              </button>
              <button
                type="button"
                onClick={async () => {
                  await patientApi.cancelSubscription();
                  setSuccess('Subscription cancelled successfully.');
                  setActiveSection('billing');
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                Cancel Subscription
              </button>
              <button
                type="button"
                onClick={async () => {
                  await patientApi.reactivateSubscription();
                  setSuccess('Subscription reactivated successfully.');
                  setActiveSection('billing');
                }}
                className="rounded-lg border border-calm-sage/25 bg-white px-3 py-2 text-sm text-charcoal/80"
              >
                Reactivate
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-calm-sage/20 bg-white/80 p-4">
            <p className="text-sm font-semibold text-charcoal">Payment Method</p>
            <p className="mt-1 text-sm text-charcoal/75">
              {billingData.paymentMethod
                ? `${billingData.paymentMethod.cardBrand || 'Card'} •••• ${billingData.paymentMethod.cardLast4 || '----'}`
                : 'No payment method added'}
            </p>
          </div>

          <div className="rounded-xl border border-calm-sage/20 bg-white/80 p-4">
            <p className="text-sm font-semibold text-charcoal">Billing History</p>
            {billingData.invoices.length === 0 ? (
              <p className="mt-2 text-sm text-charcoal/65">No invoices found.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {billingData.invoices.slice(0, 10).map((invoice: any, index: number) => (
                  <div key={`invoice-${invoice.id || index}`} className="flex items-center justify-between rounded-lg border border-calm-sage/15 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-charcoal">₹{Number(invoice.amount || 0)}</p>
                      <p className="text-xs text-charcoal/60">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'Date N/A'}</p>
                    </div>
                    <span className="rounded-full bg-calm-sage/15 px-2 py-0.5 text-[11px] font-semibold text-calm-sage">
                      {String(invoice.status || 'unknown').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-3">
      {renderSwitch(state.security.twoFactorEnabled, () => setState((prev) => ({ ...prev, security: { ...prev.security, twoFactorEnabled: !prev.security.twoFactorEnabled } })), 'Two-factor authentication')}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPasswordForm((prev) => ({ ...prev }))}
          className="rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal/80"
        >
          Change Password
        </button>
        <button
          type="button"
          onClick={async () => {
            setSecurityLoading(true);
            setError(null);
            try {
              const res = await patientApi.getActiveSessions();
              const sessions = (res as any)?.data ?? res ?? [];
              setActiveSessions(Array.isArray(sessions) ? sessions : []);
              setSuccess('Login history loaded successfully.');
            } catch (err: any) {
              setError(err?.response?.data?.message || 'Failed to load login history.');
            } finally {
              setSecurityLoading(false);
            }
          }}
          className="rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal/80"
        >
          Login History
        </button>
        <button
          type="button"
          onClick={async () => {
            setSecurityLoading(true);
            setError(null);
            try {
              const res = await patientApi.getActiveSessions();
              const sessions = (res as any)?.data ?? res ?? [];
              setActiveSessions(Array.isArray(sessions) ? sessions : []);
              setSuccess('Active sessions loaded successfully.');
            } catch (err: any) {
              setError(err?.response?.data?.message || 'Failed to load active sessions.');
            } finally {
              setSecurityLoading(false);
            }
          }}
          className="rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal/80"
        >
          Active Sessions
        </button>
        <button
          type="button"
          onClick={async () => {
            setSecurityLoading(true);
            setError(null);
            try {
              await patientApi.revokeAllSessions();
              setSuccess('All devices logged out successfully.');
              await logout();
            } catch (err: any) {
              setError(err?.response?.data?.message || 'Failed to logout all devices.');
            } finally {
              setSecurityLoading(false);
            }
          }}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          Logout All Devices
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm text-charcoal/80">
          Current Password
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80">
          New Password
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-charcoal/80">
          Confirm Password
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-calm-sage/25 bg-white px-3 py-2"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={securityLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
        onClick={async () => {
          setSecurityLoading(true);
          setError(null);
          try {
            await patientApi.changePassword(passwordForm);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setSuccess('Password changed successfully.');
          } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to change password.');
          } finally {
            setSecurityLoading(false);
          }
        }}
        className="rounded-lg bg-calm-sage px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {securityLoading ? 'Please wait...' : 'Update Password'}
      </button>

      {activeSessions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-calm-sage/20 bg-white/80 p-3">
          <p className="text-sm font-semibold text-charcoal">Active Sessions</p>
          {activeSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-calm-sage/15 bg-white px-3 py-2">
              <div>
                <p className="text-sm font-medium text-charcoal">{session.device || 'Unknown device'} {session.isCurrent ? '(Current)' : ''}</p>
                <p className="text-xs text-charcoal/60">{session.ipAddress || 'IP unavailable'} • Last active {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : 'N/A'}</p>
              </div>
              {!session.isCurrent && (
                <button
                  type="button"
                  onClick={async () => {
                    setSecurityLoading(true);
                    setError(null);
                    try {
                      await patientApi.revokeSession(session.id);
                      setActiveSessions((prev) => prev.filter((item) => item.id !== session.id));
                      setSuccess('Session revoked successfully.');
                    } catch (err: any) {
                      setError(err?.response?.data?.message || 'Failed to revoke session.');
                    } finally {
                      setSecurityLoading(false);
                    }
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                >
                  Logout device
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSection = (section: SectionId) => {
    switch (section) {
      case 'profile':
        return renderProfile();
      case 'notifications':
        return renderNotifications();
      case 'privacy':
        return renderPrivacy();
      case 'accessibility':
        return renderAccessibility();
      case 'preferences':
        return renderPreferences();
      case 'therapy':
        return renderTherapy();
      case 'billing':
        return renderBilling();
      case 'security':
        return renderSecurity();
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white/80 p-6">Loading settings...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-20 lg:pb-6">
      <section className="rounded-2xl border border-calm-sage/20 bg-white/95 px-5 py-4 shadow-soft-sm">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-calm-sage" />
          <h1 className="font-serif text-xl font-semibold text-charcoal">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-charcoal/65">Manage your profile, preferences, privacy, and security in one place.</p>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      {anyDirty && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have unsaved changes in one or more settings sections.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[64px_1fr] xl:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <div className="rounded-2xl border border-calm-sage/20 bg-white/95 p-2 shadow-soft-sm xl:p-3">
            <nav className="space-y-1" aria-label="Settings sections">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => discardSection(activeSection)}
                disabled={!sectionDirty(activeSection) || saving}
                className="rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal/80 disabled:opacity-40"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void saveSection(activeSection)}
                disabled={!sectionDirty(activeSection) || saving}
                className="rounded-lg bg-calm-sage px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
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
                {open && (
                  <div className="space-y-3 border-t border-calm-sage/15 px-4 py-3">
                    {renderSection(section.id)}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => discardSection(section.id)}
                        disabled={!sectionDirty(section.id) || saving}
                        className="flex-1 rounded-lg border border-calm-sage/20 bg-white px-3 py-2 text-sm text-charcoal/80 disabled:opacity-40"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveSection(section.id)}
                        disabled={!sectionDirty(section.id) || saving}
                        className="flex-1 rounded-lg bg-calm-sage px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {String(user?.role || '').toLowerCase() !== 'patient' && (
        <div className="rounded-xl border border-calm-sage/20 bg-[#E8EFE6] px-4 py-3 text-sm text-charcoal/75">
          Role-based settings are active. Additional role-specific sections can be enabled for your account type.
        </div>
      )}
    </div>
  );
}
