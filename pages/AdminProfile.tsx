import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Calendar, Shield, Sun, Moon, Monitor, ArrowLeft, Edit2, Save, X, FileText } from 'lucide-react';
import gsap from 'gsap';
import { signOut } from 'firebase/auth';

const AdminProfile: React.FC = () => {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [adminData, setAdminData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        fullname: ''
    });

    // GSAP Animation Refs
    const headerRef = useRef<HTMLDivElement>(null);
    const profileCardRef = useRef<HTMLDivElement>(null);
    const profileFieldsRef = useRef<HTMLDivElement>(null);

    // Real-time Admin Data Listener
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAdminData(data);
                setEditData({
                    fullname: data.fullname || 'Admin User'
                });
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching admin data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // GSAP Profile Page Animation
    useLayoutEffect(() => {
        if (loading) return;

        const ctx = gsap.context(() => {
            // Header animation
            if (headerRef.current) {
                gsap.fromTo(headerRef.current,
                    { y: -30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
                );
            }

            // Profile card entrance
            if (profileCardRef.current) {
                gsap.fromTo(profileCardRef.current,
                    { y: 40, opacity: 0, scale: 0.98 },
                    { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out", delay: 0.2 }
                );
            }

            // Profile fields staggered animation
            if (profileFieldsRef.current) {
                const fields = profileFieldsRef.current.querySelectorAll('.profile-field');
                gsap.fromTo(fields,
                    { x: -20, opacity: 0 },
                    { x: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: "power2.out", delay: 0.4 }
                );
            }
        });

        return () => ctx.revert();
    }, [loading]);

    const handleSave = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                await updateDoc(doc(db, 'users', user.uid), {
                    fullname: editData.fullname
                });
                setAdminData({ ...adminData, ...editData });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 font-sans selection:bg-primary/30">
            {/* Header */}
            <div ref={headerRef} className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-5 bg-white/70 dark:bg-[#050505]/70 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-3 sm:gap-6">
                    <button onClick={() => navigate('/admin')} className="p-2 sm:p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-95">
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div>
                        <h1 className="text-base sm:text-xl font-bold tracking-tight">Profile Settings</h1>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-0.5 hidden sm:block">Administrator Control</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Account Dropdown */}
                    <div className="relative group">
                        <div className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-white border border-gray-300 dark:border-white/10">
                                {adminData?.fullname?.[0] || 'A'}
                            </div>
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-semibold leading-none">{adminData?.fullname || 'Admin'}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Administrator</p>
                            </div>
                        </div>

                        {/* Dropdown */}
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform translate-y-2 group-hover:translate-y-0">
                            <div className="p-4 border-b border-gray-100 dark:border-white/5">
                                <p className="font-bold text-sm">{adminData?.fullname || 'Admin User'}</p>
                                <p className="text-xs text-gray-500">{adminData?.email || 'admin@interviewxpert.com'}</p>
                            </div>

                            {/* Theme Toggle */}
                            <div className="p-3 border-b border-gray-100 dark:border-white/5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Appearance</p>
                                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg gap-1">
                                    <button onClick={() => setTheme('light')} className={`flex-1 p-2 rounded-md transition-all text-xs font-medium ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <Sun size={14} className="mx-auto" />
                                    </button>
                                    <button onClick={() => setTheme('dark')} className={`flex-1 p-2 rounded-md transition-all text-xs font-medium ${theme === 'dark' ? 'bg-zinc-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
                                        <Moon size={14} className="mx-auto" />
                                    </button>
                                    <button onClick={() => setTheme('system')} className={`flex-1 p-2 rounded-md transition-all text-xs font-medium ${theme === 'system' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-primary'}`}>
                                        <Monitor size={14} className="mx-auto" />
                                    </button>
                                </div>
                            </div>

                            <button onClick={() => navigate('/admin/blogs')} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-white/5">
                                <FileText size={16} />
                                Manage Blogs
                            </button>

                            <button onClick={() => signOut(auth)} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto py-8 sm:py-16 px-4 sm:px-6">
                <div ref={profileCardRef} className="bg-white dark:bg-zinc-900/50 rounded-2xl sm:rounded-[32px] border border-gray-200 dark:border-white/5 p-6 sm:p-12 shadow-2xl shadow-black/5 dark:shadow-none backdrop-blur-sm relative overflow-hidden">
                    {/* Decoration */}
                    <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-primary/5 rounded-bl-full blur-3xl opacity-50" />

                    {/* Profile Header */}
                    <div className="flex flex-col items-center text-center mb-8 sm:mb-16">
                        <div className="relative group mb-4 sm:mb-8">
                            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[24px] bg-gradient-to-tr from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 p-1">
                                <div className="w-full h-full rounded-xl sm:rounded-[20px] bg-white dark:bg-[#0a0a0a] flex items-center justify-center border border-gray-200 dark:border-white/5 overflow-hidden">
                                    <span className="text-2xl sm:text-4xl font-light text-gray-300 dark:text-zinc-600">
                                        {adminData?.fullname?.[0] || 'A'}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 bg-primary text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-xl">
                                <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                            </div>
                        </div>

                        <div className="w-full max-w-sm">
                            {isEditing ? (
                                <div className="space-y-3 sm:space-y-4">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={editData.fullname}
                                        onChange={(e) => setEditData({ ...editData, fullname: e.target.value })}
                                        className="w-full text-center text-xl sm:text-3xl font-bold bg-transparent border-b-2 border-primary focus:outline-none focus:border-primary transition-all py-2"
                                    />
                                    <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                                        <button onClick={handleSave} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold text-sm shadow-lg shadow-primary/20">
                                            <Save size={16} /> Save Changes
                                        </button>
                                        <button onClick={() => setIsEditing(false)} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-bold text-sm">
                                            <X size={16} /> Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="group relative pt-2">
                                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 sm:mb-2 flex items-center justify-center gap-2 sm:gap-4">
                                        <span className="truncate max-w-[200px] sm:max-w-none">{adminData?.fullname || 'Admin User'}</span>
                                        <button onClick={() => setIsEditing(true)} className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all shrink-0">
                                            <Edit2 size={14} className="text-gray-400" />
                                        </button>
                                    </h2>
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-zinc-400 font-medium tracking-wide">Platform Administrator</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile Fields */}
                    <div ref={profileFieldsRef} className="grid grid-cols-1 gap-4 sm:gap-8 pt-6 sm:pt-8 border-t border-gray-100 dark:border-white/5">
                        <div className="profile-field space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-1">Email Address</label>
                            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-gray-50 dark:bg-black/20 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/5 group transition-all hover:border-primary/20">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/5 flex items-center justify-center transition-colors group-hover:bg-blue-500/10 shrink-0">
                                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                </div>
                                <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-zinc-300 truncate">{adminData?.email || 'admin@interviewxpert.com'}</span>
                            </div>
                        </div>

                        <div className="profile-field space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-1">Account Role</label>
                            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-gray-50 dark:bg-black/20 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/5 group transition-all hover:border-primary/20">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500/5 flex items-center justify-center transition-colors group-hover:bg-orange-500/10 shrink-0">
                                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                                </div>
                                <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-zinc-300 capitalize">{adminData?.role || 'Admin'}</span>
                            </div>
                        </div>

                        <div className="profile-field space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-1">Active Since</label>
                            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-gray-50 dark:bg-black/20 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/5 group transition-all hover:border-primary/20">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-500/5 flex items-center justify-center transition-colors group-hover:bg-green-500/10 shrink-0">
                                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                                </div>
                                <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-zinc-300">
                                    {adminData?.createdAt?.toDate ? adminData.createdAt.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recently Activated'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-8 text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">
                    <span className="flex items-center gap-2 pt-1 border-t border-transparent hover:border-primary transition-all cursor-default">
                        Secure Access
                    </span>
                    <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-800" />
                    <span className="flex items-center gap-2 pt-1 border-t border-transparent hover:border-primary transition-all cursor-default">
                        Privacy Protected
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;
