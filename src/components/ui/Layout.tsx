import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Capacitor } from '@capacitor/core';

export const ThemeStatusBarSync = () => {
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const updateNativeBars = async () => {
                const isDark = resolvedTheme === 'dark';

                // Use your specific theme colors here
                const bgColor = isDark ? '#09090b' : '#ffffff'; // Example Shadcn colors

                try {
                    // 1. Handle Status Bar (Top)
                    await StatusBar.setStyle({
                        style: isDark ? Style.Dark : Style.Light,
                    });
                    await StatusBar.setBackgroundColor({ color: bgColor });

                    // 2. Handle Navigation Bar (Bottom)
                    await (NavigationBar as any).setStatusBarColor?.({ color: bgColor });
                    await (NavigationBar as any).setBackgroundColor?.({ color: bgColor });
                    await (NavigationBar as any).setButtonsColor?.({ dark: !isDark });

                } catch (e) {
                    console.error("Native UI bars not supported yet", e);
                }
            };

            updateNativeBars();
        }
    }, [resolvedTheme]);

    return null;
};