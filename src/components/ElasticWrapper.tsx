import React, { useRef, useState, useEffect } from 'react';

interface ElasticWrapperProps {
    children: React.ReactNode;
    onRefresh?: () => void;
}

export const ElasticWrapper = ({ children, onRefresh }: ElasticWrapperProps) => {
    const [pull, setPull] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isAtTop = useRef(true);

    const REFRESH_THRESHOLD = 140;

    // MATCHING YOUR EXACT PADDING LOGIC
    const headerOffset = "calc(45px + env(safe-area-inset-top))";

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            startY.current = e.touches[0].pageY;
            isAtTop.current = el.scrollTop <= 0;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isRefreshing) return;
            const currentY = e.touches[0].pageY;
            const diff = currentY - startY.current;

            if (isAtTop.current && diff > 0) {
                const resistance = Math.pow(diff, 0.72) * 2.5;
                setPull(resistance);
                if (e.cancelable) e.preventDefault();
            }
        };

        const handleTouchEnd = () => {
            if (pull >= REFRESH_THRESHOLD) {
                setIsRefreshing(true);
                setPull(90);
                if (onRefresh) {
                    onRefresh();
                } else {
                    setTimeout(() => window.location.reload(), 800);
                }
            } else {
                setPull(0);
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pull, isRefreshing, onRefresh]);

    return (
        <div className="relative h-screen w-full overflow-hidden bg-transparent">

            {/* 1. REFRESH ICON
                - 'top' now matches your header offset exactly.
                - It starts hidden (-80px) and slides down as you pull.
            */}
            <div
                className="fixed left-0 right-0 flex flex-col items-center justify-center pointer-events-none"
                style={{
                    zIndex: 5,
                    top: headerOffset,
                    transform: `translateY(${pull - 80}px)`,
                    opacity: Math.min(pull / 50, 1),
                }}
            >
                <img
                    src="lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                    alt="refresh"
                    className={`w-10 h-10 object-contain transition-transform duration-100 ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{
                        transform: `rotate(${pull * 2}deg) scale(${Math.min(0.6 + pull / 250, 1.1)})`,
                    }}
                />
                <p className="text-[9px] font-bold text-purple-500/80 mt-1 tracking-[0.3em] uppercase">
                    {pull >= REFRESH_THRESHOLD ? "Release" : "Pull"}
                </p>
            </div>

            {/* 2. MAIN APP CONTENT CONTAINER */}
            <div
                ref={containerRef}
                className="relative z-10 h-full w-full overflow-y-auto bg-transparent transition-transform duration-300 ease-out"
                style={{ transform: `translateY(${pull}px)` }}
            >
                <div
                    className="min-h-screen w-full bg-white dark:bg-gray-900 pb-[env(safe-area-inset-bottom)]"
                    style={{ paddingTop: headerOffset }} // APPLYING THE OFFSET HERE TOO
                >
                    {children}
                </div>
            </div>
        </div>
    );
};