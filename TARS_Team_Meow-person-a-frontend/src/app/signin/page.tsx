'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Lock,
    Mail,
    Eye,
    EyeOff,
    Shield,
    ArrowRight,
    Fingerprint,
    Key,
    Crown,
} from 'lucide-react';

// Higher Authority Credentials (for demo purposes)
// In production, this would be handled by a secure backend
const HIGHER_AUTHORITY_CREDENTIALS = {
    email: 'admin',
    password: 'admin',
};

// Demo Employee/Whistleblower Credentials
const DEMO_EMPLOYEES = [
    {
        email: 'user1',
        password: 'user1',
        name: 'John Doe',
        company: 'Acme Corporation',
        department: 'Finance',
    },
    {
        email: 'user2',
        password: 'user2',
        name: 'Sarah Chen',
        company: 'TechGiant Inc',
        department: 'Engineering',
    },
    {
        email: 'user3',
        password: 'user3',
        name: 'Mike Wilson',
        company: 'Global Bank',
        department: 'Compliance',
    },
    {
        email: 'user4',
        password: 'user4',
        name: 'Emma Garcia',
        company: 'PharmaPlusLabs',
        department: 'Research',
    },
    {
        email: 'user5',
        password: 'user5',
        name: 'David Kumar',
        company: 'EnergyCorp',
        department: 'Operations',
    },
];

// Blockchain block component
function BlockchainBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.4 }}
            className="relative"
        >
            {/* Block */}
            <div className="glass p-6 relative overflow-hidden">
                {/* Hash pattern overlay */}
                <div
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{
                        backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(229, 228, 226, 0.1) 2px,
              rgba(229, 228, 226, 0.1) 4px
            )`,
                    }}
                />
                {children}
            </div>
        </motion.div>
    );
}

// Chain link with lock - supports vertical and horizontal
function ChainLink({ delay = 0, horizontal = false }: { delay?: number; horizontal?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.3 }}
            className={`flex items-center ${horizontal ? 'flex-row px-2' : 'flex-col py-2'}`}
        >
            {/* Chain segment 1 */}
            <div className={horizontal
                ? 'h-0.5 w-4 bg-gradient-to-r from-transparent via-[var(--silver-bright)] to-[var(--silver-medium)]'
                : 'w-0.5 h-4 bg-gradient-to-b from-transparent via-[var(--silver-bright)] to-[var(--silver-medium)]'
            } />

            {/* Lock icon */}
            <motion.div
                animate={{
                    boxShadow: [
                        '0 0 10px rgba(229, 228, 226, 0.3)',
                        '0 0 20px rgba(229, 228, 226, 0.5)',
                        '0 0 10px rgba(229, 228, 226, 0.3)',
                    ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-8 h-8 rounded-full bg-[var(--space-medium)] border border-[var(--silver-medium)] 
                   flex items-center justify-center flex-shrink-0"
            >
                <Lock className="w-4 h-4 text-[var(--platinum)]" />
            </motion.div>

            {/* Chain segment 2 */}
            <div className={horizontal
                ? 'h-0.5 w-4 bg-gradient-to-r from-[var(--silver-medium)] via-[var(--silver-bright)] to-transparent'
                : 'w-0.5 h-4 bg-gradient-to-b from-[var(--silver-medium)] via-[var(--silver-bright)] to-transparent'
            } />
        </motion.div>
    );
}

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate authentication delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for higher authority credentials
        const isHigherAuthority =
            email.toLowerCase() === HIGHER_AUTHORITY_CREDENTIALS.email &&
            password === HIGHER_AUTHORITY_CREDENTIALS.password;

        // Check for employee credentials
        const employee = DEMO_EMPLOYEES.find(
            emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === password
        );

        if (!isHigherAuthority && !employee) {
            setError('Invalid credentials. Please try again.');
            setIsLoading(false);
            return;
        }

        // Store user role and info in localStorage
        if (isHigherAuthority) {
            localStorage.setItem('tars-user-role', 'higher-authority');
            localStorage.setItem('tars-user-email', email);
            localStorage.setItem('tars-user-name', 'Administrator');
        } else if (employee) {
            localStorage.setItem('tars-user-role', 'employee');
            localStorage.setItem('tars-user-email', employee.email);
            localStorage.setItem('tars-user-name', employee.name);
            localStorage.setItem('tars-user-company', employee.company);
            localStorage.setItem('tars-user-department', employee.department);
        }
        localStorage.setItem('tars-logged-in', 'true');

        setIsLoading(false);

        // Redirect based on role
        if (isHigherAuthority) {
            router.push('/keys');
        } else {
            router.push('/submit');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div className="w-full max-w-3xl">
                {/* Header Block */}
                <BlockchainBlock delay={0}>
                    <div className="text-center">
                        <motion.div
                            animate={{
                                boxShadow: [
                                    '0 0 20px rgba(229, 228, 226, 0.3)',
                                    '0 0 40px rgba(229, 228, 226, 0.5)',
                                    '0 0 20px rgba(229, 228, 226, 0.3)',
                                ],
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--platinum)] to-[var(--silver-medium)] 
                         flex items-center justify-center"
                        >
                            <Shield className="w-8 h-8 text-[var(--void-black)]" />
                        </motion.div>

                        <h1
                            className="text-2xl font-bold text-metallic-glow mb-2"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Secure Access
                        </h1>

                        <p className="text-sm text-[var(--silver-medium)]">
                            Initialize encrypted connection to TARS network
                        </p>

                        {/* Hash display */}
                        <div
                            className="mt-4 px-3 py-2 bg-[var(--void-black)] rounded-lg border border-[var(--silver-dark)]/30"
                            style={{ fontFamily: 'var(--font-mono)' }}
                        >
                            <span className="text-xs text-[var(--silver-dark)]">BLOCK #</span>
                            <span className="text-xs text-[var(--platinum)] ml-2">0x7f3a...b92c</span>
                        </div>
                    </div>
                </BlockchainBlock>

                {/* Chain Link - connecting header to credentials */}
                <ChainLink delay={0.2} />

                {/* Email and Password Blocks - Side by Side */}
                <div className="flex items-stretch gap-0">
                    {/* Email Block */}
                    <div className="flex-1">
                        <BlockchainBlock delay={0.3}>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-[var(--platinum)] mb-3">
                                    <Mail className="w-4 h-4" />
                                    Username
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="agent@tars.network"
                                        className="input pl-4 pr-10"
                                        required
                                    />
                                    <Fingerprint className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--silver-dark)]" />
                                </div>
                            </div>
                        </BlockchainBlock>
                    </div>

                    {/* Horizontal Chain Link */}
                    <ChainLink delay={0.35} horizontal />

                    {/* Password Block */}
                    <div className="flex-1">
                        <BlockchainBlock delay={0.4}>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-[var(--platinum)] mb-3">
                                    <Key className="w-4 h-4" />
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="input pl-4 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--silver-dark)] hover:text-[var(--platinum)] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Password strength indicator */}
                                <div className="mt-3 flex gap-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all ${password.length >= i * 3
                                                ? 'bg-[var(--status-verified)]'
                                                : 'bg-[var(--silver-dark)]/30'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </BlockchainBlock>
                    </div>
                </div>

                {/* Chain Link - connecting credentials to submit */}
                <ChainLink delay={0.5} />

                {/* Submit Block */}
                <BlockchainBlock delay={0.6}>
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <motion.button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-xl font-bold text-lg relative overflow-hidden
                         disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                fontFamily: 'var(--font-display)',
                                background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 40%, #999B9B 70%, #BCC6CC 100%)',
                            }}
                        >
                            {/* Animated glow */}
                            <motion.div
                                className="absolute inset-0"
                                animate={{
                                    boxShadow: isLoading ? [
                                        '0 0 20px rgba(229, 228, 226, 0.5)',
                                        '0 0 60px rgba(229, 228, 226, 0.8)',
                                        '0 0 20px rgba(229, 228, 226, 0.5)',
                                    ] : undefined,
                                }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            />

                            <span className="relative z-10 flex items-center justify-center gap-3 text-[var(--void-black)]">
                                {isLoading ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Lock className="w-5 h-5" />
                                        </motion.div>
                                        Establishing Secure Channel...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5" />
                                        Initialize Connection
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </span>
                        </motion.button>

                        {/* Alternative options */}
                        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
                            <Link
                                href="#"
                                className="text-[var(--silver-medium)] hover:text-[var(--platinum)] transition-colors"
                            >
                                Recover Access
                            </Link>
                            <span className="text-[var(--silver-dark)]">•</span>
                            <Link
                                href="#"
                                className="text-[var(--silver-medium)] hover:text-[var(--platinum)] transition-colors"
                            >
                                New Agent
                            </Link>
                        </div>
                    </form>
                </BlockchainBlock>

                {/* Higher Authority Notice */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5"
                >
                    <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <div>
                            <p className="text-sm text-amber-300 font-medium">
                                Higher Authority Access
                            </p>
                            <p className="text-xs text-amber-200/60 mt-1">
                                Agency administrators use designated credentials for elevated access
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Demo Credentials Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mt-4 p-4 rounded-xl border border-[var(--silver-dark)]/20 bg-[var(--space-dark)]/50"
                >
                    <p className="text-xs text-[var(--silver-medium)] font-medium mb-3 flex items-center gap-2">
                        <Fingerprint className="w-4 h-4" />
                        Demo Credentials (Hackathon)
                    </p>
                    <div className="space-y-2 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                        <div className="p-2 rounded bg-[var(--void-black)]/50 border border-[var(--silver-dark)]/10">
                            <span className="text-amber-400">Admin:</span>
                            <span className="text-[var(--silver-medium)] ml-2">admin / admin</span>
                        </div>
                        <div className="p-2 rounded bg-[var(--void-black)]/30 border border-[var(--silver-dark)]/10">
                            <span className="text-[var(--accent-cyan)]">Users:</span>
                            <span className="text-[var(--silver-medium)] ml-2">user1/user1, user2/user2, user3/user3</span>
                        </div>
                    </div>
                </motion.div>

                {/* Security notice */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-6 text-center"
                >
                    <div className="flex items-center justify-center gap-2 text-xs text-[var(--silver-dark)]">
                        <Lock className="w-3 h-3" />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                            256-bit AES • Zero-Knowledge Proof • End-to-End Encrypted
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
