'use client';

import { useState, useEffect } from 'react';
import {
    Shield,
    X,
    Eye,
    EyeOff,
    Search,
    Plus,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    FileText,
    User,
    Mail,
    Phone,
    Calendar,
    Hash,
    Sparkles
} from 'lucide-react';
import { redactionApi, DetectedPII } from '@/lib/api';

interface RedactionModalProps {
    file: File | null;
    isOpen: boolean;
    onClose: () => void;
    onRedactionComplete: (redactedFile: File, redactedWords: string[]) => void;
}

export default function RedactionModal({ file, isOpen, onClose, onRedactionComplete }: RedactionModalProps) {
    const [step, setStep] = useState<'scan' | 'select' | 'preview' | 'applying'>('scan');
    const [isScanning, setIsScanning] = useState(false);
    const [detectedPII, setDetectedPII] = useState<DetectedPII | null>(null);
    const [textPreview, setTextPreview] = useState<string>('');
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [customWord, setCustomWord] = useState('');
    const [previewData, setPreviewData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        if (isOpen && file && file.type === 'application/pdf') {
            scanDocument();
        }
    }, [isOpen, file]);

    const scanDocument = async () => {
        if (!file) return;
        
        setIsScanning(true);
        setError(null);
        
        try {
            const result = await redactionApi.detectPII(file);
            
            if (result.success) {
                setDetectedPII(result.detectedPII);
                setTextPreview(result.textPreview);
                setStep('select');
            } else {
                setError('Failed to scan document');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to scan document');
        } finally {
            setIsScanning(false);
        }
    };

    const toggleWord = (word: string) => {
        if (selectedWords.includes(word)) {
            setSelectedWords(selectedWords.filter(w => w !== word));
        } else {
            setSelectedWords([...selectedWords, word]);
        }
    };

    const addCustomWord = () => {
        if (customWord.trim() && !selectedWords.includes(customWord.trim())) {
            setSelectedWords([...selectedWords, customWord.trim()]);
            setCustomWord('');
        }
    };

    const selectAllInCategory = (items: string[]) => {
        const newSelected = [...selectedWords];
        items.forEach(item => {
            if (!newSelected.includes(item)) {
                newSelected.push(item);
            }
        });
        setSelectedWords(newSelected);
    };

    const previewRedactions = async () => {
        if (!file || selectedWords.length === 0) return;
        
        setIsScanning(true);
        setError(null);
        
        try {
            const result = await redactionApi.previewRedactions(file, selectedWords);
            
            if (result.success) {
                setPreviewData(result.preview);
                setStep('preview');
            } else {
                setError('Failed to preview redactions');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to preview redactions');
        } finally {
            setIsScanning(false);
        }
    };

    const applyRedactions = async () => {
        if (!file) return;
        
        setIsApplying(true);
        setStep('applying');
        setError(null);
        
        console.log('🔒 Applying redactions...');
        console.log('   - File:', file.name, file.size, 'bytes');
        console.log('   - Words to redact:', selectedWords);
        
        try {
            const result = await redactionApi.applyRedactions(file, selectedWords);
            
            console.log('🔒 Redaction API response:');
            console.log('   - Success:', result.success);
            console.log('   - Redacted file base64 length:', result.redactedFile?.length);
            console.log('   - Redactions applied:', result.redactionsApplied);
            
            if (result.success) {
                // Convert base64 to File
                const binaryString = atob(result.redactedFile);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const redactedFile = new File([blob], `redacted-${file.name}`, { type: 'application/pdf' });
                
                console.log('🔒 Created redacted file:');
                console.log('   - Name:', redactedFile.name);
                console.log('   - Size:', redactedFile.size, 'bytes');
                
                onRedactionComplete(redactedFile, result.redactedWords || selectedWords);
                onClose();
            } else {
                setError('Failed to apply redactions');
                setStep('preview');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply redactions');
            setStep('preview');
        } finally {
            setIsApplying(false);
        }
    };

    const skipRedaction = () => {
        if (file) {
            onRedactionComplete(file, []);
            onClose();
        }
    };

    if (!isOpen) return null;

    const getPIIIcon = (type: string) => {
        switch (type) {
            case 'emails': return <Mail className="w-4 h-4" />;
            case 'phoneNumbers': return <Phone className="w-4 h-4" />;
            case 'names': return <User className="w-4 h-4" />;
            case 'dates': return <Calendar className="w-4 h-4" />;
            case 'idNumbers': return <Hash className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getPIILabel = (type: string) => {
        switch (type) {
            case 'emails': return 'Email Addresses';
            case 'phoneNumbers': return 'Phone Numbers';
            case 'names': return 'Potential Names';
            case 'dates': return 'Dates';
            case 'idNumbers': return 'ID Numbers';
            case 'addresses': return 'Addresses';
            default: return type;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-cyan-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-cyan-500/20 bg-black/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                            <Shield className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Privacy Protection</h2>
                            <p className="text-sm text-gray-400">Redact sensitive information before upload</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Scanning State */}
                    {step === 'scan' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Scanning Document</h3>
                            <p className="text-gray-400">
                                Analyzing PDF for personal information...
                            </p>
                        </div>
                    )}

                    {/* Selection State */}
                    {step === 'select' && detectedPII && (
                        <div className="space-y-6">
                            {/* Info Banner */}
                            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5" />
                                <div>
                                    <p className="text-cyan-300 font-medium">AI-Detected Personal Information</p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Select the items below to redact them from your document. You can also add custom words.
                                    </p>
                                </div>
                            </div>

                            {/* Detected PII Categories */}
                            {Object.entries(detectedPII).map(([type, items]) => {
                                if (!items || items.length === 0) return null;
                                
                                return (
                                    <div key={type} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-gray-300">
                                                {getPIIIcon(type)}
                                                <span className="font-medium">{getPIILabel(type)}</span>
                                                <span className="text-xs text-gray-500">({items.length} found)</span>
                                            </div>
                                            <button
                                                onClick={() => selectAllInCategory(items)}
                                                className="text-xs text-cyan-400 hover:text-cyan-300"
                                            >
                                                Select All
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {items.map((item: string, idx: number) => (
                                                <button
                                                    key={`${type}-${idx}`}
                                                    onClick={() => toggleWord(item)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                                        selectedWords.includes(item)
                                                            ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                                                            : 'bg-black/30 border border-gray-600/50 text-gray-400 hover:border-cyan-500/50'
                                                    }`}
                                                >
                                                    {selectedWords.includes(item) ? (
                                                        <EyeOff className="w-3 h-3 inline mr-1" />
                                                    ) : (
                                                        <Eye className="w-3 h-3 inline mr-1" />
                                                    )}
                                                    {item}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Custom Words Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-gray-300 font-medium">
                                    <Plus className="w-4 h-4" />
                                    Add Custom Words to Redact
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customWord}
                                        onChange={(e) => setCustomWord(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addCustomWord()}
                                        placeholder="Type a word or name to redact..."
                                        className="flex-1 px-4 py-2 bg-black/30 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
                                    />
                                    <button
                                        onClick={addCustomWord}
                                        className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Selected Words Summary */}
                            {selectedWords.length > 0 && (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-red-300 font-medium">
                                            {selectedWords.length} items selected for redaction
                                        </span>
                                        <button
                                            onClick={() => setSelectedWords([])}
                                            className="text-xs text-gray-400 hover:text-white"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedWords.map((word, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-red-500/20 rounded text-sm text-red-300 flex items-center gap-1"
                                            >
                                                {word}
                                                <button
                                                    onClick={() => toggleWord(word)}
                                                    className="hover:text-white"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Text Preview */}
                            {textPreview && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-gray-300 font-medium">
                                        <FileText className="w-4 h-4" />
                                        Document Text Preview
                                    </label>
                                    <div className="p-4 bg-black/30 border border-gray-600/30 rounded-lg max-h-40 overflow-y-auto">
                                        <p className="text-sm text-gray-400 whitespace-pre-wrap font-mono">
                                            {textPreview}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview State */}
                    {step === 'preview' && previewData && (
                        <div className="space-y-6">
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-green-300 font-medium">
                                        Found {previewData.totalOccurrences} occurrences to redact
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Review the preview below before applying redactions.
                                    </p>
                                </div>
                            </div>

                            {/* Occurrences by Word */}
                            <div className="space-y-2">
                                <label className="text-gray-300 font-medium">Occurrences by Term</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(previewData.byWord).map(([word, count]) => (
                                        <div
                                            key={word}
                                            className="p-3 bg-black/30 border border-gray-600/30 rounded-lg flex items-center justify-between"
                                        >
                                            <span className="text-gray-300">{word}</span>
                                            <span className="text-cyan-400 font-mono">{count as number}x</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Context Samples */}
                            {previewData.contextSamples.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-gray-300 font-medium">Preview Examples</label>
                                    <div className="space-y-2">
                                        {previewData.contextSamples.slice(0, 5).map((sample: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-black/30 border border-gray-600/30 rounded-lg space-y-2"
                                            >
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>Before:</span>
                                                </div>
                                                <p className="text-sm text-gray-400 font-mono">{sample.context}</p>
                                                <div className="flex items-center gap-2 text-xs text-green-500">
                                                    <span>After:</span>
                                                </div>
                                                <p className="text-sm text-green-400 font-mono">{sample.willBecome}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Applying State */}
                    {step === 'applying' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Applying Redactions</h3>
                            <p className="text-gray-400">
                                Processing your document securely...
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-cyan-500/20 bg-black/30 flex items-center justify-between">
                    <button
                        onClick={skipRedaction}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        disabled={isApplying}
                    >
                        Skip Redaction
                    </button>

                    <div className="flex gap-3">
                        {step === 'select' && (
                            <>
                                <button
                                    onClick={() => setStep('scan')}
                                    className="px-4 py-2 bg-black/50 border border-gray-600/50 rounded-lg text-gray-300 hover:border-cyan-500/50 transition-colors"
                                >
                                    Rescan
                                </button>
                                <button
                                    onClick={previewRedactions}
                                    disabled={selectedWords.length === 0 || isScanning}
                                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
                                >
                                    {isScanning ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                    Preview Redactions
                                </button>
                            </>
                        )}

                        {step === 'preview' && (
                            <>
                                <button
                                    onClick={() => setStep('select')}
                                    className="px-4 py-2 bg-black/50 border border-gray-600/50 rounded-lg text-gray-300 hover:border-cyan-500/50 transition-colors"
                                >
                                    Back to Edit
                                </button>
                                <button
                                    onClick={applyRedactions}
                                    disabled={isApplying}
                                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-lg text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
                                >
                                    {isApplying ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Shield className="w-4 h-4" />
                                    )}
                                    Apply Redactions
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
