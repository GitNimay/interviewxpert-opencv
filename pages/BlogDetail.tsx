import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArrowLeft, Calendar, Clock, User, Share2, BookOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMessageBox } from '../components/MessageBox';

const BlogDetail: React.FC = () => {
    const { id } = useParams();
    const { isDark } = useTheme();
    const messageBox = useMessageBox();
    const [blog, setBlog] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlog = async () => {
            if (!id) return;
            try {
                const docSnap = await getDoc(doc(db, 'blogs', id));
                if (docSnap.exists()) {
                    setBlog({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching blog:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlog();
    }, [id]);

    const handleShare = async () => {
        const url = window.location.href;

        // 1. Try Clipboard API
        try {
            await navigator.clipboard.writeText(url);
            messageBox.showSuccess('Link copied to clipboard!');
            return;
        } catch (err) {
            console.error('Failed to copy:', err);
        }

        // 2. Fallback for HTTP/Older Browsers
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "0";
        textArea.style.top = "0";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        let successful = false;
        try {
            successful = document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);

        if (successful) {
            messageBox.showSuccess('Link copied to clipboard!');
            return;
        }

        // 3. Final Fallback
        prompt("Copy this link to share:", url);
    };

    if (loading) return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0a0a0f]' : 'bg-[#fafafa]'}`}>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!blog) return (
        <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-[#fafafa] text-gray-900'}`}>
            <p className="text-xl mb-4">Blog post not found.</p>
            <Link to="/blogs" className="text-blue-500 hover:underline">Back to Blogs</Link>
        </div>
    );

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-[#fafafa] text-gray-900'} font-sans`}>
             {/* Navigation */}
            <nav className={`sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md transition-colors ${isDark ? 'bg-[#0a0a0f]/80 border-white/5' : 'bg-white/80 border-gray-200'}`}>
                <Link to="/blogs" className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    <ArrowLeft size={18} /> Back to Blogs
                </Link>
                <button 
                    onClick={handleShare} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                >
                    <Share2 size={16} />
                    Share
                </button>
            </nav>

            <article className="max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                        {blog.tags && Array.isArray(blog.tags) && blog.tags.map((tag: string, i: number) => (
                            <span key={i} className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-blue-600 text-white rounded-full shadow-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">{blog.title}</h1>
                    <div className={`flex flex-wrap items-center justify-center gap-6 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="flex items-center gap-2"><Calendar size={16} /> {blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</span>
                        <span className="flex items-center gap-2"><Clock size={16} /> {blog.readTime || '5 min read'}</span>
                        <span className="flex items-center gap-2"><User size={16} /> {blog.author || 'Admin'}</span>
                    </div>
                </div>

                {/* Featured Image */}
                <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl aspect-video relative bg-gray-100 dark:bg-gray-900">
                    {blog.imageUrl ? (
                        <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <BookOpen size={64} />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed">
                    <p className="text-xl md:text-2xl font-medium opacity-80 mb-10 border-l-4 border-blue-500 pl-6 italic">
                        {blog.excerpt}
                    </p>
                    <div className="whitespace-pre-wrap opacity-90">
                        {blog.content}
                    </div>
                </div>
            </article>
        </div>
    );
};

export default BlogDetail;