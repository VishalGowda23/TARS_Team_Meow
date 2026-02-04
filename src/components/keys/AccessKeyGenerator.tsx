'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Key, Shield, Clock, AlertTriangle } from 'lucide-react';

interface AccessKeyGeneratorProps {
    evidenceId: string;
    onGenerate: () => void;
    onClose: () => void;
}

export default function AccessKeyGenerator({ evidenceId, onGenerate, onClose }: AccessKeyGeneratorProps) {
    const [expiry, setExpiry] = useState('24h');
    const [purpose, setPurpose] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        onGenerate();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[var(--deep-void)]/90 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 w-full max-w-md glass p-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--pulse-blue)]/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-[var(--pulse-blue)]" />
                        </div>
                        <div>
                            <h3
                                className="font-semibold"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Generate Access Key
                            </h3>
                            <p
                                className="text-xs text-[var(--cosmic-gray)]"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                {evidenceId}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5 text-[var(--cosmic-gray)]" />
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Expiry */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--starlight)] mb-2">
                            <Clock className="w-4 h-4 inline-block mr-2 text-[var(--pulse-blue)]" />
                            Key Expiry
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {['1h', '24h', '7d', 'Never'].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setExpiry(option)}
                                    className={`
                    py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${expiry === option
                                            ? 'bg-[var(--pulse-blue)] text-[var(--deep-void)]'
                                            : 'bg-[var(--nebula-dark)] text-[var(--cosmic-gray)] hover:text-[var(--starlight)]'
                                        }
                  `}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--starlight)] mb-2">
                            <Shield className="w-4 h-4 inline-block mr-2 text-[var(--pulse-blue)]" />
                            Purpose (Optional)
                        </label>
                        <input
                            type="text"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="e.g., Media disclosure, Legal review..."
                            className="input"
                        />
                    </div>

                    {/* Warning */}
                    {expiry === 'Never' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-[var(--status-orbiting)]/10 border border-[var(--status-orbiting)]/30 rounded-lg flex items-start gap-2"
                        >
                            <AlertTriangle className="w-4 h-4 text-[var(--status-orbiting)] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-[var(--status-orbiting)]">
                                Permanent keys cannot be revoked. Use with caution.
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="btn-secondary flex-1"
                    >
                        Cancel
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Key className="w-4 h-4" />
                                </motion.div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Key className="w-4 h-4" />
                                Generate Key
                            </>
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
