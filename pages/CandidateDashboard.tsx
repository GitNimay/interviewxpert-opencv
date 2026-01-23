import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, Timestamp, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Job, InterviewRequest } from '../types';
import { useNavigate } from 'react-router-dom';
import { Search, Video, Users, FileText, Briefcase, MapPin, DollarSign, Clock, Sparkles, ChevronRight, MessageSquare, X, Send, Filter, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CandidateDashboard: React.FC<{ onlyBestMatches?: boolean }> = ({ onlyBestMatches }) => {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<Map<string, string>>(new Map()); // jobId -> status
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ shortlisted: 0, hired: 0, rejected: 0, total: 0 });
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [rawRequests, setRawRequests] = useState<any[]>([]);
  const [rawInterviews, setRawInterviews] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyModal, setApplyModal] = useState<{ isOpen: boolean; job: Job | null }>({ isOpen: false, job: null });
  const [applicationData, setApplicationData] = useState({
    noticePeriod: '',
    expectedSalary: '',
    coverNote: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'me', text: "vjvjkjbk,", time: "1/6/2026" },
    { id: 2, sender: 'recruiter', text: "Congratulations! You have been Hired for the position of web intern.", time: "Just now" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { 
      id: Date.now(), 
      sender: 'me', 
      text: chatInput, 
      time: 'Just now' 
    }]);
    setChatInput("");
    
    // Simulate reply
    setTimeout(() => {
        setChatMessages(prev => [...prev, { 
            id: Date.now() + 1, 
            sender: 'recruiter', 
            text: "Great! I'll send over a calendar invite for that time. Looking forward to speaking with you.", 
            time: 'Just now' 
          }]);
    }, 2000);
  };

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Real-time: Fetch existing requests (removed orderBy to avoid needing composite index)
    const reqQuery = query(collection(db, 'interviewRequests'), where('candidateUID', '==', user.uid));
    const unsubscribeRequests = onSnapshot(reqQuery, (snapshot) => {
      const reqMap = new Map<string, string>();
      const docs: any[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data() as InterviewRequest;
        reqMap.set(data.jobId, data.status);
        docs.push(data);
      });
      setRequests(reqMap);
      setRawRequests(docs);
    });

    // Real-time: Fetch available jobs
    const now = Timestamp.now();
    const jobsQuery = query(collection(db, 'jobs'), where('applyDeadline', '>', now), orderBy('applyDeadline', 'asc'));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      setLoading(false);
    });

    // Real-time: Fetch interview stats
    const intQuery = query(collection(db, 'interviews'), where('candidateUID', '==', user.uid));
    const unsubscribeStats = onSnapshot(intQuery, (snapshot) => {
      const docs: any[] = [];
      let shortlisted = 0, hired = 0, rejected = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const s = (data.status || '').toLowerCase();
        if (s === 'hired') hired++;
        else if (s === 'rejected') rejected++;
        else if (s === 'shortlisted') shortlisted++;
        docs.push(data);
      });
      setStats({ shortlisted, hired, rejected, total: snapshot.size });
      setRawInterviews(docs);
    });

    // Real-time: Fetch test submissions (Assessments)
    const subQuery = query(collection(db, 'testSubmissions'), where('candidateUID', '==', user.uid));
    const unsubscribeSubmissions = onSnapshot(subQuery, (snapshot) => {
      setAssessmentCount(snapshot.size);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeJobs();
      unsubscribeStats();
      unsubscribeSubmissions();
    };
  }, [user]);

  // Process Data for Funnel Chart
  useEffect(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data: any = {};

    rawRequests.forEach(req => {
        if (!req.createdAt) return;
        const date = req.createdAt.toDate();
        const monthName = months[date.getMonth()];
        
        if (!data[monthName]) data[monthName] = { name: monthName, total: 0, pending: 0, scheduled: 0, reviewing: 0, shortlisted: 0, hired: 0, rejected: 0, interviewsGiven: 0 };
        
        data[monthName].total++;
        if (req.status === 'pending') data[monthName].pending++;
        if (req.status === 'accepted') data[monthName].scheduled++;
    });

    rawInterviews.forEach(int => {
        if (!int.submittedAt) return;
        const date = int.submittedAt.toDate();
        const monthName = months[date.getMonth()];
        
        if (!data[monthName]) data[monthName] = { name: monthName, total: 0, pending: 0, scheduled: 0, reviewing: 0, shortlisted: 0, hired: 0, rejected: 0, interviewsGiven: 0 };
        
        data[monthName].interviewsGiven++;
        const s = (int.status || '').toLowerCase();
        if (s === 'pending') data[monthName].reviewing++;
        else if (s === 'shortlisted') data[monthName].shortlisted++;
        else if (s === 'hired') data[monthName].hired++;
        else if (s === 'rejected') data[monthName].rejected++;
    });

    const sortedData = Object.values(data).sort((a: any, b: any) => {
        return months.indexOf(a.name) - months.indexOf(b.name);
    });

    setFunnelData(sortedData);
  }, [rawRequests, rawInterviews]);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

  const openApplyModal = (job: Job) => {
    setApplyModal({ isOpen: true, job });
  };

  const submitApplication = async () => {
    const job = applyModal.job;
    if (!user || !userProfile) return;
    if (!job) return;

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'interviewRequests'), {
        jobId: job.id,
        jobTitle: job.title,
        candidateUID: user.uid,
        candidateName: userProfile.fullname,
        recruiterUID: job.recruiterUID,
        status: 'pending',
        noticePeriod: applicationData.noticePeriod,
        expectedSalary: applicationData.expectedSalary,
        coverNote: applicationData.coverNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setApplyModal({ isOpen: false, job: null });
      setApplicationData({ noticePeriod: '', expectedSalary: '', coverNote: '' });
      alert("Application sent successfully! Your profile has been shared with the recruiter.");
    } catch (err) {
      alert("Error sending request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartInterview = (jobId: string) => {
    navigate(`/interview/${jobId}`);
  };

  // Helper function to get user skills as an array
  const getUserSkills = (): string[] => {
    if (!userProfile) return [];
    const skills = (userProfile as any).skills;
    if (Array.isArray(skills)) {
      return skills.map((s: string) => s.toLowerCase().trim());
    }
    if (typeof skills === 'string') {
      return skills.split(',').map((s: string) => s.toLowerCase().trim()).filter(Boolean);
    }
    return [];
  };

  // Best Matches: Filter jobs based on user skills matching job qualifications
  const bestMatches = jobs.filter(job => {
    if ((job as any).isMock) return false;
    const userSkills = getUserSkills();
    if (userSkills.length === 0) return false;
    const jobQuals = (job.qualifications || '').toLowerCase();
    const jobTitle = (job.title || '').toLowerCase();
    const jobDescription = ((job as any).description || '').toLowerCase();
    return userSkills.some((skill: string) =>
      jobQuals.includes(skill) || jobTitle.includes(skill) || jobDescription.includes(skill)
    );
  });

  // All jobs (non-mock)
  const allJobs = jobs.filter(job => !(job as any).isMock);

  // Filter by search term
  const filterBySearch = (jobList: Job[]) => {
    const term = searchTerm.toLowerCase();
    let filtered = jobList;

    // 1. Text Search (Title, Company, Skills)
    if (term) {
      filtered = filtered.filter(job => {
        const titleMatch = (job.title || '').toLowerCase().includes(term);
        const companyMatch = (job.companyName || '').toLowerCase().includes(term);
        const skillsMatch = (job.qualifications || '').toLowerCase().includes(term);
        return titleMatch || companyMatch || skillsMatch;
      });
    }

    // 2. Date Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(job => {
        if (!(job as any).createdAt) return true; // Keep if no date data
        const jobDate = (job as any).createdAt.toDate();
        const diffTime = Math.abs(now.getTime() - jobDate.getTime());
        const diffHours = diffTime / (1000 * 60 * 60);
        
        if (dateFilter === '24h') return diffHours <= 24;
        if (dateFilter === '7d') return diffHours <= 24 * 7;
        if (dateFilter === '30d') return diffHours <= 24 * 30;
        return true;
      });
    }

    return filtered;
  };

  // Derived stats for side boxes
  const pendingApps = Array.from(requests.values()).filter(s => s === 'pending').length;
  const scheduledApps = Array.from(requests.values()).filter(s => s === 'accepted').length;
  const pendingReview = rawInterviews.filter(i => (i.status || '').toLowerCase() === 'pending').length;

  const filteredAllJobs = filterBySearch(allJobs);
  const filteredBestMatches = filterBySearch(bestMatches);

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse">Loading dashboard...</div>;

  // Visual Components with Light Mode Support
  const MetricCard = ({ icon: Icon, label, value, colorClass, percent, onClick }: any) => (
    <div onClick={onClick} className={`bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-none relative overflow-hidden group hover:border-gray-200 dark:hover:border-white/10 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}>
      <div className={`p-3 rounded-lg w-fit mb-4 ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div className="absolute top-6 right-6 px-2 py-1 rounded bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 text-xs font-bold">
        {percent}
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
    </div>
  );

  // Job Card Render Function
  const renderJobCard = (job: Job) => {
    const requestStatus = requests.get(job.id);
    const isCompleted = rawInterviews.some(i => i.jobId === job.id);

    return (
      <div key={job.id} onClick={() => setSelectedJob(job)} className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-blue-500/30 dark:hover:border-white/10 transition-all cursor-pointer group hover:-translate-y-1 duration-300 shadow-sm dark:shadow-none hover:shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-500/20">
            {job.companyName.charAt(0)}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-[#888] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border border-gray-200 dark:border-white/5">
              {(job as any).jobType || 'FULL TIME'}
            </span>
            {isCompleted && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border border-green-200 dark:border-green-800 flex items-center gap-1">
                <CheckCircle size={10} /> Completed
              </span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{job.title}</h3>
        <p className="text-gray-500 dark:text-gray-500 text-sm mb-6 flex items-center gap-1.5">
          {job.companyName} • <span className="text-gray-600 dark:text-gray-600">{(job as any).location || 'Remote'}</span>
        </p>

        <div className="flex items-center justify-between mt-auto">
          <p className="text-gray-900 dark:text-white font-bold text-sm">{(job as any).salaryRange || 'Competitive'}</p>

          {/* Action Buttons */}
          {isCompleted ? (
             <button onClick={(e) => { e.stopPropagation(); navigate('/candidate/interviews'); }} className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg text-sm font-bold transition-colors">
               View Result
             </button>
          ) : requestStatus === 'pending' ? (
            <button disabled className="px-4 py-2 bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-500 border border-yellow-100 dark:border-yellow-500/20 rounded-lg text-sm font-bold">
              Pending
            </button>
          ) : requestStatus === 'accepted' || job.interviewPermission === 'anyone' ? (
            <button onClick={(e) => { e.stopPropagation(); handleStartInterview(job.id); }} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-green-900/20">
              Start
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); openApplyModal(job); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20">
              Apply
            </button>
          )}
        </div>
      </div>
    );
  };

  // ===== BEST MATCHES ONLY MODE =====
  if (onlyBestMatches) {
    const displayedMatches = filteredBestMatches.length > 0 ? filteredBestMatches : allJobs;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white font-sans selection:bg-blue-500/30">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Header with Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Best Matches</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Jobs tailored to your skills</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search skills, title..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-all shadow-sm dark:shadow-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative w-full md:w-40">
                 <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none text-gray-900 dark:text-white appearance-none cursor-pointer shadow-sm"
                 >
                    <option value="all">Any Date</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                 </select>
                 <Filter className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Jobs Grid */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Jobs Matching Your Skills
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {displayedMatches.length} job{displayedMatches.length !== 1 ? 's' : ''} found
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedMatches.map(job => renderJobCard(job))}
            </div>
          </div>
        </div>

        {/* Modals */}
        {renderJobModal()}
        {renderApplyModal()}
      </div>
    );
  }

  // ===== FULL DASHBOARD MODE =====
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Welcome & Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {userProfile?.fullname?.split(' ')[0] || 'User'}
            </h1>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Chat Button */}
            <button 
                onClick={() => setShowChat(!showChat)}
                className={`p-2.5 border border-gray-200 dark:border-white/10 rounded-xl transition-colors shadow-sm ${showChat ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' : 'bg-white dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            icon={FileText}
            label="Total Applications"
            value={requests.size}
            colorClass="bg-blue-500 text-blue-500"
            percent=""
            onClick={() => document.getElementById('all-jobs')?.scrollIntoView({ behavior: 'smooth' })}
          />
          <MetricCard
            icon={Users}
            label="Total Hired"
            value={stats.hired}
            colorClass="bg-green-500 text-green-500"
            percent=""
            onClick={() => alert("Keep applying! You're doing great.")}
          />
          <MetricCard
            icon={Video}
            label="View Detailed Report"
            value={stats.total}
            colorClass="bg-orange-500 text-orange-500"
            percent=""
            onClick={() => navigate('/candidate/interviews')}
          />
        </div>

        {/* Activity Overview Section */}
        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Side Stats Boxes */}
            <div className="w-full lg:w-1/3 grid grid-cols-2 gap-3 h-fit">
               <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Total Applications</p>
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{requests.size}</h4>
               </div>
               <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">Interviews Given</p>
                  <h4 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stats.total}</h4>
               </div>
               <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30">
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-1">Assessments</p>
                  <h4 className="text-2xl font-bold text-teal-700 dark:text-teal-300">{assessmentCount}</h4>
               </div>
               <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Pending Apps</p>
                  <h4 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{pendingApps}</h4>
               </div>
               <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Scheduled</p>
                  <h4 className="text-2xl font-bold text-purple-700 dark:text-purple-300">{scheduledApps}</h4>
               </div>
               <div className="p-4 rounded-xl bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-800/30">
                  <p className="text-xs text-pink-600 dark:text-pink-400 font-medium mb-1">Pending Review</p>
                  <h4 className="text-2xl font-bold text-pink-700 dark:text-pink-300">{pendingReview}</h4>
               </div>
               <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Shortlisted</p>
                  <h4 className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.shortlisted}</h4>
               </div>
               <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Hired</p>
                  <h4 className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.hired}</h4>
               </div>
               <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Rejected</p>
                  <h4 className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejected}</h4>
               </div>
            </div>

            {/* Graph Area */}
            <div className="w-full lg:w-2/3 flex flex-col">
               <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Activity Trends</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly breakdown of your application status</p>
               </div>
               <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.05} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                      itemStyle={{ padding: 0 }}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                    <Bar dataKey="total" name="Applied" fill="#E5E7EB" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="pending" name="Pending" fill="#60A5FA" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="scheduled" name="Interview" fill="#A78BFA" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="interviewsGiven" name="Given" fill="#4F46E5" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="reviewing" name="Reviewing" fill="#EC4899" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="shortlisted" name="Shortlist" fill="#FBBF24" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="hired" name="Hired" fill="#34D399" radius={[2, 2, 0, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>

        {/* Best Matches Row */}
        {filteredBestMatches.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Best Matches</h2>
              </div>
              <button
                onClick={() => navigate('/candidate/best-matches')}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-500 text-sm font-bold hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                VIEW ALL <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBestMatches.slice(0, 3).map(job => renderJobCard(job))}
            </div>
          </div>
        )}

        {/* All Jobs Section */}
        <div id="all-jobs">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Available Jobs</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredAllJobs.length} job{filteredAllJobs.length !== 1 ? 's' : ''} available
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="relative w-full md:w-40">
                 <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-white appearance-none cursor-pointer shadow-sm"
                 >
                    <option value="all">Any Date</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                 </select>
                 <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAllJobs.map(job => renderJobCard(job))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {renderJobModal()}
      {renderApplyModal()}

      {/* Chat Widget */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col z-[150] overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 text-sm"><MessageSquare size={16}/> Recruiter Messages</h3>
            <button onClick={() => setShowChat(false)} className="hover:bg-blue-700 p-1 rounded"><X size={16}/></button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-black/20 space-y-3">
             {chatMessages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`${msg.sender === 'me' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'} p-3 rounded-2xl text-sm max-w-[85%]`}>
                         <p>{msg.text}</p>
                         <p className={`text-[10px] mt-1 ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{msg.time}</p>
                     </div>
                 </div>
             ))}
             <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] flex gap-2">
            <input type="text" placeholder="Type a message..." className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
            <button onClick={handleSendMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"><Send size={16}/></button>
          </div>
        </div>
      )}
    </div>
  );

  // Job Details Modal
  function renderJobModal() {
    if (!selectedJob) return null;
    const isCompleted = rawInterviews.some(i => i.jobId === selectedJob.id);

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md" onClick={() => setSelectedJob(null)}>
        <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
          {/* Modal Header with Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40 relative">
            <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 text-gray-900 dark:text-white rounded-full p-2 transition-colors">
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="px-8 pb-8 -mt-10 relative">
            <div className="flex justify-between items-end mb-6">
              <div className="flex gap-5 items-end">
                <div className="w-20 h-20 bg-white dark:bg-[#1a1a1a] rounded-xl border-4 border-white dark:border-[#0f0f0f] shadow-lg flex items-center justify-center text-3xl font-bold text-gray-500 dark:text-gray-400">
                  {selectedJob.companyName.charAt(0)}
                </div>
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedJob.title}</h2>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Briefcase className="w-4 h-4" /> {selectedJob.companyName}
                    <span>•</span>
                    <MapPin className="w-4 h-4" /> {(selectedJob as any).location || 'Remote'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mb-2">
                {/* Action Buttons */}
                {isCompleted ? (
                   <button onClick={() => navigate('/candidate/interviews')} className="px-6 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl font-bold transition-all flex items-center gap-2">
                     <CheckCircle className="w-5 h-5" /> View Result
                   </button>
                ) : requests.get(selectedJob.id) === 'pending' ? (
                  <div className="px-5 py-2.5 bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400 rounded-xl font-medium border border-yellow-100 dark:border-yellow-500/20 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Pending
                  </div>
                ) : requests.get(selectedJob.id) === 'accepted' || selectedJob.interviewPermission === 'anyone' ? (
                  <button onClick={() => handleStartInterview(selectedJob.id)} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all flex items-center gap-2">
                    <span className="text-lg">▶</span> Start Interview
                  </button>
                ) : (
                  <button onClick={() => openApplyModal(selectedJob)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                    Apply Now
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 dark:bg-[#161616] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1">
                  <DollarSign className="w-3.5 h-3.5" /> Salary
                </div>
                <div className="text-gray-900 dark:text-white font-medium">{(selectedJob as any).salaryRange || 'Not disclosed'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-[#161616] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1">
                  <Briefcase className="w-3.5 h-3.5" /> Job Type
                </div>
                <div className="text-gray-900 dark:text-white font-medium">{(selectedJob as any).jobType || 'Full-time'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-[#161616] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1">
                  <Clock className="w-3.5 h-3.5" /> Deadline
                </div>
                <div className="text-gray-900 dark:text-white font-medium">{selectedJob.applyDeadline?.toDate ? selectedJob.applyDeadline.toDate().toLocaleDateString() : 'Open'}</div>
              </div>
            </div>

            <div className="space-y-6 text-gray-600 dark:text-gray-300">
              <div>
                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-3">About the Role</h3>
                <p className="leading-relaxed whitespace-pre-wrap text-sm text-gray-500 dark:text-gray-400">
                  {(selectedJob as any).description || 'No detailed description provided.'}
                </p>
              </div>

              <div>
                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-3">Requirements</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.qualifications?.split(',').map((q, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-lg text-sm border border-gray-200 dark:border-white/5">
                      {q.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Apply Modal
  function renderApplyModal() {
    if (!applyModal.isOpen || !applyModal.job) return null;
    return (
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-white/10">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Apply for {applyModal.job.title}</h3>
          <p className="text-sm text-gray-500 mb-6">
            Share your profile with {applyModal.job.companyName}.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Notice Period</label>
              <input
                type="text"
                placeholder="e.g. Immediate"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                value={applicationData.noticePeriod}
                onChange={e => setApplicationData({ ...applicationData, noticePeriod: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Expected Salary</label>
              <input
                type="text"
                placeholder="e.g. $80k"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                value={applicationData.expectedSalary}
                onChange={e => setApplicationData({ ...applicationData, expectedSalary: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => setApplyModal({ isOpen: false, job: null })} className="px-5 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors">Cancel</button>
            <button onClick={submitApplication} disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/30 disabled:opacity-50">
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default CandidateDashboard;