'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoIntroProps {
    videoSrc: string;
    onComplete: () => void;
    skipText?: string;
}

export default function VideoIntro({ videoSrc, onComplete, skipText = 'Skip Intro' }: VideoIntroProps) {
    const [isPlaying, setIsPlaying] = useState(true);
    const [canSkip, setCanSkip] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Allow skip after 2 seconds
        const timer = setTimeout(() => {
            setCanSkip(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const handleVideoEnd = () => {
        setIsPlaying(false);
        setTimeout(onComplete, 500); // Slight delay for fade out
    };

    const handleSkip = () => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        setIsPlaying(false);
        setTimeout(onComplete, 300);
    };

    return (
        <AnimatePresence>
            {isPlaying && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
                >
                    {/* Video */}
                    {/* Video - High Quality Settings */}
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        autoPlay
                        muted
                        playsInline
                        onEnded={handleVideoEnd}
                        className="absolute inset-0 w-full h-full"
                        style={{
                            objectFit: 'cover',
                            objectPosition: 'center',
                            WebkitBackfaceVisibility: 'hidden',
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)',
                            willChange: 'transform',
                        }}
                    />

                    {/* Vignette overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                        }}
                    />

                    {/* Skip button */}
                    <AnimatePresence>
                        {canSkip && (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                onClick={handleSkip}
                                className="absolute bottom-8 right-8 px-6 py-3 rounded-lg 
                           bg-black/50 backdrop-blur-sm border border-white/20
                           text-white/80 hover:text-white hover:border-white/40
                           transition-all duration-300 font-medium
                           flex items-center gap-2"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                <span className="text-sm uppercase tracking-wider">{skipText}</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Loading indicator (in case video takes time) */}
                    <motion.div
                        className="absolute bottom-8 left-8 flex items-center gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-white/40"
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.4, 1, 0.4],
                                    }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </div>
                        <span
                            className="text-xs text-white/40 uppercase tracking-widest"
                            style={{ fontFamily: 'var(--font-mono)' }}
                        >
                            TARS
                        </span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
