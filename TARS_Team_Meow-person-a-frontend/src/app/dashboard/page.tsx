'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, User, Users, Plus, Loader2, Award, TrendingUp, Shield } from 'lucide-react';
import Link from 'next/link';
import EvidenceCard from '@/components/dashboard/EvidenceCard';
import CustodyTimeline from '@/components/dashboard/CustodyTimeline';
import AuditPanel from '@/components/dashboard/AuditPanel';
import { reputationApi, userSecretStorage, validationApi } from '@/lib/api';

interface Evidence {
    id: string;
    fileName: string;
    status: 'orbiting' | 'verified' | 'transmitted';
    submittedAt: string;
    tags: string[];
    ipfsCid: string;
    txHash: string;
    validatorSignatures?: number;
    disclosedTo?: string[];
    submittedBy?: string;
    title?: string;
    brief?: string;
}

interface Reputation {
    totalSubmissions: number;
    validatedSubmissions: number;
    trustScore: number;
    validationRate: string;
    credibilityLevel: {
        level: string;
        badge: string;
    };
}

const filterOptions = [
    { id: 'all', label: 'All Status' },
    { id: 'orbiting', label: 'Orbiting' },
    { id: 'verified', label: 'Verified' },
    { id: 'transmitted', label: 'Transmitted' },
];

export default function DashboardPage() {
    const [allEvidence, setAllEvidence] = useState<Evidence[]>([]);
    const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [reputation, setReputation] = useState<Reputation | null>(null);
    const [pseudonymousId, setPseudonymousId] = useState<string>('');

    // Load user's reputation
    useEffect(() => {
        const loadReputation = async () => {
            try {
                const secret = userSecretStorage.getOrCreate();
                const response = await reputationApi.lookup(secret);
                if (response.success) {
                    setPseudonymousId(response.pseudonymousId);
                    setReputation(response.reputation);
                }
            } catch (err) {
                // Calculate local reputation from evidence
                const stored = localStorage.getItem('tars-evidence');
                if (stored) {
                    const evidence = JSON.parse(stored);
                    const total = evidence.length;
                    const verified = evidence.filter((e: Evidence) => e.status === 'verified').length;
                    setReputation({
                        totalSubmissions: total,
                        validatedSubmissions: verified,
                        trustScore: total > 0 ? Math.round((verified / total) * 100) : 0,
                        validationRate: total > 0 ? `${Math.round((verified / total) * 100)}%` : '0%',
                        credibilityLevel: getCredibilityLevel(total > 0 ? Math.round((verified / total) * 100) : 0)
                    });
                }
            }
        };
        loadReputation();
    }, []);

    // Helper function for credibility level
    function getCredibilityLevel(score: number) {
        if (score >= 90) return { level: 'Exemplary', badge: '🏆' };
        if (score >= 75) return { level: 'Highly Trusted', badge: '⭐' };
        if (score >= 50) return { level: 'Trusted', badge: '✓' };
        if (score >= 25) return { level: 'Building Trust', badge: '📈' };
        if (score > 0) return { level: 'New', badge: '🆕' };
        return { level: 'No History', badge: '❓' };
    }

    // Load user's submitted evidence from server (shared across all users)
    useEffect(() => {
        const loadEvidence = async () => {
            setIsLoading(true);
            try {
                // Fetch all evidence from server
                const response = await validationApi.getPendingQueue();
                if (response.success && response.data) {
                    const serverEvidence = response.data.map((e: any) => ({
                        id: e.id,
                        fileName: e.fileName || 'unknown',
                        status: e.status || 'orbiting',
                        submittedAt: e.submittedAt,
                        tags: [e.category || 'Uncategorized'],
                        ipfsCid: e.ipfsCid || 'Pending...',
                        txHash: e.txHash || 'Pending...',
                        validatorSignatures: e.currentSignatures || 0,
                        submittedBy: e.submittedBy,
                        title: e.title,
                        brief: e.brief,
                    }));
                    setAllEvidence(serverEvidence);
                    if (serverEvidence.length > 0 && !selectedEvidence) {
                        setSelectedEvidence(serverEvidence[0]);
                    }
                }
            } catch (err) {
                console.error('Failed to load evidence from server:', err);
                // Fallback to localStorage
                const stored = localStorage.getItem('tars-evidence');
                if (stored) {
                    const userEvidence = JSON.parse(stored).map((e: Evidence & { category?: string; fileSize?: number; fileType?: string }) => ({
                        ...e,
                        tags: e.tags || [e.category || 'Uncategorized'],
                        ipfsCid: e.ipfsCid || 'Pending...',
                        txHash: e.txHash || 'Pending...',
                    }));
                    setAllEvidence(userEvidence);
                    if (userEvidence.length > 0 && !selectedEvidence) {
                        setSelectedEvidence(userEvidence[0]);
                    }
                }
            }
            setIsLoading(false);
        };
        loadEvidence();
    }, []);

    // Get current user's email for filtering
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    
    useEffect(() => {
        const email = localStorage.getItem('tars-user-email') || '';
        setCurrentUserEmail(email);
    }, []);

    // Filter evidence based on search, status, and view mode
    const filteredEvidence = allEvidence
        .filter(e => {
            // View mode filter
            if (viewMode === 'mine') {
                return e.submittedBy === currentUserEmail;
            }
            return true;
        })
        .filter(e => {
            // Search filter
            const query = searchQuery.toLowerCase();
            return (
                e.fileName.toLowerCase().includes(query) ||
                e.id.toLowerCase().includes(query) ||
                e.tags.some(tag => tag.toLowerCase().includes(query)) ||
                (e.title && e.title.toLowerCase().includes(query))
            );
        })
        .filter(e => {
            // Status filter
            if (statusFilter === 'all') return true;
            return e.status === statusFilter;
        });

    const myEvidenceCount = allEvidence.filter(e => e.submittedBy === currentUserEmail).length;

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                {/* Reputation Card */}
                {reputation && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass p-6 mb-8"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--status-verified)] flex items-center justify-center text-3xl">
                                    {reputation.credibilityLevel.badge}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--platinum)] flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-[var(--accent-cyan)]" />
                                        Pseudonymous Reputation
                                    </h3>
                                    <p className="text-sm text-[var(--silver-medium)]">
                                        {reputation.credibilityLevel.level} Whistleblower
                                    </p>
                                    {pseudonymousId && (
                                        <code className="text-xs text-[var(--silver-dark)] font-mono">
                                            ID: {pseudonymousId.slice(0, 10)}...{pseudonymousId.slice(-6)}
                                        </code>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-8">
                                <div className="text-center">
                                    <div className="flex items-center gap-2 text-[var(--platinum)]">
                                        <TrendingUp className="w-4 h-4 text-[var(--status-verified)]" />
                                        <span className="text-2xl font-bold">{reputation.trustScore}%</span>
                                    </div>
                                    <p className="text-xs text-[var(--silver-dark)]">Trust Score</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center gap-2 text-[var(--platinum)]">
                                        <Award className="w-4 h-4 text-[var(--status-orbiting)]" />
                                        <span className="text-2xl font-bold">{reputation.totalSubmissions}</span>
                                    </div>
                                    <p className="text-xs text-[var(--silver-dark)]">Submissions</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-[var(--status-verified)]">
                                        {reputation.validatedSubmissions}
                                    </span>
                                    <p className="text-xs text-[var(--silver-dark)]">Verified</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start justify-between mb-8"
                >
                    <div>
                        <h1
                            className="text-4xl font-bold text-metallic-glow mb-2"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Star Map
                        </h1>
                        <p className="text-[var(--silver-medium)]">
                            Track your evidence through the TARS network
                        </p>
                    </div>

                    <Link href="/submit">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium
                                       bg-[var(--platinum)] text-[var(--void-black)]"
                        >
                            <Plus className="w-5 h-5" />
                            Submit Evidence
                        </motion.button>
                    </Link>
                </motion.div>

                {/* View Toggle & Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
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

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-[var(--silver-dark)]" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input py-2 text-sm"
                            >
                                {filterOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--silver-dark)]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search evidence..."
                                className="input pl-10 py-2 text-sm w-full"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Evidence List */}
                    <div className="lg:col-span-2 space-y-4">
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="glass p-12 text-center"
                                >
                                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-[var(--platinum)]" />
                                    <h3 className="text-lg font-medium text-[var(--platinum)] mb-2">
                                        Loading evidence...
                                    </h3>
                                    <p className="text-sm text-[var(--silver-dark)]">
                                        Syncing with the blockchain
                                    </p>
                                </motion.div>
                            ) : filteredEvidence.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="glass p-12 text-center"
                                >
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--space-medium)] flex items-center justify-center">
                                        <Search className="w-8 h-8 text-[var(--silver-dark)]" />
                                    </div>
                                    <h3 className="text-lg font-medium text-[var(--platinum)] mb-2">
                                        {viewMode === 'mine' ? 'No submissions yet' : 'No evidence found'}
                                    </h3>
                                    <p className="text-sm text-[var(--silver-dark)] mb-4">
                                        {viewMode === 'mine'
                                            ? 'Submit your first evidence to see it here'
                                            : 'Try adjusting your search or filters'}
                                    </p>
                                    {viewMode === 'mine' && (
                                        <Link href="/submit">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="px-6 py-2 rounded-xl font-medium
                                                           bg-[var(--platinum)] text-[var(--void-black)]"
                                            >
                                                Submit Evidence
                                            </motion.button>
                                        </Link>
                                    )}
                                </motion.div>
                            ) : (
                                filteredEvidence.map((evidence, index) => (
                                    <EvidenceCard
                                        key={evidence.id}
                                        evidence={evidence}
                                        index={index}
                                        isSelected={selectedEvidence?.id === evidence.id}
                                        onSelect={() => setSelectedEvidence(evidence)}
                                    />
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Chain of Custody Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            <h3
                                className="text-lg font-semibold text-[var(--platinum)] mb-4"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Chain of Custody
                            </h3>

                            <AnimatePresence mode="wait">
                                {selectedEvidence ? (
                                    <motion.div
                                        key={selectedEvidence.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <CustodyTimeline evidence={selectedEvidence} />
                                        <AuditPanel evidence={selectedEvidence} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="glass p-8 text-center"
                                    >
                                        <p className="text-sm text-[var(--silver-dark)]">
                                            Select an evidence item to view its chain of custody
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
