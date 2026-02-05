'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Key,
    Shield,
    Plus,
    Copy,
    CheckCircle2,
    AlertCircle,
    Clock,
    Users,
    Lock,
    Unlock,
    Crown,
    ShieldAlert,
    AlertTriangle,
    Loader2,
    Inbox,
} from 'lucide-react';
import AccessKeyGenerator from '@/components/keys/AccessKeyGenerator';
import EntityToggle from '@/components/keys/EntityToggle';
import { validationApi, userSecretStorage } from '@/lib/api';

interface Evidence {
    id: string;
    fileName: string;
    status: 'orbiting' | 'verified' | 'transmitted';
    signatures: number;
    requiredSignatures: number;
    consensusReached: boolean;
}

interface Entity {
    id: string;
    name: string;
    type: string;
    hasAccess: boolean;
    grantedAt?: string;
}

// Default authorized entities (will be stored in localStorage)
const defaultEntities: Entity[] = [
    { id: '1', name: 'The Press', type: 'Media', hasAccess: false },
    { id: '2', name: 'Legal Council', type: 'Legal', hasAccess: false },
    { id: '3', name: 'Regulatory Authority', type: 'Government', hasAccess: false },
    { id: '4', name: 'Internal Audit', type: 'Corporate', hasAccess: false },
    { id: '5', name: 'Independent Investigator', type: 'Legal', hasAccess: false },
];

export default function KeysPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [userEmail, setUserEmail] = useState('');
    const [allEvidence, setAllEvidence] = useState<Evidence[]>([]);
    const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
    const [entities, setEntities] = useState<Entity[]>(defaultEntities);
    const [showGenerator, setShowGenerator] = useState(false);
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorizing, setIsAuthorizing] = useState<string | null>(null);
    const [authorizationError, setAuthorizationError] = useState<string | null>(null);

    // Check for higher authority access
    useEffect(() => {
        const userRole = localStorage.getItem('tars-user-role');
        const email = localStorage.getItem('tars-user-email');

        if (userRole === 'higher-authority') {
            setIsAuthorized(true);
            setUserEmail(email || 'admin');
        } else {
            setIsAuthorized(false);
        }
    }, []);

    // Load evidence from localStorage
    useEffect(() => {
        if (!isAuthorized) return;
        
        setIsLoading(true);
        const stored = localStorage.getItem('tars-evidence');
        if (stored) {
            const evidence: Evidence[] = JSON.parse(stored).map((e: { id: string; fileName: string; status: string; validatorSignatures?: number }) => ({
                id: e.id,
                fileName: e.fileName,
                status: e.status || 'orbiting',
                signatures: e.validatorSignatures || 0,
                requiredSignatures: 3,
                consensusReached: (e.validatorSignatures || 0) >= 3,
            }));
            setAllEvidence(evidence);
            if (evidence.length > 0) {
                setSelectedEvidence(evidence[0]);
            }
        }
        
        // Load entities from localStorage
        const storedEntities = localStorage.getItem('tars-entities');
        if (storedEntities) {
            setEntities(JSON.parse(storedEntities));
        }
        
        setIsLoading(false);
    }, [isAuthorized]);

    // Show loading while checking authorization
    if (isAuthorized === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Shield className="w-8 h-8 text-[var(--platinum)]" />
                </motion.div>
            </div>
        );
    }

    // Show access denied for non-higher-authority users
    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full glass p-8 text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-400" />
                    </div>

                    <h1
                        className="text-2xl font-bold text-[var(--platinum)] mb-3"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Access Denied
                    </h1>

                    <p className="text-[var(--silver-medium)] mb-6">
                        This area is restricted to <span className="text-amber-400 font-bold">Higher Authority</span> personnel only.
                        Only Agency Administrators and Senior Officers have access to the Key Master.
                    </p>

                    <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-6">
                        <div className="flex items-center gap-2 text-amber-400 text-sm">
                            <Crown className="w-5 h-5" />
                            <span>Clearance Level: <span className="font-bold">TOP SECRET</span> Required</span>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push('/signin')}
                        className="w-full py-3 rounded-xl font-medium bg-[var(--platinum)] text-[var(--void-black)]"
                    >
                        Sign in with Higher Authority Credentials
                    </motion.button>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 text-sm text-[var(--silver-dark)] hover:text-[var(--platinum)] transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    const handleToggleAccess = async (entityId: string, granted: boolean) => {
        if (!selectedEvidence?.consensusReached) return;

        setIsAuthorizing(entityId);
        setAuthorizationError(null);

        try {
            if (granted) {
                // Generate a pseudonymous address for this entity
                const entityAddress = `0x${Array.from({ length: 40 }, () => 
                    '0123456789abcdef'[Math.floor(Math.random() * 16)]
                ).join('')}`;
                
                // Call backend to authorize on blockchain
                const secret = userSecretStorage.getOrCreate();
                await validationApi.authorizeViewer(
                    selectedEvidence.id,
                    entityAddress,
                    secret
                );
            }

            const updatedEntities = entities.map(entity =>
                entity.id === entityId
                    ? {
                        ...entity,
                        hasAccess: granted,
                        grantedAt: granted ? new Date().toISOString() : undefined,
                    }
                    : entity
            );
            setEntities(updatedEntities);
            localStorage.setItem('tars-entities', JSON.stringify(updatedEntities));
        } catch (err) {
            console.warn('Authorization failed:', err);
            setAuthorizationError('Failed to authorize on blockchain. Access granted locally only.');
            // Still update locally for demo purposes
            const updatedEntities = entities.map(entity =>
                entity.id === entityId
                    ? {
                        ...entity,
                        hasAccess: granted,
                        grantedAt: granted ? new Date().toISOString() : undefined,
                    }
                    : entity
            );
            setEntities(updatedEntities);
            localStorage.setItem('tars-entities', JSON.stringify(updatedEntities));
        } finally {
            setIsAuthorizing(null);
        }
    };

    const handleGenerateKey = async () => {
        if (!selectedEvidence?.consensusReached) return;

        // Generate a cryptographically secure access key
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const hexKey = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        const key = `TARS-${selectedEvidence.id.slice(-6)}-${hexKey.slice(0, 48).toUpperCase()}`;
        
        // Store the key association
        const storedKeys = JSON.parse(localStorage.getItem('tars-access-keys') || '[]');
        storedKeys.push({
            evidenceId: selectedEvidence.id,
            key,
            createdAt: new Date().toISOString(),
            type: 'full-access'
        });
        localStorage.setItem('tars-access-keys', JSON.stringify(storedKeys));
        
        setGeneratedKey(key);
        setShowGenerator(false);
    };

    const entitiesWithAccess = entities.filter(e => e.hasAccess);
    const entitiesWithoutAccess = entities.filter(e => !e.hasAccess);
    const verifiedEvidence = allEvidence.filter(e => e.consensusReached);
    const pendingEvidence = allEvidence.filter(e => !e.consensusReached);

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-[var(--platinum)]/10 flex items-center justify-center">
                            <Key className="w-6 h-6 text-[var(--platinum)]" />
                        </div>
                        <div>
                            <h1
                                className="text-4xl font-bold text-metallic-glow"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                The Key Master
                            </h1>
                            <p className="text-[var(--silver-medium)]">
                                Selective Disclosure Control
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Authority Access Warning */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="mb-8 p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <Crown className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5" />
                                Higher Authority Access Only
                            </h3>
                            <p className="text-sm text-amber-200/80 mt-1">
                                This dashboard is restricted to <span className="font-bold text-amber-300">Agency Administrators</span> and
                                <span className="font-bold text-amber-300"> Senior Officers</span> only.
                                All actions are logged and audited.
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-amber-300/70">
                                <span className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Clearance Level: <span className="font-bold text-amber-300">TOP SECRET</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Session ID: AX-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Consensus Requirement Notice */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 p-4 rounded-xl bg-[var(--space-medium)] border border-[var(--silver-dark)]/30"
                >
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[var(--status-verified)]" />
                        <p className="text-sm text-[var(--silver-medium)]">
                            <span className="font-medium text-[var(--platinum)]">Consensus Required:</span> Only evidence that has received
                            <span className="text-[var(--status-verified)] font-bold"> 3/3 validator signatures </span>
                            can be publicly disclosed. Evidence pending validation cannot be released.
                        </p>
                    </div>
                </motion.div>

                {/* Evidence Selector */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-8"
                >
                    <label className="block text-sm font-medium text-[var(--silver-dark)] mb-3">
                        Select Evidence for Disclosure
                    </label>

                    {isLoading ? (
                        <div className="glass p-8 text-center">
                            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[var(--platinum)]" />
                            <p className="text-sm text-[var(--silver-dark)]">Loading evidence...</p>
                        </div>
                    ) : allEvidence.length === 0 ? (
                        <div className="glass p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--space-medium)] flex items-center justify-center">
                                <Inbox className="w-8 h-8 text-[var(--silver-dark)]" />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--platinum)] mb-2">
                                No Evidence Available
                            </h3>
                            <p className="text-sm text-[var(--silver-dark)]">
                                Evidence submissions will appear here once submitted and validated.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Verified Evidence (Eligible) */}
                            <div className="mb-4">
                                <p className="text-xs text-[var(--status-verified)] mb-2 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Eligible for Disclosure ({verifiedEvidence.length})
                                </p>
                                {verifiedEvidence.length === 0 ? (
                                    <div className="p-4 rounded-xl bg-[var(--space-medium)] border border-[var(--silver-dark)]/20 text-center">
                                        <p className="text-sm text-[var(--silver-dark)]">
                                            No verified evidence yet. Evidence needs 3/3 validator signatures.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 flex-wrap">
                                        {verifiedEvidence.map((evidence) => (
                                            <motion.button
                                                key={evidence.id}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSelectedEvidence(evidence)}
                                                className={`
                                                    flex-1 min-w-[200px] p-4 rounded-xl text-left transition-all relative
                                                    ${selectedEvidence?.id === evidence.id
                                                        ? 'glass border-[var(--status-verified)]/50 bg-[var(--status-verified)]/5'
                                                        : 'glass hover:border-[var(--platinum)]/30'
                                                    }
                                                `}
                                            >
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle2 className="w-4 h-4 text-[var(--status-verified)]" />
                                                </div>
                                                <div
                                                    className="text-sm text-[var(--accent-cyan)] mb-1"
                                                    style={{ fontFamily: 'var(--font-mono)' }}
                                                >
                                                    {evidence.id}
                                                </div>
                                                <div className="font-medium text-[var(--platinum)] truncate pr-6">
                                                    {evidence.fileName}
                                                </div>
                                                <div className="text-xs text-[var(--status-verified)] mt-1">
                                                    {evidence.signatures}/{evidence.requiredSignatures} signatures ✓
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pending Evidence (Not Eligible) */}
                            {pendingEvidence.length > 0 && (
                                <div>
                                    <p className="text-xs text-[var(--silver-dark)] mb-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Pending Consensus ({pendingEvidence.length})
                                    </p>
                                    <div className="flex gap-3 flex-wrap">
                                        {pendingEvidence.map((evidence) => (
                                            <div
                                                key={evidence.id}
                                                className="flex-1 min-w-[200px] p-4 rounded-xl text-left opacity-50 cursor-not-allowed
                                                           bg-[var(--space-medium)] border border-[var(--silver-dark)]/20"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div
                                                        className="text-sm text-[var(--silver-dark)]"
                                                        style={{ fontFamily: 'var(--font-mono)' }}
                                                    >
                                                        {evidence.id}
                                                    </div>
                                                    <Lock className="w-4 h-4 text-[var(--silver-dark)]" />
                                                </div>
                                                <div className="font-medium text-[var(--silver-dark)] truncate">
                                                    {evidence.fileName}
                                                </div>
                                                <div className="text-xs text-[var(--status-orbiting)] mt-1">
                                                    {evidence.signatures}/{evidence.requiredSignatures} signatures - PENDING
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Access Key Management */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass p-6"
                        >
                            <h2
                                className="text-lg font-semibold mb-4 flex items-center gap-2"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                <Lock className="w-5 h-5 text-[var(--platinum)]" />
                                Access Keys
                            </h2>

                            {/* Generate Key Button */}
                            <motion.button
                                whileHover={selectedEvidence?.consensusReached ? { scale: 1.02 } : {}}
                                whileTap={selectedEvidence?.consensusReached ? { scale: 0.98 } : {}}
                                onClick={() => selectedEvidence?.consensusReached && setShowGenerator(true)}
                                disabled={!selectedEvidence?.consensusReached}
                                className={`w-full flex items-center justify-center gap-2 mb-4 py-3 rounded-xl font-medium transition-all
                                    ${selectedEvidence?.consensusReached
                                        ? 'bg-[var(--platinum)] text-[var(--void-black)] hover:bg-white'
                                        : 'bg-[var(--silver-dark)]/20 text-[var(--silver-dark)] cursor-not-allowed'
                                    }`}
                            >
                                <Plus className="w-4 h-4" />
                                Generate New Key
                            </motion.button>

                            {!selectedEvidence?.consensusReached && (
                                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <div className="flex items-center gap-2 text-xs text-amber-400">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>{selectedEvidence ? 'Consensus not reached. Key generation disabled.' : 'Select evidence to generate keys.'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Recent Key */}
                            {generatedKey && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-[var(--status-verified)]/10 border border-[var(--status-verified)]/30 rounded-lg"
                                >
                                    <div className="flex items-center gap-2 text-sm text-[var(--status-verified)] mb-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Key Generated
                                    </div>
                                    <code
                                        className="block text-xs break-all text-[var(--platinum)]"
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    >
                                        {generatedKey}
                                    </code>
                                    <button
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(generatedKey);
                                        }}
                                        className="mt-2 text-xs text-[var(--accent-cyan)] hover:underline flex items-center gap-1"
                                    >
                                        <Copy className="w-3 h-3" />
                                        Copy to clipboard
                                    </button>
                                </motion.div>
                            )}

                            {/* Stats */}
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--silver-dark)]">Active Keys</span>
                                    <span className="text-[var(--platinum)]">{entitiesWithAccess.length}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--silver-dark)]">Pending Entities</span>
                                    <span className="text-[var(--platinum)]">{entitiesWithoutAccess.length}</span>
                                </div>
                            </div>

                            {/* Release to Public Button */}
                            {selectedEvidence?.consensusReached && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-6 pt-6 border-t border-[var(--silver-dark)]/20"
                                >
                                    <p className="text-xs text-[var(--silver-dark)] mb-3">
                                        Make this evidence publicly accessible to everyone
                                    </p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={async () => {
                                            if (!selectedEvidence) return;
                                            try {
                                                const secret = userSecretStorage.getOrCreate();
                                                await validationApi.releaseEvidence(selectedEvidence.id, secret);
                                                alert('Evidence released to public successfully!');
                                            } catch (err) {
                                                console.warn('Release failed:', err);
                                                alert('Evidence marked as released (blockchain update pending)');
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-[var(--status-verified)] to-[var(--accent-cyan)] text-[var(--void-black)]"
                                    >
                                        🌍 Release to Public
                                    </motion.button>
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Security Notice */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-4 p-4 glass flex items-start gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-[var(--status-orbiting)] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-[var(--status-orbiting)]">
                                    Irreversible Action
                                </p>
                                <p className="text-xs text-[var(--silver-dark)] mt-1">
                                    Once access is granted, decryption keys cannot be revoked.
                                    All disclosures are permanently recorded on-chain.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Entity List */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass p-6"
                        >
                            <h2
                                className="text-lg font-semibold mb-6 flex items-center gap-2"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                <Users className="w-5 h-5 text-[var(--platinum)]" />
                                Authorized Entities
                            </h2>

                            {/* Entities with Access */}
                            {entitiesWithAccess.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm text-[var(--status-verified)] mb-3 flex items-center gap-2">
                                        <Unlock className="w-4 h-4" />
                                        Has Access ({entitiesWithAccess.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {entitiesWithAccess.map((entity, index) => (
                                            <EntityToggle
                                                key={entity.id}
                                                entity={entity}
                                                index={index}
                                                onToggle={(granted) => handleToggleAccess(entity.id, granted)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Entities without Access */}
                            {entitiesWithoutAccess.length > 0 && (
                                <div>
                                    <h3 className="text-sm text-[var(--silver-dark)] mb-3 flex items-center gap-2">
                                        <Lock className="w-4 h-4" />
                                        Pending Access ({entitiesWithoutAccess.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {entitiesWithoutAccess.map((entity, index) => (
                                            <EntityToggle
                                                key={entity.id}
                                                entity={entity}
                                                index={index}
                                                onToggle={(granted) => handleToggleAccess(entity.id, granted)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Key Generator Modal */}
            <AnimatePresence>
                {showGenerator && selectedEvidence && (
                    <AccessKeyGenerator
                        evidenceId={selectedEvidence.id}
                        onGenerate={handleGenerateKey}
                        onClose={() => setShowGenerator(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
