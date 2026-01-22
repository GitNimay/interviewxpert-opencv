import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { collection, query, where, doc, deleteDoc, setDoc, serverTimestamp, updateDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { RevenueAreaChart, UserPieChart, JobBarChart } from '../components/AdminCharts';
import { GShapeAnimation } from '../components/AdminAnimations';
import { Users, FileText, DollarSign, UserPlus, Briefcase, CheckCircle, XCircle, Trash2, Bell, Sun, Moon, Monitor, Video, Menu, X, Search, ShieldCheck, ShieldX, BookOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMessageBox } from '../components/MessageBox';
import Logo from '../components/Logo';

const AdminDashboard: React.FC = () => {
  // Real-time Data State
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'users' | 'jobs' | 'transactions'>('overview');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'candidate' | 'recruiter'>('all');
  const { theme, setTheme } = useTheme();
  const messageBox = useMessageBox();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // GSAP Animation Refs
  const dashboardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Load Real-time Data
  useEffect(() => {
    // 1. Recruiter Requests
    const qRequests = query(collection(db, 'recruiterRequests'), where('status', '==', 'pending'));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Jobs
    const qJobs = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Transactions
    const qTransactions = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 5. Interviews - Real-time tracking
    const qInterviews = query(collection(db, 'interviews'), orderBy('submittedAt', 'desc'));
    const unsubInterviews = onSnapshot(qInterviews, (snap) => {
      setInterviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false); // Initial load done when interviews load
    });

    // 6. Admin Profile - Real-time
    let unsubAdmin = () => { };
    const currentUser = auth.currentUser;
    if (currentUser) {
      unsubAdmin = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          setAdminData({ id: docSnap.id, ...docSnap.data() });
        }
      });
    }

    return () => {
      unsubRequests();
      unsubUsers();
      unsubJobs();
      unsubTransactions();
      unsubInterviews();
      unsubAdmin();
    };
  }, []);

  // GSAP Initial Page Animation
  useLayoutEffect(() => {
    if (loading || hasAnimated.current) return;
    hasAnimated.current = true;

    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
        gsap.fromTo(headerRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
        );
      }

      // Sidebar animation
      if (sidebarRef.current) {
        const navItems = sidebarRef.current.querySelectorAll('button');
        gsap.fromTo(navItems,
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.2 }
        );
      }
    });

    return () => ctx.revert();
  }, [loading]);

  // GSAP Tab Content Animation
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      if (activeTab === 'overview') {
        // Animate stat cards
        if (statsRef.current) {
          const cards = statsRef.current.querySelectorAll('.stat-card');
          gsap.fromTo(cards,
            { y: 25, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "power3.out" }
          );
        }
        // Animate all charts (including job bar chart)
        const allCharts = document.querySelectorAll('.chart-box');
        gsap.fromTo(allCharts,
          { y: 30, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.15, ease: "power2.out", delay: 0.3 }
        );
      } else {
        // Animate tab content with small delay to allow DOM to render
        setTimeout(() => {
          const items = document.querySelectorAll('.animated-item');
          gsap.fromTo(items,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: "power2.out" }
          );
        }, 10);
      }
    });

    return () => ctx.revert();
  }, [activeTab, loading]);

  // --- Actions (Preserved Logic) ---

  const handleApproveRecruiter = async (req: any) => {
    const tempPassword = prompt(`Enter a temporary password for ${req.email}:`, "Password123!");
    if (!tempPassword) return;

    setProcessingId(req.id);
    const secondaryApp = initializeApp(auth.app.options, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, req.email, tempPassword);
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: req.email,
        fullname: req.fullname,
        role: 'recruiter',
        experience: req.experience || 0,
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        profilePhotoURL: null
      });
      await deleteDoc(doc(db, 'recruiterRequests', req.id));
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      messageBox.showSuccess(`Recruiter created successfully!\nEmail: ${req.email}\nPassword: ${tempPassword}`);
    } catch (error: any) {
      console.error("Error approving recruiter:", error);
      messageBox.showError("Failed to create recruiter: " + error.message);
      await deleteApp(secondaryApp);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = (id: string) => {
    messageBox.showConfirm("Are you sure you want to reject this request?", async () => {
      try { await deleteDoc(doc(db, 'recruiterRequests', id)); } catch (error) { console.error("Error rejecting:", error); }
    });
  };

  const toggleUserStatus = async (user: any) => {
    if (user.role === 'admin') return;
    const newStatus = user.accountStatus === 'active' ? 'disabled' : 'active';
    try { await updateDoc(doc(db, 'users', user.id), { accountStatus: newStatus }); } catch (error) { console.error("Error updating status:", error); }
  };

  const handleDeleteJob = (jobId: string) => {
    messageBox.showConfirm("Are you sure you want to delete this job posting?", async () => {
      try { await deleteDoc(doc(db, 'jobs', jobId)); } catch (error) { console.error("Error deleting job:", error); }
    });
  };

  const handleDeleteUser = (userId: string) => {
    messageBox.showConfirm("Are you sure you want to delete this user?", async () => {
      try {
        await deleteDoc(doc(db, 'users', userId));
        try { await deleteDoc(doc(db, 'profiles', userId)); } catch (e) { }
      } catch (error) { console.error("Error deleting user:", error); messageBox.showError("Failed to delete user."); }
    });
  };

  const toggleEmailVerification = async (user: any) => {
    const newStatus = !user.adminVerified;
    try { await updateDoc(doc(db, 'users', user.id), { adminVerified: newStatus }); } catch (error) { console.error("Error updating verification:", error); }
  };

  // --- Derived Data for Charts ---

  // Revenue Data (Grouped by Date)
  const revenueData = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    transactions.forEach(t => {
      if (!t.createdAt?.toDate) return;
      const date = t.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      grouped[date] = (grouped[date] || 0) + (Number(t.amount) || 0);
    });
    return Object.keys(grouped).map(key => ({ name: key, amount: grouped[key] }));
  }, [transactions]);

  // User Distribution
  const userStats = React.useMemo(() => {
    const counts = { Candidate: 0, Recruiter: 0, Admin: 0 };
    users.forEach(u => {
      if (u.role === 'candidate') counts.Candidate++;
      else if (u.role === 'recruiter') counts.Recruiter++;
      else if (u.role === 'admin') counts.Admin++;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key as keyof typeof counts] }));
  }, [users]);

  // Job Trends (Grouped by Date)
  const jobStats = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    jobs.forEach(j => {
      if (!j.createdAt?.toDate) return;
      const date = j.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      grouped[date] = (grouped[date] || 0) + 1;
    });
    return Object.keys(grouped).map(key => ({ name: key, count: grouped[key] })).slice(-7); // Last 7 days
  }, [jobs]);

  const totalRevenue = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Real-time computed stats for StatCards
  const todayStats = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // New users today
    const newUsersToday = users.filter(u => {
      if (!u.createdAt?.toDate) return false;
      return u.createdAt.toDate() >= todayStart;
    }).length;

    // Jobs posted today
    const jobsToday = jobs.filter(j => {
      if (!j.createdAt?.toDate) return false;
      return j.createdAt.toDate() >= todayStart;
    }).length;

    // Interviews today
    const interviewsToday = interviews.filter(i => {
      if (!i.submittedAt?.toDate) return false;
      return i.submittedAt.toDate() >= todayStart;
    }).length;

    // Revenue today
    const revenueToday = transactions
      .filter(t => {
        if (!t.createdAt?.toDate) return false;
        return t.createdAt.toDate() >= todayStart;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Revenue this week vs last week (for percentage change)
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeekRevenue = transactions
      .filter(t => {
        if (!t.createdAt?.toDate) return false;
        const date = t.createdAt.toDate();
        return date >= weekStart;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const lastWeekRevenue = transactions
      .filter(t => {
        if (!t.createdAt?.toDate) return false;
        const date = t.createdAt.toDate();
        return date >= lastWeekStart && date < weekStart;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const revenueChangePercent = lastWeekRevenue > 0
      ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(1)
      : thisWeekRevenue > 0 ? '+100' : '0';

    return {
      newUsersToday,
      jobsToday,
      interviewsToday,
      revenueToday,
      revenueChangePercent
    };
  }, [users, jobs, interviews, transactions]);

  // --- Filtering ---
  const filteredData = () => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'requests': return requests.filter(r => r.fullname?.toLowerCase().includes(term) || r.email?.toLowerCase().includes(term));
      case 'users': return users.filter(u => (u.fullname?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)) && (userFilter === 'all' || u.role === userFilter));
      case 'jobs': return jobs.filter(j => j.title?.toLowerCase().includes(term) || j.companyName?.toLowerCase().includes(term));
      case 'transactions': return transactions.filter(t => t.userName?.toLowerCase().includes(term) || t.paymentId?.toLowerCase().includes(term));
      default: return [];
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-black">
        <div className="w-32 h-32">
          <GShapeAnimation />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">

      {/* Top Bar */}
      <div ref={headerRef} className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
            <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
        </div>

        <div className="hidden sm:flex flex-1 justify-center">
          <h2 className="text-sm sm:text-lg font-semibold text-gray-700 dark:text-gray-300">Admin Dashboard</h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-6 flex-1 justify-end">
          <div className="relative group">
            <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-white/5">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
              {requests.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full animate-pulse" />}
            </button>

            {/* Notification Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform translate-y-2 group-hover:translate-y-0">
              <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h4 className="font-bold text-sm">Notifications</h4>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{requests.length} New</span>
              </div>
              <div className="max-h-60 sm:max-h-80 overflow-y-auto">
                {requests.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center text-gray-500 text-sm">No new notifications</div>
                ) : (
                  requests.map(req => (
                    <div key={req.id} onClick={() => setActiveTab('requests')} className="p-3 sm:p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors block">
                      <div className="flex gap-2 sm:gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">New Recruiter Request</p>
                          <p className="text-xs text-gray-500 mt-0.5">{req.fullname} wants to join.</p>
                          <p className="text-[10px] text-gray-400 mt-2">{req.createdAt?.toDate ? req.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20">
                <button onClick={() => setActiveTab('requests')} className="w-full py-2 text-xs font-bold text-center text-primary hover:text-primary/80">View All Requests</button>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden border border-gray-300 dark:border-white/20 cursor-pointer">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminData?.fullname || 'Admin')}&background=random`} alt="Admin" />
            </div>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-44 sm:w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform translate-y-2 group-hover:translate-y-0">
              <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-white/5">
                <p className="font-bold text-xs sm:text-sm">{adminData?.fullname || 'Admin User'}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{adminData?.email || 'admin@interviewxpert.com'}</p>
              </div>
              <a href="/#/admin/profile" className="block px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                👤 View Profile
              </a>
              <button
                onClick={() => signOut(auth)}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} className="rotate-180" /> Sign Out
              </button>

              {/* Theme Toggle */}
              <div className="p-2 sm:p-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 flex justify-center gap-1 sm:gap-2">
                <button onClick={() => setTheme('light')} className={`p-1.5 sm:p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Light Mode">
                  <Sun size={14} />
                </button>
                <button onClick={() => setTheme('dark')} className={`p-1.5 sm:p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Dark Mode">
                  <Moon size={14} />
                </button>
                <button onClick={() => setTheme('system')} className={`p-1.5 sm:p-2 rounded-lg transition-all ${theme === 'system' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="System Default">
                  <Monitor size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <nav
          className={`fixed lg:hidden top-0 left-0 h-full w-64 bg-white dark:bg-zinc-900 z-50 transform transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } border-r border-gray-200 dark:border-white/10 p-4 pt-20`}
        >
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: Briefcase },
              { id: 'requests', label: 'Requests', icon: UserPlus, count: requests.length },
              { id: 'users', label: 'Users', icon: Users, count: users.length },
              { id: 'jobs', label: 'Jobs', icon: FileText, count: jobs.length },
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'blogs', label: 'Manage Blogs', icon: BookOpen }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { 
                  if (item.id === 'blogs') navigate('/admin/blogs');
                  else setActiveTab(item.id as any); 
                  setIsMobileSidebarOpen(false); 
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
                {item.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === item.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-white/10'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Desktop Sidebar Navigation */}
        <nav ref={sidebarRef} className="hidden lg:flex flex-col w-64 h-[calc(100vh-73px)] sticky top-[73px] border-r border-gray-200 dark:border-white/10 p-4 gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'requests', label: 'Requests', icon: UserPlus, count: requests.length },
            { id: 'users', label: 'Users', icon: Users, count: users.length },
            { id: 'jobs', label: 'Jobs', icon: FileText, count: jobs.length },
            { id: 'transactions', label: 'Transactions', icon: DollarSign },
            { id: 'blogs', label: 'Manage Blogs', icon: BookOpen }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'blogs') navigate('/admin/blogs');
                else setActiveTab(item.id as any);
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
              {item.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === item.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-white/10'}`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">

          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Grid */}
              <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} change={`${Number(todayStats.revenueChangePercent) >= 0 ? '+' : ''}${todayStats.revenueChangePercent}%`} icon={DollarSign} color="text-green-500" className="stat-card" />
                <StatCard title="Total Users" value={users.length} change={`+${todayStats.newUsersToday} Today`} icon={Users} color="text-blue-500" className="stat-card" />
                <StatCard title="Job Posts" value={jobs.length} change={`+${todayStats.jobsToday} Today`} icon={FileText} color="text-purple-500" className="stat-card" />
                <StatCard title="Interviews" value={interviews.length} change={`+${todayStats.interviewsToday} Today`} icon={Video} color="text-orange-500" className="stat-card" />
              </div>

              {/* Charts Row 1 */}
              <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="chart-box lg:col-span-2 p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">Revenue Overview</h3>
                  <RevenueAreaChart data={revenueData} />
                </div>
                <div className="chart-box p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">User Distribution</h3>
                  <UserPieChart data={userStats} />
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="chart-box p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">Recent Job Postings Trend</h3>
                <JobBarChart data={jobStats} />
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div ref={contentRef} className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Recruiter Requests</h2>
              <div className="grid gap-3 sm:gap-4">
                {filteredData().length === 0 ? <p className="text-gray-500">No pending requests.</p> : filteredData().map((req) => (
                  <div key={req.id} className="animated-item flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm hover:border-primary/30 transition-colors gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0">
                        {req.fullname?.[0]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-base sm:text-lg truncate">{req.fullname}</h4>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{req.email} • {req.experience} years exp</p>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <button onClick={() => handleApproveRecruiter(req)} disabled={!!processingId} className="px-3 sm:px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:opacity-80 disabled:opacity-50">
                        {processingId === req.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button onClick={() => handleRejectRequest(req.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="animated-item flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold">User Management</h2>
                  <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg self-start sm:self-auto">
                    {['all', 'candidate', 'recruiter'].map(f => (
                      <button
                        key={f}
                        onClick={() => setUserFilter(f as any)}
                        className={`px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium capitalize transition-all ${userFilter === f ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-500'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {filteredData().map(u => (
                  <div key={u.id} className="animated-item p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{u.fullname}</div>
                        <div className="text-xs text-gray-500 truncate">{u.email}</div>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${u.accountStatus === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                        {u.accountStatus || 'active'}
                      </span>
                    </div>
                    {/* Email Verification Status */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${u.adminVerified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {u.adminVerified ? <ShieldCheck size={10} /> : <ShieldX size={10} />}
                        {u.adminVerified ? 'Email Verified' : 'Not Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 capitalize">{u.role}</span>
                      {u.role !== 'admin' && (
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => toggleEmailVerification(u)}
                            className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${u.adminVerified ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}`}
                          >
                            {u.adminVerified ? 'Unverify' : 'Verify Email'}
                          </button>
                          <button onClick={() => toggleUserStatus(u)} className="text-xs font-medium text-blue-600 hover:underline">{u.accountStatus === 'active' ? 'Disable' : 'Enable'}</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden sm:block rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-zinc-900">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 lg:px-6 py-3">User</th>
                      <th className="px-4 lg:px-6 py-3">Role</th>
                      <th className="px-4 lg:px-6 py-3">Status</th>
                      <th className="px-4 lg:px-6 py-3">Email Verified</th>
                      <th className="px-4 lg:px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredData().map(u => (
                      <tr key={u.id} className="animated-item hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <div className="font-medium">{u.fullname}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-4 lg:px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 capitalize">{u.role}</span></td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.accountStatus === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                            {u.accountStatus || 'active'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${u.adminVerified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {u.adminVerified ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
                            {u.adminVerified ? 'Verified' : 'Not Verified'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-right space-x-2">
                          {u.role !== 'admin' && (
                            <>
                              <button
                                onClick={() => toggleEmailVerification(u)}
                                className={`text-sm font-medium px-2 py-1 rounded-md transition-colors ${u.adminVerified ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}`}
                              >
                                {u.adminVerified ? 'Unverify' : 'Verify Email'}
                              </button>
                              <button onClick={() => toggleUserStatus(u)} className="text-sm font-medium text-blue-600 hover:underline">{u.accountStatus === 'active' ? 'Disable' : 'Enable'}</button>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="animated-item flex flex-col gap-3">
                <h2 className="text-xl sm:text-2xl font-bold">Job Postings</h2>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by job title or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredData().map(job => (
                  <div key={job.id} className="animated-item p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all group relative">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-bold text-base sm:text-lg truncate" title={job.title}>{job.title}</h3>
                      <button onClick={() => handleDeleteJob(job.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors bg-gray-100 dark:bg-white/5 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                    <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4 truncate">{job.companyName}</p>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400 mt-auto">
                      <span>{job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-md">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="animated-item flex flex-col gap-3">
                <h2 className="text-xl sm:text-2xl font-bold">Transaction History</h2>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email or payment ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {filteredData().map(t => (
                  <div key={t.id} className="animated-item p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{t.userName}</div>
                        <div className="text-xs text-gray-500 truncate">{t.userEmail}</div>
                      </div>
                      <span className="shrink-0 text-green-500 font-bold text-sm">+₹{t.amount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
                      <span>{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                      <span className="font-mono truncate max-w-[150px]">{t.paymentId}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="animated-item overflow-x-auto hidden sm:block rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-zinc-900">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 lg:px-6 py-3">Paid By</th>
                      <th className="px-4 lg:px-6 py-3">Amount</th>
                      <th className="px-4 lg:px-6 py-3">Date</th>
                      <th className="px-4 lg:px-6 py-3">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredData().map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <div className="font-medium">{t.userName}</div>
                          <div className="text-xs text-gray-500">{t.userEmail}</div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-green-500 font-bold">+₹{t.amount}</td>
                        <td className="px-4 lg:px-6 py-4 text-gray-500 text-sm">{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                        <td className="px-4 lg:px-6 py-4 text-xs font-mono text-gray-400">{t.paymentId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; change: string; icon: any; color: string; className?: string }> = ({ title, value, change, icon: Icon, color, className }) => (
  <div className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all ${className || ''}`}>
    <div className="flex justify-between items-start mb-2 sm:mb-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <h3 className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate">{value}</h3>
      </div>
      <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-white/5 shrink-0 ${color}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </div>
    <div className="flex items-center text-[10px] sm:text-xs font-medium text-green-500">
      <span className="bg-green-100 dark:bg-green-900/20 px-1 sm:px-1.5 py-0.5 rounded mr-1 sm:mr-2 truncate max-w-[60px] sm:max-w-none">{change}</span>
      <span className="text-gray-400 hidden sm:inline">vs last month</span>
    </div>
  </div>
);

export default AdminDashboard;