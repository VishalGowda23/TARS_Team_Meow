'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Rocket, ShieldCheck, ArrowRight } from 'lucide-react';

export default function HeroSection() {
    return (
        <section className="relative min-h-[85vh] flex items-center justify-center px-8">
            <div className="max-w-4xl mx-auto text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle mb-8"
                >
                    <ShieldCheck className="w-4 h-4 text-[var(--silver-bright)]" />
                    <span className="text-sm text-[var(--cosmic-gray)]">
                        End-to-End Encrypted • Decentralized • Anonymous
                    </span>
                </motion.div>

                {/* Main Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    Secure Disclosure
                    <br />
                    <span className="text-metallic-glow">
                        Beyond Reach
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-[var(--cosmic-gray)] mb-12 max-w-2xl mx-auto leading-relaxed"
                >
                    TARS is a decentralized whistleblowing platform that ensures your evidence
                    reaches the truth — anonymously, immutably, and verifiably.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    {/* Primary CTA - Initiate Disclosure */}
                    <Link href="/signin">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative px-8 py-4 rounded-xl font-semibold text-lg overflow-hidden"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {/* Glow effect behind button */}
                            <motion.div
                                className="absolute inset-0 rounded-xl"
                                style={{ background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 40%, #999B9B 70%, #BCC6CC 100%)' }}
                                animate={{
                                    boxShadow: [
                                        '0 0 20px rgba(229, 228, 226, 0.5), 0 0 40px rgba(188, 198, 204, 0.3)',
                                        '0 0 40px rgba(229, 228, 226, 0.8), 0 0 80px rgba(188, 198, 204, 0.5)',
                                        '0 0 20px rgba(229, 228, 226, 0.5), 0 0 40px rgba(188, 198, 204, 0.3)',
                                    ],
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            />

                            {/* Button content */}
                            <span className="relative z-10 flex items-center gap-3 text-[var(--deep-void)] text-black">
                                <Rocket className="w-5 h-5" style={{ color: 'black' }} />
                                Initiate Disclosure
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </span>
                        </motion.button>
                    </Link>

                    {/* Secondary CTA */}
                    <Link href="/dashboard">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-secondary text-lg"
                        >
                            View Star Map
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto"
                >
                    {[
                        { value: '256-bit', label: 'Encryption' },
                        { value: 'IPFS', label: 'Storage' },
                        { value: '100%', label: 'Anonymous' },
                    ].map((stat, index) => (
                        <div key={index} className="text-center">
                            <div
                                className="text-2xl font-bold text-silver-glow"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                {stat.value}
                            </div>
                            <div className="text-sm text-[var(--cosmic-gray)]">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Decorative orbital rings */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 border border-white/5 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 border border-white/3 rounded-full"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
                />
            </div>
        </section>
    );
}
