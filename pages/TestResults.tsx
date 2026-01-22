import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArrowLeft, AlertTriangle, User, FileText, X, Check, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TestResults: React.FC = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!testId) return;
      try {
        // Fetch Test Details
        const testSnap = await getDoc(doc(db, 'tests', testId));
        if (testSnap.exists()) {
          setTest({ id: testSnap.id, ...testSnap.data() });
        }

        const q = query(
          collection(db, 'testSubmissions'),
          where('testId', '==', testId)
        );
        const snap = await getDocs(q);
        const fetchedSubmissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedSubmissions.sort((a: any, b: any) => {
          const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(0);
          const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        setSubmissions(fetchedSubmissions);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [testId]);

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/recruiter/tests')} className="flex items-center gap-2 text-gray-500 hover:text-blue-500 mb-6">
          <ArrowLeft size={18} /> Back to Assessments
        </button>
        
        <h1 className="text-3xl font-bold mb-8">Test Results</h1>

        {loading ? (
          <div className="text-center py-20 opacity-50">Loading results...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <p className="text-gray-500">No submissions yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
            {submissions.map((sub, i) => (
              <div key={sub.id} className={`p-6 flex justify-between items-center ${i !== submissions.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}>
                <div>
                  <h3 className="font-bold text-lg">{sub.candidateName}</h3>
                  <p className="text-sm text-gray-500">Submitted: {sub.submittedAt?.toDate().toLocaleString()}</p>
                  {sub.tabSwitchCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                      <AlertTriangle size={14} /> Tab switched {sub.tabSwitchCount} time(s)
                    </div>
                  )}
                  {sub.feedback && <p className="text-sm text-gray-400 mt-1 italic">"{sub.feedback}"</p>}
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${sub.score >= 70 ? 'text-green-500' : sub.score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>{sub.score}%</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/profile/${sub.candidateUID}`)}
                      className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      title="View Profile"
                    >
                      <User size={18} />
                    </button>
                    <button 
                      onClick={() => setSelectedSubmission(sub)}
                      className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                      title="View Solution"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Solution Modal */}
        {selectedSubmission && test && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedSubmission(null)}>
            <div className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#111] text-white' : 'bg-white text-gray-900'}`} onClick={e => e.stopPropagation()}>
              <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-white/10 bg-[#161616]' : 'border-gray-200 bg-gray-50'}`}>
                <div>
                  <h3 className="font-bold text-lg">{selectedSubmission.candidateName}'s Solution</h3>
                  <p className="text-xs text-gray-500">Score: {selectedSubmission.score}%</p>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {test.questions?.map((q: any, i: number) => (
                  <div key={i} className="mb-8 last:mb-0">
                    <h4 className={`font-bold mb-3 flex gap-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      <span className="text-gray-400">Q{i+1}.</span> 
                      {test.type === 'aptitude' ? q.question : q.title}
                    </h4>
                    
                    {test.type === 'aptitude' ? (
                      <div className="space-y-2">
                        {q.options?.map((opt: string, optIdx: number) => {
                          const isSelected = selectedSubmission.answers?.[i] === optIdx;
                          const isCorrect = q.correctIndex === optIdx;
                          let itemClass = `p-3 rounded-lg border text-sm flex justify-between items-center `;
                          
                          if (isCorrect) itemClass += isDark ? "bg-green-900/20 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-700";
                          else if (isSelected && !isCorrect) itemClass += isDark ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-50 border-red-200 text-red-700";
                          else itemClass += isDark ? "bg-[#1a1a1a] border-white/5 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600";

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
                        <pre className="text-sm font-mono text-gray-300">{selectedSubmission.answers?.[i] || '// No code submitted'}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;