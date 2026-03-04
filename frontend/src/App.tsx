import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import { AuthProvider } from './context/AuthContext';
import { Assessment } from './pages/Assessment'
import { ResultsPage } from './pages/Results'
import { CrisisPage } from './pages/Crisis'
import { OnboardingName } from './pages/OnboardingName'
import { OnboardingEmail } from './pages/OnboardingEmail'
import SessionSocketDemo from './components/SessionSocketDemo'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import SessionDetailPage from './pages/therapist/SessionDetailPage'
import ProtectedRoute from './components/ProtectedRoute'
import PatientDashboardLayout from './components/layout/PatientDashboardLayout'
import TherapistDashboardLayout from './components/layout/TherapistDashboardLayout'
import DashboardPage from './pages/patient/DashboardPage'
import ProvidersPage from './pages/patient/ProvidersPage'
import ProviderDetailPage from './pages/patient/ProviderDetailPage'
import BookSessionPage from './pages/patient/BookSessionPage'
import SessionsPage from './pages/patient/SessionsPage'
import PatientSessionDetailPage from './pages/patient/SessionDetailPage'
import AIChatPage from './pages/patient/AIChatPage'
import ProfilePage from './pages/patient/ProfilePage'
import LiveSessionPage from './pages/patient/LiveSessionPage'
import AssessmentsPage from './pages/patient/AssessmentsPage'
import BillingPage from './pages/patient/BillingPage'
import DocumentsPage from './pages/patient/DocumentsPage'
import SupportPage from './pages/patient/SupportPage'
import NotificationsPage from './pages/patient/NotificationsPage'
import CBTSessionPlayerPage from './pages/patient/CBTSessionPlayerPage'
import AdminPortalLoginPage from './pages/admin/AdminPortalLoginPage'
import AdminDashboardPage from './pages/admin/Dashboard'
import AdminShellLayout from './components/admin/AdminShellLayout'
import AdminUsersPage from './pages/admin/Users'
import AdminTherapistsPage from './pages/admin/Therapists'
import AdminVerificationPage from './pages/admin/Verification'
import AdminSubscriptionsPage from './pages/admin/Subscriptions'
import AdminRevenuePage from './pages/admin/Revenue'
import AdminSettingsPage from './pages/admin/Settings'
import ClinicalAssistantPage from './pages/admin/ClinicalAssistantPage'
import CertificationsPage from './pages/CertificationsPage'
import TherapistDashboardPage from './pages/therapist/TherapistDashboardPage'
import TherapistPatientsPage from './pages/therapist/TherapistPatientsPage'
import TherapistSessionsPage from './pages/therapist/TherapistSessionsPage'
import TherapistSessionNotesPage from './pages/therapist/TherapistSessionNotesPage'
import TherapistEarningsPage from './pages/therapist/TherapistEarningsPage'
import TherapistPayoutHistoryPage from './pages/therapist/TherapistPayoutHistoryPage'
import TherapistMessagesPage from './pages/therapist/TherapistMessagesPage'
import TherapistExerciseLibraryPage from './pages/therapist/TherapistExerciseLibraryPage'
import TherapistAnalyticsPage from './pages/therapist/TherapistAnalyticsPage'
import TherapistSettingsPage from './pages/therapist/TherapistSettingsPage'
import TherapistHelpSupportPage from './pages/therapist/TherapistHelpSupportPage'

interface AssessmentData {
  symptoms: string[];
  impact: string;
  selfHarm: string;
}

function App() {
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [userName, setUserName] = useState<string>('');

  const handleAssessmentSubmit = (data: AssessmentData, isCritical: boolean) => {
    setAssessmentData(data);
    if (isCritical) {
      window.location.href = '/#/crisis';
    } else {
      window.location.href = '/#/results';
    }
  };

  const handleOnboardingName = (data: { firstName: string; lastName: string; pronouns: string }) => {
    setUserName(data.firstName);
    window.location.href = '/#/onboarding/email';
  };

  return (
    <AuthProvider>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/assessment" element={<Assessment onSubmit={handleAssessmentSubmit} />} />
      <Route path="/certifications" element={<CertificationsPage />} />
      <Route path="/results" element={<ResultsPage data={assessmentData} />} />
      <Route path="/crisis" element={<CrisisPage />} />
      <Route path="/onboarding/name" element={<OnboardingName onNext={handleOnboardingName} />} />
      <Route path="/onboarding/email" element={<OnboardingEmail userName={userName} />} />
        <Route
          path="/session-demo"
          element={
            <ProtectedRoute>
              <SessionSocketDemo sessionId={new URLSearchParams(window.location.hash.split('?')[1]).get('sessionId')} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/therapist-dashboard"
          element={
            <ProtectedRoute>
              <Navigate to="/therapist/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/therapist"
          element={
            <ProtectedRoute allowedRoles={['therapist', 'psychiatrist', 'coach']}>
              <TherapistDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TherapistDashboardPage />} />
          <Route path="patients" element={<TherapistPatientsPage />} />
          <Route path="sessions" element={<TherapistSessionsPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="session-notes" element={<TherapistSessionNotesPage />} />
          <Route path="earnings" element={<TherapistEarningsPage />} />
          <Route path="payout-history" element={<TherapistPayoutHistoryPage />} />
          <Route path="messages" element={<TherapistMessagesPage />} />
          <Route path="exercise-library" element={<TherapistExerciseLibraryPage />} />
          <Route path="analytics" element={<TherapistAnalyticsPage />} />
          <Route path="settings" element={<TherapistSettingsPage />} />
          <Route path="help-support" element={<TherapistHelpSupportPage />} />
        </Route>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin-portal/login" element={<AdminPortalLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminShellLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="analytics" replace />} />
          <Route path="analytics" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="therapists" element={<AdminTherapistsPage />} />
          <Route path="verification" element={<AdminVerificationPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="revenue" element={<AdminRevenuePage />} />
          <Route path="clinical-assistant" element={<ClinicalAssistantPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="dashboard" element={<Navigate to="/admin/analytics" replace />} />
        </Route>
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/signup" replace />} />

        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="providers/:id" element={<ProviderDetailPage />} />
          <Route path="book/:providerId" element={<BookSessionPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:id" element={<PatientSessionDetailPage />} />
          <Route path="cbt/:sessionId" element={<CBTSessionPlayerPage />} />
          <Route path="sessions/:id/live" element={<LiveSessionPage />} />
          <Route path="messages" element={<AIChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="assessments" element={<AssessmentsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/patient/dashboard" replace />} />
        <Route path="/subscribe" element={<Navigate to="/patient/billing" replace />} />
        <Route path="/providers" element={<Navigate to="/patient/providers" replace />} />
        <Route path="/providers/:id" element={<Navigate to="/patient/providers" replace />} />
        <Route path="/book/:providerId" element={<Navigate to="/patient/providers" replace />} />
        <Route path="/sessions" element={<Navigate to="/patient/sessions" replace />} />
        <Route path="/sessions/:id/live" element={<Navigate to="/patient/sessions" replace />} />
        <Route path="/ai-chat" element={<Navigate to="/patient/messages" replace />} />
        <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
