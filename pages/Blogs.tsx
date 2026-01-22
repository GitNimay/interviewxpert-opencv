import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, ArrowLeft, BookOpen, Clock, Calendar, ChevronRight } from 'lucide-react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Logo from '../components/Logo';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  tags: string[];
  readTime: string;
  author: string;
  createdAt: any;
}

const BlogsContent: React.FC = () => {
    const { toggleTheme, isDark } = useTheme();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                setBlogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
            } catch (error) {
                console.error("Error fetching blogs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

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
            <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
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
                        <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Insights, strategies, and tips for your career journey.
                        </p>
                    </motion.div>
                </motion.div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : blogs.length === 0 ? (
                    <div className="text-center py-20 opacity-60">
                        <p className="text-xl">No blog posts available yet.</p>
                        <p className="text-sm mt-2">Check back soon for updates!</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
                    >
                        {blogs.map((blog, index) => (
                            <motion.div
                                key={blog.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`group rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${isDark
                                    ? 'bg-[#111] border-white/5 hover:border-white/10 hover:shadow-2xl hover:shadow-blue-900/10'
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xl hover:shadow-blue-500/5'
                                    }`}
                            >
                                {/* Image */}
                                <Link to={`/blog/${blog.id}`} className="block aspect-video w-full overflow-hidden bg-gray-100 dark:bg-white/5 relative">
                                    {blog.imageUrl ? (
                                        <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                                            <BookOpen size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        {Array.isArray(blog.tags) && blog.tags.slice(0, 2).map((tag, i) => (
                                            <span key={i} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-black/80 backdrop-blur text-blue-600 dark:text-blue-400 rounded-lg shadow-sm">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </Link>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {blog.readTime || '5 min read'}</span>
                                    </div>
                                    
                                    <Link to={`/blog/${blog.id}`}>
                                        <h3 className={`text-xl font-bold mb-3 line-clamp-2 ${isDark ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'} transition-colors`}>
                                            {blog.title}
                                        </h3>
                                    </Link>
                                    
                                    <p className={`text-sm line-clamp-3 mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {blog.excerpt}
                                    </p>

                                    <Link 
                                        to={`/blog/${blog.id}`}
                                        className={`text-sm font-bold flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                    >
                                        Read Article <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
                
                <div className="mt-16 text-center">
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
                </div>
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
