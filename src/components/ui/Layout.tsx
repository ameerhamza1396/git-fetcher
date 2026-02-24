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
                    await NavigationBar.setStatusBarColor({ color: bgColor }); // Some versions use this method

                    // To change the color of the navigation bar background:
                    await NavigationBar.setBackgroundColor({ color: bgColor });

                    // This makes the navigation buttons (Back, Home) dark or light
                    await NavigationBar.setButtonsColor({ dark: !isDark });

                } catch (e) {
                    console.error("Native UI bars not supported yet", e);
                }
            };

            updateNativeBars();
        }
    }, [resolvedTheme]);

    return null;
};