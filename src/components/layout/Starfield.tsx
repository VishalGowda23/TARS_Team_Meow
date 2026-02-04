'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Debris {
    id: number;
    type: 'asteroid' | 'satellite' | 'fragment';
    x: number;
    y: number;
    size: number;
    rotation: number;
    duration: number;
    delay: number;
}

export default function Starfield() {
    const [debris, setDebris] = useState<Debris[]>([]);

    useEffect(() => {
        // Generate random debris on mount
        const items: Debris[] = [];

        // Asteroids
        for (let i = 0; i < 8; i++) {
            items.push({
                id: i,
                type: 'asteroid',
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 40 + 20,
                rotation: Math.random() * 360,
                duration: Math.random() * 40 + 60,
                delay: Math.random() * 20,
            });
        }

        // Satellite fragments
        for (let i = 8; i < 14; i++) {
            items.push({
                id: i,
                type: 'satellite',
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 4 + 2,
                rotation: Math.random() * 360,
                duration: Math.random() * 20 + 30,
                delay: Math.random() * 10,
            });
        }

        // Small fragments
        for (let i = 14; i < 30; i++) {
            items.push({
                id: i,
                type: 'fragment',
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 3 + 1,
                rotation: Math.random() * 360,
                duration: Math.random() * 30 + 40,
                delay: Math.random() * 15,
            });
        }

        setDebris(items);
    }, []);

    return (
        <>
            {/* Main starfield with CSS animation */}
            <div className="starfield" aria-hidden="true" />

            {/* Nebula clouds */}
            <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
                <motion.div
                    className="absolute w-[800px] h-[800px] rounded-full opacity-20"
                    style={{
                        background: 'radial-gradient(circle, rgba(0, 229, 255, 0.1) 0%, transparent 70%)',
                        top: '10%',
                        right: '-10%',
                        filter: 'blur(60px)',
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.15, 0.25, 0.15],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute w-[600px] h-[600px] rounded-full opacity-15"
                    style={{
                        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%)',
                        bottom: '20%',
                        left: '-5%',
                        filter: 'blur(50px)',
                    }}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 5,
                    }}
                />
            </div>

            {/* Floating space debris */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
                {debris.map((item) => (
                    <motion.div
                        key={item.id}
                        className={`absolute ${item.type === 'asteroid' ? 'asteroid' : item.type === 'satellite' ? 'satellite' : 'debris'}`}
                        style={{
                            width: item.size,
                            height: item.type === 'asteroid' ? item.size * 0.7 : item.size,
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                        }}
                        initial={{
                            rotate: item.rotation,
                            opacity: item.type === 'asteroid' ? 0.6 : 0.4,
                        }}
                        animate={{
                            x: [0, -200, -400],
                            y: [0, 50, 100],
                            rotate: [item.rotation, item.rotation + 180, item.rotation + 360],
                            opacity: item.type === 'asteroid' ? [0.6, 0.8, 0.6] : [0.4, 0.6, 0.4],
                        }}
                        transition={{
                            duration: item.duration,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: item.delay,
                        }}
                    />
                ))}
            </div>

            {/* Twinkling stars */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
                {[...Array(40)].map((_, i) => (
                    <motion.div
                        key={`star-${i}`}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: Math.random() * 2 + 1,
                            height: Math.random() * 2 + 1,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            opacity: [0.2, 0.8, 0.2],
                            scale: [1, 1.3, 1],
                        }}
                        transition={{
                            duration: Math.random() * 3 + 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: Math.random() * 5,
                        }}
                    />
                ))}
            </div>

            {/* Occasional shooting star */}
            <motion.div
                className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden"
                aria-hidden="true"
            >
                <motion.div
                    className="absolute w-[150px] h-[2px]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(0, 229, 255, 0.6), transparent)',
                        boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
                    }}
                    initial={{ x: '-150px', y: '15%', rotate: 35, opacity: 0 }}
                    animate={{
                        x: ['0%', '130%'],
                        y: ['10%', '60%'],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 12,
                        ease: 'easeOut',
                    }}
                />

                {/* Second shooting star */}
                <motion.div
                    className="absolute w-[100px] h-[1px]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                        boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
                    }}
                    initial={{ x: '110%', y: '30%', rotate: 140, opacity: 0 }}
                    animate={{
                        x: [null, '-20%'],
                        y: ['25%', '70%'],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        repeatDelay: 18,
                        ease: 'easeOut',
                        delay: 8,
                    }}
                />
            </motion.div>

            {/* Grid overlay for tech feel */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(192, 192, 192, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 192, 192, 0.5) 1px, transparent 1px)
          `,
                    backgroundSize: '100px 100px',
                }}
                aria-hidden="true"
            />
        </>
    );
}
