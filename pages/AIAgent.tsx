import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useAnimatedText } from '../hooks/useAnimatedText';
import {
    Bot,
    Send,
    User,
    Plus,
    MessageSquare,
    PanelLeftClose,
    PanelLeftOpen,
    Trash2,
    MoreHorizontal,
    Edit3,
    Save
} from 'lucide-react';

// --- Types ---
interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

interface ChatSession {
    id: string;
    title: string;
    createdAt: number;
    messages: Message[];
}

// Animated message component for AI responses
const AnimatedMessage: React.FC<{ text: string; isLatest: boolean }> = React.memo(({ text, isLatest }) => {
    // Only animate the latest AI message, use word-by-word animation
    const animatedText = useAnimatedText(text, " ");
    const displayText = isLatest ? animatedText : text;

    return (
        <>
            {displayText.split('\n').map((line, i) => (
                <p key={i} className="mb-2 last:mb-0 min-h-[1em]">{line}</p>
            ))}
        </>
    );
});

const AIAgent: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
    const [isHoveringSession, setHoveringSession] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Context State
    const [fullProfile, setFullProfile] = useState<any>(null);
    const [pastInterviews, setPastInterviews] = useState<any[]>([]);

    const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    // --- Initialization ---

    useEffect(() => {
        // Create a new session on mount
        createNewSession();
    }, []);

    // Fetch User Context (Profile & Interviews)
    useEffect(() => {
        const fetchContext = async () => {
            if (!user) return;
            try {
                // 1. Fetch Profile
                const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
                if (profileSnap.exists()) {
                    setFullProfile(profileSnap.data());
                }

                // 2. Fetch Interviews
                const q = query(collection(db, 'interviews'), where('candidateUID', '==', user.uid));
                const snap = await getDocs(q);
                setPastInterviews(snap.docs.map(d => d.data()));
            } catch (error) {
                console.error("Error fetching AI context:", error);
            }
        };
        fetchContext();
    }, [user]);

    // Load saved sessions from DB
    useEffect(() => {
        const loadSavedSessions = async () => {
            if (!user) return;
            try {
                const q = query(collection(db, 'chatSessions'), where('userId', '==', user.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const dbSessions = snap.docs.map(d => d.data() as ChatSession);
                    setSessions(prev => {
                        const existingIds = new Set(prev.map(s => s.id));
                        const newSessions = dbSessions.filter(s => !existingIds.has(s.id));
                        return [...prev, ...newSessions].sort((a, b) => b.createdAt - a.createdAt);
                    });
                }
            } catch (error) {
                console.error("Error loading saved chats:", error);
            }
        };
        loadSavedSessions();
    }, [user]);

    useEffect(() => {
        scrollToBottom();
    }, [currentSessionId, sessions, loading]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Actions ---

    const createNewSession = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            createdAt: Date.now(),
            messages: []
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        if (window.innerWidth < 768) setSidebarOpen(false); // Auto close sidebar on mobile
    };

    const deleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (currentSessionId === id) {
            if (newSessions.length > 0) {
                setCurrentSessionId(newSessions[0].id);
            } else {
                createNewSession();
            }
        }

        if (user) {
            try {
                await deleteDoc(doc(db, 'chatSessions', id));
            } catch (error) {
                console.error("Error deleting chat:", error);
            }
        }
    };

    const saveCurrentChat = async () => {
        if (!user || !currentSessionId) return;
        const session = sessions.find(s => s.id === currentSessionId);
        if (!session) return;

        try {
            await setDoc(doc(db, 'chatSessions', session.id), {
                ...session,
                userId: user.uid,
                updatedAt: serverTimestamp()
            });
            alert("Chat saved successfully!");
        } catch (error) {
            console.error("Error saving chat:", error);
            alert("Failed to save chat.");
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !currentSessionId) return;

        const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex === -1) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim(),
            timestamp: Date.now()
        };

        const updatedSessions = [...sessions];
        updatedSessions[sessionIndex].messages.push(userMsg);

        // Auto-title the session if it's the first message
        if (updatedSessions[sessionIndex].messages.length === 1) {
            const title = userMsg.text.slice(0, 30) + (userMsg.text.length > 30 ? '...' : '');
            updatedSessions[sessionIndex].title = title;
        }

        setSessions(updatedSessions);
        setInput('');
        setLoading(true);

        try {
            // Prepare context
            const history = updatedSessions[sessionIndex].messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            // Remove the last user message we just added from history array passed to API 
            // (SDK handles conversation history differently, but for manual construction we pass pure history + last msg)
            // But here we'll just pass the full history to the model directly if using sendMessage on a chat session object
            // For simplicity with generateContent, we pass the full list.

            // Build Context Strings
            const profileContext = fullProfile ? `
            FULL PROFILE DATA:
            - Skills: ${fullProfile.skills || 'None listed'}
            - Bio: ${fullProfile.bio || 'None'}
            - Experience: ${fullProfile.experienceList?.map((e: any) => `${e.role} at ${e.company} (${e.duration})`).join('; ') || fullProfile.experience || 'None'}
            - Education: ${fullProfile.educationList?.map((e: any) => `${e.degree} at ${e.school}`).join('; ') || fullProfile.education || 'None'}
            - Projects: ${fullProfile.projects?.map((p: any) => `${p.title}: ${p.description}`).join('; ') || 'None'}
            ` : '';

            const interviewContext = pastInterviews.length > 0 ? `
            PAST INTERVIEW SCORES:
            ${pastInterviews.map(i => `- Role: ${i.jobTitle}, Score: ${i.score} (Resume: ${i.resumeScore}, Q&A: ${i.qnaScore})`).join('\n')}
            ` : '';

            const systemInstruction = `You are a helpful, professional AI interview coach and career assistant named "Career Copilot". 
            User Context: The user's name is ${userProfile?.fullname || 'Candidate'}.
            ${profileContext}
            ${interviewContext}
            
            CRITICAL FORMATTING RULES (MUST FOLLOW):
            - DO NOT use any Markdown symbols like **, *, #, ##, ###, or #### 
            - DO NOT use bullet points with asterisks (*)
            - Write in clean, plain text paragraphs
            - Use natural line breaks to separate ideas
            - Use simple numbered lists (1. 2. 3.) when listing items
            - Use dashes (-) for sub-points if needed
            - Keep formatting minimal and clean
            
            Response Guidelines:
            - Provide detailed, thorough answers (medium length, 3-5 paragraphs typically)
            - Include practical examples and actionable tips
            - Be encouraging and supportive while providing constructive feedback
            - Break down complex topics into digestible parts
            - For interview questions, provide sample answers with explanations
            - For career advice, include both immediate steps and long-term strategies
            - Write in a conversational, friendly tone
            
            Remember: Keep responses well-structured but clean without any special formatting symbols.`;

            const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    { role: "user", parts: [{ text: systemInstruction }] },
                    ...history
                ]
            });

            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: text,
                timestamp: Date.now()
            };

            const finalSessions = [...sessions];
            const finalIndex = finalSessions.findIndex(s => s.id === currentSessionId); // Re-find in case index shifted (unlikely)
            if (finalIndex !== -1) {
                finalSessions[finalIndex].messages.push(aiMsg);
                setSessions(finalSessions);
            }

        } catch (error) {
            console.error("Generation error", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Sorry, I encountered an error. Please try again.",
                timestamp: Date.now()
            };
            const errSessions = [...sessions];
            const errIndex = errSessions.findIndex(s => s.id === currentSessionId);
            if (errIndex !== -1) {
                errSessions[errIndex].messages.push(errorMsg);
                setSessions(errSessions);
            }
        } finally {
            setLoading(false);
        }
    };

    const currentSession = sessions.find(s => s.id === currentSessionId);

    // --- Render Helpers ---

    const renderMessage = (msg: Message, isLatestAI: boolean = false) => (
        <div key={msg.id} className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-white" />
                </div>
            )}

            <div className={`max-w-[85%] md:max-w-[75%] px-5 py-3.5 rounded-2xl text-[15px] leading-7 ${msg.role === 'user'
                ? 'bg-[#2f2f2f] text-white rounded-tr-sm'
                : 'text-gray-900 dark:text-gray-100 dark:bg-transparent pl-0'
                }`}>
                {msg.role === 'model' ? (
                    <AnimatedMessage text={msg.text} isLatest={isLatestAI} />
                ) : (
                    msg.text.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0 min-h-[1em]">{line}</p>
                    ))
                )}
            </div>

            {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={16} className="text-gray-500 dark:text-gray-300" />
                </div>
            )}
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-[#09090b] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">

            {/* --- SIDEBAR --- */}
            {/* --- SIDEBAR BACKDROP (Mobile) --- */}
            {isSidebarOpen && (
                <div
                    className="md:hidden absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* --- SIDEBAR --- */}
            <div className={`
                fixed md:relative z-50 h-full
                bg-gray-50 dark:bg-[#000000] 
                transition-all duration-300 ease-in-out 
                border-r border-gray-200 dark:border-white/5 
                flex flex-col shadow-xl md:shadow-none
                w-[280px]
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'}
            `}>
                <div className="p-3">
                    <button
                        onClick={createNewSession}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors text-sm font-medium"
                    >
                        <Plus size={18} /> New chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                    <div className="text-xs font-semibold text-gray-400 px-3 py-2 mt-2">Recent</div>
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm cursor-pointer mb-1 transition-colors ${currentSessionId === session.id
                                ? 'bg-gray-200 dark:bg-[#1a1a1a]'
                                : 'hover:bg-gray-100 dark:hover:bg-[#111]'
                                }`}
                            onClick={() => {
                                setCurrentSessionId(session.id);
                                if (window.innerWidth < 768) setSidebarOpen(false);
                            }}
                            onMouseEnter={() => setHoveringSession(session.id)}
                            onMouseLeave={() => setHoveringSession(null)}
                        >
                            <MessageSquare size={16} className="text-gray-500 shrink-0" />
                            <span className="truncate flex-1 max-w-[170px]">{session.title}</span>

                            {(isHoveringSession === session.id || currentSessionId === session.id) && (
                                <button
                                    className="absolute right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-gray-300 dark:hover:bg-[#2a2a2a] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => deleteSession(e, session.id)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Sidebar Footer */}

            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col relative h-full">

                {/* Navbar (Mobile/Toggle) */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-2 md:p-3 text-gray-500 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
                        >
                            {isSidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeftOpen size={24} />}
                        </button>
                        <span className="md:hidden font-semibold text-gray-900 dark:text-white">Career Copilot</span>
                    </div>

                    <button
                        onClick={saveCurrentChat}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Save chat to database"
                    >
                        <Save size={18} />
                        <span className="hidden sm:inline">Save Chat</span>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                    {!currentSession || currentSession.messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center pt-[12vh] px-4">
                            <div className="w-16 h-16 bg-white dark:bg-[#1a1a1a] rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Bot size={32} className="text-gray-900 dark:text-gray-100" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-2 text-center text-gray-900 dark:text-white">
                                How can I help you today?
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
                                I can analyze your resume, help you prepare for specific roles, or conduct mock interviews.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                                {['Analyze my weak points', 'Mock interview for Product Manager', 'Optimize my resume', 'Salary negotiation tips'].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => { setInput(suggestion); }}
                                        className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-left text-sm text-gray-600 dark:text-gray-300 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
                            {currentSession.messages.map((msg, index) => {
                                // Find the index of the last AI message
                                const lastAIMessageIndex = currentSession.messages
                                    .map((m, i) => ({ role: m.role, index: i }))
                                    .filter(m => m.role === 'model')
                                    .pop()?.index;
                                const isLatestAI = msg.role === 'model' && index === lastAIMessageIndex;
                                return renderMessage(msg, isLatestAI);
                            })}
                            {loading && (
                                <div className="flex gap-4 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-1">
                                        <Bot size={16} className="text-white" />
                                    </div>
                                    <div className="flex items-center gap-1.5 h-8">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} className="h-4" />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white dark:bg-[#09090b]">
                    <div className="max-w-3xl mx-auto relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Message Career Copilot..."
                            className="w-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white rounded-full py-3.5 pl-5 pr-12 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 placeholder-gray-500"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!input.trim() || loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="text-center text-[11px] text-gray-400 mt-2">
                        AI can make mistakes. Check important info.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default AIAgent;
