import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowRight, Building2, DollarSign, Briefcase } from 'lucide-react';

interface Job {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  jobType: string;
  salaryRange?: string;
  status: string;
  createdAt: any;
  deadline?: string;
  isMock?: boolean;
  jobDescription?: string;
}

const LandingJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const q = query(
          collection(db, 'jobs'),
          limit(50) // Increased limit to ensure we find valid jobs after expiration filtering
        );
        
        const querySnapshot = await getDocs(q);
        const jobsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];

        // Filter out expired jobs and sort by newest
        const now = new Date();
        const validJobs = jobsData
          .filter(job => {
            if (job.isMock) return false;
            if (job.deadline) {
              return new Date(job.deadline) > now;
            }
            return true;
          })
          .sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          })
          .slice(0, 6); // Show top 6

        setJobs(validJobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleApply = () => {
    if (auth.currentUser) {
      navigate('/candidate/jobs');
    } else {
      navigate('/auth');
    }
  };

  if (loading) return null;

  return (
    <section id="jobs" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore <span className="text-blue-600 dark:text-blue-400">Active Opportunities</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover roles that match your skills and aspirations. Join top companies hiring now.
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No active job openings at the moment. Please check back later.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {jobs.map((job) => (
            <div 
              key={job.id}
              className="group bg-white dark:bg-[#121212] rounded-2xl p-6 shadow-sm hover:shadow-2xl border border-gray-100 dark:border-white/5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30">
                  <Building2 size={28} />
                </div>
                {job.createdAt?.toDate && (new Date().getTime() - job.createdAt.toDate().getTime()) < 7 * 24 * 60 * 60 * 1000 && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                    New
                  </span>
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {job.jobTitle}
                </h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{job.companyName}</p>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/5">
                  <MapPin size={12} /> {job.location}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/5">
                  <Briefcase size={12} /> {job.jobType || 'Full-time'}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-6">
                {job.jobDescription?.replace(/<[^>]*>/g, '') || 'View details to learn more about this opportunity.'}
              </p>

              <div className="space-y-3 mb-6 flex-grow">
                {job.salaryRange && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <div className="w-6 h-6 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                      <DollarSign size={14} />
                    </div>
                    <span>{job.salaryRange}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock size={16} className="text-gray-400" />
                    <span>Posted {job.createdAt?.toDate ? new Date(job.createdAt.toDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}</span>
                </div>
              </div>

              <button 
                onClick={handleApply}
                className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:bg-blue-600 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-500/20 mt-auto"
              >
                Apply Now <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
        )}

        <div className="mt-16 text-center">
            <button 
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5"
            >
                View All Jobs <ArrowRight size={18} />
            </button>
        </div>
      </div>
    </section>
  );
};

export default LandingJobs;