'use client';

import { useState, useEffect } from 'react';
import VideoIntro from '@/components/landing/VideoIntro';
import HeroSection from '@/components/landing/HeroSection';
import MissionBriefing from '@/components/landing/MissionBriefing';
import { motion } from 'framer-motion';

export default function Home() {
  const [showIntro, setShowIntro] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if intro was already shown in this session
    const introShown = sessionStorage.getItem('tars-intro-shown');

    // Only show intro on the very first visit of the session
    // Do NOT show on: page reload, back navigation, or any subsequent visits
    if (!introShown) {
      setShowIntro(true);
    } else {
      // Skip intro, show content directly
      setShowIntro(false);
      setContentReady(true);
    }
    setIsLoading(false);
  }, []);

  const handleIntroComplete = () => {
    // Mark intro as shown for this session - won't show again until browser is closed
    sessionStorage.setItem('tars-intro-shown', 'true');
    setShowIntro(false);
    setTimeout(() => setContentReady(true), 100);
  };

  // Don't render anything until we determine whether to show intro
  if (isLoading) {
    return <div className="min-h-screen bg-[var(--void-black)]" />;
  }

  return (
    <>
      {/* Video Intro - plays only on first visit of session */}
      {showIntro && (
        <VideoIntro
          videoSrc="/intro-video.mp4"
          onComplete={handleIntroComplete}
          skipText="Enter TARS"
        />
      )}

      {/* Main Landing Content - shows after video or immediately if returning */}
      {!showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: contentReady ? 1 : 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <HeroSection />
          <MissionBriefing />
        </motion.div>
      )}
    </>
  );
}
