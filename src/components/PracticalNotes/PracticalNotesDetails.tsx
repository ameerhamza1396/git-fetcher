import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Menu, X, Moon, Sun, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

// --- START: Mock Theme Hook (Replace with your actual theme context/hook) ---
const useTheme = () => {
    const [theme, setTheme] = useState("light"); // 'light' or 'dark'

    useEffect(() => {
        // Apply theme class to HTML element
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(currentTheme => currentTheme === 'light' ? 'dark' : 'light');
    };

    return { theme, toggleTheme };
};
// --- END: Mock Theme Hook ---

// Helper function for the logo path
const logoPath = "/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png";

// Define the Content type for better clarity
type PracticalContent = {
    id: number;
    title: string;
    content_html: string;
    component_slug: string;
};

export default function SubjectPracticalDetails() {
    const { id } = useParams();
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [fullScreenContent, setFullScreenContent] = useState<PracticalContent | null>(null);
    const { theme, toggleTheme } = useTheme();

    // --- HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL ---

    // Fetch Subject Details
    const { data: subject, isLoading: subjectLoading } = useQuery({
        queryKey: ["practicalSubject", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("practical_subjects")
                .select("id, name, practical_components")
                .eq("id", id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    // Fetch all practical notes content for the subject
    const { data: contentList, isLoading: contentLoading } = useQuery<PracticalContent[]>({
        queryKey: ["practicalNotesContent", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("practical_notes_content")
                .select("id, title, content_html, component_slug")
                .eq("practical_subject_id", id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!id,
    });

    // Determine components array from subject data (must be done before the useEffect)
    let components: any[] = [];
    try {
        components = Array.isArray(subject?.practical_components)
            ? subject.practical_components
            : JSON.parse(subject?.practical_components || "[]");
    } catch {
        components = [];
    }

    // EFFECT: Set the first component as selected by default.
    useEffect(() => {
        if (!selectedComponent && components.length > 0) {
            setSelectedComponent(components[0].slug);
        }
    }, [components, selectedComponent]);

    // --- END HOOKS ---

    // --- START CONDITIONAL RENDERS (EARLY RETURNS) ---

    if (subjectLoading)
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="animate-spin text-purple-600 dark:text-purple-400 h-8 w-8" />
            </div>
        );

    if (!subject)
        return (
            <p className="text-center mt-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 min-h-screen">
                Subject not found or not available.
            </p>
        );

    // --- END CONDITIONAL RENDERS ---

    // --- COMPONENT LOGIC (CALCULATIONS) ---

    const filteredContents = selectedComponent
        ? contentList?.filter((c) => c.component_slug === selectedComponent)
        : [];

    // Handler to close sidebar and set the selected component
    const handleComponentSelect = (slug: string) => {
        setSelectedComponent(slug);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
        setFullScreenContent(null); // Clear full screen view
    };

    // Handler to open content in full screen
    const handleContentClick = (content: PracticalContent) => {
        setFullScreenContent(content);
    };

    // --- Main Render ---

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* 1. Main App Header */}
            <header className="sticky top-0 z-20 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm">
                <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Left: Back Link & Branding */}
                    <div className="flex items-center space-x-4">
                        <Link to="/practical-notes" className="text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors hidden sm:flex">
                            <Button variant="ghost" size="icon" aria-label="Back to subjects">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/practical-notes" className="flex items-center space-x-2">
                            <img src={logoPath} alt="Medmacs.app Logo" className="h-8 w-auto" />
                            <span className="text-xl font-bold text-purple-700 dark:text-purple-400 hidden sm:inline">
                                Medmacs.app
                            </span>
                        </Link>
                    </div>

                    {/* Right: Controls (Theme Toggle & Menu Button) */}
                    <div className="flex items-center space-x-3">
                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        </Button>

                        {/* Hamburger Menu for Mobile */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-gray-600 dark:text-gray-400"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            aria-label="Toggle component menu"
                        >
                            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* 2. Main Content Area: Sidebar and Details */}
            <main className="flex-1 max-w-7xl mx-auto w-full flex relative px-4 sm:px-6 lg:px-8 py-6 gap-8">

                {/* 2.1. Sidebar/Drawer for Component Selection */}
                <div className={clsx(
                    "fixed md:sticky top-0 left-0 h-full w-full md:w-64 md:h-auto md:top-20 z-30 transition-all duration-300",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}>
                    {/* Overlay for mobile */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden z-30"
                            onClick={() => setIsSidebarOpen(false)}
                            aria-hidden="true"
                        />
                    )}

                    {/* Sidebar Content - Scrollable list of components */}
                    <div className="relative h-full w-64 bg-white dark:bg-gray-900 md:bg-purple-50 md:dark:bg-gray-800 p-4 shadow-xl md:shadow-sm rounded-r-2xl md:rounded-2xl z-40 overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-4 text-purple-700 dark:text-purple-300 border-b pb-2 border-purple-200 dark:border-gray-700">
                            Subject Components
                        </h2>
                        <div className="flex flex-col gap-2">
                            {components.map((comp) => (
                                <Button
                                    key={comp.slug}
                                    variant={selectedComponent === comp.slug ? "default" : "outline"}
                                    className={clsx(
                                        "w-full justify-between text-left",
                                        selectedComponent === comp.slug ? "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white" : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    )}
                                    onClick={() => handleComponentSelect(comp.slug)}
                                >
                                    {comp.label || comp.slug}
                                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                        {
                                            contentList?.filter(
                                                (c) => c.component_slug === comp.slug
                                            ).length
                                        }
                                    </span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2.2. Content List Area */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                        {subject.name}
                    </h1>
                    <p className="text-xl font-medium text-purple-600 dark:text-purple-400 mb-6 border-b pb-2">
                        {components.find(c => c.slug === selectedComponent)?.label || "Select a Component"}
                    </p>

                    {contentLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-purple-500" />
                        </div>
                    ) : filteredContents.length > 0 ? (
                        <div className="space-y-4">
                            {filteredContents.map((content) => (
                                <Card
                                    key={content.id}
                                    className="w-full cursor-pointer border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleContentClick(content)}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">
                                            {content.title}
                                        </h3>
                                        <Button variant="ghost" size="icon" className="text-purple-600 dark:text-purple-400 flex-shrink-0 ml-4">
                                            <BookOpen className="h-5 w-5" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 mt-10 p-6 border border-dashed rounded-lg text-center">
                            No practical notes found for this component.
                        </p>
                    )}
                </div>
            </main>

            {/* 3. Full Screen Content Modal */}
            <Dialog open={!!fullScreenContent} onOpenChange={(open) => !open && setFullScreenContent(null)}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 flex flex-row items-center justify-between"> {/* Changed to flex-row and justify-between */}
                        <div className="flex items-center space-x-2"> {/* Wrapper for logo and title */}
                            <img src={logoPath} alt="Medmacs.app Logo" className="h-7 w-auto" /> {/* Adjusted height for modal */}
                            <DialogTitle className="text-xl font-bold text-purple-700 dark:text-purple-400">
                                {fullScreenContent?.title}
                            </DialogTitle>
                        </div>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="static right-auto top-auto"> {/* Changed position to static */}
                                <X className="h-6 w-6 text-gray-500" />
                            </Button>
                        </DialogClose>
                    </DialogHeader>

                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div
                            className="prose dark:prose-invert max-w-none pb-10"
                            dangerouslySetInnerHTML={{ __html: fullScreenContent?.content_html || "" }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}