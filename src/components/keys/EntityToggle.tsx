'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Scale,
    Newspaper,
    ShieldCheck,
    Clock,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';

interface Entity {
    id: string;
    name: string;
    type: string;
    hasAccess: boolean;
    grantedAt?: string;
}

interface EntityToggleProps {
    entity: Entity;
    index: number;
    onToggle: (granted: boolean) => void;
}

const typeIcons: Record<string, typeof Building2> = {
    Media: Newspaper,
    Legal: Scale,
    Government: ShieldCheck,
    Corporate: Building2,
};

export default function EntityToggle({ entity, index, onToggle }: EntityToggleProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const Icon = typeIcons[entity.type] || Building2;

    const handleToggle = async () => {
        if (entity.hasAccess) {
            // Can't revoke - just show warning
            return;
        }

        if (!showConfirm) {
            setShowConfirm(true);
            return;
        }

        setIsToggling(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        onToggle(true);
        setIsToggling(false);
        setShowConfirm(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
        p-4 rounded-xl transition-all
        ${entity.hasAccess
                    ? 'bg-[var(--status-verified)]/5 border border-[var(--status-verified)]/20'
                    : 'glass-subtle'
                }
      `}
        >
            <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center
          ${entity.hasAccess
                        ? 'bg-[var(--status-verified)]/20 text-[var(--status-verified)]'
                        : 'bg-[var(--nebula-light)] text-[var(--cosmic-gray)]'
                    }
        `}>
                    <Icon className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium">{entity.name}</h4>
                        {entity.hasAccess && (
                            <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--cosmic-gray)]">
                        <span>{entity.type}</span>
                        {entity.grantedAt && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Granted {formatDate(entity.grantedAt)}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-3">
                    {showConfirm && !entity.hasAccess && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                        >
                            <span className="text-xs text-[var(--status-orbiting)] flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Confirm?
                            </span>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="text-xs text-[var(--cosmic-gray)] hover:text-[var(--starlight)]"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: entity.hasAccess ? 1 : 1.05 }}
                        whileTap={{ scale: entity.hasAccess ? 1 : 0.95 }}
                        onClick={handleToggle}
                        disabled={entity.hasAccess || isToggling}
                        className={`
              relative w-14 h-7 rounded-full transition-all
              ${entity.hasAccess
                                ? 'bg-[var(--status-verified)] cursor-not-allowed'
                                : showConfirm
                                    ? 'bg-[var(--status-orbiting)]'
                                    : 'bg-[var(--cosmic-gray-dark)] hover:bg-[var(--cosmic-gray)]'
                            }
            `}
                    >
                        <motion.div
                            animate={{
                                x: entity.hasAccess ? 28 : 2,
                            }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`
                absolute top-1 w-5 h-5 rounded-full
                ${entity.hasAccess
                                    ? 'bg-white'
                                    : 'bg-[var(--starlight)]'
                                }
              `}
                        >
                            {isToggling && (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                                    className="w-full h-full rounded-full border-2 border-t-transparent border-[var(--deep-void)]"
                                />
                            )}
                        </motion.div>
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
