import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp, Timestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMessageBox } from '../components/MessageBox';
import { GoogleGenAI } from '@google/genai';

const MockInterviewSetup: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLinkedin, setFetchingLinkedin] = useState(false);
  const messageBox = useMessageBox();
  const [activeTab, setActiveTab] = useState<'video' | 'assessment'>('video');
  const [assessmentType, setAssessmentType] = useState<'aptitude' | 'coding'>('aptitude');
  const [assessmentTopic, setAssessmentTopic] = useState('');

  const fetchLinkedinJob = async () => {
    if (!linkedinUrl) return;
    setFetchingLinkedin(true);
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(linkedinUrl)}&disableCache=true`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (!data.contents) {
        throw new Error("Failed to retrieve page content via proxy.");
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, "text/html");

      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      let jobData = null;

      for (let i = 0; i < scripts.length; i++) {
        try {
          const json = JSON.parse(scripts[i].textContent || '{}');
          if (json['@type'] === 'JobPosting') {
            jobData = json;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      let title = '';
      let description = '';

      if (jobData) {
        title = jobData.title || '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = jobData.description || '';
        description = tempDiv.textContent || tempDiv.innerText || '';
      } else {
        title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title || '';
        const descElement = doc.querySelector('.show-more-less-html__markup') ||
          doc.querySelector('.description__text') ||
          doc.querySelector('.job-description');
        if (descElement) {
          description = descElement.textContent?.trim() || '';
        }
      }

      if (!description) {
        throw new Error("Could not extract job description.");
      }

      setJobTitle(title);
      setJobDesc(description);
    } catch (error: any) {
      console.error("LinkedIn Fetch Error:", error);
      messageBox.showError("Could not fetch job data. Please enter details manually.");
    } finally {
      setFetchingLinkedin(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !jobTitle || !jobDesc) return;
    setLoading(true);

    try {
      // Check Wallet Balance
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentBalance = userSnap.data()?.walletBalance || 0;
      const INTERVIEW_COST = 10;

      if (currentBalance < INTERVIEW_COST) {
        messageBox.showConfirm(
          `Insufficient wallet balance (${currentBalance} pts). A mock interview requires ${INTERVIEW_COST} points. Would you like to add points?`,
          () => navigate('/candidate/payment')
        );
        setLoading(false);
        return;
      }

      // Deduct Points
      await updateDoc(userRef, {
        walletBalance: increment(-INTERVIEW_COST)
      });

      // Create a temporary/mock job
      const docRef = await addDoc(collection(db, 'jobs'), {
        title: jobTitle,
        description: jobDesc,
        companyName: 'Mock Interview',
        isMock: true,
        recruiterUID: user.uid, // User owns this mock job
        createdAt: serverTimestamp(),
        applyDeadline: Timestamp.fromDate(new Date(Date.now() + 86400000 * 365)), // 1 year
        interviewPermission: 'anyone', // Allow immediate start
        skills: '',
        category: 'Mock'
      });

      navigate(`/interview/${docRef.id}`);
    } catch (err) {
      console.error(err);
      messageBox.showError("Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assessmentTopic) return;
    setLoading(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const prompt = assessmentType === 'aptitude' 
        ? `Generate 5 aptitude multiple choice questions about "${assessmentTopic}". Return ONLY a JSON array with format: [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0 }] (0-3 index). No markdown.`
        : `Generate 1 coding problem about "${assessmentTopic}". Return ONLY a JSON array with format: [{ "title": "...", "description": "...", "testCases": "Input: ... Output: ..." }]. No markdown.`;
      
      const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: {
          parts: [{ text: prompt }]
        }
      });
      const text = (response.candidates?.[0]?.content?.parts?.[0]?.text || "").replace(/```json|```/g, '').trim();
      const questions = JSON.parse(text);

      const docRef = await addDoc(collection(db, 'tests'), {
        title: `${assessmentType === 'aptitude' ? 'Aptitude' : 'Coding'} Practice: ${assessmentTopic}`,
        type: assessmentType,
        questions,
        duration: 15, // 15 minutes for practice
        recruiterUID: user.uid, // User owns this mock test
        isMock: true,
        createdAt: serverTimestamp()
      });

      navigate(`/candidate/test/${docRef.id}`);
    } catch (error) {
      console.error("Error creating assessment:", error);
      messageBox.showError("Failed to generate assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 transition-colors duration-300">
      <div className="w-full relative z-10">

        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-gray-200 dark:border-white/10">
            <button 
                onClick={() => setActiveTab('video')}
                className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'video' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <i className="fas fa-video mr-2"></i> Video Interview
            </button>
            <button 
                onClick={() => setActiveTab('assessment')}
                className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'assessment' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <i className="fas fa-laptop-code mr-2"></i> Skill Assessment
            </button>
        </div>

        {activeTab === 'video' ? (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-16 items-start">

            {/* Left Side: Info & LinkedIn */}
            <div className="w-full lg:w-5/12 space-y-4 lg:space-y-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Mock Interview Setup</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Practice for any job role. Paste a job link or describe the role manually to get started.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800">
                  <i className="fas fa-coins"></i> Cost: 10 Points
                </div>
              </div>

              {/* LinkedIn Import - Clean Design */}
              <div className="bg-white dark:bg-[#111] rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-200 dark:border-white/5 shadow-lg shadow-gray-100/50 dark:shadow-none">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#0077b5] flex items-center justify-center text-white shadow-md">
                      <i className="fab fa-linkedin-in text-xl"></i>
                    </span>
                    Import from LinkedIn
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fas fa-link text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                    </div>
                    <input
                      type="url"
                      placeholder="Paste LinkedIn Job URL..."
                      className="w-full pl-10 pr-4 py-4 border border-gray-200 dark:border-white/10 rounded-2xl text-sm bg-gray-50 dark:bg-[#050505] dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={fetchLinkedinJob}
                    disabled={fetchingLinkedin || !linkedinUrl}
                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg active:scale-95"
                  >
                    {fetchingLinkedin ? (
                      <><i className="fas fa-circle-notch fa-spin"></i> Fetching...</>
                    ) : (
                      <><i className="fas fa-magic"></i> Auto-Fill Details</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Divider for Mobile */}
            <div className="flex lg:hidden items-center gap-4 w-full my-2">
              <div className="h-px bg-gray-200 dark:bg-slate-800 flex-1"></div>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider px-2">Or Enter Manually</span>
              <div className="h-px bg-gray-200 dark:bg-slate-800 flex-1"></div>
            </div>

            {/* Right Side: Manual Form */}
            <div className="w-full lg:w-7/12">
              <div className="bg-white dark:bg-[#111] p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-none">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <i className="fas fa-pen-to-square text-primary"></i> Manual Entry
                </h2>
                <form onSubmit={handleStart} className="space-y-6">
                  <div className="space-y-2 group">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1 group-focus-within:text-primary transition-colors">Job Title</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior Frontend Engineer"
                        className="w-full pl-4 pr-4 py-4 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-white dark:bg-[#111] dark:text-white font-medium placeholder-gray-400 shadow-sm"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1 group-focus-within:text-primary transition-colors">Job Description</label>
                    <div className="relative">
                      <textarea
                        required
                        rows={6}
                        placeholder="Paste the full job description here..."
                        className="w-full p-4 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-white dark:bg-[#111] dark:text-white resize-none font-medium leading-relaxed placeholder-gray-400 shadow-sm"
                        value={jobDesc}
                        onChange={(e) => setJobDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 hover:to-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-1 active:scale-[0.98] disabled:opacity-70 disabled:transform-none flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <><i className="fas fa-circle-notch fa-spin"></i> Setting up...</>
                      ) : (
                        <><i className="fas fa-play"></i> Start Mock Interview</>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center justify-center gap-1.5">
                      <i className="fas fa-shield-alt text-green-500"></i> AI-Powered & Secure Environment
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-[#111] p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Practice Assessment</h2>
                <form onSubmit={handleStartAssessment} className="space-y-6">
                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Assessment Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setAssessmentType('aptitude')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${assessmentType === 'aptitude' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                            >
                                <i className="fas fa-brain text-2xl"></i>
                                <span className="font-bold">Aptitude</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAssessmentType('coding')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${assessmentType === 'coding' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                            >
                                <i className="fas fa-code text-2xl"></i>
                                <span className="font-bold">Coding</span>
                            </button>
                        </div>
                    </div>

                    {/* Topic Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Topic / Skill</label>
                        <input 
                            type="text" 
                            required
                            placeholder={assessmentType === 'aptitude' ? "e.g. Logical Reasoning, Mathematics" : "e.g. JavaScript Arrays, Python Algorithms"}
                            className="w-full p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-[#050505] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={assessmentTopic}
                            onChange={(e) => setAssessmentTopic(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 hover:to-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><i className="fas fa-circle-notch fa-spin"></i> Generating...</>
                        ) : (
                            <><i className="fas fa-play"></i> Start Practice Test</>
                        )}
                    </button>
                </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockInterviewSetup;