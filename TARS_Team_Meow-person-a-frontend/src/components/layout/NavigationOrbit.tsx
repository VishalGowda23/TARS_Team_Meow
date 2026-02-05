'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  FileUp,
  LayoutDashboard,
  CheckCircle2,
  Key,
  AlertTriangle,
  Orbit,
  LogOut,
  User,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Command Center', icon: Orbit },
  { href: '/submit', label: 'Submit Evidence', icon: FileUp },
  { href: '/dashboard', label: 'Star Map', icon: LayoutDashboard },
  { href: '/validate', label: 'The Bridge', icon: CheckCircle2 },
  { href: '/keys', label: 'Key Master', icon: Key },
];

export default function NavigationOrbit() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; company?: string } | null>(null);

  // Load user info from localStorage
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('tars-logged-in');
    if (isLoggedIn === 'true') {
      setUser({
        name: localStorage.getItem('tars-user-name') || 'Anonymous Agent',
        role: localStorage.getItem('tars-user-role') || 'agent',
        company: localStorage.getItem('tars-user-company') || undefined,
      });
    }
  }, []);

  // Sign out handler
  const handleSignOut = useCallback(() => {
    localStorage.removeItem('tars-logged-in');
    localStorage.removeItem('tars-user-role');
    localStorage.removeItem('tars-user-email');
    localStorage.removeItem('tars-user-name');
    localStorage.removeItem('tars-user-company');
    localStorage.removeItem('tars-user-department');
    localStorage.removeItem('tars-user-secret');
    setUser(null);
    router.push('/signin');
  }, [router]);

  // Panic Button - ESC key handler
  const handlePanic = useCallback(() => {
    window.location.href = 'https://www.google.com/search?q=Google.com';
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlePanic();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePanic]);

  return (
    <motion.nav
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-full w-64 z-50 glass border-r border-white/10"
    >
      <div className="flex flex-col h-full p-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="relative">
            <Shield className="w-10 h-10 text-[var(--accent-cyan)]" />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  '0 0 10px rgba(0, 212, 255, 0.3)',
                  '0 0 20px rgba(0, 212, 255, 0.5)',
                  '0 0 10px rgba(0, 212, 255, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              TARS
            </h1>
            <p className="text-xs text-[var(--cosmic-gray)] uppercase tracking-widest">
              Secure Network
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="block"
              >
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive
                      ? 'bg-[var(--pulse-blue)]/10 text-[var(--accent-cyan)] border border-[var(--pulse-blue)]/30'
                      : 'text-[var(--cosmic-gray)] hover:text-[var(--starlight)] hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--pulse-blue)]"
                      style={{ boxShadow: '0 0 10px var(--pulse-blue)' }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* User Info & Sign Out */}
        {user && (
          <div className="pt-4 border-t border-white/10 mb-4">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--accent-cyan)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--starlight)] truncate">
                  {user.name}
                </p>
                <p className="text-xs text-[var(--cosmic-gray)] truncate">
                  {user.company || (user.role === 'higher-authority' ? 'Administrator' : 'Whistleblower')}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                         bg-white/5 hover:bg-white/10 text-[var(--cosmic-gray)] hover:text-[var(--starlight)]
                         transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </motion.button>
          </div>
        )}

        {/* Sign In Link (if not logged in) */}
        {!user && (
          <div className="pt-4 border-t border-white/10 mb-4">
            <Link href="/signin">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                           bg-[var(--accent-cyan)]/10 hover:bg-[var(--accent-cyan)]/20 
                           text-[var(--accent-cyan)] transition-all text-sm font-medium
                           border border-[var(--accent-cyan)]/30"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </motion.div>
            </Link>
          </div>
        )}

        {/* Panic Button */}
        <div className="pt-6 border-t border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePanic}
            className="btn-panic w-full flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>PANIC [ESC]</span>
          </motion.button>
          <p className="text-[10px] text-[var(--cosmic-gray)] text-center mt-2">
            Emergency exit to safety
          </p>
        </div>
      </div>
    </motion.nav>
  );
}
