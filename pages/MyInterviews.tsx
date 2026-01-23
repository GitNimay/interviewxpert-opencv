import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Link } from 'react-router-dom';
import { Interview } from '../types';
import { X, Check, XCircle } from 'lucide-react';

const MyInterviews: React.FC = () => {
  const [realInterviews, setRealInterviews] = useState<Interview[]>([]);
  const [mockInterviews, setMockInterviews] = useState<Interview[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [activeTab, setActiveTab] = useState<'real' | 'mock' | 'assessment'>('real');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const handleViewAssessment = async (submission: any) => {
    setSelectedSubmission(submission);
    setViewLoading(true);
    try {
      if (submission.testId) {
        const testDoc = await getDoc(doc(db, 'tests', submission.testId));
        if (testDoc.exists()) {
          setSelectedTest({ id: testDoc.id, ...testDoc.data() });
        } else {
          setSelectedTest(null);
        }
      }
    } catch (error) {
      console.error("Error fetching test details", error);
    } finally {
      setViewLoading(false);
    }
  };

  const closeAssessmentModal = () => {
    setSelectedSubmission(null);
    setSelectedTest(null);
  };

  useEffect(() => {
    // Use onAuthStateChanged to wait for the user session to initialize
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Query for interviews where the user is the candidate
          const q = query(
            collection(db, 'interviews'),
            where('candidateUID', '==', user.uid)
          );

          const snap = await getDocs(q);
          const allInterviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interview));

          // Fetch mock jobs created by this user to exclude them
          const mockJobsQuery = query(
            collection(db, 'jobs'),
            where('recruiterUID', '==', user.uid),
            where('isMock', '==', true)
          );
          const mockJobsSnap = await getDocs(mockJobsQuery);
          const mockJobIds = new Set(mockJobsSnap.docs.map(doc => doc.id));

          // Separate interviews
          const real: Interview[] = [];
          const mock: Interview[] = [];

          allInterviews.forEach(interview => {
            if (mockJobIds.has(interview.jobId)) mock.push(interview);
            else real.push(interview);
          });

          setRealInterviews(real);
          setMockInterviews(mock);

          // Fetch Test Submissions (Assessments)
          const subQ = query(
            collection(db, 'testSubmissions'),
            where('candidateUID', '==', user.uid)
          );
          const subSnap = await getDocs(subQ);
          const subs = await Promise.all(subSnap.docs.map(async (d) => {
            const data = d.data();
            let jobTitle = data.testTitle || data.title;

            if (!jobTitle && data.testId) {
              try {
                const tDoc = await getDoc(doc(db, 'tests', data.testId));
                if (tDoc.exists()) jobTitle = tDoc.data().title;
              } catch (e) { /* ignore */ }
            }

            // Map fields to match Interview type for easier filtering/sorting
            return { id: d.id, ...data, jobTitle: jobTitle || 'Skill Assessment', submittedAt: data.submittedAt || data.createdAt, isAssessment: true };
          }));
          setAssessments(subs);

        } catch (err) {
          console.error("Error fetching interviews:", err);
        }
      }
      // Always set loading to false after the auth check completes
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentList = activeTab === 'real' ? realInterviews : activeTab === 'mock' ? mockInterviews : assessments;

  const filteredInterviews = currentList
    .filter(interview =>
      ((interview as any).jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const getScore = (val: any) => {
        if (!val) return 0;
        const match = String(val).match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[0]) : 0;
      };
      const scoreA = getScore(a.score);
      const scoreB = getScore(b.score);

      if (sortOrder === 'scoreHigh') {
        return scoreB - scoreA;
      }
      if (sortOrder === 'scoreLow') {
        return scoreA - scoreB;
      }
      // Default to newest
      const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : 0;
      const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : 0;
      return dateB - dateA;
    });

  if (loading) return <div className="text-center py-10 dark:text-gray-400">Loading your interviews...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Interview History</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-white/5">
        <button
          onClick={() => setActiveTab('real')}
          className={`pb-3 px-1 text-sm font-bold transition-all relative ${activeTab === 'real'
            ? 'text-primary border-b-2 border-primary'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
          Job Interviews <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-full text-xs">{realInterviews.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('mock')}
          className={`pb-3 px-1 text-sm font-bold transition-all relative ${activeTab === 'mock'
            ? 'text-primary border-b-2 border-primary'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
          Mock Interviews <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-full text-xs">{mockInterviews.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('assessment')}
          className={`pb-3 px-1 text-sm font-bold transition-all relative ${activeTab === 'assessment'
            ? 'text-primary border-b-2 border-primary'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
          Skill Assessments <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-full text-xs">{assessments.length}</span>
        </button>
      </div>

      <div className="mb-8 bg-white dark:bg-[#111] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
            <input
              type="text"
              placeholder="Search by job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white dark:bg-[#050505] dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div className="relative w-full md:w-64">
            <i className="fas fa-sort absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none bg-white dark:bg-[#050505] dark:text-white transition-all cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="scoreHigh">Score: High to Low</option>
              <option value="scoreLow">Score: Low to High</option>
            </select>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none text-xs"></i>
          </div>
        </div>
      </div>

      {filteredInterviews.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-[#111] rounded-lg shadow-sm border border-gray-100 dark:border-white/5">
          <p className="text-gray-500 dark:text-gray-400">No {activeTab === 'mock' ? 'mock' : activeTab === 'assessment' ? 'assessment' : 'job'} records found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInterviews.map(interview => {
            // Common logic for score parsing
            const score = parseInt(interview.score as string) || 0;
            const resumeScore = parseInt((interview as any).resumeScore) || 0;
            const qaScore = parseInt((interview as any).qaScore) ||
              parseInt((interview as any).qnaScore) ||
              parseInt((interview as any).qaQuality) ||
              parseInt((interview as any).technicalScore) ||
              parseInt((interview as any).communicationScore) || 0;

            // --- RENDER ASSESSMENT CARD ---
            if (activeTab === 'assessment') {
               return (
                <div key={interview.id} onClick={() => handleViewAssessment(interview)} className="group bg-white dark:bg-[#111] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-xl hover:border-teal-500/20 dark:hover:border-teal-500/20 transition-all duration-300 flex flex-col relative overflow-hidden cursor-pointer">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                          Assessment
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <i className="far fa-calendar-alt"></i>
                          {interview.submittedAt?.toDate ? interview.submittedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date N/A'}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1 group-hover:text-teal-600 transition-colors" title={(interview as any).jobTitle}>
                        {(interview as any).jobTitle}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-2xl font-black ${score >= 70 ? 'text-green-600 dark:text-green-400' : score >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'}`}>
                        {score}%
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Score</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 flex-grow relative z-10">
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-auto relative z-10">
                    <button className="flex items-center justify-center w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 group-hover:bg-teal-600 group-hover:text-white rounded-xl text-sm font-semibold transition-colors">
                      View Results
                    </button>
                  </div>
                </div>
               );
            }

            // --- RENDER INTERVIEW CARD (Existing) ---
            return (
              <div key={interview.id} className="group bg-white dark:bg-[#111] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300 flex flex-col relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {activeTab === 'mock' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          Mock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                          Job
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${interview.status === 'Hired' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                        interview.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                        }`}>
                        {interview.status || 'Pending'}
                      </span>

                      <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <i className="far fa-calendar-alt"></i>
                        {interview.submittedAt?.toDate ? interview.submittedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date N/A'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1 group-hover:text-primary transition-colors" title={(interview as any).jobTitle}>
                      {(interview as any).jobTitle || 'Untitled Position'}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className={`text-2xl font-black ${score >= 70 ? 'text-green-600 dark:text-green-400' :
                      score >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-500'
                      }`}>
                      {score}
                    </div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Score</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-grow relative z-10">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {(interview as any).jobDescription || 'View full report for details.'}
                  </p>

                  {/* Mini stats */}
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2 text-center border border-gray-100 dark:border-white/5">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Resume</div>
                      <div className="font-bold text-gray-800 dark:text-white">{resumeScore}%</div>
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2 text-center border border-gray-100 dark:border-white/5">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Q&A</div>
                      <div className="font-bold text-gray-800 dark:text-white">{qaScore}%</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-auto relative z-10">
                  <Link
                    to={`/report/${interview.id}`}
                    className="flex items-center justify-center w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white hover:border-primary dark:hover:bg-primary dark:hover:border-primary rounded-xl transition-all font-semibold text-sm group-hover:shadow-md"
                  >
                    View Full Report <i className="fas fa-arrow-right ml-2"></i>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assessment Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeAssessmentModal}>
          <div className="bg-white dark:bg-[#111] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-[#161616]">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Assessment Results</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Score: {selectedSubmission.score}%</p>
              </div>
              <button onClick={closeAssessmentModal} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {viewLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading questions...</p>
                </div>
              ) : !selectedTest ? (
                 <div className="text-center py-10 text-gray-500">
                   Test details not found. It may have been deleted.
                 </div>
              ) : (
                <div className="space-y-8">
                  {selectedTest.questions?.map((q: any, i: number) => (
                    <div key={i} className="border-b border-gray-100 dark:border-white/5 pb-6 last:border-0">
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex gap-2">
                        <span className="text-gray-400">Q{i+1}.</span> {selectedTest.type === 'aptitude' ? q.question : q.title}
                      </h4>

                      {selectedTest.type === 'aptitude' ? (
                        <div className="space-y-2">
                          {q.options?.map((opt: string, optIdx: number) => {
                            const isSelected = selectedSubmission.answers?.[i] === optIdx;
                            const isCorrect = q.correctIndex === optIdx;
                            
                            let itemClass = "p-3 rounded-lg border text-sm flex justify-between items-center transition-colors ";
                            if (isCorrect) itemClass += "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400";
                            else if (isSelected && !isCorrect) itemClass += "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400";
                            else itemClass += "bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400";

                            return (
                              <div key={optIdx} className={itemClass}>
                                <span>{opt}</span>
                                {isCorrect && <Check size={16} />}
                                {isSelected && !isCorrect && <XCircle size={16} />}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-[#1e1e1e] p-4 rounded-xl overflow-x-auto border border-gray-700">
                          <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                             <span className="text-xs text-gray-400 font-mono">Your Solution</span>
                             {selectedSubmission.feedback && <span className="text-xs text-yellow-500">AI Feedback Available</span>}
                          </div>
                          <pre className="text-sm font-mono text-gray-300">{selectedSubmission.answers?.[i] || '// No code submitted'}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyInterviews;