'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Fingerprint, CheckCircle2, Lock, Zap } from 'lucide-react';

interface CryptoHandshakeProps {
    onComplete: () => void;
    evidenceId: string;
}

const handshakeSteps = [
    { message: 'Initiating secure channel...', icon: Lock },
    { message: 'Generating ECDSA signature...', icon: Fingerprint },
    { message: 'Computing zero-knowledge proof...', icon: Shield },
    { message: 'Broadcasting to network...', icon: Zap },
    { message: 'Confirmation received!', icon: CheckCircle2 },
];

export default function CryptoHandshake({ onComplete, evidenceId }: CryptoHandshakeProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const runAnimation = async () => {
            for (let i = 0; i < handshakeSteps.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 800));
                setCurrentStep(i);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsComplete(true);

            await new Promise(resolve => setTimeout(resolve, 500));
            onComplete();
        };

        runAnimation();
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[var(--deep-void)]/90 backdrop-blur-md" />

            {/* Content */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 w-full max-w-md glass p-8"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        animate={isComplete ? {} : {
                            boxShadow: [
                                '0 0 20px rgba(0, 212, 255, 0.3)',
                                '0 0 40px rgba(0, 212, 255, 0.6)',
                                '0 0 20px rgba(0, 212, 255, 0.3)',
                            ],
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{
                            background: isComplete
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(0, 212, 255, 0.1)',
                            border: `2px solid ${isComplete ? 'var(--status-verified)' : 'var(--pulse-blue)'}`,
                        }}
                    >
                        {isComplete ? (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                            >
                                <CheckCircle2 className="w-10 h-10 text-[var(--status-verified)]" />
                            </motion.div>
                        ) : (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                <Fingerprint className="w-10 h-10 text-[var(--pulse-blue)]" />
                            </motion.div>
                        )}
                    </motion.div>

                    <h2
                        className="text-xl font-bold mb-1"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        {isComplete ? 'Signature Complete' : 'Cryptographic Handshake'}
                    </h2>
                    <p
                        className="text-sm text-[var(--cosmic-gray)]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                    >
                        {evidenceId}
                    </p>
                </div>

                {/* Animation Container */}
                <div className="relative mb-8">
                    {/* Connection lines animation */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-full h-px bg-gradient-to-r from-transparent via-[var(--pulse-blue)] to-transparent"
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={!isComplete ? {
                                    opacity: [0, 1, 0],
                                    scaleX: [0, 1, 0],
                                } : { opacity: 0 }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                                style={{
                                    top: `${10 + i * 15}%`,
                                    rotate: `${-30 + i * 10}deg`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                        {handshakeSteps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = currentStep === index;
                            const isPast = currentStep > index;

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0.3, x: -20 }}
                                    animate={{
                                        opacity: isPast || isActive ? 1 : 0.3,
                                        x: isPast || isActive ? 0 : -20,
                                    }}
                                    className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all
                    ${isActive && !isComplete ? 'bg-[var(--pulse-blue)]/10 border border-[var(--pulse-blue)]/30' : ''}
                    ${isPast ? 'bg-[var(--status-verified)]/10' : ''}
                  `}
                                >
                                    <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isPast
                                            ? 'bg-[var(--status-verified)]/20 text-[var(--status-verified)]'
                                            : isActive && !isComplete
                                                ? 'bg-[var(--pulse-blue)]/20 text-[var(--pulse-blue)]'
                                                : 'bg-[var(--nebula-dark)] text-[var(--cosmic-gray)]'
                                        }
                  `}>
                                        {isPast ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <Icon className="w-4 h-4" />
                                        )}
                                    </div>

                                    <span
                                        className={`text-sm ${isPast
                                                ? 'text-[var(--status-verified)]'
                                                : isActive && !isComplete
                                                    ? 'text-[var(--pulse-blue)]'
                                                    : 'text-[var(--cosmic-gray)]'
                                            }`}
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    >
                                        {step.message}
                                    </span>

                                    {isActive && !isComplete && !isPast && (
                                        <motion.div
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                            className="ml-auto w-2 h-2 rounded-full bg-[var(--pulse-blue)]"
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-[var(--nebula-dark)] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{
                            width: isComplete
                                ? '100%'
                                : `${((currentStep + 1) / handshakeSteps.length) * 100}%`
                        }}
                        transition={{ duration: 0.3 }}
                        className={`h-full ${isComplete
                                ? 'bg-[var(--status-verified)]'
                                : 'bg-gradient-to-r from-[var(--pulse-blue)] to-purple-500'
                            }`}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
}
