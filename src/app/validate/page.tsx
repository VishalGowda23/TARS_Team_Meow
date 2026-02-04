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
import { blockchain } from '@/lib/api';

interface QueueItem {
    id: string;
    title?: string;
    brief?: string;
    fileName: string;
    submittedAt: string;
    fileSize: string | number;
    contentHash: string;
    currentSignatures: number;
    requiredSignatures: number;
    priority: 'high' | 'medium' | 'low';
    submittedBy?: string;
    category?: string;
    status?: 'orbiting' | 'verified' | 'transmitted';
    signatures?: number;
    evidenceHash?: string;
}



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
    hasVoted,
}: {
    item: QueueItem;
    onClose: () => void;
    onSign: () => void;
    onReject: () => void;
    isOwn: boolean;
    hasVoted: boolean;
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

                    {/* Validation Actions - only for non-own evidence that hasn't been voted on */}
                    {!isOwn && !hasVoted && (
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
                    
                    {/* Already voted message */}
                    {!isOwn && hasVoted && (
                        <div className="pt-4 border-t border-[var(--silver-dark)]/20">
                            <div className="flex items-center gap-3 p-4 bg-[var(--status-verified)]/10 rounded-lg border border-[var(--status-verified)]/30">
                                <CheckCircle2 className="w-5 h-5 text-[var(--status-verified)]" />
                                <div>
                                    <p className="font-medium text-[var(--platinum)]">You Have Voted</p>
                                    <p className="text-sm text-[var(--silver-dark)]">
                                        Your vote has been recorded for this evidence.
                                    </p>
                                </div>
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
    hasVoted,
}: {
    item: QueueItem;
    index: number;
    onClick: () => void;
    isOwn: boolean;
    hasVoted: boolean;
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
                        {hasVoted && !isOwn && (
                            <span className="px-2 py-0.5 rounded text-xs bg-[var(--status-verified)]/20 text-[var(--status-verified)]">
                                ✓ Voted
                            </span>
                        )}
                        {item.status === 'verified' && (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                                Verified
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
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
    const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
    const [signingId, setSigningId] = useState<string | null>(null);
    const [showHandshake, setShowHandshake] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [votedItems, setVotedItems] = useState<Set<string>>(new Set());
    const [signedTodayCount, setSignedTodayCount] = useState(0);
    const [totalVerifiedCount, setTotalVerifiedCount] = useState(0);

    // Determine priority based on evidence attributes
    const determinePriority = (e: any): 'high' | 'medium' | 'low' => {
        if (e.category === 'Financial Fraud' || e.category === 'Safety Violation') return 'high';
        if (e.category === 'Environmental' || e.category === 'Corruption') return 'medium';
        return 'low';
    };

    // Load ALL evidence from global storage for validation
    useEffect(() => {
        // Get current user email for ownership detection
        const userEmail = localStorage.getItem('tars-user-email') || '';
        setCurrentUserEmail(userEmail);
        
        // Load voted items from localStorage
        const votedKey = `tars-voted-${userEmail}`;
        const storedVoted = localStorage.getItem(votedKey);
        if (storedVoted) {
            setVotedItems(new Set(JSON.parse(storedVoted)));
        }
        
        // Load stats from localStorage
        const todayKey = `tars-signed-today-${new Date().toDateString()}`;
        const todayCount = parseInt(localStorage.getItem(todayKey) || '0');
        setSignedTodayCount(todayCount);
        
        const totalCount = parseInt(localStorage.getItem('tars-total-verified') || '0');
        setTotalVerifiedCount(totalCount);
        
        // Load global evidence for validators to review
        const globalEvidence = localStorage.getItem('tars-evidence-global');
        
        if (globalEvidence) {
            const allEvidence = JSON.parse(globalEvidence).map((e: QueueItem & { fileType?: string; evidenceHash?: string }) => ({
                ...e,
                title: e.title || e.fileName,
                fileSize: typeof e.fileSize === 'number' ? formatFileSize(e.fileSize) : (e.fileSize || 'Unknown'),
                contentHash: e.evidenceHash || `sha256:${e.id.slice(-8)}${Math.random().toString(16).slice(2, 10)}...`,
                currentSignatures: e.currentSignatures || e.signatures || 0,
                requiredSignatures: e.requiredSignatures || 3,
                priority: determinePriority(e),
                // Keep the actual submittedBy from evidence
            }));
            setQueue(allEvidence);
        }
    }, []);
    
    // Helper to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };
    
    // Check if current user has already voted on this item
    const hasVoted = (itemId: string): boolean => {
        return votedItems.has(itemId);
    };
    
    // Check if evidence belongs to current user
    const isOwnEvidence = (item: QueueItem): boolean => {
        return item.submittedBy === currentUserEmail;
    };

    // Submit vote to blockchain
    const submitVoteToBlockchain = async (evidenceId: string, approve: boolean) => {
        try {
            // Get validator address from localStorage
            const validatorAddress = localStorage.getItem('tars-wallet-address') || 
                localStorage.getItem('validator-address') || 
                'validator_' + Date.now();
            
            const response = await blockchain.submitVote({
                evidenceId,
                validatorAddress,
                approve,
                reason: approve ? 'Evidence verified and authentic' : 'Evidence rejected',
                signature: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            });
            
            return response;
        } catch (error) {
            console.error('Blockchain vote failed:', error);
            return null;
        }
    };

    const handleSign = async (id: string) => {
        setSelectedItem(null);
        setSigningId(id);
        setShowHandshake(true);
    };

    const handleHandshakeComplete = async () => {
        if (signingId) {
            setIsVoting(true);
            
            // Submit vote to blockchain
            const result = await submitVoteToBlockchain(signingId, true);
            
            // Get the actual vote count from blockchain response
            const blockchainVoteCount = result?.data?.votes?.approvals || 0;
            
            // Track this vote
            const newVotedItems = new Set(votedItems);
            newVotedItems.add(signingId);
            setVotedItems(newVotedItems);
            
            // Save voted items to localStorage
            const votedKey = `tars-voted-${currentUserEmail}`;
            localStorage.setItem(votedKey, JSON.stringify([...newVotedItems]));
            
            // Update signed today count
            const todayKey = `tars-signed-today-${new Date().toDateString()}`;
            const newTodayCount = signedTodayCount + 1;
            setSignedTodayCount(newTodayCount);
            localStorage.setItem(todayKey, newTodayCount.toString());
            
            // Update local state with blockchain vote count
            setQueue(prev => prev.map(item => {
                if (item.id === signingId) {
                    const newStatus = blockchainVoteCount >= item.requiredSignatures ? 'verified' : item.status;
                    
                    // Update total verified if this evidence just got verified
                    if (newStatus === 'verified' && item.status !== 'verified') {
                        const newTotal = totalVerifiedCount + 1;
                        setTotalVerifiedCount(newTotal);
                        localStorage.setItem('tars-total-verified', newTotal.toString());
                    }
                    
                    return { 
                        ...item, 
                        currentSignatures: blockchainVoteCount,
                        status: newStatus as 'orbiting' | 'verified' | 'transmitted'
                    };
                }
                return item;
            }));

            // Update localStorage (global evidence) with blockchain vote count
            const stored = localStorage.getItem('tars-evidence-global');
            if (stored) {
                const evidence = JSON.parse(stored);
                const updated = evidence.map((e: QueueItem) => {
                    if (e.id === signingId) {
                        return {
                            ...e,
                            currentSignatures: blockchainVoteCount,
                            signatures: blockchainVoteCount,
                            status: blockchainVoteCount >= 5 ? 'verified' : 'orbiting',
                        };
                    }
                    return e;
                });
                localStorage.setItem('tars-evidence-global', JSON.stringify(updated));
            }

            setIsVoting(false);
        }
        setShowHandshake(false);
        setSigningId(null);
    };

    const handleReject = async (id: string) => {
        console.log('🚫 Rejecting evidence:', id);
        setSelectedItem(null);
        setIsVoting(true);
        
        // Submit rejection vote to blockchain
        const result = await submitVoteToBlockchain(id, false);
        console.log('Blockchain rejection result:', result);
        
        // Track this vote
        const newVotedItems = new Set(votedItems);
        newVotedItems.add(id);
        setVotedItems(newVotedItems);
        
        // Save voted items to localStorage
        const votedKey = `tars-voted-${currentUserEmail}`;
        localStorage.setItem(votedKey, JSON.stringify([...newVotedItems]));
        
        // Update local state - mark as rejected but keep in list
        setQueue(prev => prev.map(item => 
            item.id === id ? { ...item, status: 'transmitted' as const } : item
        ));
        
        // Update global localStorage as well
        const stored = localStorage.getItem('tars-evidence-global');
        if (stored) {
            const evidence = JSON.parse(stored);
            const updated = evidence.map((e: QueueItem) => {
                if (e.id === id) {
                    return { ...e, status: 'transmitted' };
                }
                return e;
            });
            localStorage.setItem('tars-evidence-global', JSON.stringify(updated));
        }
        
        setIsVoting(false);
        console.log('✅ Rejection complete');
    };

    const displayedQueue = viewMode === 'mine'
        ? queue.filter(item => isOwnEvidence(item))
        : queue;

    const myEvidenceCount = queue.filter(item => isOwnEvidence(item)).length;
    const othersEvidenceCount = queue.filter(item => !isOwnEvidence(item)).length;

    const stats = {
        pending: queue.filter(item => !hasVoted(item.id) && item.status !== 'verified').length,
        signedToday: signedTodayCount,
        totalSigned: totalVerifiedCount,
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
                                    isOwn={isOwnEvidence(item)}
                                    hasVoted={hasVoted(item.id)}
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
                        isOwn={isOwnEvidence(selectedItem)}
                        hasVoted={hasVoted(selectedItem.id)}
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
