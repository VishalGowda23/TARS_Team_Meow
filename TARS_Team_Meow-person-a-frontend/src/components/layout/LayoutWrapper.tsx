'use client';

import { usePathname } from 'next/navigation';
import NavigationOrbit from './NavigationOrbit';
import Starfield from './Starfield';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicPage = pathname === '/' || pathname === '/signin';

    return (
        <>
            {/* Background Effects */}
            <Starfield />

            {/* Navigation - Only show on authenticated pages */}
            {!isPublicPage && <NavigationOrbit />}

            {/* Main Content */}
            <main className={`relative z-10 min-h-screen ${!isPublicPage ? 'ml-64' : ''}`}>
                {children}
            </main>
        </>
    );
}
