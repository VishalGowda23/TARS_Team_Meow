'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, User, Users, Plus } from 'lucide-react';
import Link from 'next/link';
import EvidenceCard from '@/components/dashboard/EvidenceCard';
import CustodyTimeline from '@/components/dashboard/CustodyTimeline';

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

// Mock evidence data (existing in the system)
const mockEvidence: Evidence[] = [
    {
        id: 'TARS-7X92K1',
        title: 'Q4 Internal Financial Discrepancies',
        brief: 'Internal memo revealing undisclosed financial discrepancies in Q4 reports. Shows deliberate misrepresentation of quarterly earnings to stakeholders.',
        fileName: 'internal_memo_q4.pdf',
        status: 'verified',
        submittedAt: '2024-01-15T10:30:00Z',
        tags: ['Corporate', 'Financial', 'Urgent'],
        ipfsCid: 'QmX7b2...8k9Zp',
        txHash: '0x8f3a...b72c',
        validatorSignatures: 3,
        disclosedTo: ['The Press', 'Legal Council'],
        submittedBy: 'anon-1',
    },
    {
        id: 'TARS-3M41P8',
        title: 'Executive Meeting Recording - Dec 12',
        brief: 'Audio recording of executive meeting discussing suppression of safety report findings. Contains admissions of knowingly ignoring regulatory requirements.',
        fileName: 'audio_recording_dec12.mp3',
        status: 'orbiting',
        submittedAt: '2024-01-14T16:45:00Z',
        tags: ['Audio', 'Meeting', 'Executive'],
        ipfsCid: 'QmY8c3...9l0Aq',
        txHash: '0x9g4b...c83d',
        validatorSignatures: 1,
        submittedBy: 'anon-2',
    },
    {
        id: 'TARS-9K28L5',
        title: 'Email Chain: Cover-up Communications',
        brief: 'Complete email chain showing coordinated effort to destroy evidence and mislead investigators. Includes communications from senior leadership.',
        fileName: 'email_chain_export.eml',
        status: 'transmitted',
        submittedAt: '2024-01-10T09:15:00Z',
        tags: ['Email', 'Evidence', 'Chain'],
        ipfsCid: 'QmZ9d4...0m1Br',
        txHash: '0x0h5c...d94e',
        validatorSignatures: 3,
        disclosedTo: ['Regulatory Body'],
        submittedBy: 'anon-3',
    },
    {
        id: 'TARS-2L59N4',
        title: '2023 Annual Report Manipulation',
        brief: 'Financial report showing evidence of systematic manipulation of annual figures. Cross-references with internal documents reveal significant discrepancies.',
        fileName: 'financial_report_2023.xlsx',
        status: 'verified',
        submittedAt: '2024-01-08T14:20:00Z',
        tags: ['Financial', 'Annual', 'Report'],
        ipfsCid: 'QmA0e5...1n2Cs',
        txHash: '0x1i6d...e05f',
        validatorSignatures: 3,
        submittedBy: 'anon-1',
    },
];

const filterOptions = [
    { id: 'all', label: 'All Status' },
    { id: 'orbiting', label: 'Orbiting' },
    { id: 'verified', label: 'Verified' },
    { id: 'transmitted', label: 'Transmitted' },
];

export default function DashboardPage() {
    const [allEvidence, setAllEvidence] = useState<Evidence[]>(mockEvidence);
    const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

    // Load user's submitted evidence from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('tars-evidence');
        if (stored) {
            const userEvidence = JSON.parse(stored).map((e: Evidence & { category?: string; fileSize?: number; fileType?: string }) => ({
                ...e,
                tags: e.tags || [e.category || 'Uncategorized'],
                ipfsCid: e.ipfsCid || `Qm${e.id.slice(-8)}...${Math.random().toString(36).slice(2, 6)}`,
                txHash: e.txHash || `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
            }));
            setAllEvidence([...userEvidence, ...mockEvidence]);
            if (userEvidence.length > 0 && !selectedEvidence) {
                setSelectedEvidence(userEvidence[0]);
            }
        } else if (!selectedEvidence && mockEvidence.length > 0) {
            setSelectedEvidence(mockEvidence[0]);
        }
    }, []);

    // Filter evidence based on search, status, and view mode
    const filteredEvidence = allEvidence
        .filter(e => {
            // View mode filter
            if (viewMode === 'mine') {
                return e.submittedBy === 'current-user';
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

    const myEvidenceCount = allEvidence.filter(e => e.submittedBy === 'current-user').length;

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
