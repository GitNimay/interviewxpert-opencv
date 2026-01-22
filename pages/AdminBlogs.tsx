import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, X, Image as ImageIcon, Type, FileText, Tag, Clock, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  tags: string | string[];
  readTime: string;
  createdAt: any;
}

const AdminBlogs: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    tags: '',
    readTime: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    try {
      const blogData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'blogs', editingId), blogData);
        alert('Blog post updated successfully!');
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'blogs'), {
          ...blogData,
          author: auth.currentUser?.displayName || 'Admin',
          createdAt: serverTimestamp()
        });
        alert('Blog post published successfully!');
      }
      setFormData({ title: '', excerpt: '', content: '', imageUrl: '', tags: '', readTime: '' });
    } catch (error) {
      console.error("Error adding blog:", error);
      alert('Failed to publish blog.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      await deleteDoc(doc(db, 'blogs', id));
    }
  };

  const handleEdit = (blog: BlogPost) => {
    setEditingId(blog.id);
    setFormData({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.content,
      imageUrl: blog.imageUrl,
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || ''),
      readTime: blog.readTime
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', excerpt: '', content: '', imageUrl: '', tags: '', readTime: '' });
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'} font-sans`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 ${isDark ? 'bg-[#050505]/80 border-white/5' : 'bg-white/80 border-gray-200'} backdrop-blur-xl border-b`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="text-blue-500" size={20} />
            Blog Management
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Post Form */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200'} shadow-xl h-fit`}>
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            {editingId ? (
              <><Edit size={18} className="text-blue-500" /> Edit Post</>
            ) : (
              <><Plus size={18} className="text-green-500" /> Create New Post</>
            )}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">Title</label>
              <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/10 focus-within:border-blue-500' : 'bg-gray-50 border-gray-200 focus-within:border-blue-500'} transition-colors`}>
                <Type size={16} className="opacity-50 mr-2" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter blog title..."
                  className="bg-transparent w-full outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">Read Time</label>
                <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <Clock size={16} className="opacity-50 mr-2" />
                  <input
                    type="text"
                    value={formData.readTime}
                    onChange={e => setFormData({ ...formData, readTime: e.target.value })}
                    placeholder="e.g. 5 min read"
                    className="bg-transparent w-full outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">Tags</label>
                <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <Tag size={16} className="opacity-50 mr-2" />
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Tech, Career, AI"
                    className="bg-transparent w-full outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">Image URL</label>
              <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <ImageIcon size={16} className="opacity-50 mr-2" />
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-transparent w-full outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Short summary..."
                className={`w-full p-3 rounded-xl border outline-none text-sm h-20 resize-none ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">Content</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your blog content here..."
                className={`w-full p-3 rounded-xl border outline-none text-sm h-48 resize-y ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                required
              />
            </div>

            <div className="flex gap-3">
              {editingId && (
                <button type="button" onClick={cancelEdit} className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                  <X size={18} /> Cancel
                </button>
              )}
              <button type="submit" className={`flex-1 py-3 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl font-bold transition-all shadow-lg`}>
                {editingId ? 'Update Post' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Posts List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold mb-4 opacity-80">Published Posts ({blogs.length})</h2>
          {loading ? (
            <div className="text-center py-10 opacity-50">Loading posts...</div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-10 opacity-50 border border-dashed rounded-xl">No blog posts yet.</div>
          ) : (
            blogs.map(blog => (
              <div key={blog.id} className={`group relative p-4 rounded-xl border ${isDark ? 'bg-[#111] border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:border-gray-300'} transition-all flex gap-4`}>
                <div className={`w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  {blog.imageUrl ? (
                    <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30"><FileText /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold truncate pr-8">{blog.title}</h3>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(blog)}
                        className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(blog.id)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs opacity-60 line-clamp-2 mt-1 mb-2">{blog.excerpt}</p>
                  <div className="flex items-center gap-2 text-[10px] opacity-50">
                    <span className="flex items-center gap-1"><Clock size={10} /> {blog.readTime || '3 min'}</span>
                    <span>•</span>
                    <span>{blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now'}</span>
                  </div>
                  {blog.tags && (
                    <div className="flex gap-1 mt-2">
                      {Array.isArray(blog.tags) ? blog.tags.map((tag: string, i: number) => (
                        <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>{tag}</span>
                      )) : null}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBlogs;