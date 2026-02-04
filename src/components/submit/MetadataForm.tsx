'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, FileText, Send } from 'lucide-react';

interface MetadataFormProps {
    onSubmit: (data: { tags: string; description: string }) => void;
    initialData: { tags: string; description: string };
}

const suggestedTags = [
    'Financial Fraud',
    'Environmental Violation',
    'Corruption',
    'Safety Hazard',
    'Data Breach',
    'Whistleblower',
];

export default function MetadataForm({ onSubmit, initialData }: MetadataFormProps) {
    const [tags, setTags] = useState(initialData.tags);
    const [description, setDescription] = useState(initialData.description);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ tags, description });
    };

    const addTag = (tag: string) => {
        const currentTags = tags.split(',').map(t => t.trim()).filter(Boolean);
        if (!currentTags.includes(tag)) {
            setTags(currentTags.length ? `${tags}, ${tag}` : tag);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-8">
                <h2
                    className="text-2xl font-semibold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    Step 2: Metadata
                </h2>
                <p className="text-[var(--cosmic-gray)] text-sm">
                    Add context to help classify and verify your evidence
                </p>
            </div>

            {/* Case Tags */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--starlight)]">
                    <Tag className="w-4 h-4 text-[var(--pulse-blue)]" />
                    Case Tags
                </label>

                <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Enter tags separated by commas..."
                    className="input"
                />

                {/* Suggested Tags */}
                <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag) => (
                        <motion.button
                            key={tag}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addTag(tag)}
                            className="px-3 py-1.5 text-xs rounded-full bg-[var(--nebula-light)] text-[var(--cosmic-gray)] hover:text-[var(--pulse-blue)] hover:bg-[var(--pulse-blue)]/10 border border-transparent hover:border-[var(--pulse-blue)]/30 transition-all"
                            style={{ fontFamily: 'var(--font-mono)' }}
                        >
                            + {tag}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Evidence Description */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--starlight)]">
                    <FileText className="w-4 h-4 text-[var(--pulse-blue)]" />
                    Evidence Description
                </label>

                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this evidence shows and its significance..."
                    className="input min-h-[150px]"
                    required
                />

                <p className="text-xs text-[var(--cosmic-gray)]">
                    Be descriptive but avoid including personally identifiable information
                </p>
            </div>

            {/* Character Count */}
            <div className="flex justify-between text-xs text-[var(--cosmic-gray)]">
                <span>Description: {description.length} characters</span>
                <span>Tags: {tags.split(',').filter(t => t.trim()).length}</span>
            </div>

            {/* Submit Button */}
            <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!description.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send className="w-5 h-5" />
                Submit to Orbit
            </motion.button>

            {/* Security Notice */}
            <p className="text-center text-xs text-[var(--cosmic-gray)]">
                Your metadata is encrypted alongside your evidence
            </p>
        </form>
    );
}
