import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";

export default function BackButtonHandler() {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // App.addListener returns a Promise<PluginListenerHandle>, keep the promise and remove the listener after it resolves
        const listenerPromise = App.addListener("backButton", ({ canGoBack }) => {
            // EXEMPT DASHBOARD FROM OVERRIDE
            if (location.pathname === "/dashboard") {
                return;
            }

            // If page can go back → go back
            if (canGoBack) {
                navigate(-1);
            } else {
                // Optional fall-back: go to dashboard instead of closing
                navigate("/dashboard");
            }
        });

        return () => {
            // Ensure the listener is removed once the promise resolves
            listenerPromise.then((listener) => {
                listener.remove();
            }).catch(() => {
                // ignore errors during cleanup
            });
        };
    }, [location.pathname, navigate]);

    return null;
}