import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MessageBoxProvider } from './components/MessageBox';
import Layout from './components/Layout';
import AuthPage from './pages/Auth';
import RecruiterDashboard from './pages/RecruiterDashboard';
import PostJob from './pages/PostJob';
import ManageCandidates from './pages/ManageCandidates';
import InterviewRequests from './pages/InterviewRequests';
import CandidateDashboard from './pages/CandidateDashboard';
import MyInterviews from './pages/MyInterviews';
import InterviewWizard from './pages/Interview';
import InterviewReport from './pages/Report';
import JobCandidates from './pages/JobCandidates';
import EditJob from './pages/EditJob';
import Profile from './pages/Profile';
import Home from './pages/Home';
import ResumeAnalysis from './pages/ResumeAnalysis';
import ResumeBuilder from './pages/ResumeBuilder';
import MockInterviewSetup from './pages/MockInterviewSetup';
import MockHistory from './pages/MockHistory';
import Payment from './pages/Payment';
import AdminDashboard from './pages/AdminDashboard';
import AdminProfile from './pages/AdminProfile';
import AIAgent from './pages/AIAgent';
import Blogs from './pages/Blogs';
import AdminBlogs from './pages/AdminBlogs';
import BlogDetail from './pages/BlogDetail';
import RecruiterTests from './pages/RecruiterTests';
import CreateTest from './pages/CreateTest';
import TakeTest from './pages/TakeTest';
import TestResults from './pages/TestResults';
import CandidateTests from './pages/CandidateTests';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'recruiter' | 'candidate' | 'admin' }> = ({ children, role }) => {
  const { user, userProfile, loading } = useAuth();

  // FIX: Wait for BOTH Auth and User Profile to load.
  // If we don't wait for userProfile, the role check below will fail and cause a redirect loop.
  if (loading || (user && !userProfile)) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (!user) return <Navigate to="/" replace />;

  // FIX: Smart Redirect to prevent loops. If role mismatch, go to correct dashboard.
  const userRole: string = userProfile?.role || 'candidate';
  if (role && userRole !== role) {
    if (userRole === 'recruiter') return <Navigate to="/recruiter/jobs" replace />;
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/candidate/jobs" replace />;
  }

  return <>{children}</>;
};

const HomeRoute: React.FC = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (user) {
    // Prevent redirect loop: Wait for userProfile to load before redirecting.
    // If we redirect without the profile, ProtectedRoute will kick the user back here.
    if (!userProfile) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
    const userRole: string = userProfile.role || 'candidate';
    if (userRole === 'recruiter') return <Navigate to="/recruiter/jobs" replace />;
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/candidate/jobs" replace />;
  }

  return <Home />;
};

const App: React.FC = () => {
  return (
    <MessageBoxProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Routes (No Layout) */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blog/:id" element={
              <ThemeProvider>
                <BlogDetail />
              </ThemeProvider>
            } />

            {/* Admin Routes (No Standard Layout) */}
            <Route path="/admin" element={
              <ThemeProvider>
                <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
              </ThemeProvider>
            } />
            <Route path="/admin/profile" element={
              <ThemeProvider>
                <ProtectedRoute role="admin"><AdminProfile /></ProtectedRoute>
              </ThemeProvider>
            } />
            <Route path="/admin/blogs" element={
              <ThemeProvider>
                <ProtectedRoute role="admin"><AdminBlogs /></ProtectedRoute>
              </ThemeProvider>
            } />

            {/* Interview Route (No Layout) */}
            <Route path="/interview/:jobId" element={
              <ThemeProvider>
                <ProtectedRoute role="candidate"><InterviewWizard /></ProtectedRoute>
              </ThemeProvider>
            } />

            {/* Test Taking Route (No Layout) */}
            <Route path="/candidate/test/:testId" element={
              <ThemeProvider>
                <ProtectedRoute role="candidate"><TakeTest /></ProtectedRoute>
              </ThemeProvider>
            } />

            {/* Public Report Route (No Auth Required) */}
            <Route path="/report/:interviewId" element={
              <ThemeProvider>
                <InterviewReport />
              </ThemeProvider>
            } />

            {/* Protected Routes (With Layout) */}
            <Route path="/*" element={
              <Layout>
                <Routes>
                  {/* Admin Routes */}


                  {/* Recruiter Routes */}
                  <Route path="/recruiter/jobs" element={
                    <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/job/:jobId/candidates" element={
                    <ProtectedRoute role="recruiter"><JobCandidates /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/edit-job/:jobId" element={
                    <ProtectedRoute role="recruiter"><EditJob /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/post" element={
                    <ProtectedRoute role="recruiter"><PostJob /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/candidates" element={
                    <ProtectedRoute role="recruiter"><ManageCandidates /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/requests" element={
                    <ProtectedRoute role="recruiter"><InterviewRequests /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/tests" element={
                    <ProtectedRoute role="recruiter"><RecruiterTests /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/tests/create" element={
                    <ProtectedRoute role="recruiter"><CreateTest /></ProtectedRoute>
                  } />
                  <Route path="/recruiter/tests/:testId/results" element={
                    <ProtectedRoute role="recruiter"><TestResults /></ProtectedRoute>
                  } />

                  {/* Candidate Routes */}
                  <Route path="/candidate/jobs" element={
                    <ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>
                  } />
                  <Route path="/candidate/best-matches" element={
                    <ProtectedRoute role="candidate"><CandidateDashboard onlyBestMatches /></ProtectedRoute>
                  } />
                  <Route path="/candidate/interviews" element={
                    <ProtectedRoute role="candidate"><MyInterviews /></ProtectedRoute>
                  } />
                  <Route path="/candidate/ai-agent" element={
                    <ProtectedRoute role="candidate"><AIAgent /></ProtectedRoute>
                  } />
                  <Route path="/candidate/resume-analysis" element={
                    <ProtectedRoute role="candidate"><ResumeAnalysis /></ProtectedRoute>
                  } />
                  <Route path="/candidate/resume-builder" element={
                    <ProtectedRoute role="candidate"><ResumeBuilder /></ProtectedRoute>
                  } />
                  <Route path="/candidate/mock-interview" element={
                    <ProtectedRoute role="candidate"><MockInterviewSetup /></ProtectedRoute>
                  } />
                  <Route path="/candidate/mock-history" element={
                    <ProtectedRoute role="candidate"><MockHistory /></ProtectedRoute>
                  } />
                  <Route path="/candidate/payment" element={
                    <ProtectedRoute role="candidate"><Payment /></ProtectedRoute>
                  } />
                  <Route path="/candidate/tests" element={
                    <ProtectedRoute role="candidate"><CandidateTests /></ProtectedRoute>
                  } />

                  {/* Shared/Public */}
                  <Route path="/profile" element={
                    <ProtectedRoute><Profile /></ProtectedRoute>
                  } />
                  <Route path="/profile/:userId" element={
                    <ProtectedRoute><Profile /></ProtectedRoute>
                  } />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </MessageBoxProvider>
  );
};

export default App;
