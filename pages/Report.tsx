import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { Interview } from '../types';
import { sendNotification } from '../services/notificationService';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const InterviewReport: React.FC = () => {
  const { interviewId } = useParams();
  const { userProfile } = useAuth();
  const { isDark } = useTheme();
  const [report, setReport] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [cvStats, setCvStats] = useState<any>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!interviewId) return;
      const docSnap = await getDoc(doc(db, 'interviews', interviewId));
      if (docSnap.exists()) {
        setReport({ id: docSnap.id, ...docSnap.data() } as Interview);

        if (docSnap.data().jobId) {
          try {
            const jobSnap = await getDoc(doc(db, 'jobs', docSnap.data().jobId));
            if (jobSnap.exists()) {
              setCompanyName(jobSnap.data().companyName);
            }
          } catch (error) {
            console.log("Job details fetch failed (public access)", error);
          }
        }

        if (docSnap.data().meta && docSnap.data().meta.cvStats) {
          setCvStats(docSnap.data().meta.cvStats);
        }

        const data = docSnap.data();
        const candidateId = data.candidateUID || data.candidateId || data.userId || data.uid;

        if (candidateId) {
          try {
            const profileSnap = await getDoc(doc(db, 'profiles', candidateId));
            if (profileSnap.exists()) {
              setProfile(profileSnap.data());
            }
          } catch (error) {
            console.log("Profile fetch restricted or failed", error);
          }

          try {
            const userSnap = await getDoc(doc(db, 'users', candidateId));
            if (userSnap.exists()) {
              setCandidateEmail(userSnap.data().email);
            } else if (data.candidateEmail) {
              setCandidateEmail(data.candidateEmail);
            }
          } catch (error) {
            if (data.candidateEmail) setCandidateEmail(data.candidateEmail);
          }
        }
      }
      setLoading(false);
    };
    fetchReport();
  }, [interviewId]);

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${isDark ? 'border-white' : 'border-gray-900'}`}></div>
    </div>
  );

  if (!report) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0a0a0a] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
      Report not found.
    </div>
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!report) return;
    try {
      await updateDoc(doc(db, 'interviews', report.id), { status: newStatus });
      setReport(prev => prev ? { ...prev, status: newStatus } : null);

      const candidateId = report.candidateUID || (report as any).candidateId || (report as any).userId || (report as any).uid;
      if (candidateId) {
        let notificationMessage = `Your application status has been updated to: ${newStatus}`;
        switch (newStatus) {
          case 'Hired': notificationMessage = `Congratulations! You have been Hired for ${report.jobTitle || 'the position'}.`; break;
          case 'Rejected': notificationMessage = `Update regarding your application for ${report.jobTitle || 'the position'}. Status: Rejected.`; break;
          case 'Interview Scheduled': notificationMessage = `Action Required: Interview scheduled for ${report.jobTitle}.`; break;
        }
        await sendNotification(candidateId, notificationMessage, 'status_update', auth.currentUser?.uid, 'Recruiter');
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // --- Header Background ---
    doc.setFillColor(30, 58, 138); // Dark Blue
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // --- Header Text ---
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Interview Report", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 35);
    
    // --- Candidate Info ---
    doc.setTextColor(0, 0, 0);
    let y = 60;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("Candidate Details", 20, y);
    y += 8;
    
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Name:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(report.candidateName, 50, y);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Job Title:`, 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(report.jobTitle, 140, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Company:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(companyName || 'N/A', 50, y);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Date:`, 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(report.submittedAt?.toDate().toLocaleDateString() || 'N/A', 140, y);
    
    y += 15;

    // --- Scores Section ---
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, 'FD');
    
    let scoreY = y + 12;
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("Performance Scores", 30, scoreY);
    
    scoreY += 12;
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Helper for score display
    const drawScore = (label: string, value: string | number, x: number) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, x, scoreY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 100, 0); // Greenish for score
        doc.text(`${value}`, x + doc.getTextWidth(label) + 5, scoreY);
        doc.setTextColor(0);
    };
    
    drawScore("Overall:", report.score, 30);
    drawScore("Resume:", report.resumeScore, 80);
    drawScore("Q&A:", report.qnaScore, 130);
    
    y += 50;

    // --- Visual Intelligence Analysis ---
    if (cvStats) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Visual Intelligence Analysis", 20, y);
        y += 8;
        
        doc.setDrawColor(200);
        doc.line(20, y, pageWidth - 20, y);
        y += 12;
        
        // Stats Grid
        doc.setFontSize(11);
        doc.setTextColor(0);
        
        // Eye Contact
        doc.setFont("helvetica", "bold");
        doc.text("Eye Contact:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${cvStats.eyeContactScore}%`, 60, y);
        
        // Confidence
        doc.setFont("helvetica", "bold");
        doc.text("Confidence:", 110, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${cvStats.confidenceScore || 85}%`, 150, y);
        y += 8;
        
        // Environment
        doc.setFont("helvetica", "bold");
        doc.text("Environment:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(cvStats.facesDetected > 1 ? 'Multiple Faces Detected' : 'Secure', 60, y);
        y += 8;
        
        // Expressions
        if (cvStats.expressions) {
            doc.setFont("helvetica", "bold");
            doc.text("Expressions:", 20, y);
            doc.setFont("helvetica", "normal");
            
            const expressions = Object.entries(cvStats.expressions)
                .map(([k, v]) => `${k} (${v})`)
                .join(', ');
            
            const expLines = doc.splitTextToSize(expressions, pageWidth - 60);
            doc.text(expLines, 60, y);
            y += (expLines.length * 6) + 10;
        } else {
            y += 10;
        }
    }

    // --- AI Feedback ---
    doc.addPage();
    y = 20;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("AI Feedback", 20, y);
    y += 8;
    
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    const cleanFeedback = report.feedback.replace(/\*\*/g, '');
    const feedbackLines = doc.splitTextToSize(cleanFeedback, pageWidth - 40);
    
    // Check page break for feedback
    if (y + (feedbackLines.length * 5) > pageHeight - 20) {
        doc.addPage();
        y = 20;
    }
    
    doc.text(feedbackLines, 20, y);
    y += (feedbackLines.length * 5) + 15;

    // --- Transcript ---
    if (y > pageHeight - 40) { doc.addPage(); y = 20; }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("Interview Transcript", 20, y);
    y += 10;

    report.questions.forEach((q, i) => {
      if (y > pageHeight - 40) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      const qLines = doc.splitTextToSize(`Q${i + 1}: ${q}`, pageWidth - 40);
      doc.text(qLines, 20, y);
      y += (qLines.length * 5) + 3;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      const aText = report.transcriptTexts[i] || "(No transcription)";
      const aLines = doc.splitTextToSize(aText, pageWidth - 40);
      doc.text(aLines, 20, y);
      y += (aLines.length * 5) + 10;
    });

    // --- Footer Verified Badge ---
    const badgeY = pageHeight - 30;
    
    // Badge Container
    doc.setDrawColor(37, 99, 235); // Blue-600
    doc.setLineWidth(0.5);
    doc.setFillColor(239, 246, 255); // Blue-50
    doc.roundedRect(pageWidth/2 - 50, badgeY, 100, 18, 4, 4, 'FD');
    
    // Icon & Title
    doc.setTextColor(22, 163, 74); // Green-600
    doc.setFontSize(14);
    doc.text("✔", pageWidth/2 - 42, badgeY + 11);
    
    doc.setTextColor(30, 58, 138); // Blue-900
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OFFICIALLY VERIFIED", pageWidth/2 - 32, badgeY + 7);
    
    // URL ID
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    const reportUrl = `${window.location.origin}/report/${report.id}`;
    doc.textWithLink(reportUrl, pageWidth/2 - 32, badgeY + 13, { url: reportUrl });

    doc.save(`${report.candidateName.replace(/\s+/g, '_')}_Report.pdf`);
  };

  const handleShare = async () => {
    // Ensure we share the clean, direct URL (handling HashRouter correctly)
    const url = window.location.href.split('?')[0];

    // Method 1: Modern Clipboard API (Secure Contexts)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        alert("Report URL copied to clipboard!");
        return;
      }
    } catch (err) {
      console.warn("Clipboard API failed, trying fallback...", err);
    }

    // Method 2: Fallback (HTTP/Mobile)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      
      // Ensure element is part of DOM but invisible
      textArea.style.position = "fixed";
      textArea.style.left = "0";
      textArea.style.top = "0";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999); // For mobile devices
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        alert("Report URL copied to clipboard!");
        return;
      }
    } catch (e) {
      console.error("Fallback failed", e);
    }

    // Method 3: Ultimate Fallback (Manual)
    prompt("Copy this link to share:", url);
  };

  const formatFeedback = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold ${isDark ? 'text-white' : 'text-gray-900'}">$1</strong>`)
      .split('\n').map((line, i) => <p key={i} className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`} dangerouslySetInnerHTML={{ __html: line }} />);
  };

  const scoreColor = (score: string | number) => {
    const s = parseInt(score.toString());
    if (s >= 75) return isDark ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800' : 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (s >= 50) return isDark ? 'text-amber-400 bg-amber-900/30 border-amber-800' : 'text-amber-600 bg-amber-50 border-amber-100';
    return isDark ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-red-600 bg-red-50 border-red-100';
  };

  const scoreBarColor = (score: string | number) => {
    const s = parseInt(score.toString());
    if (s >= 75) return 'bg-emerald-500';
    if (s >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#fafafa] text-gray-900'}`}>
      {/* Navbar / Header */}
      <div className={`${isDark ? 'bg-[#111]/80 backdrop-blur-md border-white/10' : 'bg-white/80 backdrop-blur-md border-gray-200'} border-b rounded-b-3xl sticky top-0 z-30 shadow-sm transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <Link to="/" className={`p-2 rounded-full ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}>
              <i className="fas fa-arrow-left text-lg"></i>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className={`text-xl font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{report.jobTitle}</h1>
              <div className={`flex flex-wrap items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="font-medium text-blue-500 truncate">{report.candidateName}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{companyName || 'Interview Report'}</span>
                <span className="hidden sm:inline">•</span>
                <span className="whitespace-nowrap">{report.submittedAt?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full lg:w-auto">
            {userProfile?.role === 'recruiter' ? (
              <div className="relative w-full sm:w-auto">
                <select
                  value={report.status || 'Pending'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`w-full sm:w-auto text-sm font-medium border pl-3 pr-8 py-2.5 rounded-xl cursor-pointer outline-none transition-all appearance-none bg-no-repeat bg-[right_0.75rem_center] ${isDark ? 'border-white/10 ring-1 ring-white/5 focus:ring-blue-500/50 hover:bg-white/5 text-white bg-[#1a1a1a]' : 'border-gray-200 ring-1 ring-gray-100 focus:ring-blue-500/50 hover:bg-gray-50 text-gray-900 bg-white'}`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${isDark ? '%239ca3af' : '%236b7280'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Reviewing">Reviewing</option>
                  <option value="Interview Scheduled">Scheduled</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            ) : (
              <div className={`h-10 px-4 flex items-center justify-center rounded-xl text-sm font-bold border w-full sm:w-auto ${
                report.status === 'Hired' ? (isDark ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200') :
                report.status === 'Rejected' ? (isDark ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200') :
                (isDark ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200')
              }`}>
                {report.status || 'Pending'}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleShare} 
                className={`flex-1 sm:flex-none h-10 px-3 sm:px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all border ${isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300'}`}
                title="Share Report URL"
              >
                <i className="fas fa-share-alt text-lg"></i>
                <span className="hidden sm:inline">Share</span>
              </button>

              <button 
                onClick={() => report.candidateResumeURL ? setSelectedResume(report.candidateResumeURL) : alert("No resume uploaded. Profile information was used for this interview.")} 
                className={`flex-1 sm:flex-none h-10 px-3 sm:px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all border ${isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300'} ${!report.candidateResumeURL ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="View Resume"
              >
                <i className="far fa-file-alt text-lg"></i>
                <span className="hidden sm:inline">Resume</span>
              </button>

              <button 
                onClick={handleDownloadPDF} 
                className={`flex-1 sm:flex-none h-10 px-3 sm:px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all border ${isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300'}`}
                title="Download Report"
              >
                <i className="far fa-file-pdf text-lg"></i>
                <span className="hidden sm:inline">Download</span>
              </button>

              <button 
                onClick={() => setShowProfile(true)} 
                className={`flex-1 sm:flex-none h-10 px-3 sm:px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'}`}
                title="View Profile"
              >
                <i className="far fa-user-circle text-lg"></i>
                <span className="hidden sm:inline">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Overall Score', value: report.score, icon: 'fa-chart-pie', type: 'score' },
            { label: 'Resume Match', value: report.resumeScore, icon: 'fa-file-contract', type: 'score' },
            { label: 'Q&A Quality', value: report.qnaScore, icon: 'fa-comments', type: 'score' },
            { label: 'Tab Switches', value: report.meta?.tabSwitchCount || 0, icon: 'fa-window-restore', type: 'count' }
          ].map((metric, i) => (
            <div key={i} className={`${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-100'} p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs font-bold uppercase tracking-wider`}>{metric.label}</h3>
                <i className={`fas ${metric.icon} ${isDark ? 'text-gray-600' : 'text-gray-300'}`}></i>
              </div>
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-bold tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{metric.value}</span>
                {metric.type === 'score' ? (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${scoreColor(metric.value)}`}>
                    {parseInt(metric.value.toString()) >= 70 ? 'Excellent' : parseInt(metric.value.toString()) >= 40 ? 'Good' : 'Poor'}
                  </span>
                ) : (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${metric.value === 0 ? (isDark ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800' : 'text-emerald-600 bg-emerald-50 border-emerald-100') : (isDark ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-red-600 bg-red-50 border-red-100')}`}>
                    {metric.value === 0 ? 'Clean' : 'Flagged'}
                  </span>
                )}
              </div>
              {metric.type === 'score' ? (
                <div className={`w-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'} h-1.5 rounded-full mt-6 overflow-hidden`}>
                  <div className={`h-full rounded-full transition-all duration-1000 ${scoreBarColor(metric.value)}`} style={{ width: `${metric.value}%` }}></div>
                </div>
              ) : (
                <div className={`mt-6 text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {metric.value === 0 ? 'No suspicious activity detected.' : 'Focus lost detected during interview.'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI Visual Analysis (if available) - Redesigned */}
        {cvStats && (
          <div className={`${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm overflow-hidden`}>
            <div className={`px-8 py-6 border-b ${isDark ? 'border-white/10' : 'border-gray-100'} flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} flex items-center justify-center ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <i className="fas fa-eye text-sm"></i>
              </div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Visual Intelligence Analysis</h2>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="text-center">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2 font-medium`}>Eye Contact</div>
                  <div className={`relative w-24 h-24 mx-auto flex items-center justify-center text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <svg className="w-full h-full absolute top-0 left-0 transform -rotate-90">
                      <circle cx="50%" cy="50%" r="45%" stroke={isDark ? "#1f2937" : "#f3f4f6"} strokeWidth="6" fill="transparent" />
                      <circle cx="50%" cy="50%" r="45%" stroke="#3b82f6" strokeWidth="6" fill="transparent" strokeDasharray={`${(cvStats.eyeContactScore / 100) * 283} 283`} strokeLinecap="round" />
                    </svg>
                    {cvStats.eyeContactScore}%
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2 font-medium`}>Confidence</div>
                  <div className={`relative w-24 h-24 mx-auto flex items-center justify-center text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <svg className="w-full h-full absolute top-0 left-0 transform -rotate-90">
                      <circle cx="50%" cy="50%" r="45%" stroke={isDark ? "#1f2937" : "#f3f4f6"} strokeWidth="6" fill="transparent" />
                      <circle cx="50%" cy="50%" r="45%" stroke="#8b5cf6" strokeWidth="6" fill="transparent" strokeDasharray={`${((cvStats.confidenceScore || 85) / 100) * 283} 283`} strokeLinecap="round" />
                    </svg>
                    {cvStats.confidenceScore || 85}%
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2 font-medium`}>Environment Check</div>
                  <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${cvStats.facesDetected > 1 
                    ? (isDark ? 'bg-red-900/30 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                    : (isDark ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700')
                  }`}>
                    <i className={`fas ${cvStats.facesDetected > 1 ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                    <span className="font-semibold text-sm">{cvStats.facesDetected > 1 ? 'Multiple Faces' : 'Secure Environment'}</span>
                  </div>
                </div>
              </div>

              <div className={`mt-8 pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                <span className={`text-xs font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-wider block mb-3`}>Detected Expressions</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cvStats.expressions || {}).map(([expr, count]: [string, any]) => (
                    <span key={expr} className={`px-3 py-1 ${isDark ? 'bg-white/5 text-gray-300 border-white/10' : 'bg-gray-50 text-gray-600 border-gray-100'} rounded-md text-xs border font-medium capitalize`}>
                      {expr} <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} ml-1`}>({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Feedback - Document Style */}
        <div className={`${isDark ? 'bg-[#111] border-white/10 shadow-xl shadow-black/40' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/40'} rounded-2xl border overflow-hidden`}>
          <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50/50 border-gray-100'} px-8 py-6 border-b`}>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
              <i className={`fas fa-magic ${isDark ? 'text-purple-400' : 'text-purple-600'}`}></i> AI Evaluation Report
            </h2>
          </div>
          <div className={`p-8 md:p-10 font-serif leading-relaxed text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {formatFeedback(report.feedback)}
          </div>
        </div>

        {/* Q&A Transcript - Minimalist List */}
        <div className="space-y-6">
          <div className={`flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-gray-200'} pb-4`}>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Interview Transcript</h2>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{report.questions.length} Questions</span>
          </div>

          <div className="grid gap-6">
            {report.questions.map((q, i) => (
              <div key={i} className={`group ${isDark ? 'bg-[#111] border-white/10 hover:border-white/20' : 'bg-white border-gray-200 hover:border-gray-300'} rounded-xl border p-6 transition-colors`}>
                <div className="flex items-start gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg ${isDark ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'} flex items-center justify-center text-sm font-bold shadow-sm`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>{q}</h3>
                    <div className={`relative pl-4 border-l-2 ${isDark ? 'border-white/10 group-hover:border-blue-500/30' : 'border-gray-100 group-hover:border-blue-500/30'} transition-colors`}>
                      <p className={`${isDark ? 'text-gray-300 bg-white/5' : 'text-gray-600 bg-gray-50'} text-sm leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-r-lg rounded-bl-lg`}>
                        {report.transcriptTexts[i] || <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} italic`}>No audio transcription available.</span>}
                      </p>
                    </div>
                    {report.videoURLs[i] && (
                      <button
                        onClick={() => setSelectedVideo(report.videoURLs[i]!)}
                        className={`mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
                      >
                        <i className="fas fa-play-circle text-lg"></i> Watch Response
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrity Warning Footer */}
        {report.meta && report.meta.tabSwitchCount > 0 && (
          <div className={`max-w-xl mx-auto mt-12 text-center p-6 rounded-xl border ${isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-100'}`}>
            <i className={`fas fa-shield-alt ${isDark ? 'text-red-400' : 'text-red-400'} text-2xl mb-2`}></i>
            <h4 className={`${isDark ? 'text-red-300' : 'text-red-800'} font-bold mb-1`}>Integrity Note</h4>
            <p className={`${isDark ? 'text-red-400' : 'text-red-600'} text-sm`}>
              The candidate switched tabs <span className="font-bold">{report.meta.tabSwitchCount}</span> time(s) during the session.
            </p>
          </div>
        )}

      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className={`fixed inset-0 ${isDark ? 'bg-black/90' : 'bg-white/90'} backdrop-blur-md z-[9999] flex items-center justify-center p-6`} onClick={() => setSelectedVideo(null)}>
          <div className={`${isDark ? 'bg-black' : 'bg-black'} rounded-2xl overflow-hidden max-w-5xl w-full shadow-2xl ring-1 ${isDark ? 'ring-white/20' : 'ring-gray-200'}`} onClick={e => e.stopPropagation()}>
            <video src={selectedVideo} controls autoPlay className="w-full h-auto max-h-[85vh]" />
          </div>
          <button className={`absolute top-6 right-6 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors`}>
            <i className="fas fa-times text-3xl"></i>
          </button>
        </div>
      )}

      {/* Resume Modal */}
      {selectedResume && (
        <div className={`fixed inset-0 ${isDark ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-sm z-[9999] flex items-center justify-center p-4`} onClick={() => setSelectedResume(null)}>
          <div className={`${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200'} rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Parsed Resume</h3>
              <button onClick={() => setSelectedResume(null)} className={`${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'} transition-colors`}>
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className={`flex-1 overflow-auto ${isDark ? 'bg-black' : 'bg-gray-50'} p-8 flex justify-center`}>
              <img src={selectedResume} alt="Resume" className="max-w-full h-auto shadow-lg ring-1 ring-gray-900/5" />
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className={`fixed inset-0 ${isDark ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-sm z-[9999] flex items-center justify-center sm:p-6`} onClick={() => setShowProfile(false)}>
          <div className={`${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-100'} rounded-2xl shadow-xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-[#111]/95' : 'border-gray-100 bg-white/95'} flex items-center justify-between sticky top-0 backdrop-blur-sm z-10`}>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Candidate Profile</h3>
              <button onClick={() => setShowProfile(false)} className={`w-8 h-8 rounded-full ${isDark ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} flex items-center justify-center transition-colors`}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={`p-8 text-center border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
              <div className={`w-24 h-24 mx-auto ${isDark ? 'bg-white/10' : 'bg-gray-100'} rounded-full flex items-center justify-center ${isDark ? 'text-gray-400' : 'text-gray-400'} text-3xl mb-4 overflow-hidden border-4 ${isDark ? 'border-[#111]' : 'border-white'} shadow-sm ring-1 ${isDark ? 'ring-white/10' : 'ring-gray-100'}`}>
                {profile?.photoURL ? <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <i className="fas fa-user"></i>}
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>{profile?.displayName || report.candidateName}</h2>
              <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-4`}>{profile?.location || "Location not specified"}</div>

              <div className="flex justify-center gap-4 text-sm">
                {candidateEmail && <a href={`mailto:${candidateEmail}`} className={`${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}><i className="far fa-envelope mr-1"></i> Email</a>}
                {profile?.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className={`${isDark ? 'text-blue-400' : 'text-blue-700'} hover:underline`}><i className="fab fa-linkedin mr-1"></i> LinkedIn</a>}
                {profile?.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer" className={`${isDark ? 'text-gray-300' : 'text-gray-700'} hover:underline`}><i className="fas fa-globe mr-1"></i> Portfolio</a>}
              </div>
            </div>

            <div className="p-8 space-y-8">
              {profile?.bio && (
                <div>
                  <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>About</h4>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed text-sm`}>{profile.bio}</p>
                </div>
              )}

              {profile?.skills && (
                <div>
                  <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-3`}>Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.split(',').map((s: string) => (
                      <span key={s} className={`px-3 py-1 ${isDark ? 'bg-white/5 text-gray-300 border-white/10' : 'bg-gray-100 text-gray-700 border-gray-200'} rounded-full text-xs font-medium border`}>{s.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InterviewReport;