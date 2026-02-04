'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    FileCheck,
    Clock,
    CheckCircle2,
    Fingerprint,
    Lock,
    Zap,
    User,
    Users,
    Eye,
    FileText,
    Image,
    File,
    X,
    ThumbsUp,
    ThumbsDown,
    AlertCircle,
    Radio,
} from 'lucide-react';
import CryptoHandshake from '@/components/validate/CryptoHandshake';

interface QueueItem {
    id: string;
    title?: string;
    brief?: string;
    fileName: string;
    submittedAt: string;
    fileSize: string;
    contentHash: string;
    currentSignatures: number;
    requiredSignatures: number;
    priority: 'high' | 'medium' | 'low';
    submittedBy?: string;
    category?: string;
    status?: 'orbiting' | 'verified' | 'transmitted';
}

// Mock queue data
const mockQueue: QueueItem[] = [
    {
        id: 'TARS-7X8K2M',
        title: 'Q4 Financial Irregularities',
        brief: 'Internal documents showing discrepancies between reported revenue and actual bank deposits. Multiple instances of unexplained transfers to offshore accounts.',
        fileName: 'financial_records_q4.pdf',
        submittedAt: '2024-01-16T10:30:00Z',
        fileSize: '2.4 MB',
        contentHash: 'sha256:a7f5d8c9e1b4...',
        currentSignatures: 0,
        requiredSignatures: 3,
        priority: 'high',
        submittedBy: 'anon-1',
        category: 'Financial Fraud',
    },
    {
        id: 'TARS-6R9W4T',
        title: 'Customer Data Breach Evidence',
        brief: 'JSON export from security logs showing unauthorized access to customer database. Includes timestamps, IP addresses, and compromised records count.',
        fileName: 'data_breach_evidence.json',
        submittedAt: '2024-01-16T09:15:00Z',
        fileSize: '156 KB',
        contentHash: 'sha256:b3e7f2a1d9c6...',
        currentSignatures: 1,
        requiredSignatures: 3,
        priority: 'medium',
        submittedBy: 'anon-2',
        category: 'Safety Hazard',
    },
    {
        id: 'TARS-4M2K8P',
        title: 'Executive Communication Chain',
        brief: 'Email thread between executives discussing plans to suppress safety violations. Contains admissions of knowledge and deliberate cover-up.',
        fileName: 'internal_communications.eml',
        submittedAt: '2024-01-15T16:45:00Z',
        fileSize: '89 KB',
        contentHash: 'sha256:c1d9f4e2a8b7...',
        currentSignatures: 2,
        requiredSignatures: 3,
        priority: 'low',
        submittedBy: 'anon-3',
        category: 'Corporate Misconduct',
    },
];

const priorityConfig = {
    high: { color: 'rgb(239, 68, 68)', label: 'HIGH' },
    medium: { color: 'var(--status-orbiting)', label: 'MEDIUM' },
    low: { color: 'var(--silver-medium)', label: 'LOW' },
};

function EvidenceDetailModal({
    item,
    onClose,
    onSign,
    onReject,
    isOwn,
}: {
    item: QueueItem;
    onClose: () => void;
    onSign: () => void;
    onReject: () => void;
    isOwn: boolean;
}) {
    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.pdf')) return <FileText className="w-8 h-8" />;
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <Image className="w-8 h-8" />;
        return <File className="w-8 h-8" />;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const priority = priorityConfig[item.priority];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[var(--void-black)]/90 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 w-full max-w-2xl glass p-6 max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <span
                                className="px-2 py-1 rounded text-xs font-bold uppercase"
                                style={{
                                    backgroundColor: `${priority.color}20`,
                                    color: priority.color,
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                {priority.label} PRIORITY
                            </span>
                            {isOwn && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                                    Your Submission
                                </span>
                            )}
                        </div>

                        <h2
                            className="text-2xl font-bold text-[var(--platinum)]"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {item.title || item.fileName}
                        </h2>

                        <code
                            className="text-sm text-[var(--silver-medium)] mt-2 block"
                            style={{ fontFamily: 'var(--font-mono)' }}
                        >
                            {item.id}
                        </code>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-[var(--silver-dark)] hover:text-[var(--platinum)] transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {/* Brief Description */}
                    {item.brief && (
                        <div>
                            <h3 className="text-sm font-medium text-[var(--silver-dark)] mb-2 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Evidence Description
                            </h3>
                            <div className="p-4 bg-[var(--space-dark)] rounded-lg border border-[var(--silver-dark)]/20">
                                <p className="text-[var(--platinum)] leading-relaxed">
                                    {item.brief}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* File Information */}
                    <div>
                        <h3 className="text-sm font-medium text-[var(--silver-dark)] mb-2">
                            File Information
                        </h3>
                        <div className="flex items-center gap-4 p-4 bg-[var(--space-dark)] rounded-lg">
                            <div className="w-12 h-12 rounded-lg bg-[var(--space-medium)] flex items-center justify-center text-[var(--platinum)]">
                                {getFileIcon(item.fileName)}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-[var(--platinum)]">{item.fileName}</p>
                                <p className="text-sm text-[var(--silver-dark)]">{item.fileSize}</p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--space-dark)] rounded-lg">
                            <p className="text-xs text-[var(--silver-dark)] mb-1">Category</p>
                            <p className="font-medium text-[var(--platinum)]">
                                {item.category || 'Uncategorized'}
                            </p>
                        </div>
                        <div className="p-4 bg-[var(--space-dark)] rounded-lg">
                            <p className="text-xs text-[var(--silver-dark)] mb-1">Submitted</p>
                            <p className="font-medium text-[var(--platinum)]">
                                {formatDate(item.submittedAt)}
                            </p>
                        </div>
                    </div>

                    {/* Content Hash */}
                    <div className="p-4 bg-[var(--space-dark)] rounded-lg">
                        <p className="text-xs text-[var(--silver-dark)] mb-1">Content Hash</p>
                        <code
                            className="text-sm text-[var(--accent-cyan)] break-all"
                            style={{ fontFamily: 'var(--font-mono)' }}
                        >
                            {item.contentHash}
                        </code>
                    </div>

                    {/* Signature Progress */}
                    <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-[var(--silver-dark)]">Validator Signatures</span>
                            <span className="text-[var(--platinum)] font-medium">
                                {item.currentSignatures} of {item.requiredSignatures} required
                            </span>
                        </div>
                        <div className="h-3 bg-[var(--space-dark)] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.currentSignatures / item.requiredSignatures) * 100}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full rounded-full bg-gradient-to-r from-[var(--status-orbiting)] to-[var(--status-verified)]"
                            />
                        </div>
                    </div>

                    {/* Validation Actions - only for non-own evidence */}
                    {!isOwn && (
                        <div className="pt-4 border-t border-[var(--silver-dark)]/20">
                            <div className="flex items-center gap-2 text-sm text-[var(--silver-dark)] mb-4">
                                <AlertCircle className="w-4 h-4" />
                                <span>As a validator, you can sign or reject this evidence</span>
                            </div>
                            <div className="flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onSign}
                                    className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2
                                               bg-[var(--status-verified)]/20 text-[var(--status-verified)] 
                                               border border-[var(--status-verified)]/30 hover:border-[var(--status-verified)]/50"
                                >
                                    <ThumbsUp className="w-5 h-5" />
                                    Sign & Validate
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onReject}
                                    className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2
                                               bg-red-500/10 text-red-400 
                                               border border-red-500/30 hover:border-red-500/50"
                                >
                                    <ThumbsDown className="w-5 h-5" />
                                    Reject
                                </motion.button>
                            </div>
                        </div>
                    )}

                    {/* Own evidence - status info */}
                    {isOwn && (
                        <div className="pt-4 border-t border-[var(--silver-dark)]/20">
                            <div className="flex items-center gap-3 p-4 bg-[var(--status-orbiting)]/10 rounded-lg border border-[var(--status-orbiting)]/30">
                                <Radio className="w-5 h-5 text-[var(--status-orbiting)]" />
                                <div>
                                    <p className="font-medium text-[var(--platinum)]">Awaiting Validation</p>
                                    <p className="text-sm text-[var(--silver-dark)]">
                                        Your evidence is in the queue. {item.requiredSignatures - item.currentSignatures} more
                                        signature{item.requiredSignatures - item.currentSignatures !== 1 ? 's' : ''} needed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

function QueueItemCard({
    item,
    index,
    onClick,
    isOwn,
}: {
    item: QueueItem;
    index: number;
    onClick: () => void;
    isOwn: boolean;
}) {
    const priority = priorityConfig[item.priority];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            onClick={onClick}
            className="glass p-5 cursor-pointer hover:border-[var(--platinum)]/30 transition-all relative"
        >
            {/* Priority indicator */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: priority.color }}
            />

            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--platinum)] truncate">
                            {item.title || item.fileName}
                        </h3>
                        {isOwn && (
                            <span className="px-2 py-0.5 rounded text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                                Yours
                            </span>
                        )}
                    </div>
                    <code
                        className="text-xs text-[var(--silver-dark)]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                    >
                        {item.id}
                    </code>
                </div>

                <span
                    className="px-2 py-1 rounded text-xs font-bold uppercase flex-shrink-0"
                    style={{
                        backgroundColor: `${priority.color}20`,
                        color: priority.color,
                        fontFamily: 'var(--font-mono)',
                    }}
                >
                    {priority.label}
                </span>
            </div>

            {item.brief && (
                <p className="text-sm text-[var(--silver-medium)] line-clamp-2 mb-3 pl-2">
                    {item.brief}
                </p>
            )}

            <div className="flex items-center justify-between pl-2">
                <div className="flex items-center gap-4 text-xs text-[var(--silver-dark)]">
                    <span>{item.fileName}</span>
                    <span>{item.fileSize}</span>
                </div>
                <span className="text-xs text-[var(--silver-dark)]">
                    {formatDate(item.submittedAt)}
                </span>
            </div>

            {/* Signature Progress */}
            <div className="mt-3 pt-3 border-t border-[var(--silver-dark)]/20 pl-2">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--silver-dark)]">Signatures</span>
                    <span className="text-[var(--platinum)]">
                        {item.currentSignatures}/{item.requiredSignatures}
                    </span>
                </div>
                <div className="h-1.5 bg-[var(--space-dark)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--status-orbiting)] to-[var(--status-verified)]"
                        style={{ width: `${(item.currentSignatures / item.requiredSignatures) * 100}%` }}
                    />
                </div>
            </div>
        </motion.div>
    );
}

export default function ValidatePage() {
    const [queue, setQueue] = useState<QueueItem[]>(mockQueue);
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
    const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
    const [signingId, setSigningId] = useState<string | null>(null);
    const [showHandshake, setShowHandshake] = useState(false);

    // Load user's evidence from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('tars-evidence');
        if (stored) {
            const userEvidence = JSON.parse(stored).map((e: QueueItem & { fileType?: string }) => ({
                ...e,
                title: e.title || e.fileName,
                fileSize: e.fileSize || 'Unknown',
                contentHash: `sha256:${e.id.slice(-8)}${Math.random().toString(16).slice(2, 10)}...`,
                currentSignatures: e.currentSignatures || 0,
                requiredSignatures: e.requiredSignatures || 3,
                priority: 'medium' as const,
                submittedBy: 'current-user',
            }));
            setQueue([...userEvidence, ...mockQueue]);
        }
    }, []);

    const handleSign = (id: string) => {
        setSelectedItem(null);
        setSigningId(id);
        setShowHandshake(true);
    };

    const handleHandshakeComplete = () => {
        if (signingId) {
            setQueue(prev => prev.map(item =>
                item.id === signingId
                    ? { ...item, currentSignatures: item.currentSignatures + 1 }
                    : item
            ));
        }
        setShowHandshake(false);
        setSigningId(null);
    };

    const handleReject = (id: string) => {
        setSelectedItem(null);
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    const displayedQueue = viewMode === 'mine'
        ? queue.filter(item => item.submittedBy === 'current-user')
        : queue;

    const myEvidenceCount = queue.filter(item => item.submittedBy === 'current-user').length;

    const stats = {
        pending: queue.length,
        signedToday: 12,
        totalSigned: 147,
    };

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-[var(--platinum)]/10 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-[var(--platinum)]" />
                        </div>
                        <div>
                            <h1
                                className="text-4xl font-bold text-metallic-glow"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                The Bridge
                            </h1>
                            <p className="text-[var(--silver-medium)]">
                                Validator Control Panel
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-4 mb-8"
                >
                    {[
                        { label: 'Pending Verification', value: stats.pending, icon: Clock, color: 'var(--status-orbiting)' },
                        { label: 'Signed Today', value: stats.signedToday, icon: FileCheck, color: 'var(--status-verified)' },
                        { label: 'Total Verified', value: stats.totalSigned, icon: Fingerprint, color: 'var(--accent-cyan)' },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="glass p-6"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                                <span
                                    className="text-3xl font-bold"
                                    style={{ fontFamily: 'var(--font-mono)', color: stat.color }}
                                >
                                    {stat.value}
                                </span>
                            </div>
                            <p className="text-sm text-[var(--silver-dark)]">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* View Toggle & Tactical View Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6"
                >
                    {/* View Mode Toggle */}
                    <div className="flex bg-[var(--space-medium)] rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'all'
                                    ? 'bg-[var(--platinum)] text-[var(--void-black)]'
                                    : 'text-[var(--silver-medium)] hover:text-[var(--platinum)]'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            All Evidence
                        </button>
                        <button
                            onClick={() => setViewMode('mine')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'mine'
                                    ? 'bg-[var(--platinum)] text-[var(--void-black)]'
                                    : 'text-[var(--silver-medium)] hover:text-[var(--platinum)]'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            My Submissions
                            {myEvidenceCount > 0 && (
                                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[var(--accent-cyan)] text-[var(--void-black)]">
                                    {myEvidenceCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <h2
                            className="text-xl font-semibold flex items-center gap-2"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            <Zap className="w-5 h-5 text-[var(--accent-cyan)]" />
                            Tactical View
                        </h2>
                        <div className="flex items-center gap-1 ml-4 text-xs text-[var(--silver-dark)]">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span>LIVE</span>
                        </div>
                    </div>
                </motion.div>

                {/* Validation Queue */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {displayedQueue.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass p-12 text-center"
                            >
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--space-medium)] flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-[var(--silver-dark)]" />
                                </div>
                                <h3 className="text-lg font-medium text-[var(--platinum)] mb-2">
                                    {viewMode === 'mine' ? 'No submissions in queue' : 'Queue is empty'}
                                </h3>
                                <p className="text-sm text-[var(--silver-dark)]">
                                    {viewMode === 'mine'
                                        ? 'Your submitted evidence will appear here while awaiting validation'
                                        : 'No evidence currently pending validation'}
                                </p>
                            </motion.div>
                        ) : (
                            displayedQueue.map((item, index) => (
                                <QueueItemCard
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onClick={() => setSelectedItem(item)}
                                    isOwn={item.submittedBy === 'current-user'}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Security Notice */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 p-4 glass flex items-start gap-3"
                >
                    <Lock className="w-5 h-5 text-[var(--accent-cyan)] flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-[var(--platinum)]">
                            Zero-Knowledge Verification
                        </p>
                        <p className="text-xs text-[var(--silver-dark)] mt-1">
                            You are signing the cryptographic hash of the evidence, not the content itself.
                            Your signature confirms authenticity without exposing the data.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Evidence Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <EvidenceDetailModal
                        item={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onSign={() => handleSign(selectedItem.id)}
                        onReject={() => handleReject(selectedItem.id)}
                        isOwn={selectedItem.submittedBy === 'current-user'}
                    />
                )}
            </AnimatePresence>

            {/* Crypto Handshake Animation Overlay */}
            <AnimatePresence>
                {showHandshake && (
                    <CryptoHandshake
                        onComplete={handleHandshakeComplete}
                        evidenceId={signingId || ''}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
