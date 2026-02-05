'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    Send,
    Loader2,
    User,
    Clock,
    Trash2,
    Edit2,
    X,
    Check,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { commentsApi, Comment } from '@/lib/api';

interface CommentsProps {
    evidenceId: string;
    evidenceTitle?: string;
}

export default function Comments({ evidenceId, evidenceTitle }: CommentsProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUserEmail(localStorage.getItem('tars-user-email'));
        }
    }, []);

    useEffect(() => {
        fetchComments();
    }, [evidenceId]);

    const fetchComments = async () => {
        try {
            setIsFetching(true);
            const response = await commentsApi.getComments(evidenceId);
            if (response.success) {
                setComments(response.comments);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setIsFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await commentsApi.addComment(evidenceId, newComment.trim());
            if (response.success) {
                setComments(prev => [...prev, response.comment]);
                setNewComment('');
                setIsExpanded(true);
            }
        } catch (err) {
            setError('Failed to post comment. Please try again.');
            console.error('Error posting comment:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const response = await commentsApi.deleteComment(evidenceId, commentId);
            if (response.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            }
        } catch (err) {
            console.error('Error deleting comment:', err);
        }
    };

    const handleEdit = async (commentId: string) => {
        if (!editContent.trim()) return;

        try {
            const response = await commentsApi.editComment(evidenceId, commentId, editContent.trim());
            if (response.success) {
                setComments(prev => prev.map(c => c.id === commentId ? response.comment : c));
                setEditingId(null);
                setEditContent('');
            }
        } catch (err) {
            console.error('Error editing comment:', err);
        }
    };

    const startEdit = (comment: Comment) => {
        setEditingId(comment.id);
        setEditContent(comment.content);
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="mt-4 border-t border-cyan-500/20 pt-4">
            {/* Comment count header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors w-full"
            >
                <MessageCircle size={16} />
                <span className="text-sm font-medium">
                    {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {/* Comments list */}
                        <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                            {isFetching ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                                </div>
                            ) : comments.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-2">
                                    No comments yet. Be the first to comment!
                                </p>
                            ) : (
                                comments.map((comment) => (
                                    <motion.div
                                        key={comment.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-black/30 rounded-lg p-3 border border-cyan-500/10"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                                                    <User size={12} className="text-white" />
                                                </div>
                                                <span className="text-cyan-400 text-sm font-medium">
                                                    {comment.author}
                                                </span>
                                                <span className="text-gray-500 text-xs flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatTime(comment.timestamp)}
                                                    {comment.edited && ' (edited)'}
                                                </span>
                                            </div>
                                            
                                            {/* Edit/Delete buttons - only for comment author */}
                                            {currentUserEmail && comment.authorEmail === currentUserEmail && (
                                                <div className="flex items-center gap-1">
                                                    {editingId !== comment.id && (
                                                        <>
                                                            <button
                                                                onClick={() => startEdit(comment)}
                                                                className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(comment.id)}
                                                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Comment content or edit form */}
                                        {editingId === comment.id ? (
                                            <div className="mt-2 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-400"
                                                />
                                                <button
                                                    onClick={() => handleEdit(comment.id)}
                                                    className="p-1 text-green-400 hover:text-green-300"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingId(null); setEditContent(''); }}
                                                    className="p-1 text-red-400 hover:text-red-300"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="mt-1 text-gray-300 text-sm">
                                                {comment.content}
                                            </p>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* New comment form */}
                        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                maxLength={1000}
                                className="flex-1 bg-black/30 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !newComment.trim()}
                                className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                            </button>
                        </form>

                        {error && (
                            <p className="mt-2 text-red-400 text-xs">{error}</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
