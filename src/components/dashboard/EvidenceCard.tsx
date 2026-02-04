'use client';

import { motion } from 'framer-motion';
import { File, Clock, CheckCircle2, Radio, Copy, Tag, FileText } from 'lucide-react';
import { useState } from 'react';

interface Evidence {
    id: string;
    title?: string;
    fileName: string;
    brief?: string;
    status: 'orbiting' | 'verified' | 'transmitted';
    submittedAt: string;
    tags?: string[];
    category?: string;
    ipfsCid?: string;
    txHash?: string;
    validatorSignatures?: number;
    signatures?: number;
    requiredSignatures?: number;
    disclosedTo?: string[];
}

interface EvidenceCardProps {
    evidence: Evidence;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
}

const statusConfig = {
    orbiting: {
        label: 'ORBITING',
        icon: Clock,
        className: 'badge-orbiting',
    },
    verified: {
        label: 'VERIFIED',
        icon: CheckCircle2,
        className: 'badge-verified',
    },
    transmitted: {
        label: 'TRANSMITTED',
        icon: Radio,
        className: 'badge-transmitted',
    },
};

export default function EvidenceCard({ evidence, index, isSelected, onSelect }: EvidenceCardProps) {
    const [copied, setCopied] = useState(false);
    const status = statusConfig[evidence.status];
    const StatusIcon = status.icon;

    // Use title if available, otherwise fall back to fileName
    const displayTitle = evidence.title || evidence.fileName;
    const hasDescription = evidence.brief && evidence.brief.length > 0;

    const copyId = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(evidence.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get signature count
    const signatures = evidence.signatures ?? evidence.validatorSignatures ?? 0;
    const requiredSignatures = evidence.requiredSignatures ?? 3;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            onClick={onSelect}
            className={`
        card cursor-pointer transition-all relative
        ${isSelected
                    ? 'border-[var(--platinum)]/50 bg-[var(--platinum)]/5'
                    : 'hover:border-white/20'
                }
      `}
        >
            <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="w-12 h-12 rounded-lg bg-[var(--space-medium)] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-[var(--platinum)]" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="min-w-0">
                            {/* Evidence Title */}
                            <h3 className="font-medium text-[var(--platinum)] truncate">{displayTitle}</h3>

                            {/* ID and File Reference */}
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className="text-xs text-[var(--silver-dark)]"
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                >
                                    {evidence.id}
                                </span>
                                <button
                                    onClick={copyId}
                                    className="p-1 rounded hover:bg-white/5 transition-colors"
                                    title="Copy ID"
                                >
                                    {copied ? (
                                        <CheckCircle2 className="w-3 h-3 text-[var(--status-verified)]" />
                                    ) : (
                                        <Copy className="w-3 h-3 text-[var(--silver-dark)]" />
                                    )}
                                </button>
                                {evidence.title && (
                                    <span className="text-xs text-[var(--silver-dark)]">
                                        • {evidence.fileName}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`badge ${status.className} flex-shrink-0`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                        </div>
                    </div>

                    {/* Description Preview (when selected) */}
                    {isSelected && hasDescription && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 p-3 rounded-lg bg-[var(--void-black)]/50 border border-[var(--silver-dark)]/20"
                        >
                            <p className="text-sm text-[var(--silver-medium)] leading-relaxed">
                                {evidence.brief}
                            </p>
                        </motion.div>
                    )}

                    {/* Tags / Category */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {evidence.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[var(--platinum)]/10 text-[var(--silver-medium)]">
                                <Tag className="w-3 h-3" />
                                {evidence.category}
                            </span>
                        )}
                        {evidence.tags?.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[var(--space-medium)] text-[var(--silver-dark)]"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-[var(--silver-dark)]">
                        <span>Submitted {formatDate(evidence.submittedAt)}</span>

                        <div className="flex items-center gap-4">
                            {signatures > 0 && (
                                <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-[var(--status-verified)]" />
                                    {signatures}/{requiredSignatures} validated
                                </span>
                            )}

                            {evidence.disclosedTo && evidence.disclosedTo.length > 0 && (
                                <span className="text-[var(--accent-cyan)]">
                                    Disclosed to {evidence.disclosedTo.length} entities
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Selection indicator */}
            {isSelected && (
                <motion.div
                    layoutId="selectedCard"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--platinum)] rounded-l-xl"
                />
            )}
        </motion.div>
    );
}
