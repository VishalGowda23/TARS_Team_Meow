'use client';

import { motion } from 'framer-motion';
import { EyeOff, Database, Fingerprint, Shield, Lock, Zap } from 'lucide-react';
import MissionCard from './MissionCard';

const missions = [
    {
        icon: EyeOff,
        title: 'Anonymity Shield',
        description: 'Your identity is protected through zero-knowledge proofs and onion routing. No traceable metadata, no digital footprint.',
    },
    {
        icon: Database,
        title: 'Immutable Records',
        description: 'Evidence is stored on IPFS and anchored to blockchain. Once submitted, it cannot be altered, deleted, or censored.',
    },
    {
        icon: Fingerprint,
        title: 'Cryptographic Verification',
        description: 'Multi-party validators sign and verify evidence authenticity without accessing the content itself.',
    },
];

const features = [
    {
        icon: Shield,
        title: 'End-to-End Encryption',
        description: 'Military-grade AES-256 encryption ensures only authorized parties can access your evidence.',
    },
    {
        icon: Lock,
        title: 'Selective Disclosure',
        description: 'Generate time-limited access keys for specific journalists, lawyers, or oversight bodies.',
    },
    {
        icon: Zap,
        title: 'Instant Timestamping',
        description: 'Blockchain timestamps provide irrefutable proof of when evidence was submitted.',
    },
];

export default function MissionBriefing() {
    return (
        <section className="relative py-24 px-8">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h2
                        className="text-3xl md:text-4xl font-bold mb-4"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Mission Briefing
                    </h2>
                    <p className="text-[var(--cosmic-gray)] max-w-2xl mx-auto">
                        TARS is built on three foundational pillars that ensure your disclosures
                        remain secure, permanent, and verifiable.
                    </p>
                </motion.div>

                {/* Primary Mission Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {missions.map((mission, index) => (
                        <MissionCard
                            key={mission.title}
                            icon={mission.icon}
                            title={mission.title}
                            description={mission.description}
                            index={index}
                        />
                    ))}
                </div>

                {/* Divider */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="h-px bg-gradient-to-r from-transparent via-[var(--pulse-blue)]/30 to-transparent mb-16"
                />

                {/* Secondary Features */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h3
                        className="text-2xl font-semibold mb-2"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Additional Safeguards
                    </h3>
                    <p className="text-[var(--cosmic-gray)] text-sm">
                        Every layer of protection working in unison
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <MissionCard
                            key={feature.title}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                            index={index}
                        />
                    ))}
                </div>
            </div>

            {/* Background decoration */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </section>
    );
}
