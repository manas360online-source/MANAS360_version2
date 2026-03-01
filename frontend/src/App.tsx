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
import TherapistDashboard from './components/TherapistDashboard'
import AnalyticsPage from './pages/therapist/AnalyticsPage'
import LoginWidget from './components/LoginWidget'
import SessionDetailPage from './pages/therapist/SessionDetailPage'
import ProtectedRoute from './components/ProtectedRoute'

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
              <TherapistDashboard sessionId={new URLSearchParams(window.location.hash.split('?')[1]).get('sessionId')} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/therapist/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/therapist/sessions/:id"
          element={
            <ProtectedRoute>
              <SessionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginWidget />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
