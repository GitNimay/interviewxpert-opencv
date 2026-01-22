import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Job, InterviewRequest } from '../types';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import gsap from 'gsap';
import { useMessageBox } from '../components/MessageBox';

const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<InterviewRequest[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const messageBox = useMessageBox();

  useEffect(() => {
    if (!loading) {
      const ctx = gsap.context(() => {
        gsap.from('.dashboard-header', {
          y: -20,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out'
        });

        gsap.from('.kpi-card', {
          y: 20,
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
          delay: 0.2,
          ease: 'power2.out'
        });

        gsap.from('.analytics-card', {
          scale: 0.95,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
          delay: 0.4,
          ease: 'power2.out'
        });

        gsap.from('.jobs-table-section', {
          y: 40,
          opacity: 0,
          duration: 0.8,
          delay: 0.6,
          ease: 'power3.out'
        });
      });

      return () => ctx.revert();
    }
  }, [loading]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Jobs
        const jobsQuery = query(
          collection(db, 'jobs'),
          where('recruiterUID', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const jobsSnap = await getDocs(jobsQuery);
        const jobsData = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        setJobs(jobsData);

        // 2. Fetch Requests (for charts)
        // Use correct collection name 'interviewRequests' and sort by date for "Top 2"
        // Removed orderBy from query to avoid index requirement issues; sorting in memory instead.
        const requestsQuery = query(
          collection(db, 'interviewRequests'),
          where('recruiterUID', '==', user.uid)
        );
        const requestsSnap = await getDocs(requestsQuery);
        const requestsData = requestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InterviewRequest));
        requestsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setRequests(requestsData);

        // 3. Fetch Interviews (for Pending Review count)
        const jobIds = jobsData.map(j => j.id);
        let allInterviews: any[] = [];
        if (jobIds.length > 0) {
          for (let i = 0; i < jobIds.length; i += 10) {
            const chunk = jobIds.slice(i, i + 10);
            const intQuery = query(collection(db, 'interviews'), where('jobId', 'in', chunk));
            const intSnap = await getDocs(intQuery);
            allInterviews = [...allInterviews, ...intSnap.docs.map(d => d.data())];
          }
        }
        setInterviews(allInterviews);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleDelete = (jobId: string) => {
    messageBox.showConfirm("Are you sure you want to delete this job?", async () => {
      try {
        await deleteDoc(doc(db, 'jobs', jobId));
        setJobs(jobs.filter(j => j.id !== jobId));
      } catch (err) {
        messageBox.showError("Error deleting job");
      }
    });
  };

  // --- Prepare Chart Data ---

  // 1. Job Activity (Bar Chart): Jobs posted per date/month (Last 5-6 entries)
  const jobProcessData = () => {
    const map = new Map<string, number>();
    jobs.slice().reverse().forEach(job => {
      const date = job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
      map.set(date, (map.get(date) || 0) + 1);
    });
    // Convert to array and take last 7
    return Array.from(map.entries()).map(([date, count]) => ({ date, count })).slice(-7);
  };
  const activityData = jobProcessData();

  // 2. Request Status (Pie Chart)
  const statusData = [
    { name: 'Pending', value: requests.filter(r => r.status === 'pending').length, color: '#FBBF24' }, // Amber
    { name: 'Accepted', value: requests.filter(r => r.status === 'accepted').length, color: '#34D399' }, // Emerald
    { name: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, color: '#F87171' }, // Red
  ].filter(d => d.value > 0);




  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-gray-200 dark:border-white/5 dashboard-header">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Recruiter Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of your recruitment activities and performance.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/recruiter/post" className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white dark:text-black font-semibold rounded-full shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm">
            <i className="fas fa-plus"></i> <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none kpi-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Jobs</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{jobs.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <i className="fas fa-briefcase"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none kpi-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Applications</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{interviews.length}</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <i className="fas fa-users"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none kpi-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pending Review</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{interviews.filter(i => i.status === 'Pending').length}</h3>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-xl">
              <i className="fas fa-clock"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none kpi-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Action Taken</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{requests.filter(r => r.status !== 'pending').length + interviews.filter(i => i.status && i.status !== 'Pending').length}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <i className="fas fa-check-double"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none kpi-card cursor-pointer" onClick={() => window.location.hash = '/recruiter/tests'}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Assessments</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">Manage Tests</h3>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl">
              <i className="fas fa-clipboard-list"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section - Bento Grid Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Job Posting Activity - Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none analytics-card">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Posting Activity</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Number of jobs posted recently</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} className="dark:stroke-[#333]" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #1a1a1a)', border: '1px solid var(--tooltip-border, #333)', borderRadius: '8px', color: 'var(--tooltip-text, #fff)' }}
                  itemStyle={{ color: 'var(--tooltip-text, #fff)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application Status - Pie Chart */}
        <div className="bg-white dark:bg-[#111] p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none analytics-card overflow-hidden">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Status</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Distribution & Recent Activity</p>
          </div>
          <div className="flex flex-col">
            <div className="h-[200px] w-full relative mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #1a1a1a)', border: '1px solid var(--tooltip-border, #333)', borderRadius: '8px', color: 'var(--tooltip-text, #fff)' }}
                    itemStyle={{ color: 'var(--tooltip-text, #fff)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {statusData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                  No data available
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mb-4 flex-wrap">
              {statusData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{entry.name}</span>
                </div>
              ))}
            </div>

            {/* Top 2 Requests List */}
            <div className="mt-auto border-t border-gray-100 dark:border-white/5 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Requests</h4>
                <Link to="/recruiter/requests" className="text-[10px] text-primary hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {requests.slice(0, 2).map(req => (
                  <div key={req.id} className="flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{req.candidateName || 'Candidate'}</p>
                      <p className="text-xs text-gray-500 truncate">{req.jobTitle}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${req.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : req.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      {req.status}
                    </span>
                  </div>
                ))}
                {requests.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No requests yet.</p>}
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Jobs Table Section */}
      <div className="mt-8 jobs-table-section">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Your Posted Jobs</h2>

        {jobs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/5 border-dashed">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
              <i className="fas fa-clipboard-list text-2xl"></i>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't posted any jobs yet.</p>
            <Link to="/recruiter/post" className="text-primary font-medium hover:underline hover:text-primary-light transition-colors">Create your first job posting</Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/5">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Title</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Posted Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deadline</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{job.title}</div>
                        <div className="text-xs text-gray-500">{job.location || 'Remote'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.applyDeadline?.toDate ? job.applyDeadline.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                        <Link to={`/recruiter/job/${job.id}/candidates`} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="View Candidates">
                          <i className="fas fa-users"></i>
                        </Link>
                        <Link to={`/recruiter/edit-job/${job.id}`} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit">
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button onClick={() => handleDelete(job.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterDashboard;