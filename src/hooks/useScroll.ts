import { useEffect, useState, useRef, useCallback } from 'react';

export const useScroll = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const tickingRef = useRef(false);

    const handleScroll = useCallback(() => {
        const currentScrollY = window.scrollY;

        if (!tickingRef.current) {
            window.requestAnimationFrame(() => {
                // Check if scrolled
                if (currentScrollY > 20) {
                    setIsScrolled(true);

                    // Show/hide based on direction
                    if (currentScrollY > lastScrollY && currentScrollY > 100) {
                        setIsVisible(false);
                    } else if (currentScrollY < lastScrollY) {
                        setIsVisible(true);
                    }
                } else {
                    setIsScrolled(false);
                    setIsVisible(true);
                }

                setLastScrollY(currentScrollY);
                tickingRef.current = false;
            });

            tickingRef.current = true;
        }
    }, [lastScrollY]);

    useEffect(() => {
        // Add scroll listener
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Initial check
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [handleScroll]);

    return { isScrolled, isVisible };
};