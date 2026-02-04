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
    UserPlus,
} from 'lucide-react';
import { AuthAPI } from '@/lib/api/auth';

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
    const [isRegistering, setIsRegistering] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let response;
            
            if (isRegistering) {
                // Register new user
                response = await AuthAPI.register({
                    email: email.toLowerCase(),
                    password,
                    firstName: firstName || undefined,
                    lastName: lastName || undefined,
                });
            } else {
                // Login existing user
                response = await AuthAPI.login({
                    email: email.toLowerCase(),
                    password,
                });
            }

            // Redirect based on user role
            const userRole = response.user.role;
            switch (userRole) {
                case 'HIGHER_AUTHORITY':
                case 'ADMIN':
                    router.push('/keys');
                    break;
                case 'VALIDATOR':
                    router.push('/validate');
                    break;
                case 'AGENT':
                default:
                    router.push('/submit');
                    break;
            }
        } catch (error: any) {
            setError(error.message || (isRegistering ? 'Registration failed' : 'Login failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const createDemoUsers = async () => {
        try {
            setIsLoading(true);
            await AuthAPI.createDemoUsers();
            setError('');
            alert('Demo users created successfully! Try logging in with:\n\n' +
                  'Agent: agent1@tars.network / agent123\n' +
                  'Validator: validator1@tars.network / validator123\n' +
                  'Admin: admin@tars.network / authority123');
        } catch (error: any) {
            setError('Failed to create demo users');
        } finally {
            setIsLoading(false);
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
                            {isRegistering ? 'Create Account' : 'Secure Access'}
                        </h1>

                        <p className="text-sm text-[var(--silver-medium)]">
                            {isRegistering 
                                ? 'Join the TARS network as a registered agent'
                                : 'Initialize encrypted connection to TARS network'
                            }
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

                {/* Registration fields for new users */}
                {isRegistering && (
                    <>
                        <div className="flex items-stretch gap-0">
                            {/* First Name Block */}
                            <div className="flex-1">
                                <BlockchainBlock delay={0.25}>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--platinum)] mb-3">
                                            <Fingerprint className="w-4 h-4" />
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Enter first name"
                                            className="input pl-4 pr-4"
                                        />
                                    </div>
                                </BlockchainBlock>
                            </div>

                            <ChainLink delay={0.27} horizontal />

                            {/* Last Name Block */}
                            <div className="flex-1">
                                <BlockchainBlock delay={0.3}>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--platinum)] mb-3">
                                            <Fingerprint className="w-4 h-4" />
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Enter last name"
                                            className="input pl-4 pr-4"
                                        />
                                    </div>
                                </BlockchainBlock>
                            </div>
                        </div>

                        <ChainLink delay={0.32} />
                    </>
                )}

                {/* Email and Password Blocks - Side by Side */}
                <div className="flex items-stretch gap-0">
                    {/* Email Block */}
                    <div className="flex-1">
                        <BlockchainBlock delay={isRegistering ? 0.35 : 0.3}>
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
                    <ChainLink delay={isRegistering ? 0.37 : 0.35} horizontal />

                    {/* Password Block */}
                    <div className="flex-1">
                        <BlockchainBlock delay={isRegistering ? 0.4 : 0.4}>
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
                <ChainLink delay={isRegistering ? 0.5 : 0.5} />

                {/* Submit Block */}
                <BlockchainBlock delay={isRegistering ? 0.6 : 0.6}>
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <motion.button
                            type="submit"
                            disabled={isLoading || !email || !password || (isRegistering && (!firstName || !lastName))}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-xl font-bold text-lg relative overflow-hidden mb-4
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
                                        {isRegistering ? 'Creating Account...' : 'Establishing Secure Channel...'}
                                    </>
                                ) : (
                                    <>
                                        {isRegistering ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                        {isRegistering ? 'Create Account' : 'Initialize Connection'}
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </span>
                        </motion.button>

                        {/* Toggle between login and register */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                                setFirstName('');
                                setLastName('');
                            }}
                            className="w-full py-2 text-sm text-[var(--silver-medium)] hover:text-[var(--platinum)] transition-colors"
                        >
                            {isRegistering 
                                ? 'Already have an account? Sign in' 
                                : 'New to TARS? Create an account'
                            }
                        </button>

                        {/* Demo users helper */}
                        <button
                            type="button"
                            onClick={createDemoUsers}
                            disabled={isLoading}
                            className="w-full mt-2 py-2 text-xs text-[var(--silver-dark)] hover:text-[var(--silver-medium)] transition-colors"
                        >
                            Create Demo Users
                        </button>

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
                                Contact Support
                            </Link>
                        </div>
                    </form>
                </BlockchainBlock>

                {/* Predefined Users Notice */}
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
                                Predefined User Accounts
                            </p>
                            <p className="text-xs text-amber-200/60 mt-1">
                                Admin: admin@tars.network / authority123 | Agent: agent1@tars.network / agent123
                            </p>
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
