import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Typewriter } from "react-simple-typewriter";

const validYears = ["1st", "2nd", "3rd", "4th", "5th"];

export default function SelectYear() {
    // Component State
    const [year, setYear] = useState<string | null>(null);
    const [loading, setLoading] = useState(false); // Used for the Save button operation
    const [profileLoading, setProfileLoading] = useState(true); // Added for initial profile fetch
    const [message, setMessage] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    const navigate = useNavigate();
    // Profile state with more specific type
    const [profile, setProfile] = useState<{ id: string; year?: string } | null>(null);

    const shortYearMap: Record<string, string> = {
        "1st Year MBBS": "1st",
        "2nd Year MBBS": "2nd",
        "3rd Year MBBS": "3rd",
        "4th Year MBBS": "4th",
        "Final Year MBBS": "5th",
    };

    /**
     * Effect to fetch the user profile and check for existing year.
     * Handles initial loading and redirection.
     */
    useEffect(() => {
        const fetchProfile = async () => {
            setProfileLoading(true); // Start loading

            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                setProfile(null);
                setProfileLoading(false);
                // If no user, the outer routing should handle redirect to login, but for safety:
                // navigate("/login"); 
                return;
            }

            const { data, error: profileError } = await supabase
                .from("profiles")
                .select("id, year, username, full_name")
                .eq("id", user.id)
                .single();

            if (profileError || !data) {
                setProfile(null);
            } else {
                setProfile({ id: data.id, year: data.year });
                // If a valid year is already set, redirect immediately
                if (data.year && validYears.includes(data.year)) {
                    navigate("/dashboard");
                    return; // Prevent further rendering of the selection card
                }
            }

            setProfileLoading(false); // End loading
        };

        fetchProfile();
        // Added necessary dependencies and removed the potentially problematic 'navigate' from dependency array
    }, [navigate]);

    // --- Conditional Loading Screen ---
    // The previous implementation used undefined variables like isNavigating, authLoading, userStatsLoading.
    // I am replacing it with the newly defined 'profileLoading' state.
    if (profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <img
                    src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                    alt="Loading Medmacs"
                    className="w-32 h-32 object-contain"
                />
            </div>
        );
    }
    // Note: The redirection for already having a valid year is now handled inside useEffect.

    /**
     * Handles the saving of the selected year to the user's profile.
     */
    const handleSave = async () => {
        if (!year) {
            setMessage("Please select a year first.");
            return;
        }
        setLoading(true);
        setMessage("");

        const shortYear = shortYearMap[year];
        if (!shortYear) {
            setMessage("Invalid year selection.");
            setLoading(false);
            return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            setMessage("Could not fetch user.");
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from("profiles")
            // Use the shortened year value
            .update({ year: shortYear })
            .eq("id", user.id);

        if (error) {
            setMessage("Error updating year: " + error.message);
            setLoading(false);
            return;
        }

        // Success sequence
        setFadeOut(true);

        setTimeout(() => {
            setConfirmed(true);
            setFadeOut(false);
            setLoading(false);
        }, 600);
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden" style={{ backgroundColor: "hsl(222, 84%, 4.9%)" }}>
            {/* Spiral Gradient Background */}
            <div className="absolute inset-0 bg-gradient-spiral animate-gradient-spiral" />

            <div className="relative z-10 w-full flex flex-col items-center px-4">
                <h1 style={{ color: "hsl(210, 40%, 98%)" }} className="text-2xl md:text-5xl font-extrabold mb-10 text-center drop-shadow-lg leading-snug">
                    <Typewriter
                        words={["Before we start, we need to know your year of study"]}
                        typeSpeed={50}
                        deleteSpeed={0}
                        delaySpeed={1000}
                        cursor
                        cursorStyle="|"
                    />
                </h1>

                <Card className="w-full max-w-lg shadow-2xl rounded-3xl p-4" style={{ backgroundColor: "hsl(0, 0%, 100%)" }}>
                    <CardHeader>
                        <CardTitle style={{ color: "hsl(222,84%,4.9%)" }} className="text-xl md:text-2xl font-semibold text-center">
                            {!confirmed ? "Select Your Year" : ""}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative space-y-6">
                        {!confirmed && (
                            <div className={`${fadeOut ? "animate-fade-out opacity-0" : "animate-fade-in"} flex flex-col gap-6`}>
                                <Select onValueChange={setYear}>
                                    <SelectTrigger
                                        className="text-lg py-4"
                                        style={{ color: "hsl(222,84%,4.9%)", backgroundColor: "hsl(0,0%,100%)" }}
                                    >
                                        <SelectValue placeholder="Choose Year" />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: "hsl(0,0%,100%)", color: "hsl(222,84%,4.9%)" }}>
                                        {["1st Year MBBS", "2nd Year MBBS", "3rd Year MBBS", "4th Year MBBS", "Final Year MBBS"].map((item) => (
                                            <SelectItem
                                                key={item}
                                                value={item}
                                                style={{ color: "hsl(222,84%,4.9%)", backgroundColor: "hsl(0,0%,100%)" }}
                                                onMouseEnter={(e) =>
                                                    Object.assign(e.currentTarget.style, {
                                                        backgroundColor: "hsl(210,50%,90%)",
                                                        color: "hsl(222,84%,4.9%)",
                                                    })
                                                }
                                                onMouseLeave={(e) =>
                                                    Object.assign(e.currentTarget.style, {
                                                        backgroundColor: "hsl(0,0%,100%)",
                                                        color: "hsl(222,84%,4.9%)",
                                                    })
                                                }
                                            >
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    className="w-full text-lg py-4 rounded-xl"
                                    style={{ color: "hsl(210, 40%, 98%)", backgroundColor: "hsl(222,47%,11%)" }}
                                    onClick={handleSave}
                                    disabled={loading || !year} // Disable button if loading or no year selected
                                >
                                    {loading ? "Saving..." : "Save Year"}
                                </Button>

                                {message && (
                                    <p style={{ color: "hsl(222,84%,4.9%)" }} className="text-center text-base mt-2 font-medium">
                                        {message}
                                    </p>
                                )}
                            </div>
                        )}

                        {confirmed && (
                            <div className="animate-fade-in text-center space-y-6">
                                <h2 style={{ color: "hsl(222,84%,4.9%)" }} className="text-2xl md:text-3xl font-bold">
                                    Your year has been updated!
                                </h2>
                                <Button
                                    className="mt-4 w-full text-lg py-4 rounded-xl"
                                    style={{ color: "hsl(210, 40%, 98%)", backgroundColor: "hsl(222,47%,11%)" }}
                                    onClick={() => navigate("/dashboard")}
                                >
                                    Go to Dashboard
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}