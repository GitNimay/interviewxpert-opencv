import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { Sun, Moon, Menu, X, Monitor } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';
import Logo from './Logo';



const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const { theme, setTheme } = useTheme();

  // Force Dark Mode for this theme update if desired, but respecting user toggle for now.
  // Ideally for "Black Dignity" we default to dark or design the light mode to be very minimal too.

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-200 font-sans selection:bg-primary/30 selection:text-primary-foreground flex flex-col transition-colors duration-300">
      {/* Background Subtle Gradient - Dark Mode Only */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-tr from-[#000000] via-[#050505] to-[#0a0a0a] pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300" />

      {/* Tech Grid Pattern - subtle texture */}
      <div className="fixed inset-0 z-[-1] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}>
      </div>

      <nav className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 sticky top-0 z-[100] transition-all duration-300">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Logo Area */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center group">
                <div className="w-10 h-10 flex items-center justify-center transition-all duration-300">
                  <Logo className="w-10 h-10" />
                </div>
              </Link>
            </div>

            {/* Centered Navigation */}
            <div className="hidden xl:flex items-center justify-center flex-1 px-2">
              <div className="flex items-center bg-gray-100/50 dark:bg-white/5 rounded-full px-2 py-1.5 border border-gray-200 dark:border-white/5 backdrop-blur-sm">
                {user && userProfile?.role === 'admin' ? (
                  <Link to="/admin" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/admin') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                    Admin Dashboard
                  </Link>
                ) : userProfile?.role === 'recruiter' ? (
                  <>
                    <Link to="/recruiter/jobs" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/recruiter/jobs') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Dashboard
                    </Link>
                    <Link to="/recruiter/post" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/recruiter/post') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Post Job
                    </Link>
                    <Link to="/recruiter/candidates" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/recruiter/candidates') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Manage Candidates
                    </Link>
                    <Link to="/recruiter/requests" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/recruiter/requests') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Requests
                    </Link>
                    <Link to="/recruiter/tests" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/recruiter/tests') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Assessments
                    </Link>
                  </>
                ) : user ? (
                  <>
                    <Link to="/candidate/jobs" className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/jobs') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Jobs
                    </Link>
                    <Link to="/candidate/best-matches" className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/best-matches') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Best Matches
                    </Link>
                    <Link to="/candidate/interviews" className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/interviews') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      My Interviews
                    </Link>
                    <Link to="/candidate/resume-analysis" className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/resume-analysis') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Resume AI
                    </Link>
                    <Link to="/candidate/resume-builder" className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/resume-builder') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Builder
                    </Link>
                    <Link to="/candidate/mock-interview" className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/mock-interview') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Mock
                    </Link>
                    <Link to="/candidate/tests" className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/tests') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Assessments
                    </Link>
                    <Link to="/candidate/ai-agent" className={`group relative px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive('/candidate/ai-agent') ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                      Career Copilot
                      <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[7px] leading-none font-bold px-1 py-[1px] rounded transition-all shadow-sm border-[0.5px] border-white dark:border-[#09090b] transform rotate-12 z-20">
                        NEW
                      </span>
                    </Link>
                  </>
                ) : (
                  <Link to="/" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/') ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                    Home
                  </Link>
                )}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Wallet for Candidate */}
              {user && userProfile?.role === 'candidate' && (
                <Link to="/candidate/payment" className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20 text-xs font-bold hover:bg-yellow-500/20 transition-all" title="Wallet Balance">
                  <i className="fas fa-coins"></i>
                  <span>{(userProfile as any)?.walletBalance || 0}</span>
                </Link>
              )}

              {user ? (
                <>


                  <NotificationCenter />
                </>
              ) : (
                <Link to="/auth" className="px-5 py-2 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                  Sign In
                </Link>
              )}

              {/* ConnectionStatus moved to dropdown */}

              {/* Profile Dropdown */}
              {user && (
                <div className="hidden md:flex relative group items-center gap-3 pl-3 ml-1 h-9 border-l border-white/10">
                  <div className="flex items-center gap-3 cursor-pointer">
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-semibold text-gray-700 dark:text-white leading-none">{userProfile?.fullname || 'User'}</p>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">{userProfile?.role || 'Guest'}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/20 p-0.5 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <img
                        src={userProfile?.profilePhotoURL || `https://ui-avatars.com/api/?name=${userProfile?.fullname?.replace(/\s/g, '+') || 'User'}&background=random&color=fff`}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  <div className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-[#0a0a0a] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform group-hover:translate-y-0 translate-y-2">
                    <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 rounded-t-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full p-0.5 border border-gray-200 dark:border-white/10">
                          <img
                            src={userProfile?.profilePhotoURL || `https://ui-avatars.com/api/?name=${userProfile?.fullname?.replace(/\s/g, '+')}&background=random&color=fff`}
                            alt="Avatar"
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base">{userProfile?.fullname}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">{userProfile?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link to="/profile" className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors">
                        <i className="fas fa-user-circle w-5 text-center text-gray-500"></i> View Profile
                      </Link>
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 transition-colors">
                        <i className="fa-solid fa-right-from-bracket w-5 text-center"></i> Sign Out
                      </button>
                    </div>
                    <div className="p-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-black/20 rounded-b-xl">
                      <div className="flex items-center gap-1 bg-gray-200/50 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/5">
                        <button
                          onClick={() => setTheme('light')}
                          className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                          title="Light"
                        >
                          <Sun size={14} />
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                          title="Dark"
                        >
                          <Moon size={14} />
                        </button>
                        <button
                          onClick={() => setTheme('system')}
                          className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30' : 'text-gray-500 hover:text-gray-300'}`}
                          title="System"
                        >
                          <Monitor size={14} />
                        </button>
                      </div>
                      <ConnectionStatus />
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Menu Button */}
              <div className="flex xl:hidden items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:outline-none transition-colors"
                >
                  <Menu size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className={`flex-grow w-full ${isActive('/candidate/ai-agent') ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'} relative z-10`}>
        {children}
      </main>

      {!isActive('/candidate/ai-agent') && (
        <footer className="border-t border-gray-200 dark:border-white/5 bg-white/50 dark:bg-[#050505]/50 backdrop-blur-sm py-8 mt-auto z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <Logo className="w-6 h-6" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">InterviewXpert</span>
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-600 font-medium">
                &copy; {new Date().getFullYear()} InterviewXpert Inc.
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile Menu Overlay & Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed inset-y-0 right-0 w-[280px] bg-white dark:bg-[#0a0a0a] border-l border-gray-200 dark:border-white/5 shadow-2xl transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5">
              <span className="font-bold text-lg text-gray-900 dark:text-white">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4 px-4 space-y-6">
              {/* Links */}
              <div className="space-y-1">
                {user && userProfile?.role === 'admin' ? (
                  <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/admin') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                    <i className="fas fa-shield-alt w-5 text-center"></i> Admin Dashboard
                  </Link>
                ) : userProfile?.role === 'recruiter' ? (
                  <>
                    <Link to="/recruiter/jobs" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/recruiter/jobs') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-columns w-5 text-center"></i> Dashboard</Link>
                    <Link to="/recruiter/post" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/recruiter/post') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-plus-circle w-5 text-center"></i> Post Job</Link>
                    <Link to="/recruiter/candidates" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/recruiter/candidates') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-users w-5 text-center"></i> Candidates</Link>
                    <Link to="/recruiter/requests" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/recruiter/requests') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-inbox w-5 text-center"></i> Requests</Link>
                    <Link to="/recruiter/tests" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/recruiter/tests') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-clipboard-list w-5 text-center"></i> Assessments</Link>
                  </>
                ) : user ? (
                  <>
                    <Link to="/candidate/jobs" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/jobs') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-briefcase w-5 text-center"></i> Jobs</Link>
                    <Link to="/candidate/best-matches" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/best-matches') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-star w-5 text-center"></i> Best Matches</Link>
                    <Link to="/candidate/interviews" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/interviews') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-video w-5 text-center"></i> My Interviews</Link>
                    <Link to="/candidate/resume-analysis" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/resume-analysis') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-file-alt w-5 text-center"></i> Resume AI</Link>
                    <Link to="/candidate/resume-builder" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/resume-builder') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-pen-fancy w-5 text-center"></i> Builder</Link>
                    <Link to="/candidate/mock-interview" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/mock-interview') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-robot w-5 text-center"></i> Mock Interview</Link>
                    <Link to="/candidate/tests" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/tests') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-clipboard-check w-5 text-center"></i> Assessments</Link>
                    <Link to="/candidate/ai-agent" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/candidate/ai-agent') ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-robot w-5 text-center"></i> Career Copilot</Link>
                  </>
                ) : (
                  <>
                    <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><i className="fas fa-home w-5 text-center"></i> Home</Link>
                  </>
                )}
              </div>

              {/* Divider */}
              {user && <div className="h-px bg-gray-200 dark:bg-white/5 my-2" />}

              {/* User Section */}
              {user && (
                <div className="space-y-4">
                  {/* Profile Link */}
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                    <img className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-white/10 group-hover:border-primary/50 transition-colors" src={userProfile?.profilePhotoURL || `https://ui-avatars.com/api/?name=${userProfile?.fullname?.replace(/\s/g, '+')}&background=random&color=fff`} alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">{userProfile?.fullname}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.email}</div>
                    </div>
                  </Link>



                  {/* Wallet */}
                  {userProfile?.role === 'candidate' && (
                    <Link to="/candidate/payment" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500 font-medium text-sm">
                        <i className="fas fa-coins"></i> Wallet
                      </div>
                      <span className="font-bold text-yellow-800 dark:text-yellow-400">{(userProfile as any)?.walletBalance || 0} pts</span>
                    </Link>
                  )}

                  {/* Theme */}
                  <div className="bg-gray-50 dark:bg-white/5 p-1 rounded-xl flex">
                    <button onClick={() => setTheme('light')} className={`flex-1 p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-medium ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                      <Sun size={14} /> Light
                    </button>
                    <button onClick={() => setTheme('dark')} className={`flex-1 p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                      <Moon size={14} /> Dark
                    </button>
                    <button onClick={() => setTheme('system')} className={`flex-1 p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-medium ${theme === 'system' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                      <Monitor size={14} /> Auto
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {user ? (
              <div className="p-4 border-t border-gray-200 dark:border-white/5">
                <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium text-sm transition-colors">
                  <i className="fas fa-sign-out-alt"></i> Sign Out
                </button>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-200 dark:border-white/5 space-y-3">
                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)} className="block w-full py-3 text-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">Log In</Link>
                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)} className="block w-full py-3 text-center rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    <LayoutContent>{children}</LayoutContent>
  </ThemeProvider>
);

export default Layout;