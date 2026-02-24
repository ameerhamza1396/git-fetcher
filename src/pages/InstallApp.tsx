import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import drHamzaAvatar from "/images/drhamzaavatar.png";
import logo from "/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png";
import playStore from "/images/play-store.png";
import appStore from "/images/app-store.png";

const InstallApp: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        window.addEventListener("appinstalled", () => {
            navigate("/");
        });

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, [navigate]);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === "accepted") navigate("/");
                setDeferredPrompt(null);
            });
        } else {
            alert(
                "For iOS: Tap 'Share' → 'Add to Home Screen'.\n" +
                "For Desktop: Use the browser's install option."
            );
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Floating animated blobs */}
            <div className="absolute w-80 h-80 bg-pink-400 rounded-full opacity-30 blur-3xl animate-blob top-10 left-10"></div>
            <div className="absolute w-96 h-96 bg-teal-400 rounded-full opacity-20 blur-3xl animate-blob animation-delay-2000 top-64 right-0"></div>
            <div className="absolute w-72 h-72 bg-yellow-400 rounded-full opacity-25 blur-3xl animate-blob animation-delay-4000 bottom-20 left-24"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between w-full max-w-7xl p-8 gap-14">
                {/* Left Column */}
                <div className="flex flex-col items-start text-left space-y-6">
                    <img src={logo} alt="Medmacs Logo" className="w-32 md:w-44 mb-4 drop-shadow-2xl" />

                    <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-lg">
                        <span className="bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-text-shimmer">
                            Install Medmacs
                        </span>
                    </h1>

                    <p className="text-white/90 text-lg md:text-xl max-w-lg leading-relaxed drop-shadow-sm">
                        Experience Pakistan’s most advanced AI-powered Medical prep platform
                        as a lightweight, zero-KB application. Install on your device for
                        quick access and offline-friendly performance.
                    </p>

                    <button
                        onClick={handleInstallClick}
                        className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white font-semibold px-10 py-4 rounded-2xl shadow-xl hover:scale-105 hover:shadow-cyan-400/50 transition-transform duration-300"
                    >
                        🚀 Install Application
                    </button>


                    {/* Coming Soon Banners */}
                    <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2 bg-white/20 px-5 py-3 rounded-xl backdrop-blur-md hover:bg-white/30 transition shadow-lg">
                            <img src={playStore} alt="Play Store" className="w-8 h-8" />
                            <span className="text-white font-medium">Coming Soon</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/20 px-5 py-3 rounded-xl backdrop-blur-md hover:bg-white/30 transition shadow-lg">
                            <img src={appStore} alt="App Store" className="w-8 h-8" />
                            <span className="text-white font-medium">Coming Soon</span>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex-shrink-0 relative">
                    <img
                        src={drHamzaAvatar}
                        alt="Dr Hamza Avatar"
                        className="h-[500px] md:h-[600px] object-contain rounded-3xl shadow-3xl animate-float"
                    />
                </div>
            </div>

            {/* Keyframe Animations */}
            <style>
                {`
          @keyframes blob {
            0%, 100% { transform: translate(0,0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob {
            animation: blob 18s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          @keyframes text-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .animate-text-shimmer {
            background-size: 200% auto;
            animation: text-shimmer 6s linear infinite;
          }
        `}
            </style>
        </div>
    );
};

export default InstallApp;
