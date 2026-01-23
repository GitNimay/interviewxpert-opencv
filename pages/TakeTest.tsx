import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { GoogleGenAI } from '@google/genai';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, Clock, Code, Terminal, Play, FileCode, Settings } from 'lucide-react';

const TakeTest: React.FC = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [codeLang, setCodeLang] = useState('javascript');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmitRef = useRef<() => void>(() => { });

  useEffect(() => {
    const fetchTest = async () => {
      if (!testId) return;
      const snap = await getDoc(doc(db, 'tests', testId));
      if (snap.exists()) {
        const testData = { id: snap.id, ...snap.data() } as any;
        setTest(testData);
        if (testData.duration && !isNaN(Number(testData.duration))) {
          setTimeLeft(testData.duration * 60);
        }
      }
    };
    fetchTest();
  }, [testId]);

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitting]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleAnswer = (val: any) => {
    setAnswers({ ...answers, [currentQ]: val });
  };

  const handleSubmit = async () => {
    if (!auth.currentUser || !test || !test.questions) return;
    setSubmitting(true);

    let score = 0;
    let feedback = '';

    if (test.type === 'aptitude') {
      let correctCount = 0;
      test.questions.forEach((q: any, i: number) => {
        if (answers[i] === q.correctIndex) correctCount++;
      });
      score = Math.round((correctCount / test.questions.length) * 100);
    } else {
      // AI Grading for Coding
      try {
        const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

        const prompt = `Evaluate this code submission for the problem: "${test.questions[currentQ].title}".
        Description: ${test.questions[currentQ].description}
        Language: ${codeLang}
        Code:
        ${answers[currentQ] || ''}
        
        Return ONLY a JSON object: { "score": number (0-100), "feedback": "string" }. Score based on correctness and logic.`;

        const response = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: {
            parts: [{ text: prompt }]
          }
        });
        const text = (response.candidates?.[0]?.content?.parts?.[0]?.text || "").replace(/```json|```/g, '').trim();
        const evalData = JSON.parse(text);
        score = evalData.score;
        feedback = evalData.feedback;
      } catch (e) {
        console.error("Grading failed", e);
        score = 0; // Fallback
      }
    }

    await addDoc(collection(db, 'testSubmissions'), {
      testId,
      candidateUID: auth.currentUser.uid,
      candidateName: auth.currentUser.displayName || 'Candidate',
      answers,
      score,
      feedback,
      tabSwitchCount,
      submittedAt: serverTimestamp()
    });

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(e => console.error(e));
    }

    navigate('/candidate/jobs');
  };

  // Update ref in effect to avoid render side-effects
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0) {
      handleSubmitRef.current?.();
    }
  }, [timeLeft]);

  if (!test) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (!test.questions || test.questions.length === 0) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <p className="text-xl mb-4">This test has no questions.</p>
        <button onClick={() => navigate('/candidate/jobs')} className="text-blue-500 hover:underline">Go Back</button>
      </div>
    );
  }

  const question = test.questions?.[currentQ];

  if (!question) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <p>Error loading question.</p>
        <button onClick={() => navigate('/candidate/jobs')} className="ml-4 text-blue-500 hover:underline">Go Back</button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{test.title}</h1>
          <p className="text-sm text-gray-500">Question {currentQ + 1} of {test.questions.length}</p>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold ${timeLeft < 60 ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-600 bg-gray-50 dark:bg-gray-700/20'}`}>
              <Clock size={16} /> {formatTime(timeLeft)}
            </div>
          )}
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-lg text-sm font-bold">
            <AlertTriangle size={16} /> No Copy Paste Allowed
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
          <AlertTriangle size={16} className="inline mr-2" />
          Tab switching is monitored.
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 w-full p-4 md:p-6 ${test.type === 'coding' ? 'max-w-[1600px] mx-auto' : 'max-w-4xl mx-auto'}`}>
        {test.type === 'aptitude' ? (
          <div className="bg-white dark:bg-[#111] p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mt-8">
            <h2 className="text-xl font-bold mb-6">{question.question || 'Question text missing'}</h2>
            <div className="space-y-3">
              {question.options?.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${answers[currentQ] === i
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-[#1a1a1a] border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
            {/* Problem Description Panel */}
            <div className="lg:col-span-2 bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#161616] flex items-center gap-2">
                <FileCode size={18} className="text-blue-500" />
                <h2 className="font-bold text-gray-800 dark:text-white">Problem Description</h2>
              </div>
              <div className="p-6 overflow-y-auto flex-1 prose dark:prose-invert max-w-none">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{question.title || 'Problem Title'}</h3>
                <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-6 text-sm leading-relaxed">
                  {question.description || 'No description provided.'}
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wider">Test Cases</h4>
                  <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-200 dark:border-white/5 font-mono text-sm text-gray-700 dark:text-gray-300">
                    {question.testCases || 'No test cases provided.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Code Editor Panel */}
            <div className="lg:col-span-3 flex flex-col bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Code size={16} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-300">Code Editor</span>
                  </div>
                  <div className="h-4 w-px bg-[#444]"></div>
                  <select
                    value={codeLang}
                    onChange={e => setCodeLang(e.target.value)}
                    className="bg-[#333] text-gray-200 text-xs rounded px-2 py-1 border border-[#444] focus:outline-none focus:border-blue-500 hover:bg-[#3c3c3c] transition-colors cursor-pointer"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors" title="Settings">
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 relative group bg-[#1e1e1e]">
                {/* Line Numbers (Visual only) */}
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#1e1e1e] border-r border-[#333] flex flex-col items-end pt-4 pr-2 text-gray-600 text-xs font-mono select-none pointer-events-none">
                  {Array.from({ length: 20 }).map((_, i) => <div key={i} className="leading-6">{i + 1}</div>)}
                </div>
                <textarea
                  value={answers[currentQ] || ''}
                  onChange={e => handleAnswer(e.target.value)}
                  onPaste={e => e.preventDefault()}
                  className="w-full h-full pl-12 pr-4 py-4 bg-[#1e1e1e] text-gray-300 font-mono text-sm resize-none outline-none leading-6"
                  placeholder={`// Write your ${codeLang} solution here...\n\nfunction solution() {\n  // your code\n}`}
                  spellCheck={false}
                  style={{ tabSize: 2 }}
                />
              </div>

              {/* Editor Footer / Console */}
              <div className="bg-[#252526] border-t border-[#333]">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Terminal size={12} />
                    <span>Console Output</span>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors">
                    <Play size={12} /> Run Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] flex justify-end gap-4">
        {currentQ > 0 && <button onClick={() => setCurrentQ(c => c - 1)} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">Previous</button>}
        {currentQ < test.questions.length - 1 ? (
          <button onClick={() => setCurrentQ(c => c + 1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Next</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Test'}</button>
        )}
      </div>
    </div>
  );
};

export default TakeTest;