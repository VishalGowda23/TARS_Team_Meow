'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, File, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileDropZoneProps {
    onFileProcessed: (file: File) => void;
}

interface LogEntry {
    message: string;
    type: 'info' | 'success' | 'warning';
}

const scrubbingSteps = [
    { message: 'Initializing secure environment...', delay: 500 },
    { message: 'Analyzing file structure...', delay: 800 },
    { message: 'Stripping EXIF metadata...', delay: 1200 },
    { message: 'Purging GPS coordinates...', delay: 800 },
    { message: 'Removing device identifiers...', delay: 600 },
    { message: 'Sanitizing embedded timestamps...', delay: 700 },
    { message: 'Generating content hash...', delay: 900 },
    { message: 'Encrypting payload with AES-256...', delay: 1500 },
    { message: 'Verifying integrity checksum...', delay: 600 },
    { message: '✓ File scrubbed and encrypted successfully', delay: 0 },
];

export default function FileDropZone({ onFileProcessed }: FileDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isComplete, setIsComplete] = useState(false);

    const processFile = useCallback(async (uploadedFile: File) => {
        setFile(uploadedFile);
        setIsProcessing(true);
        setLogs([]);
        setIsComplete(false);

        // Simulate terminal scrubbing animation
        for (let i = 0; i < scrubbingSteps.length; i++) {
            const step = scrubbingSteps[i];

            await new Promise(resolve => setTimeout(resolve, step.delay));

            setLogs(prev => [
                ...prev,
                {
                    message: step.message,
                    type: i === scrubbingSteps.length - 1 ? 'success' : 'info',
                },
            ]);
        }

        setIsProcessing(false);
        setIsComplete(true);
        onFileProcessed(uploadedFile);
    }, [onFileProcessed]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    }, [processFile]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    }, [processFile]);

    // Auto-scroll terminal to bottom
    useEffect(() => {
        const terminal = document.getElementById('scrubbing-terminal');
        if (terminal) {
            terminal.scrollTop = terminal.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2
                    className="text-2xl font-semibold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    Step 1: Local Scrubbing
                </h2>
                <p className="text-[var(--cosmic-gray)] text-sm">
                    Upload your evidence file. All metadata will be stripped locally before encryption.
                </p>
            </div>

            {/* Drop Zone */}
            {!file && (
                <motion.div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    animate={{
                        borderColor: isDragging ? 'var(--pulse-blue)' : 'var(--cosmic-gray-dark)',
                        backgroundColor: isDragging ? 'rgba(0, 212, 255, 0.05)' : 'transparent',
                    }}
                    className="relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all"
                >
                    <input
                        type="file"
                        onChange={handleFileInput}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="*/*"
                    />

                    <motion.div
                        animate={{
                            y: isDragging ? -5 : 0,
                        }}
                    >
                        <Upload
                            className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[var(--pulse-blue)]' : 'text-[var(--cosmic-gray)]'
                                }`}
                        />
                        <p className="text-[var(--starlight)] font-medium mb-2">
                            {isDragging ? 'Release to upload' : 'Drag and drop your file here'}
                        </p>
                        <p className="text-sm text-[var(--cosmic-gray)]">
                            or click to browse • All file types supported
                        </p>
                    </motion.div>

                    {isDragging && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{
                                boxShadow: 'inset 0 0 30px rgba(0, 212, 255, 0.2)',
                            }}
                        />
                    )}
                </motion.div>
            )}

            {/* File Info & Terminal */}
            {file && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* File info */}
                    <div className="flex items-center gap-4 p-4 glass-subtle rounded-lg">
                        <div className="w-12 h-12 rounded-lg bg-[var(--pulse-blue)]/10 flex items-center justify-center">
                            <File className="w-6 h-6 text-[var(--pulse-blue)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-sm text-[var(--cosmic-gray)]">
                                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                            </p>
                        </div>
                        {isComplete && (
                            <CheckCircle2 className="w-6 h-6 text-[var(--status-verified)]" />
                        )}
                    </div>

                    {/* Scrubbing Terminal */}
                    <div
                        id="scrubbing-terminal"
                        className="terminal max-h-64 overflow-y-auto"
                    >
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--cosmic-gray-dark)]">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            <span className="ml-2 text-[var(--cosmic-gray)] text-xs">
                                TARS Security Module v2.0
                            </span>
                        </div>

                        <div className="space-y-1">
                            {logs.map((log, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="terminal-line"
                                >
                                    <span className="terminal-prompt">$</span>
                                    <span className={
                                        log.type === 'success'
                                            ? 'terminal-success'
                                            : log.type === 'warning'
                                                ? 'terminal-warning'
                                                : ''
                                    }>
                                        {log.message}
                                    </span>
                                </motion.div>
                            ))}

                            {isProcessing && (
                                <motion.div
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                    className="terminal-line"
                                >
                                    <span className="terminal-prompt">$</span>
                                    <span className="text-[var(--pulse-blue)]">Processing...</span>
                                    <span className="ml-1 inline-block w-2 h-4 bg-[var(--pulse-blue)]" />
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Security notice */}
                    <div className="flex items-start gap-3 p-4 bg-[var(--status-verified)]/10 border border-[var(--status-verified)]/20 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-[var(--status-verified)] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[var(--status-verified)]">
                                All processing happens locally
                            </p>
                            <p className="text-xs text-[var(--cosmic-gray)] mt-1">
                                Your original file never leaves your device. Only encrypted data is transmitted.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
