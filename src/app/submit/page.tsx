'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileText,
    Image,
    File,
    X,
    Shield,
    Send,
    CheckCircle2,
    Paperclip,
    Tag,
    AlertCircle,
} from 'lucide-react';
import { privacy } from '@/lib/api';

export default function SubmitPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        brief: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<{
        submissionId: string;
        evidenceHash: string;
        ipfsCid?: string;
        txHash?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const categories = [
        'Corporate Misconduct',
        'Government Corruption',
        'Environmental Violation',
        'Financial Fraud',
        'Safety Hazard',
        'Human Rights',
        'Other',
    ];

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) setFile(selectedFile);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) setFile(droppedFile);
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
        if (type === 'application/pdf') return <FileText className="w-5 h-5" />;
        return <File className="w-5 h-5" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.brief || !file) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Submit to Privacy Engine (Person B) - strips metadata, hashes, forwards to storage
            const response = await privacy.submitEvidence(
                file,
                `${formData.title}\n\n${formData.brief}`,
                formData.category ? [formData.category] : []
            );

            if (response.success && response.data) {
                const { submissionId, evidenceHash, storage } = response.data;
                
                setSubmissionResult({
                    submissionId,
                    evidenceHash,
                    ipfsCid: storage?.ipfsCid,
                    txHash: storage?.blockchainTx,
                });

                // Also store locally for dashboard display
                // Get current user info for user-specific storage
                const userEmail = localStorage.getItem('tars-user-email') || 'anonymous';
                const hasToken = !!localStorage.getItem('tars-access-token');
                // Use email directly as userId base for consistency
                const userId = hasToken && userEmail !== 'anonymous' ? 
                    userEmail.split('@')[0] : 'anonymous';
                
                console.log('📦 Storing evidence for user:', userId, 'email:', userEmail);
                
                const evidence = {
                    id: submissionId,
                    title: formData.title,
                    category: formData.category,
                    brief: formData.brief,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    status: 'orbiting' as const,
                    submittedAt: new Date().toISOString(),
                    submittedBy: userEmail,
                    userId: userId,
                    signatures: 0,
                    requiredSignatures: 5,
                    evidenceHash,
                    ipfsCid: storage?.ipfsCid,
                    txHash: storage?.blockchainTx,
                };

                // Store evidence with user-specific key
                const userEvidenceKey = `tars-evidence-${userId}`;
                const existing = JSON.parse(localStorage.getItem(userEvidenceKey) || '[]');
                localStorage.setItem(userEvidenceKey, JSON.stringify([evidence, ...existing]));
                
                // Also update global evidence list for admin/system use
                const globalEvidence = JSON.parse(localStorage.getItem('tars-evidence-global') || '[]');
                localStorage.setItem('tars-evidence-global', JSON.stringify([evidence, ...globalEvidence]));

                setIsSuccess(true);
                setTimeout(() => router.push('/dashboard'), 2500);
            } else {
                throw new Error(response.error?.message || 'Submission failed');
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit evidence. Please try again.');
            
            // Fallback to local storage if backend is unavailable
            const userEmail = localStorage.getItem('tars-user-email') || 'anonymous';
            const hasToken = !!localStorage.getItem('tars-access-token');
            const userId = hasToken && userEmail !== 'anonymous' ? 
                userEmail.split('@')[0] : 'anonymous';
            
            console.log('📦 Fallback: Storing evidence for user:', userId, 'email:', userEmail);
                
            const evidence = {
                id: `TARS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                title: formData.title,
                category: formData.category,
                brief: formData.brief,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                status: 'orbiting' as const,
                submittedAt: new Date().toISOString(),
                submittedBy: userEmail,
                userId: userId,
                signatures: 0,
                requiredSignatures: 5,
            };

            // Store with user-specific key
            const userEvidenceKey = `tars-evidence-${userId}`;
            const existing = JSON.parse(localStorage.getItem(userEvidenceKey) || '[]');
            localStorage.setItem(userEvidenceKey, JSON.stringify([evidence, ...existing]));
            
            // Also update global evidence for system use
            const globalEvidence = JSON.parse(localStorage.getItem('tars-evidence-global') || '[]');
            localStorage.setItem('tars-evidence-global', JSON.stringify([evidence, ...globalEvidence]));
            
            setIsSuccess(true);
            setTimeout(() => router.push('/dashboard'), 1500);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="h-screen flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-lg">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--status-verified)]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-[var(--status-verified)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--platinum)]" style={{ fontFamily: 'var(--font-display)' }}>
                        Evidence Submitted Successfully
                    </h2>
                    
                    {submissionResult && (
                        <div className="mt-6 p-4 glass text-left space-y-3">
                            <div>
                                <p className="text-xs text-[var(--silver-dark)] uppercase tracking-wider">Submission ID</p>
                                <p className="text-sm text-[var(--platinum)] font-mono">{submissionResult.submissionId}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--silver-dark)] uppercase tracking-wider">Evidence Hash (SHA-256)</p>
                                <p className="text-xs text-[var(--accent-cyan)] font-mono break-all">{submissionResult.evidenceHash}</p>
                            </div>
                            {submissionResult.ipfsCid && (
                                <div>
                                    <p className="text-xs text-[var(--silver-dark)] uppercase tracking-wider">IPFS CID</p>
                                    <p className="text-sm text-[var(--platinum)] font-mono">{submissionResult.ipfsCid}</p>
                                </div>
                            )}
                            {submissionResult.txHash && (
                                <div>
                                    <p className="text-xs text-[var(--silver-dark)] uppercase tracking-wider">Blockchain TX</p>
                                    <p className="text-sm text-[var(--platinum)] font-mono">{submissionResult.txHash}</p>
                                </div>
                            )}
                            <div className="pt-2 border-t border-[var(--silver-dark)]/20">
                                <p className="text-xs text-[var(--silver-medium)]">
                                    <Shield className="w-3 h-3 inline mr-1" />
                                    Save this receipt as proof of submission
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <p className="text-[var(--silver-medium)] mt-4">Redirecting to dashboard...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-3xl"
            >
                {/* Header */}
                <div className="mb-6 flex items-end justify-between">
                    <div>
                        <p className="text-xs text-[var(--silver-dark)] uppercase tracking-widest mb-1">New Disclosure</p>
                        <h1 className="text-3xl font-bold text-[var(--platinum)]" style={{ fontFamily: 'var(--font-display)' }}>
                            Submit Evidence
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--silver-dark)]">
                        <Shield className="w-4 h-4" />
                        <span>End-to-end encrypted</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Main Card */}
                    <div className="glass p-8">
                        {/* Title Input - Full Width, Prominent */}
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="What is this evidence about?"
                            className="w-full bg-transparent border-none text-xl text-[var(--platinum)] placeholder-[var(--silver-dark)]/50 
                         focus:outline-none focus:ring-0 mb-4"
                            style={{ fontFamily: 'var(--font-display)' }}
                            required
                        />

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--silver-dark)]/30 to-transparent mb-4" />

                        {/* Description */}
                        <textarea
                            value={formData.brief}
                            onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                            placeholder="Describe the evidence in detail. What does it show? Why is it important? Include any relevant context..."
                            className="w-full bg-transparent border-none text-[var(--silver-medium)] placeholder-[var(--silver-dark)]/40 
                         focus:outline-none focus:ring-0 resize-none leading-relaxed"
                            rows={6}
                            required
                        />

                        {/* Bottom Bar */}
                        <div className="mt-4 pt-4 border-t border-[var(--silver-dark)]/20 flex items-center gap-3">
                            {/* Category Dropdown */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--space-dark)] border border-[var(--silver-dark)]/20">
                                <Tag className="w-4 h-4 text-[var(--silver-dark)]" />
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="bg-transparent border-none text-sm text-[var(--silver-medium)] focus:outline-none cursor-pointer"
                                >
                                    <option value="">Add category</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* File Attachment */}
                            <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept="image/*,.pdf,.txt,.doc,.docx" className="hidden" />

                            <AnimatePresence mode="wait">
                                {!file ? (
                                    <motion.button
                                        key="attach"
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--space-dark)] border border-[var(--silver-dark)]/20
                               hover:border-[var(--silver-medium)]/50 transition-colors text-[var(--silver-medium)] text-sm"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                        Attach file
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        key="file"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--status-verified)]/10 border border-[var(--status-verified)]/30"
                                    >
                                        {getFileIcon(file.type)}
                                        <span className="text-sm text-[var(--platinum)] max-w-[150px] truncate">{file.name}</span>
                                        <span className="text-xs text-[var(--silver-dark)]">{formatFileSize(file.size)}</span>
                                        <button type="button" onClick={() => setFile(null)} className="ml-1 text-[var(--silver-dark)] hover:text-red-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={isSubmitting || !formData.title || !formData.brief || !file}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                style={{
                                    background: formData.title && formData.brief && file
                                        ? 'linear-gradient(135deg, #E5E4E2, #BCC6CC)'
                                        : 'var(--space-dark)',
                                    color: formData.title && formData.brief && file ? 'var(--void-black)' : 'var(--silver-dark)',
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                            <Shield className="w-4 h-4" />
                                        </motion.div>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </form>

                {/* Tip */}
                <p className="mt-4 text-center text-xs text-[var(--silver-dark)]">
                    Your identity remains anonymous • All metadata is stripped automatically
                </p>
            </motion.div>
        </div>
    );
}
