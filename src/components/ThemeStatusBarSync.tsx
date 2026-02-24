import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Capacitor } from '@capacitor/core';

export const ThemeStatusBarSync = () => {
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
            const updateNativeBars = async () => {
                const isDark = resolvedTheme === 'dark';

                // Ensure these HEX colors match your Tailwind/CSS background exactly
                const bgColor = isDark ? '#09090b' : '#ffffff';

                try {
                    // 1. Update Top Bar (Status Bar)
                    // Style.Dark = White Icons | Style.Light = Dark Icons
                    await StatusBar.setStyle({
                        style: isDark ? Style.Dark : Style.Light,
                    });
                    await StatusBar.setBackgroundColor({ color: bgColor });

                    // 2. Update Bottom Bar (Navigation Bar)
                    // We use 'set' because that is the correct method for @capgo
                    await (NavigationBar as any).set({
                        color: bgColor,
                        darkButtons: !isDark
                    });

                } catch (e) {
                    console.warn("Native bars update failed. Check if plugin is synced.", e);
                }
            };

            updateNativeBars();
        }
    }, [resolvedTheme]);

    return null;
};