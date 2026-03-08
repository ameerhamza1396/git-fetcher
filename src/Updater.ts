// @ts-nocheck
import { CapacitorUpdater } from "@capgo/capacitor-updater";

export const runOTAUpdate = async (manifest, setUI) => {
    setUI({
        visible: true,
        progress: 0,
        size: manifest.size_mb,
        title: manifest.title,
        message: manifest.message,
        features: manifest.features || [],
        critical: !!manifest.critical,
        status: "downloading",
        error: null
    });

    try {
        const downloaded = await CapacitorUpdater.download(
            {
                url: manifest.url,
                version: manifest.version
            },
            progress => {
                setUI(prev => ({
                    ...prev,
                    progress: Math.round(progress * 100),
                    status: "downloading"
                }));
            }
        );

        setUI(prev => ({
            ...prev,
            status: "installing"
        }));

        await CapacitorUpdater.set(downloaded);

        // Reload into the freshly installed bundle
        await CapacitorUpdater.reload();
    } catch (err) {
        console.error("OTA update failed:", err);
        setUI(prev => ({
            ...prev,
            status: "error",
            error: "Update failed. We’ll try again next time you open the app."
        }));

        // Auto-hide non‑critical failures so the user can keep using the app
        if (!manifest.critical) {
            setTimeout(() => {
                setUI(prev => ({
                    ...prev,
                    visible: false
                }));
            }, 2500);
        }
    }
};
