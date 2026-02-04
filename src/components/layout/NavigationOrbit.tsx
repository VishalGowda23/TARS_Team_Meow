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
import { AuthAPI } from '@/lib/api/auth';

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
  const [currentUser, setCurrentUser] = useState<{email: string, role: string} | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Load current user info from localStorage immediately
  useEffect(() => {
    setIsClient(true);
    // Always try localStorage first for immediate display
    const email = localStorage.getItem('tars-user-email');
    const role = localStorage.getItem('tars-user-role');
    if (email) {
      setCurrentUser({ email, role: role || 'AGENT' });
    }
    
    // Then try API for fresh data
    const loadUser = async () => {
      try {
        const user = await AuthAPI.getCurrentUser();
        if (user) {
          setCurrentUser({ email: user.email, role: user.role });
        }
      } catch (error) {
        // Keep localStorage data if API fails
        console.log('Using localStorage for user info');
      }
    };
    loadUser();
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    router.push('/signin');
  };

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

        {/* User Info & Controls */}
        <div className="pt-6 border-t border-white/10 space-y-3">
          {/* Current User - show email or default */}
          {isClient && (
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3 text-[var(--accent-cyan)]" />
                <div className="overflow-hidden">
                  <p className="text-[var(--starlight)] font-medium truncate max-w-[180px]">
                    {currentUser?.email || 'User'}
                  </p>
                  <p className="text-[var(--cosmic-gray)] uppercase text-[10px]">
                    {currentUser?.role?.replace('_', ' ') || 'AGENT'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Logout Button - Always visible */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                     bg-red-500/10 hover:bg-red-500/20 border border-red-500/30
                     text-red-400 hover:text-red-300 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </motion.button>
          
          {/* Panic Button */}
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
