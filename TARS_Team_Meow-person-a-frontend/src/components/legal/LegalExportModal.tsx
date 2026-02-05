'use client';

import { useState } from 'react';
import {
    Scale,
    Download,
    FileText,
    Shield,
    CheckCircle2,
    Loader2,
    X,
    Gavel,
    Globe,
    Hash,
    Clock,
    AlertTriangle,
    Copy
} from 'lucide-react';
import { auditApi, LegalExportResponse } from '@/lib/api';

interface LegalExportModalProps {
    evidenceId: string;
    evidenceTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function LegalExportModal({ evidenceId, evidenceTitle, isOpen, onClose }: LegalExportModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [legalPackage, setLegalPackage] = useState<LegalExportResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [caseNumber, setCaseNumber] = useState('');
    const [jurisdiction, setJurisdiction] = useState('International');
    const [copied, setCopied] = useState(false);

    const jurisdictions = [
        'International',
        'United States',
        'European Union',
        'United Kingdom',
        'India',
        'Australia',
        'Canada',
        'Singapore',
        'Other'
    ];

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await auditApi.getLegalExport(evidenceId, {
                caseNumber: caseNumber || undefined,
                jurisdiction
            });

            if (response.success) {
                setLegalPackage(response);
            } else {
                setError('Failed to generate legal package');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate legal package');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        const url = auditApi.getLegalExportDownloadUrl(evidenceId, {
            caseNumber: caseNumber || undefined,
            jurisdiction
        });
        window.open(url, '_blank');
    };

    const handleCopyIntegrity = async () => {
        if (legalPackage?.documentIntegrity) {
            await navigator.clipboard.writeText(legalPackage.documentIntegrity);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setLegalPackage(null);
        setError(null);
        setCaseNumber('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="bg-[var(--space-dark)] border border-cyan-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                    className="bg-[var(--space-dark)] border border-cyan-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                                    <Scale className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Legal Export</h2>
                                    <p className="text-sm text-gray-400">Generate court-admissible documentation</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {!legalPackage ? (
                            <>
                                {/* Evidence Info */}
                                <div className="mb-6 p-4 bg-black/30 rounded-xl border border-cyan-500/10">
                                    <div className="flex items-center gap-2 text-cyan-400 mb-2">
                                        <FileText className="w-4 h-4" />
                                        <span className="text-sm font-medium">Evidence</span>
                                    </div>
                                    <p className="text-white font-medium">{evidenceTitle}</p>
                                    <p className="text-xs text-gray-500 mt-1">ID: {evidenceId}</p>
                                </div>

                                {/* Configuration */}
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <Globe className="w-4 h-4 inline mr-2" />
                                            Jurisdiction
                                        </label>
                                        <select
                                            value={jurisdiction}
                                            onChange={(e) => setJurisdiction(e.target.value)}
                                            className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400"
                                        >
                                            {jurisdictions.map((j) => (
                                                <option key={j} value={j}>{j}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <Gavel className="w-4 h-4 inline mr-2" />
                                            Case Number (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={caseNumber}
                                            onChange={(e) => setCaseNumber(e.target.value)}
                                            placeholder="e.g., 2026-CV-12345"
                                            className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                                        />
                                    </div>
                                </div>

                                {/* What's Included */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-gray-300 mb-3">Package Includes:</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            'Evidence Summary',
                                            'Chain of Custody',
                                            'Hash Certificate',
                                            'Blockchain Proof',
                                            'Validation Records',
                                            'Metadata Report',
                                            'Affidavit Template',
                                            'Tech Specifications',
                                            'Verification Guide',
                                            'Legal Disclaimers'
                                        ].map((item) => (
                                            <div key={item} className="flex items-center gap-2 text-sm text-gray-400">
                                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-purple-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Generating Legal Package...
                                        </>
                                    ) : (
                                        <>
                                            <Scale className="w-5 h-5" />
                                            Generate Legal Package
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Success State */}
                                <div className="text-center mb-6">
                                    <div
                                        className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                                    >
                                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Legal Package Generated</h3>
                                    <p className="text-gray-400 text-sm">Court-admissible documentation ready</p>
                                </div>

                                {/* Package Info */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Hash className="w-4 h-4" />
                                            <span className="text-sm">Package ID</span>
                                        </div>
                                        <span className="text-cyan-400 font-mono text-sm">{legalPackage.packageId}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm">Generated</span>
                                        </div>
                                        <span className="text-white text-sm">
                                            {new Date(legalPackage.generatedAt).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Shield className="w-4 h-4" />
                                            <span className="text-sm">Integrity Hash</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400 font-mono text-xs">
                                                {legalPackage.documentIntegrity.substring(0, 16)}...
                                            </span>
                                            <button
                                                onClick={handleCopyIntegrity}
                                                className="p-1 hover:bg-white/10 rounded"
                                            >
                                                {copied ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table of Contents Preview */}
                                <div className="mb-6 p-4 bg-black/30 rounded-xl border border-cyan-500/10">
                                    <h4 className="text-sm font-medium text-cyan-400 mb-3">Document Sections</h4>
                                    <div className="space-y-1">
                                        {legalPackage.legalPackage.tableOfContents.map((item) => (
                                            <div key={item.section} className="flex items-center gap-2 text-sm text-gray-400">
                                                <span className="text-cyan-500">{item.section}.</span>
                                                {item.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-purple-500 text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download PDF
                                    </button>

                                    <button
                                        onClick={() => {
                                            const dataStr = JSON.stringify(legalPackage.legalPackage, null, 2);
                                            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                                            const link = document.createElement('a');
                                            link.setAttribute('href', dataUri);
                                            link.setAttribute('download', `TARS-Legal-Package-${evidenceId}.json`);
                                            link.click();
                                        }}
                                        className="py-3 rounded-xl font-medium bg-black/50 border border-cyan-500/50 text-cyan-400 flex items-center justify-center gap-2 hover:bg-black/70 transition-colors"
                                    >
                                        <FileText className="w-5 h-5" />
                                        Download JSON
                                    </button>
                                </div>

                                <p className="mt-4 text-xs text-gray-500 text-center">
                                    This document is court-admissible and includes cryptographic verification
                                </p>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-cyan-500/20 bg-black/30">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <Shield className="w-3 h-3" />
                            <span>Generated by TARS - Trustless Anonymous Reporting System</span>
                        </div>
                    </div>
                </div>
            </div>
    );
}
