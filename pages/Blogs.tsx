import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, ArrowLeft, BookOpen, PenLine, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Logo from '../components/Logo';

const BlogsContent: React.FC = () => {
    const { toggleTheme, isDark } = useTheme();

    // Sample upcoming blog topics
    const upcomingTopics = [
        { icon: TrendingUp, title: "Interview Strategies", color: "blue" },
        { icon: PenLine, title: "Resume Tips", color: "purple" },
        { icon: Sparkles, title: "Career Growth", color: "amber" },
    ];

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark
            ? 'bg-[#0a0a0f]'
            : 'bg-[#fafafa]'
            }`}>
            {/* Subtle Background Pattern */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Gradient orbs */}
                <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] ${isDark ? 'bg-blue-900/20' : 'bg-blue-100/60'
                    }`} />
                <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[100px] ${isDark ? 'bg-purple-900/15' : 'bg-purple-100/50'
                    }`} />

                {/* Subtle grid pattern */}
                <div
                    className={`absolute inset-0 ${isDark ? 'opacity-[0.02]' : 'opacity-[0.03]'}`}
                    style={{
                        backgroundImage: `linear-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            {/* Navigation Bar */}
            <nav className={`relative z-50 flex items-center justify-between px-5 sm:px-8 md:px-12 py-4 md:py-5 border-b transition-colors ${isDark ? 'border-white/5' : 'border-black/5'
                }`}>
                <Link
                    to="/"
                    className="flex items-center transition-opacity hover:opacity-70"
                >
                    <Logo
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg"
                        isDark={isDark}
                    />
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        to="/"
                        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 sm:px-4 rounded-full transition-all ${isDark
                            ? 'text-slate-400 hover:text-white hover:bg-white/5'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                            }`}
                    >
                        <ArrowLeft size={15} />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className={`p-2.5 rounded-full transition-all duration-300 ${isDark
                            ? 'bg-white/5 hover:bg-white/10 text-yellow-400'
                            : 'bg-black/5 hover:bg-black/10 text-slate-600'
                            }`}
                        aria-label="Toggle theme"
                    >
                        <motion.div
                            initial={false}
                            animate={{ rotate: isDark ? 0 : 180 }}
                            transition={{ duration: 0.3 }}
                        >
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </motion.div>
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-5 sm:px-8 py-12 sm:py-16">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center max-w-xl mx-auto"
                >
                    {/* Icon Badge */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                        className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mb-6 sm:mb-8 ${isDark
                            ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
                            : 'bg-gradient-to-br from-slate-100 to-white border border-slate-200/80 shadow-sm'
                            }`}
                    >
                        <BookOpen className={`w-7 h-7 sm:w-9 sm:h-9 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </motion.div>

                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4 ${isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                            Blog
                        </h1>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-5 ${isDark
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                            <Clock size={13} />
                            Coming Soon
                        </div>
                    </motion.div>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className={`text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 ${isDark ? 'text-slate-400' : 'text-slate-600'
                            }`}
                    >
                        We're preparing thoughtful content on interview preparation, career development, and industry insights.
                    </motion.p>

                    {/* Upcoming Topics */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="flex flex-col gap-2.5 sm:gap-3 mb-8 sm:mb-10"
                    >
                        {upcomingTopics.map((topic, index) => (
                            <motion.div
                                key={topic.title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${isDark
                                    ? 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                    : 'bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
                                    }`}
                            >
                                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${topic.color === 'blue'
                                    ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                                    : topic.color === 'purple'
                                        ? isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-600'
                                        : isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                    <topic.icon size={17} />
                                </div>
                                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {topic.title}
                                </span>
                                <span className={`ml-auto text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                    Soon
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Back Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                    >
                        <Link
                            to="/"
                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 ${isDark
                                ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/10'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20'
                                }`}
                        >
                            <ArrowLeft size={16} />
                            Back to Home
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Subtle loading indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="absolute bottom-8 sm:bottom-12 flex items-center gap-1.5"
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.7, 0.3]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                            }}
                            className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-slate-500' : 'bg-slate-400'
                                }`}
                        />
                    ))}
                </motion.div>
            </main>
        </div>
    );
};

const Blogs: React.FC = () => {
    return (
        <ThemeProvider>
            <BlogsContent />
        </ThemeProvider>
    );
};

export default Blogs;
