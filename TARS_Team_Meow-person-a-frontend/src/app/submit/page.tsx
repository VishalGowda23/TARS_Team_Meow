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
    EyeOff,
    Eye,
} from 'lucide-react';
import { evidenceApi, userSecretStorage, ApiError } from '@/lib/api';
import RedactionModal from '@/components/redaction/RedactionModal';

export default function SubmitPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Use a ref to store the actual file to submit - refs update immediately unlike state
    const actualFileToSubmitRef = useRef<File | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        brief: '',
    });
    // fileForDisplay is what we show in the UI
    const [fileForDisplay, setFileForDisplay] = useState<File | null>(null);
    // fileToSubmit is ALWAYS what gets submitted - this is the redacted file if redaction was applied
    const [fileToSubmit, setFileToSubmit] = useState<File | null>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRedactionModal, setShowRedactionModal] = useState(false);
    const [redactedWords, setRedactedWords] = useState<string[]>([]);
    const [submissionResult, setSubmissionResult] = useState<{
        submissionId: string;
        ipfsCid: string;
        txHash: string;
        strippedFields?: string[];
    } | null>(null);

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
        if (selectedFile) {
            setOriginalFile(selectedFile);
            // If it's a PDF, show redaction modal
            if (selectedFile.type === 'application/pdf') {
                setShowRedactionModal(true);
            } else {
                // For non-PDF files, use as-is (both display and submit are same)
                actualFileToSubmitRef.current = selectedFile;
                setFileForDisplay(selectedFile);
                setFileToSubmit(selectedFile);
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setOriginalFile(droppedFile);
            // If it's a PDF, show redaction modal
            if (droppedFile.type === 'application/pdf') {
                setShowRedactionModal(true);
            } else {
                // For non-PDF files, use as-is (both display and submit are same)
                actualFileToSubmitRef.current = droppedFile;
                setFileForDisplay(droppedFile);
                setFileToSubmit(droppedFile);
            }
        }
    };

    const handleRedactionComplete = (redactedFile: File, words: string[]) => {
        console.log('🔒 Redaction complete - SETTING REDACTED FILE:');
        console.log('   - Original file size:', originalFile?.size);
        console.log('   - Redacted file size:', redactedFile.size);
        console.log('   - Words redacted:', words);
        
        // CRITICAL: Store in ref immediately - this is what we'll actually submit
        actualFileToSubmitRef.current = redactedFile;
        
        // IMPORTANT: Show alert to confirm redaction worked
        alert(`✅ Redaction complete!\n\nOriginal: ${originalFile?.size?.toLocaleString()} bytes\nRedacted: ${redactedFile.size.toLocaleString()} bytes\n\nThe REDACTED file (${redactedFile.size.toLocaleString()} bytes) will be submitted.`);
        
        // Set the REDACTED file as the one to submit
        setFileToSubmit(redactedFile);
        // Show the redacted file in the UI
        setFileForDisplay(redactedFile);
        setRedactedWords(words);
        setShowRedactionModal(false);
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
        
        // CRITICAL: Use the ref which has the actual file (refs update immediately, state doesn't)
        const theFileToSubmit = actualFileToSubmitRef.current;
        
        if (!formData.title || !formData.brief || !theFileToSubmit) {
            alert('Please fill in all fields and attach a file');
            return;
        }

        // IMPORTANT: Show what we're about to submit
        const confirmMsg = `📤 SUBMITTING FILE:\n\nName: ${theFileToSubmit.name}\nSize: ${theFileToSubmit.size.toLocaleString()} bytes (${formatFileSize(theFileToSubmit.size)})\n\nThis should be the REDACTED file if you applied redactions.\n\nProceed?`;
        if (!confirm(confirmMsg)) return;

        console.log('📤 Submitting evidence:');
        console.log('   - File name:', theFileToSubmit.name);
        console.log('   - File size:', theFileToSubmit.size);
        console.log('   - File type:', theFileToSubmit.type);
        console.log('   - Redacted words:', redactedWords);

        setIsSubmitting(true);
        setError(null);

        try {
            // Get or create user secret for pseudonymous identity
            const userSecret = userSecretStorage.getOrCreate();
            
            // Submit to backend - this will:
            // 1. Strip metadata from files
            // 2. Encrypt and upload to IPFS
            // 3. Record proof-of-existence on blockchain
            const response = await evidenceApi.submit(
                theFileToSubmit,
                formData.category || 'Other',
                formData.title,
                formData.brief,
                userSecret
            );

            if (response.success) {
                setSubmissionResult({
                    submissionId: response.data.submissionId,
                    ipfsCid: response.data.ipfsCid,
                    txHash: response.data.txHash,
                    strippedFields: response.submissions?.[0]?.strippedFields || [],
                });

                // Get current user's email for tracking ownership
                const currentUserEmail = localStorage.getItem('tars-user-email') || 'anonymous';

                // Also store locally for dashboard
                const evidence = {
                    id: response.data.submissionId,
                    title: formData.title,
                    category: formData.category || 'Other',
                    brief: formData.brief,
                    fileName: theFileToSubmit.name,
                    fileType: theFileToSubmit.type,
                    fileSize: theFileToSubmit.size,
                    status: 'orbiting' as const,
                    submittedAt: new Date().toISOString(),
                    submittedBy: currentUserEmail,
                    ipfsCid: response.data.ipfsCid,
                    txHash: response.data.txHash,
                    contentHash: response.data.contentHash,
                    signatures: 0,
                    requiredSignatures: 3,
                };

                const existing = JSON.parse(localStorage.getItem('tars-evidence') || '[]');
                localStorage.setItem('tars-evidence', JSON.stringify([evidence, ...existing]));

                setIsSuccess(true);
                setTimeout(() => router.push('/dashboard'), 2500);
            }
        } catch (err) {
            console.error('Submission error:', err);
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to submit evidence. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess && submissionResult) {
        return (
            <div className="h-screen flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-lg">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--status-verified)]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-[var(--status-verified)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--platinum)]" style={{ fontFamily: 'var(--font-display)' }}>
                        Evidence Submitted Successfully
                    </h2>
                    <p className="text-[var(--silver-medium)] mt-2 mb-4">
                        Your evidence has been encrypted, uploaded to IPFS, and recorded on the blockchain.
                    </p>
                    
                    {/* Metadata Stripping Info */}
                    {submissionResult.strippedFields && submissionResult.strippedFields.length > 0 && (
                        <div className="glass p-4 text-left mb-4 border border-[var(--status-verified)]/30 bg-[var(--status-verified)]/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-[var(--status-verified)]" />
                                <span className="text-sm font-semibold text-[var(--status-verified)]">Metadata Sanitized</span>
                            </div>
                            <p className="text-xs text-[var(--silver-dark)] mb-2">
                                The following identifying information was removed:
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {submissionResult.strippedFields.map((field, i) => (
                                    <span key={i} className="px-2 py-0.5 text-xs rounded bg-[var(--space-medium)] text-[var(--silver-medium)]">
                                        {field}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Blockchain Details */}
                    <div className="glass p-4 text-left space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-[var(--silver-dark)]">Submission ID</span>
                            <span className="text-xs text-[var(--platinum)] font-mono">{submissionResult.submissionId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-[var(--silver-dark)]">IPFS CID</span>
                            <span className="text-xs text-[var(--platinum)] font-mono truncate max-w-[200px]">{submissionResult.ipfsCid}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-[var(--silver-dark)]">TX Hash</span>
                            <a 
                                href={`https://sepolia.etherscan.io/tx/${submissionResult.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--status-verified)] font-mono truncate max-w-[200px] hover:underline"
                            >
                                {submissionResult.txHash.slice(0, 10)}...{submissionResult.txHash.slice(-8)}
                            </a>
                        </div>
                    </div>
                    
                    <p className="text-[var(--silver-dark)] mt-4 text-sm">Redirecting to dashboard...</p>
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
                    {/* Error Display */}
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-400">{error}</p>
                            <button 
                                type="button"
                                onClick={() => setError(null)}
                                className="ml-auto text-red-400 hover:text-red-300"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

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
                        <div className="mt-4 pt-4 border-t border-[var(--silver-dark)]/20 flex flex-wrap items-center gap-3">
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
                                {!fileForDisplay ? (
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
                                        {getFileIcon(fileForDisplay.type)}
                                        <span className="text-sm text-[var(--platinum)] max-w-[150px] truncate">{fileForDisplay.name}</span>
                                        <span className="text-xs text-[var(--silver-dark)]">{formatFileSize(fileForDisplay.size)}</span>
                                        {redactedWords.length > 0 && (
                                            <>
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">
                                                    <EyeOff className="w-3 h-3" />
                                                    {redactedWords.length} redacted
                                                </span>
                                                {/* Preview redacted file button */}
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        if (fileToSubmit) {
                                                            const url = URL.createObjectURL(fileToSubmit);
                                                            window.open(url, '_blank');
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/30"
                                                    title="Preview redacted PDF"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    Preview
                                                </button>
                                            </>
                                        )}
                                        <button type="button" onClick={() => { 
                                            actualFileToSubmitRef.current = null;
                                            setFileForDisplay(null);
                                            setFileToSubmit(null);
                                            setRedactedWords([]);
                                        }} className="ml-1 text-[var(--silver-dark)] hover:text-red-400">
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
                                disabled={isSubmitting || !formData.title || !formData.brief || !fileToSubmit}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                style={{
                                    background: formData.title && formData.brief && fileToSubmit
                                        ? 'linear-gradient(135deg, #E5E4E2, #BCC6CC)'
                                        : 'var(--space-dark)',
                                    color: formData.title && formData.brief && fileToSubmit ? 'var(--void-black)' : 'var(--silver-dark)',
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

            {/* Redaction Modal */}
            <RedactionModal
                file={originalFile}
                isOpen={showRedactionModal}
                onClose={() => {
                    setShowRedactionModal(false);
                    // If user closes without redacting, use original file
                    if (originalFile && !actualFileToSubmitRef.current) {
                        actualFileToSubmitRef.current = originalFile;
                        setFileToSubmit(originalFile);
                        setFileForDisplay(originalFile);
                    }
                }}
                onRedactionComplete={handleRedactionComplete}
            />
        </div>
    );
}
