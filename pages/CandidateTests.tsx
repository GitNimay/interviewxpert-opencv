import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Code, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const CandidateTests: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        // Fetch all tests
        const testsSnap = await getDocs(collection(db, 'tests'));
        const testsData = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Fetch user's submissions to check status
        const subQuery = query(
          collection(db, 'testSubmissions'), 
          where('candidateUID', '==', auth.currentUser.uid)
        );
        const subSnap = await getDocs(subQuery);
        const subSet = new Set(subSnap.docs.map(d => d.data().testId));

        setTests(testsData);
        setSubmissions(subSet);
      } catch (error) {
        console.error("Error fetching tests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStartTest = async (testId: string) => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen failed:", e);
    }
    navigate(`/candidate/test/${testId}`);
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Assessments</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Take skill assessments to showcase your expertise to recruiters.</p>

        {loading ? (
          <div className="text-center py-20 opacity-50">Loading assessments...</div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <p className="text-gray-500">No assessments available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map(test => {
              const isTaken = submissions.has(test.id);
              return (
                <div key={test.id} className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${test.type === 'coding' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600'}`}>
                      {test.type === 'coding' ? <Code size={24} /> : <FileText size={24} />}
                    </div>
                    {isTaken && (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                        <CheckCircle size={12} /> Completed
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{test.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <span className="capitalize">{test.type}</span>
                    <span>•</span>
                    <span>{test.questions?.length || 0} Questions</span>
                  </div>

                  <div className="mt-auto">
                    {isTaken ? (
                      <button disabled className="w-full py-2.5 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-xl font-bold cursor-not-allowed">
                        Already Taken
                      </button>
                    ) : (
                      <button onClick={() => handleStartTest(test.id)} className="flex items-center justify-center w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20">
                        Start Assessment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateTests;