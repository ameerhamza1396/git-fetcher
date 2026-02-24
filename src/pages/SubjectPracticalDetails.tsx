import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList, HeartPulse, MonitorPlay, Activity, Scan, Scissors, Loader2, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

// Map string icon names to Lucide components for dynamic rendering
const iconMap = {
    ClipboardList: ClipboardList,
    HeartPulse: HeartPulse,
    MonitorPlay: MonitorPlay,
    Activity: Activity,
    Scan: Scan,
    Scissors: Scissors,
    BookOpen: BookOpen // Fallback
};

// Component to render a card for a specific practical component
const ComponentCard = ({ subjectId, component }) => {
    const Icon = iconMap[component.icon] || BookOpen; // Use the mapped icon or fallback
    const linkPath = `/practical-notes/subject/${subjectId}/${component.slug}`;

    return (
        <Link to={linkPath} className="block h-full">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                <CardHeader className="text-center pb-4">
                    <Icon className="h-10 w-10 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-gray-900 dark:text-white text-xl mb-1">{component.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                        View Notes
                    </Button>
                </CardContent>
            </Card>
        </Link>
    );
};


const SubjectPracticalDetails = () => {
    const { subjectId } = useParams();

    // Fetch the specific subject details by ID
    const { data: subject, isLoading, isError } = useQuery({
        queryKey: ['subjectDetails', subjectId],
        queryFn: async () => {
            if (!subjectId) return null;

            const { data, error } = await supabase
                .from('subjects')
                .select('id, name, color, practical_components')
                .eq('id', subjectId)
                .maybeSingle();

            if (error) throw new Error(error.message);
            if (!data) throw new Error('Subject not found');

            // IMPORTANT: Ensure practical_components is parsed if stored as string, 
            // though it should be an object/array if using jsonb
            return {
                ...data,
                practical_components: data.practical_components || []
            };
        },
        enabled: !!subjectId,
        staleTime: Infinity, // Subject details don't change often
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Loading Subject details...</span>
            </div>
        );
    }

    if (isError || !subject) {
        return (
            <div className="min-h-screen p-8">
                <Link to="/practical-notes" className="text-purple-600 dark:text-purple-400 flex items-center mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Subjects
                </Link>
                <div className="text-center text-red-600 dark:text-red-400">
                    Error: Could not load practical details for this subject.
                </div>
            </div>
        );
    }

    // Fallback for when practical_components is null or an empty array
    const components = Array.isArray(subject.practical_components) ? subject.practical_components : [];


    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            <Seo title={`${subject.name} Practical Notes`} description={`OSCE and VIVA notes components for ${subject.name}.`} />

            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center max-w-7xl">
                    <Link to="/practical-notes" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex-grow text-center">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{subject.name} Practical Notes</span>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {subject.name} Practical Modules
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Select a module to access OSCE and VIVA-relevant notes.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {components.length > 0 ? (
                        components.map((component) => (
                            <ComponentCard
                                key={component.slug}
                                subjectId={subject.id}
                                component={component}
                            />
                        ))
                    ) : (
                        <p className="col-span-full text-center text-gray-500 dark:text-gray-400 p-8 border border-dashed rounded-lg">
                            No practical modules are currently available for this subject.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubjectPracticalDetails;