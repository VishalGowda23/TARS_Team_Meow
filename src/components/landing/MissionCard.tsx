'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MissionCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    index: number;
}

export default function MissionCard({ icon: Icon, title, description, index }: MissionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
            whileHover={{ y: -8 }}
            className="card group relative overflow-hidden"
        >
            {/* Gradient border effect on hover */}
            <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, transparent 50%)',
                }}
            />

            {/* Icon */}
            <div className="relative mb-6">
                <div className="w-14 h-14 rounded-xl bg-[var(--pulse-blue)]/10 flex items-center justify-center border border-[var(--pulse-blue)]/20">
                    <Icon className="w-7 h-7 text-[var(--pulse-blue)]" />
                </div>

                {/* Glow effect */}
                <motion.div
                    className="absolute inset-0 rounded-xl"
                    animate={{
                        boxShadow: [
                            '0 0 0px rgba(0, 212, 255, 0)',
                            '0 0 20px rgba(0, 212, 255, 0.3)',
                            '0 0 0px rgba(0, 212, 255, 0)',
                        ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
                />
            </div>

            {/* Content */}
            <h3
                className="text-xl font-semibold mb-3 text-[var(--starlight)] group-hover:text-[var(--pulse-blue)] transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
            >
                {title}
            </h3>

            <p className="text-[var(--cosmic-gray)] leading-relaxed text-sm">
                {description}
            </p>

            {/* Bottom accent line */}
            <motion.div
                className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[var(--pulse-blue)] to-transparent"
                initial={{ width: '0%' }}
                whileHover={{ width: '100%' }}
                transition={{ duration: 0.3 }}
            />
        </motion.div>
    );
}
