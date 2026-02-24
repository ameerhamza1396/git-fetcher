// src/components/IndexHeader.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileNav from "./MobileNav";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sun, Moon } from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

type PricingPlan = {
    id: string;
    display_name: string;
    price: number;
    currency: string;
    billing_cycle: string;
};

const IndexHeader: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [pricing, setPricing] = useState<PricingPlan[]>([]);

    useEffect(() => {
        async function loadPricing() {
            const { data, error } = await supabase
                .from<PricingPlan>("pricing_plans")
                .select("id,display_name,price,currency,billing_cycle")
                .eq("currency", "PKR")
                .eq("billing_cycle", "monthly")
                .order("order", { ascending: true })
                .limit(3);

            if (!error && data) setPricing(data);
        }
        loadPricing();
    }, []);

    const PopoverWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div
            className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[32rem]
        rounded-2xl shadow-xl p-6 z-50 transition-all
        ${theme === "dark"
                    ? "bg-indigo-900 text-white border border-indigo-700"
                    : "bg-pink-50 text-gray-900 border border-pink-200"
                }`}
        >
            {children}
        </div>
    );

    return (
        <header className="bg-transparent backdrop-blur-md border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
            <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                <Link to="/" className="flex items-center space-x-3 group">
                    <img
                        src="/lovable-uploads/161d7edb-aa7b-4383-a8e2-75b6685fc44f.png"
                        alt="Medistics Logo"
                        className="w-9 h-9 object-contain group-hover:scale-110 transition-all duration-300 group-hover:rotate-12"
                    />
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Medmacs.App
                    </span>
                </Link>

                <nav className="hidden md:flex items-center space-x-8 relative font-bold">
                    {/* Social Media */}
                    <div className="relative group">
                        <button className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-pink-400 transition-colors">
                            Our Social Media
                        </button>
                        <div className="hidden group-hover:block">
                            <PopoverWrapper>
                                <h4 className="font-semibold mb-4 text-lg">Connect with us</h4>
                                <ul className="space-y-4 text-base">
                                    <li>
                                        <a
                                            href="https://facebook.com/medisticsapp"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center space-x-3 hover:text-[#1877F2]"
                                        >
                                            <FaFacebookF className="w-5 h-5" /> <span>Facebook</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://instagram.com/medistics.app"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center space-x-3 hover:text-[#E1306C]"
                                        >
                                            <FaInstagram className="w-5 h-5" /> <span>Instagram</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://linkedin.com/in/medisticsapp"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center space-x-3 hover:text-[#0077B5]"
                                        >
                                            <FaLinkedinIn className="w-5 h-5" /> <span>LinkedIn</span>
                                        </a>
                                    </li>
                                    <li className="border-t border-current/30"></li>
                                    <li>
                                        <a
                                            href="https://wa.me/03392456162"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center space-x-3 hover:text-[#25D366]"
                                        >
                                            <FaWhatsapp className="w-5 h-5" /> <span>WhatsApp: 0339-2456162</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="mailto:contact@medmacs.app"
                                            className="flex items-center space-x-3 hover:opacity-80"
                                        >
                                            <span>📧 contact@medmacs.app</span>
                                        </a>
                                    </li>
                                </ul>
                            </PopoverWrapper>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="relative group">
                        <button className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-pink-400 transition-colors">
                            Pricing
                        </button>
                        <div className="hidden group-hover:block">
                            <PopoverWrapper>
                                <h4 className="font-semibold mb-4 text-lg">Monthly Plans (PKR)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {pricing.length === 0 && <div>No plans available.</div>}
                                    {pricing.map((p) => (
                                        <div
                                            key={p.id}
                                            className="p-4 rounded-xl border border-current/30 shadow-md hover:shadow-lg transition"
                                        >
                                            <div className="font-semibold">{p.display_name}</div>
                                            <div className="font-bold text-lg">PKR {p.price}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 text-right">
                                    <Button
                                        size="sm"
                                        onClick={() => navigate("/pricing")}
                                        className="bg-purple-600 text-white hover:scale-105 rounded-full"
                                    >
                                        View All
                                    </Button>
                                </div>
                            </PopoverWrapper>
                        </div>
                    </div>

                    {/* Our Team */}
                    <div className="relative group">
                        <button className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-pink-400 transition-colors">
                            Our Team
                        </button>
                        <div className="hidden group-hover:block">
                            <PopoverWrapper>
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="font-bold text-lg">Dr Muhammad Ameer Hamza</div>
                                        <div className="text-sm">Founder</div>
                                    </div>
                                    <img
                                        src="/team/founders/hamza.png"
                                        alt="Dr Muhammad Ameer Hamza"
                                        className="w-24 h-24 rounded-full border-2 border-current/50 shadow-lg"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-current/30 pt-4">
                                    <div className="p-3 rounded-xl border border-current/30 shadow-sm">
                                        Saba Yaqoob – Academic Head
                                    </div>
                                    <div className="p-3 rounded-xl border border-current/30 shadow-sm">
                                        Junaid Imran – Head of Marketing
                                    </div>
                                </div>
                                <div className="mt-4 text-right">
                                    <Link to="/teams">
                                        <Button
                                            size="sm"
                                            className="bg-purple-600 text-white hover:scale-105 rounded-full"
                                        >
                                            View Complete Team
                                        </Button>
                                    </Link>
                                </div>
                            </PopoverWrapper>
                        </div>
                    </div>

                    {/* Our Application */}
                    <div className="relative group">
                        <button className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-pink-400 transition-colors">
                            Our Application
                        </button>
                        <div className="hidden group-hover:block">
                            <PopoverWrapper>
                                <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 animate-gradient-x text-white shadow-lg">
                                    <div className="font-bold text-xl">0KB Application</div>
                                    <div className="text-sm opacity-90">Install lightweight version now</div>
                                    <Link to="/install-app">
                                        <Button className="mt-3 w-full bg-white text-purple-600 hover:scale-105 rounded-full">
                                            Install
                                        </Button>
                                    </Link>
                                </div>
                                <ul className="space-y-3 text-base border-t border-current/30 pt-3">
                                    <li className="flex items-center space-x-2 opacity-70">
                                        <img src="/images/play-store.png" alt="Play Store" className="w-5 h-5" />
                                        <span>Coming Soon</span>
                                    </li>
                                    <li className="flex items-center space-x-2 opacity-70">
                                        <img src="/images/app-store.png" alt="App Store" className="w-5 h-5" />
                                        <span>Coming Soon</span>
                                    </li>
                                </ul>
                            </PopoverWrapper>
                        </div>
                    </div>
                </nav>

                <div className="flex items-center space-x-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="hidden md:flex w-10 h-10 p-0 hover:scale-110 rounded-full"
                    >
                        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                    <div className="hidden md:flex items-center space-x-3">
                        <Link to="/login">
                            <Button variant="ghost" className="hover:scale-105 rounded-full">
                                Login
                            </Button>
                        </Link>
                        <Link to="/signup">
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 hover:shadow-lg rounded-full">
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <MobileNav />
                </div>
            </div>
        </header>
    );
};

export default IndexHeader;
