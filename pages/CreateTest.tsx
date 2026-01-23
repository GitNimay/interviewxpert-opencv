import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Save, ArrowLeft, Plus, Trash } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const CreateTest: React.FC = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [type, setType] = useState<'aptitude' | 'coding'>('aptitude');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(10); // Default 10 minutes
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Manual Question State
  const [manualQ, setManualQ] = useState({ question: '', options: ['', '', '', ''], correct: 0 });
  const [manualCodeQ, setManualCodeQ] = useState({ title: '', description: '', testCases: '' });

  const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setLoading(true);
    try {
      const prompt = type === 'aptitude'
        ? `Generate 5 aptitude multiple choice questions about "${aiPrompt}". Return ONLY a raw JSON array. Schema: [{"question": "string", "options": ["string", "string", "string", "string"], "correctIndex": number}]`
        : `Generate 1 coding problem about "${aiPrompt}". Return ONLY a raw JSON array. Schema: [{"title": "string", "description": "string", "testCases": "string"}]`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          parts: [{ text: prompt }]
        }],
        config: {
          responseMimeType: "application/json"
        }
      });
      
      let text = "";
      if ((response as any).response && typeof (response as any).response.text === 'function') {
         text = (response as any).response.text();
      } else if (response.candidates && response.candidates.length > 0) {
         text = response.candidates[0].content?.parts?.[0]?.text || "";
      }

      if (!text) throw new Error("No response from AI");
      
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const generated = JSON.parse(cleanText);
      setQuestions([...questions, ...generated]);
    } catch (error) {
      console.error("AI Error:", error);
      alert("Failed to generate questions. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const addManualQuestion = () => {
    if (type === 'aptitude') {
      setQuestions([...questions, { ...manualQ, correctIndex: Number(manualQ.correct) }]);
      setManualQ({ question: '', options: ['', '', '', ''], correct: 0 });
    } else {
      setQuestions([...questions, manualCodeQ]);
      setManualCodeQ({ title: '', description: '', testCases: '' });
    }
  };

  const handleSave = async () => {
    if (!title || questions.length === 0) return alert("Add title and at least one question.");
    setLoading(true);
    try {
      await addDoc(collection(db, 'tests'), {
        recruiterUID: auth.currentUser?.uid,
        title,
        type,
        duration,
        questions,
        createdAt: serverTimestamp()
      });
      navigate('/recruiter/tests');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-blue-500 mb-6">
          <ArrowLeft size={18} /> Back
        </button>

        <h1 className="text-3xl font-bold mb-8">Create Assessment</h1>

        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold mb-2">Test Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 outline-none" placeholder="e.g. Frontend React Quiz" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Test Type</label>
              <select value={type} onChange={(e: any) => { setType(e.target.value); setQuestions([]); }} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 outline-none">
                <option value="aptitude">Aptitude (MCQ)</option>
                <option value="coding">Coding Challenge</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">Duration (minutes)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min="1"
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 outline-none" placeholder="e.g. 15" />
            </div>
          </div>

          {/* AI Generator */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 mb-8">
            <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
              <Sparkles size={18} /> AI Generator
            </h3>
            <div className="flex gap-2">
              <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder={`Enter topic for ${type} questions...`} className="flex-1 p-3 rounded-xl bg-white dark:bg-[#050505] border border-blue-200 dark:border-blue-800 outline-none" />
              <button onClick={handleAiGenerate} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="mb-8 border-t border-gray-100 dark:border-white/5 pt-6">
            <h3 className="font-bold mb-4">Add Manually</h3>
            {type === 'aptitude' ? (
              <div className="space-y-3">
                <input type="text" placeholder="Question" value={manualQ.question} onChange={e => setManualQ({ ...manualQ, question: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10" />
                <div className="grid grid-cols-2 gap-3">
                  {manualQ.options.map((opt, i) => (
                    <input key={i} type="text" placeholder={`Option ${i + 1}`} value={opt} onChange={e => {
                      const newOpts = [...manualQ.options]; newOpts[i] = e.target.value;
                      setManualQ({ ...manualQ, options: newOpts });
                    }} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10" />
                  ))}
                </div>
                <select value={manualQ.correct} onChange={e => setManualQ({ ...manualQ, correct: Number(e.target.value) })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10">
                  {manualQ.options.map((_, i) => <option key={i} value={i}>Correct Option: {i + 1}</option>)}
                </select>
                <button onClick={addManualQuestion} className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl font-bold flex items-center justify-center gap-2">
                  <Plus size={18} /> Add Question
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input type="text" placeholder="Problem Title" value={manualCodeQ.title} onChange={e => setManualCodeQ({ ...manualCodeQ, title: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10" />
                <textarea placeholder="Problem Description" value={manualCodeQ.description} onChange={e => setManualCodeQ({ ...manualCodeQ, description: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 h-32" />
                <textarea placeholder="Test Cases (e.g. Input: 1 2, Output: 3)" value={manualCodeQ.testCases} onChange={e => setManualCodeQ({ ...manualCodeQ, testCases: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 h-24" />
                <button onClick={addManualQuestion} className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl font-bold flex items-center justify-center gap-2">
                  <Plus size={18} /> Add Problem
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <h3 className="font-bold mb-4">Questions ({questions.length})</h3>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5 relative group">
                  <button onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash size={18} />
                  </button>
                  {type === 'aptitude' ? (
                    <>
                      <p className="font-bold mb-2">{i + 1}. {q.question}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {q.options.map((opt: string, idx: number) => (
                          <div key={idx} className={`p-2 rounded ${idx === q.correctIndex ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 dark:bg-white/5'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-bold mb-1">{i + 1}. {q.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{q.description}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || questions.length === 0} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={20} /> Save Assessment
        </button>
      </div>
    </div>
  );
};

export default CreateTest;