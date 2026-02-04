'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, User, Users, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import EvidenceCard from '@/components/dashboard/EvidenceCard';
import CustodyTimeline from '@/components/dashboard/CustodyTimeline';
import { blockchain } from '@/lib/api';

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
    userId?: string;
    title?: string;
    brief?: string;
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
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('mine');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch evidence status from blockchain and merge with local data
    const fetchEvidenceStatus = async (evidenceId: string) => {
        try {
            const response = await blockchain.getEvidenceStatus(evidenceId);
            if (response.success && response.data) {
                return response.data;
            }
        } catch (error) {
            console.warn(`Could not fetch status for ${evidenceId}:`, error);
        }
        return null;
    };

    // Load user's submitted evidence from localStorage and sync with backend
    useEffect(() => {
        const loadEvidence = async () => {
            setIsLoading(true);
            
            // Get current user info to load user-specific evidence
            const userEmail = localStorage.getItem('tars-user-email') || 'anonymous';
            const hasToken = !!localStorage.getItem('tars-access-token');
            // Use email directly as userId base for consistency (matches submit page)
            const userId = hasToken && userEmail !== 'anonymous' ? 
                userEmail.split('@')[0] : 'anonymous';
            
            console.log('📊 Loading evidence for user:', userId, 'email:', userEmail);
            
            // Load user-specific evidence or global for admins
            const userRole = localStorage.getItem('tars-user-role');
            const isAdmin = userRole === 'higher-authority' || userRole === 'admin';
            
            const storageKey = viewMode === 'all' && isAdmin ? 
                'tars-evidence-global' : 
                `tars-evidence-${userId}`;
                
            const stored = localStorage.getItem(storageKey);
            
            if (stored) {
                const userEvidence = JSON.parse(stored).map((e: Evidence & { category?: string; fileSize?: number; fileType?: string; evidenceHash?: string }) => ({
                    ...e,
                    tags: e.tags || [e.category || 'Uncategorized'],
                    ipfsCid: e.ipfsCid || `Qm${e.id.slice(-8)}...${Math.random().toString(36).slice(2, 6)}`,
                    txHash: e.txHash || `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
                }));

                // Try to fetch updated status from blockchain for each evidence
                const updatedEvidence = await Promise.all(
                    userEvidence.map(async (e: Evidence) => {
                        const blockchainStatus = await fetchEvidenceStatus(e.id);
                        if (blockchainStatus) {
                            const statusMap: Record<string, 'orbiting' | 'verified' | 'transmitted'> = {
                                'PENDING': 'orbiting',
                                'VERIFIED': 'verified',
                                'REJECTED': 'orbiting',
                            };
                            return {
                                ...e,
                                status: statusMap[blockchainStatus.status] || e.status,
                                validatorSignatures: blockchainStatus.votes?.approvals || e.validatorSignatures,
                                txHash: blockchainStatus.transactionHash || e.txHash,
                            };
                        }
                        return e;
                    })
                );

                setAllEvidence(updatedEvidence);
                if (updatedEvidence.length > 0 && !selectedEvidence) {
                    setSelectedEvidence(updatedEvidence[0]);
                }
            } else {
                setAllEvidence([]);
            }
            setIsLoading(false);
        };

        loadEvidence();
    }, [viewMode]); // Re-load when view mode changes

    // Refresh evidence status
    const handleRefresh = async () => {
        setIsLoading(true);
        
        // Get current user info and determine storage key
        const userEmail = localStorage.getItem('tars-user-email') || 'anonymous';
        const hasToken = !!localStorage.getItem('tars-access-token');
        const userId = hasToken && userEmail !== 'anonymous' ? 
            userEmail.split('@')[0] : 'anonymous';
        const userRole = localStorage.getItem('tars-user-role');
        const isAdmin = userRole === 'higher-authority' || userRole === 'admin';
        
        const storageKey = viewMode === 'all' && isAdmin ? 
            'tars-evidence-global' : 
            `tars-evidence-${userId}`;
            
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const userEvidence = JSON.parse(stored);
            const updatedEvidence = await Promise.all(
                userEvidence.map(async (e: Evidence) => {
                    const blockchainStatus = await fetchEvidenceStatus(e.id);
                    if (blockchainStatus) {
                        const statusMap: Record<string, 'orbiting' | 'verified' | 'transmitted'> = {
                            'PENDING': 'orbiting',
                            'VERIFIED': 'verified',
                            'REJECTED': 'orbiting',
                        };
                        return {
                            ...e,
                            status: statusMap[blockchainStatus.status] || e.status,
                            validatorSignatures: blockchainStatus.votes?.approvals || 0,
                        };
                    }
                    return e;
                })
            );
            setAllEvidence(updatedEvidence);
        } else {
            setAllEvidence([]);
        }
        setIsLoading(false);
    };

    // Filter evidence based on search, status, and view mode
    const filteredEvidence = allEvidence
        .filter(e => {
            // Search filter
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query || 
                e.title?.toLowerCase().includes(query) ||
                e.fileName?.toLowerCase().includes(query) ||
                e.brief?.toLowerCase().includes(query) ||
                e.id.toLowerCase().includes(query);

            // Status filter
            const matchesStatus = statusFilter === 'all' || e.status === statusFilter;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    // Calculate counts based on current user
    const userEmail = localStorage.getItem('tars-user-email') || 'anonymous';
    const myEvidenceCount = allEvidence.filter(e => e.submittedBy === userEmail).length;

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
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
                        {(() => {
                            const userRole = localStorage.getItem('tars-user-role');
                            const isAdmin = userRole === 'higher-authority' || userRole === 'admin';
                            
                            return (
                                <>
                                    {isAdmin && (
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
                                    )}
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
                                </>
                            );
                        })()} 
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
                            {filteredEvidence.length === 0 ? (
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
                        <div className="sticky top-8">
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
                                    >
                                        <CustodyTimeline evidence={selectedEvidence} />
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
