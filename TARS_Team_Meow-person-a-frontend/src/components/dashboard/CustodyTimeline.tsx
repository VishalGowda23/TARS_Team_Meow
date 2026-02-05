'use client';

import { motion } from 'framer-motion';
import {
    Upload,
    ShieldCheck,
    Fingerprint,
    Radio,
    CheckCircle2,
    Clock,
    Lock,
} from 'lucide-react';

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
}

interface CustodyTimelineProps {
    evidence: Evidence;
}

export default function CustodyTimeline({ evidence }: CustodyTimelineProps) {
    const steps = [
        {
            id: 'submitted',
            label: 'Evidence Submitted',
            description: 'File scrubbed and encrypted locally',
            icon: Upload,
            time: new Date(evidence.submittedAt).toLocaleString(),
            completed: true,
        },
        {
            id: 'uploaded',
            label: 'IPFS Upload',
            description: 'Stored on decentralized network',
            icon: ShieldCheck,
            time: new Date(new Date(evidence.submittedAt).getTime() + 60000).toLocaleString(),
            completed: true,
            hash: evidence.ipfsCid.slice(0, 12) + '...',
        },
        {
            id: 'anchored',
            label: 'Blockchain Anchor',
            description: 'Timestamp recorded on-chain',
            icon: Lock,
            time: new Date(new Date(evidence.submittedAt).getTime() + 120000).toLocaleString(),
            completed: true,
            hash: evidence.txHash.slice(0, 12) + '...',
        },
        {
            id: 'verification',
            label: 'Validator Verification',
            description: evidence.validatorSignatures
                ? `${evidence.validatorSignatures} validators signed`
                : 'Awaiting validator signatures',
            icon: Fingerprint,
            completed: evidence.status === 'verified' || evidence.status === 'transmitted',
            pending: evidence.status === 'orbiting',
            signatures: evidence.validatorSignatures,
        },
        {
            id: 'disclosure',
            label: 'Selective Disclosure',
            description: evidence.disclosedTo
                ? `Released to: ${evidence.disclosedTo.join(', ')}`
                : 'Keys not yet distributed',
            icon: Radio,
            completed: evidence.status === 'transmitted',
            pending: evidence.status !== 'transmitted',
            entities: evidence.disclosedTo,
        },
    ];

    return (
        <div className="glass p-6">
            {/* Evidence Info Header */}
            <div className="mb-6 pb-4 border-b border-[var(--cosmic-gray-dark)]">
                <div
                    className="text-sm font-medium text-[var(--pulse-blue)] mb-1"
                    style={{ fontFamily: 'var(--font-mono)' }}
                >
                    {evidence.id}
                </div>
                <div className="text-sm text-[var(--starlight)] truncate">
                    {evidence.fileName}
                </div>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--cosmic-gray-dark)]" />

                <div className="space-y-6">
                    {steps.map((step, index) => {
                        const Icon = step.icon;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative flex gap-4"
                            >
                                {/* Icon */}
                                <div
                                    className={`
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${step.completed
                                            ? 'bg-[var(--status-verified)]/20 text-[var(--status-verified)]'
                                            : step.pending
                                                ? 'bg-[var(--status-orbiting)]/20 text-[var(--status-orbiting)]'
                                                : 'bg-[var(--nebula-dark)] text-[var(--cosmic-gray)]'
                                        }
                  `}
                                >
                                    {step.completed ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : step.pending ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Clock className="w-5 h-5" />
                                        </motion.div>
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                    <h4
                                        className={`text-sm font-medium ${step.completed
                                                ? 'text-[var(--starlight)]'
                                                : 'text-[var(--cosmic-gray)]'
                                            }`}
                                    >
                                        {step.label}
                                    </h4>
                                    <p className="text-xs text-[var(--cosmic-gray)] mt-0.5">
                                        {step.description}
                                    </p>

                                    {step.time && step.completed && (
                                        <p
                                            className="text-xs text-[var(--cosmic-gray)]/70 mt-1"
                                            style={{ fontFamily: 'var(--font-mono)' }}
                                        >
                                            {step.time}
                                        </p>
                                    )}

                                    {step.hash && (
                                        <code className="text-xs text-[var(--pulse-blue)] mt-1 block">
                                            {step.hash}
                                        </code>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-6 pt-4 border-t border-[var(--cosmic-gray-dark)]">
                <div className="flex justify-between text-xs text-[var(--cosmic-gray)] mb-2">
                    <span>Lifecycle Progress</span>
                    <span>
                        {steps.filter(s => s.completed).length}/{steps.length}
                    </span>
                </div>
                <div className="h-2 bg-[var(--nebula-dark)] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{
                            width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%`
                        }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-[var(--pulse-blue)] to-[var(--status-verified)]"
                    />
                </div>
            </div>
        </div>
    );
}
