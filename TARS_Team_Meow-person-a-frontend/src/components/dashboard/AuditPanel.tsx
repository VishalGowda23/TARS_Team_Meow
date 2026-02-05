'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    FileText,
    Shield,
    Clock,
    CheckCircle2,
    ExternalLink,
    Loader2,
    AlertCircle,
    Scale,
    Globe,
    Upload as UploadIcon,
    Copy,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { auditApi, AuditReport, LegalReport } from '@/lib/api';

interface Evidence {
    id: string;
    fileName: string;
    status: 'orbiting' | 'verified' | 'transmitted';
    submittedAt: string;
    ipfsCid?: string;
    txHash?: string;
}

interface AuditPanelProps {
    evidence: Evidence;
}

export default function AuditPanel({ evidence }: AuditPanelProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
    const [legalReport, setLegalReport] = useState<LegalReport | null>(null);
    const [showLegalReport, setShowLegalReport] = useState(false);
    const [storingOnIPFS, setStoringOnIPFS] = useState(false);
    const [ipfsStored, setIpfsStored] = useState<{ hash: string; url: string } | null>(null);
    const [jurisdiction, setJurisdiction] = useState('International');
    const [copied, setCopied] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>('chain');

    // Load audit report when evidence changes
    useEffect(() => {
        const loadAuditReport = async () => {
            if (!evidence.id || evidence.id.startsWith('local-')) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const response = await auditApi.getAuditReport(evidence.id);
                if (response.success) {
                    setAuditReport(response.auditReport);
                }
            } catch (err) {
                console.warn('Could not load audit report:', err);
                setError('Audit data will be available after blockchain confirmation');
            } finally {
                setLoading(false);
            }
        };

        loadAuditReport();
    }, [evidence.id]);

    const handleDownload = (format: 'json' | 'text') => {
        const url = auditApi.getDownloadUrl(evidence.id, format);
        window.open(url, '_blank');
    };

    const handleGetLegalReport = async () => {
        setLoading(true);
        try {
            const response = await auditApi.getLegalReport(evidence.id, jurisdiction);
            if (response.success) {
                setLegalReport(response.legalReport);
                setShowLegalReport(true);
            }
        } catch (err) {
            setError('Failed to generate legal report');
        } finally {
            setLoading(false);
        }
    };

    const handleStoreOnIPFS = async () => {
        setStoringOnIPFS(true);
        try {
            const response = await auditApi.storeOnIPFS(evidence.id);
            if (response.success) {
                setIpfsStored({ hash: response.ipfsHash, url: response.ipfsUrl });
            }
        } catch (err) {
            setError('Failed to store on IPFS');
        } finally {
            setStoringOnIPFS(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    if (loading && !auditReport) {
        return (
            <div className="glass p-6 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[var(--accent-cyan)]" />
                <p className="text-sm text-[var(--silver-dark)]">Loading audit data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Evidence Header */}
            <div className="glass p-4">
                <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-[var(--accent-cyan)]" />
                    <h3 className="font-semibold text-[var(--platinum)]">Audit & Chain of Custody</h3>
                </div>
                <div className="text-xs text-[var(--silver-dark)] font-mono truncate">
                    ID: {evidence.id}
                </div>
            </div>

            {error && (
                <div className="glass p-4 border border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                </div>
            )}

            {/* Chain of Custody Section */}
            <div className="glass overflow-hidden">
                <button
                    onClick={() => toggleSection('chain')}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--status-orbiting)]" />
                        <span className="font-medium text-[var(--platinum)]">Chain of Custody</span>
                    </div>
                    {expandedSection === 'chain' ? (
                        <ChevronUp className="w-4 h-4 text-[var(--silver-dark)]" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--silver-dark)]" />
                    )}
                </button>
                
                <AnimatePresence>
                    {expandedSection === 'chain' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-[var(--space-medium)]"
                        >
                            <div className="p-4 space-y-3">
                                {/* Timeline */}
                                <div className="space-y-3">
                                    {/* Submitted */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[var(--status-verified)]/20 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--platinum)]">Evidence Submitted</p>
                                            <p className="text-xs text-[var(--silver-dark)]">{formatDate(evidence.submittedAt)}</p>
                                        </div>
                                    </div>

                                    {/* IPFS Upload */}
                                    {evidence.ipfsCid && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--status-verified)]/20 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--platinum)]">Stored on IPFS</p>
                                                <code className="text-xs text-[var(--accent-cyan)]">{evidence.ipfsCid.slice(0, 20)}...</code>
                                            </div>
                                        </div>
                                    )}

                                    {/* Blockchain Anchor */}
                                    {evidence.txHash && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--status-verified)]/20 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--platinum)]">Blockchain Anchored</p>
                                                <a 
                                                    href={`https://sepolia.etherscan.io/tx/${evidence.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-[var(--accent-cyan)] hover:underline flex items-center gap-1"
                                                >
                                                    View on Etherscan <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Validation Events from Audit Report */}
                                    {auditReport?.validations?.map((v, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                v.approved 
                                                    ? 'bg-[var(--status-verified)]/20' 
                                                    : 'bg-red-500/20'
                                            }`}>
                                                <CheckCircle2 className={`w-4 h-4 ${
                                                    v.approved ? 'text-[var(--status-verified)]' : 'text-red-400'
                                                }`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--platinum)]">
                                                    Validator {v.approved ? 'Approved' : 'Rejected'}
                                                </p>
                                                <p className="text-xs text-[var(--silver-dark)]">{formatDate(v.timestamp)}</p>
                                                {v.comment && (
                                                    <p className="text-xs text-[var(--silver-medium)] mt-1">"{v.comment}"</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Access Events */}
                                    {auditReport?.accesses?.slice(0, 5).map((a, i) => (
                                        <div key={`access-${i}`} className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--space-medium)] flex items-center justify-center flex-shrink-0">
                                                <Clock className="w-4 h-4 text-[var(--silver-dark)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--platinum)] capitalize">{a.action}</p>
                                                <p className="text-xs text-[var(--silver-dark)]">{formatDate(a.timestamp)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Download Section */}
            <div className="glass overflow-hidden">
                <button
                    onClick={() => toggleSection('download')}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-[var(--accent-cyan)]" />
                        <span className="font-medium text-[var(--platinum)]">Download Reports</span>
                    </div>
                    {expandedSection === 'download' ? (
                        <ChevronUp className="w-4 h-4 text-[var(--silver-dark)]" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--silver-dark)]" />
                    )}
                </button>
                
                <AnimatePresence>
                    {expandedSection === 'download' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-[var(--space-medium)]"
                        >
                            <div className="p-4 space-y-3">
                                {/* Download Buttons */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleDownload('text')}
                                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                                   bg-[var(--platinum)]/10 text-[var(--platinum)] 
                                                   hover:bg-[var(--platinum)]/20 transition-colors text-sm"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Text Report
                                    </button>
                                    <button
                                        onClick={() => handleDownload('json')}
                                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                                   bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] 
                                                   hover:bg-[var(--accent-cyan)]/20 transition-colors text-sm"
                                    >
                                        <FileText className="w-4 h-4" />
                                        JSON Report
                                    </button>
                                </div>

                                {/* Jurisdiction Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs text-[var(--silver-dark)]">Jurisdiction</label>
                                    <select
                                        value={jurisdiction}
                                        onChange={(e) => setJurisdiction(e.target.value)}
                                        className="w-full input py-2 text-sm"
                                    >
                                        <option value="International">International</option>
                                        <option value="US">United States</option>
                                        <option value="EU">European Union</option>
                                        <option value="UK">United Kingdom</option>
                                        <option value="India">India</option>
                                    </select>
                                </div>

                                {/* Legal Report Button */}
                                <button
                                    onClick={handleGetLegalReport}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                                               bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--status-verified)]
                                               text-[var(--void-black)] font-medium hover:opacity-90 transition-opacity"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Scale className="w-4 h-4" />
                                    )}
                                    Generate Legal Report
                                </button>

                                {/* Store on IPFS */}
                                <button
                                    onClick={handleStoreOnIPFS}
                                    disabled={storingOnIPFS || !!ipfsStored}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                                               bg-[var(--space-medium)] text-[var(--silver-medium)]
                                               hover:bg-[var(--space-medium)]/80 transition-colors text-sm
                                               disabled:opacity-50"
                                >
                                    {storingOnIPFS ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : ipfsStored ? (
                                        <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                                    ) : (
                                        <UploadIcon className="w-4 h-4" />
                                    )}
                                    {ipfsStored ? 'Stored on IPFS' : 'Store Report on IPFS'}
                                </button>

                                {ipfsStored && (
                                    <div className="p-3 rounded-lg bg-[var(--status-verified)]/10 border border-[var(--status-verified)]/30">
                                        <p className="text-xs text-[var(--status-verified)] mb-1">Permanently stored:</p>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-[var(--platinum)] flex-1 truncate">
                                                {ipfsStored.hash}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(ipfsStored.hash)}
                                                className="p-1 hover:bg-white/10 rounded"
                                            >
                                                {copied ? (
                                                    <CheckCircle2 className="w-3 h-3 text-[var(--status-verified)]" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-[var(--silver-dark)]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Legal Report Modal */}
            <AnimatePresence>
                {showLegalReport && legalReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                        onClick={() => setShowLegalReport(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass max-w-2xl w-full max-h-[80vh] overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <Scale className="w-6 h-6 text-[var(--accent-cyan)]" />
                                        <div>
                                            <h2 className="text-xl font-bold text-[var(--platinum)]">
                                                {legalReport.reportType}
                                            </h2>
                                            <p className="text-sm text-[var(--silver-dark)]">
                                                Jurisdiction: {legalReport.jurisdiction}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowLegalReport(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Evidence Summary */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[var(--platinum)] mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Evidence Summary
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 bg-[var(--space-medium)] rounded">
                                            <span className="text-[var(--silver-dark)]">ID:</span>
                                            <span className="ml-2 text-[var(--platinum)]">{legalReport.evidenceSummary.submissionId}</span>
                                        </div>
                                        <div className="p-2 bg-[var(--space-medium)] rounded">
                                            <span className="text-[var(--silver-dark)]">Status:</span>
                                            <span className="ml-2 text-[var(--status-verified)]">{legalReport.evidenceSummary.status}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 p-2 bg-[var(--space-medium)] rounded">
                                        <span className="text-xs text-[var(--silver-dark)]">Content Hash:</span>
                                        <code className="block text-xs text-[var(--accent-cyan)] mt-1 break-all">
                                            {legalReport.evidenceSummary.contentHash}
                                        </code>
                                    </div>
                                </div>

                                {/* Proof of Existence */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[var(--platinum)] mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Proof of Existence
                                    </h3>
                                    <div className="p-3 bg-[var(--space-medium)] rounded space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-[var(--silver-dark)]">Network:</span>
                                            <span className="text-[var(--platinum)]">{legalReport.proofOfExistence.blockchainNetwork}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--silver-dark)]">Block:</span>
                                            <span className="text-[var(--platinum)]">{legalReport.proofOfExistence.blockNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--silver-dark)]">Timestamp:</span>
                                            <span className="text-[var(--platinum)]">{legalReport.proofOfExistence.timestamp}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Validation History */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[var(--platinum)] mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Validation History
                                    </h3>
                                    <div className="space-y-2">
                                        {legalReport.validationHistory.validations.map((v, i) => (
                                            <div key={i} className="p-3 bg-[var(--space-medium)] rounded text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className={v.decision === 'APPROVED' ? 'text-[var(--status-verified)]' : 'text-red-400'}>
                                                        {v.decision}
                                                    </span>
                                                    <span className="text-xs text-[var(--silver-dark)]">{v.timestamp}</span>
                                                </div>
                                                <code className="text-xs text-[var(--silver-dark)] block mt-1">{v.validator}</code>
                                            </div>
                                        ))}
                                        {legalReport.validationHistory.consensusReached && (
                                            <div className="p-2 bg-[var(--status-verified)]/20 rounded text-center text-sm text-[var(--status-verified)]">
                                                ✓ Consensus Reached
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Verification Instructions */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[var(--platinum)] mb-3 flex items-center gap-2">
                                        <Globe className="w-4 h-4" /> Verification Instructions
                                    </h3>
                                    <ol className="space-y-2 text-sm text-[var(--silver-medium)]">
                                        <li className="flex gap-2">
                                            <span className="text-[var(--accent-cyan)]">1.</span>
                                            {legalReport.verificationInstructions.step1}
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[var(--accent-cyan)]">2.</span>
                                            {legalReport.verificationInstructions.step2}
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[var(--accent-cyan)]">3.</span>
                                            {legalReport.verificationInstructions.step3}
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[var(--accent-cyan)]">4.</span>
                                            {legalReport.verificationInstructions.step4}
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[var(--accent-cyan)]">5.</span>
                                            {legalReport.verificationInstructions.step5}
                                        </li>
                                    </ol>
                                </div>

                                {/* Legal Disclaimer */}
                                <div className="p-4 bg-[var(--space-medium)] rounded-lg border border-[var(--silver-dark)]/20">
                                    <p className="text-xs text-[var(--silver-dark)] leading-relaxed">
                                        {legalReport.legalDisclaimer}
                                    </p>
                                </div>

                                {/* Download Button */}
                                <div className="mt-6 flex gap-2">
                                    <button
                                        onClick={() => handleDownload('text')}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                                                   bg-[var(--platinum)] text-[var(--void-black)] font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Full Report
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
