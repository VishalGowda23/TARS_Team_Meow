'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Copy, ExternalLink, Download, Shield } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface MissionReceiptProps {
    evidenceId: string;
    ipfsCid: string;
    txHash: string;
    fileName: string;
    tags: string;
}

export default function MissionReceipt({
    evidenceId,
    ipfsCid,
    txHash,
    fileName,
    tags,
}: MissionReceiptProps) {
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    const receiptData = [
        { label: 'Evidence ID', value: evidenceId, truncate: false },
        { label: 'IPFS CID', value: ipfsCid, truncate: true },
        { label: 'Transaction Hash', value: txHash, truncate: true },
    ];

    return (
        <div className="space-y-8">
            {/* Success Header */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-[var(--status-verified)]/20 flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle2 className="w-10 h-10 text-[var(--status-verified)]" />
                </motion.div>

                <h2
                    className="text-2xl font-bold mb-2 text-[var(--status-verified)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    Mission Complete
                </h2>
                <p className="text-[var(--cosmic-gray)]">
                    Your evidence is now orbiting securely in the network
                </p>
            </motion.div>

            {/* Receipt Card - Digital Boarding Pass Style */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative overflow-hidden rounded-2xl"
            >
                {/* Perforated edge effect */}
                <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-4 h-4 rounded-full bg-[var(--deep-void)]" />
                    ))}
                </div>

                <div className="bg-gradient-to-br from-[var(--nebula-dark)] to-[var(--nebula-light)] border border-[var(--glass-border)] pl-8 pr-6 py-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-[var(--cosmic-gray-dark)]">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 text-[var(--pulse-blue)]" />
                            <div>
                                <div
                                    className="text-lg font-bold"
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    TARS
                                </div>
                                <div className="text-xs text-[var(--cosmic-gray)]">
                                    MISSION RECEIPT
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-[var(--cosmic-gray)]">STATUS</div>
                            <div className="badge badge-orbiting mt-1">ORBITING</div>
                        </div>
                    </div>

                    {/* File Info */}
                    <div className="mb-6">
                        <div className="text-xs text-[var(--cosmic-gray)] mb-1">FILE</div>
                        <div className="font-medium truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                            {fileName}
                        </div>
                        {tags && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.split(',').filter(t => t.trim()).map((tag, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 text-xs rounded bg-[var(--pulse-blue)]/10 text-[var(--pulse-blue)]"
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    >
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Receipt Data */}
                    <div className="space-y-4">
                        {receiptData.map((item, index) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                className="flex items-start justify-between gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-[var(--cosmic-gray)] mb-1">
                                        {item.label}
                                    </div>
                                    <div
                                        className={`text-sm ${item.truncate ? 'truncate' : ''}`}
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                        title={item.value}
                                    >
                                        {item.value}
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(item.value, item.label)}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copied === item.label ? (
                                        <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-[var(--cosmic-gray)]" />
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>

                    {/* Timestamp */}
                    <div className="mt-6 pt-4 border-t border-dashed border-[var(--cosmic-gray-dark)]">
                        <div className="flex justify-between text-xs text-[var(--cosmic-gray)]">
                            <span>Submitted</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>
                                {new Date().toISOString()}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4"
            >
                <button
                    onClick={() => {
                        const receiptText = `TARS Mission Receipt\n\nEvidence ID: ${evidenceId}\nIPFS CID: ${ipfsCid}\nTransaction Hash: ${txHash}\n\nSubmitted: ${new Date().toISOString()}`;
                        const blob = new Blob([receiptText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `tars-receipt-${evidenceId}.txt`;
                        a.click();
                    }}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Download Receipt
                </button>

                <Link href="/dashboard" className="flex-1">
                    <button className="btn-primary w-full flex items-center justify-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        View in Star Map
                    </button>
                </Link>
            </motion.div>

            {/* Important Notice */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="p-4 bg-[var(--status-orbiting)]/10 border border-[var(--status-orbiting)]/20 rounded-lg"
            >
                <p className="text-sm text-[var(--status-orbiting)] font-medium mb-1">
                    Important: Save your Evidence ID
                </p>
                <p className="text-xs text-[var(--cosmic-gray)]">
                    This ID is required to track your submission and for validators to verify your evidence.
                    Store it securely offline.
                </p>
            </motion.div>
        </div>
    );
}
