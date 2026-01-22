import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Code, Eye, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const RecruiterTests: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  useEffect(() => {
    const fetchTests = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'tests'),
          where('recruiterUID', '==', auth.currentUser.uid)
        );
        const snap = await getDocs(q);
        const fetchedTests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedTests.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        setTests(fetchedTests);
      } catch (error) {
        console.error("Error fetching tests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this test?")) {
      await deleteDoc(doc(db, 'tests', id));
      setTests(tests.filter(t => t.id !== id));
    }
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Assessments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage aptitude and coding tests for candidates.</p>
          </div>
          <Link to="/recruiter/tests/create" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all">
            <Plus size={20} /> Create New Test
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-50">Loading assessments...</div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <p className="text-gray-500 mb-4">No tests created yet.</p>
            <Link to="/recruiter/tests/create" className="text-blue-600 hover:underline">Create your first assessment</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map(test => (
              <div key={test.id} className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${test.type === 'coding' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600'}`}>
                    {test.type === 'coding' ? <Code size={24} /> : <FileText size={24} />}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/recruiter/tests/${test.id}/results`)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="View Results">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleDelete(test.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{test.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                  <span className="capitalize">{test.type} Test</span>
                  <span>•</span>
                  <span>{test.questions?.length || 0} Questions</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {test.duration || 'N/A'} min</span>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Created {test.createdAt?.toDate().toLocaleDateString()}</span>
                  <button onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/#/candidate/test/${test.id}`);
                    alert("Test link copied to clipboard!");
                  }} className="text-sm font-bold text-blue-600 hover:underline">Copy Link</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterTests;