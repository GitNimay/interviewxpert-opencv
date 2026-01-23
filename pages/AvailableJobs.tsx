import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Link } from 'react-router-dom';
import { JOB_CATEGORIES } from './Profile';

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  type: string;
  description?: string;
  category?: string;
  skills?: string;
  createdAt?: any;
}

const AvailableJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.skills && job.skills.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
      const matchesType = selectedType === 'All' || job.type === selectedType;
      const isNotMock = !(job as any).isMock;
      return matchesSearch && matchesCategory && matchesType && isNotMock;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateA - dateB;
      }
      // Default newest
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });

  if (loading) return <div className="text-center py-10">Loading jobs...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-6 overflow-x-auto">
          <Link to="/jobs" className="text-primary font-bold border-b-2 border-primary pb-4 -mb-4 whitespace-nowrap">Available Jobs</Link>
          <Link to="/my-interviews" className="text-gray-500 hover:text-primary font-medium whitespace-nowrap">My Interviews</Link>
          <Link to="/profile" className="text-gray-500 hover:text-primary font-medium whitespace-nowrap">My Profile</Link>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">All Available Positions</h2>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by title, company, or skills..."
            className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="All">All Categories</option>
            {JOB_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="All">All Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map(job => (
          <div key={job.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg text-gray-800 mb-1">{job.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{job.companyName}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"><i className="fas fa-map-marker-alt mr-1"></i>{job.location}</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"><i className="fas fa-briefcase mr-1"></i>{job.type}</span>
              {job.category && <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded"><i className="fas fa-tag mr-1"></i>{job.category}</span>}
            </div>

            <p className="text-sm text-gray-500 mb-4 line-clamp-3">{job.description}</p>

            <button
              onClick={() => setSelectedJob(job)}
              className="block w-full text-center px-4 py-2 bg-gray-50 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors font-medium text-sm"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                <p className="text-lg text-gray-600">{selectedJob.companyName}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <i className="fas fa-map-marker-alt text-gray-400"></i> {selectedJob.location}
                </span>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <i className="fas fa-briefcase text-gray-400"></i> {selectedJob.type}
                </span>
                {selectedJob.category && (
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <i className="fas fa-tag text-blue-400"></i> {selectedJob.category}
                  </span>
                )}
                {selectedJob.createdAt && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <i className="far fa-clock text-gray-400"></i> Posted {selectedJob.createdAt?.toDate ? selectedJob.createdAt.toDate().toLocaleDateString() : 'Recently'}
                  </span>
                )}
              </div>

              {selectedJob.skills && (
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.split(',').map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-100">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Job Description</h3>
                <div className="prose max-w-none text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">
                  {selectedJob.description || "No description provided."}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <Link
                to={`/jobs/${selectedJob.id}`}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableJobs;