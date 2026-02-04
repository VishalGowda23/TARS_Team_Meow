'use client';

import { motion } from 'framer-motion';
import {
    FileCheck,
    XCircle,
    Clock,
    AlertTriangle,
    ArrowUpCircle,
    ArrowRightCircle,
    ArrowDownCircle,
    Fingerprint,
} from 'lucide-react';

interface QueueItem {
    id: string;
    fileName: string;
    submittedAt: string;
    fileSize: string;
    contentHash: string;
    currentSignatures: number;
    requiredSignatures: number;
    priority: 'high' | 'medium' | 'low';
}

interface ValidationQueueProps {
    queue: QueueItem[];
    onSign: (id: string) => void;
    onReject: (id: string) => void;
    signingId: string | null;
}

const priorityConfig = {
    high: {
        label: 'HIGH',
        icon: ArrowUpCircle,
        color: 'text-red-400',
        bg: 'bg-red-400/10',
    },
    medium: {
        label: 'MEDIUM',
        icon: ArrowRightCircle,
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
    },
    low: {
        label: 'LOW',
        icon: ArrowDownCircle,
        color: 'text-green-400',
        bg: 'bg-green-400/10',
    },
};

export default function ValidationQueue({ queue, onSign, onReject, signingId }: ValidationQueueProps) {
    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    if (queue.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass p-12 text-center"
            >
                <FileCheck className="w-16 h-16 text-[var(--status-verified)] mx-auto mb-4" />
                <h3
                    className="text-xl font-semibold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    Queue Clear
                </h3>
                <p className="text-[var(--cosmic-gray)]">
                    All pending evidence has been verified
                </p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            {queue.map((item, index) => {
                const priority = priorityConfig[item.priority];
                const PriorityIcon = priority.icon;
                const signatureProgress = item.currentSignatures / item.requiredSignatures;
                const isAlmostComplete = item.currentSignatures === item.requiredSignatures - 1;
                const isSigning = signingId === item.id;

                return (
                    <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`
              glass p-6 transition-all
              ${isSigning ? 'border-[var(--pulse-blue)] bg-[var(--pulse-blue)]/5' : ''}
            `}
                    >
                        <div className="flex items-start gap-6">
                            {/* Priority Indicator */}
                            <div className={`p-3 rounded-lg ${priority.bg}`}>
                                <PriorityIcon className={`w-6 h-6 ${priority.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div>
                                        <h3 className="font-medium truncate">{item.fileName}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--cosmic-gray)]">
                                            <span style={{ fontFamily: 'var(--font-mono)' }}>{item.id}</span>
                                            <span>•</span>
                                            <span>{item.fileSize}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(item.submittedAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <span className={`px-2 py-1 rounded text-xs font-medium ${priority.bg} ${priority.color}`}>
                                        {priority.label}
                                    </span>
                                </div>

                                {/* Content Hash */}
                                <div className="mb-4 p-3 bg-black/30 rounded-lg">
                                    <div className="text-xs text-[var(--cosmic-gray)] mb-1">Content Hash</div>
                                    <code className="text-sm text-[var(--pulse-blue)]" style={{ fontFamily: 'var(--font-mono)' }}>
                                        {item.contentHash}
                                    </code>
                                </div>

                                {/* Signature Progress */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className="text-[var(--cosmic-gray)]">Verification Progress</span>
                                        <span className="flex items-center gap-1">
                                            <Fingerprint className="w-3 h-3 text-[var(--status-verified)]" />
                                            <span style={{ fontFamily: 'var(--font-mono)' }}>
                                                {item.currentSignatures}/{item.requiredSignatures}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--nebula-dark)] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${signatureProgress * 100}%` }}
                                            className={`h-full ${isAlmostComplete
                                                    ? 'bg-gradient-to-r from-[var(--status-verified)] to-[var(--pulse-blue)]'
                                                    : 'bg-[var(--status-verified)]'
                                                }`}
                                        />
                                    </div>
                                    {isAlmostComplete && (
                                        <p className="text-xs text-[var(--status-orbiting)] mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            One signature remaining for verification
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onSign(item.id)}
                                        disabled={isSigning}
                                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Fingerprint className="w-4 h-4" />
                                        Sign Verification
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onReject(item.id)}
                                        className="btn-secondary flex items-center gap-2 text-red-400 border-red-400/50 hover:bg-red-400/10"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
