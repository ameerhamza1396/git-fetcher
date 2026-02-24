import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

// NOTE: This component assumes a table like 'practical_notes_content'
// that stores the notes text/HTML based on subject_id AND component_slug.

const PracticalContent = () => {
    const { subjectId, componentSlug } = useParams();

    // Fetch the practical content
    const { data: content, isLoading, isError } = useQuery({
        queryKey: ['practicalContent', subjectId, componentSlug],
        queryFn: async () => {
            if (!subjectId || !componentSlug) return null;

            // This query targets a hypothetical table 'practical_notes_content'
            // where the actual notes are stored.
            const { data, error } = await supabase
                .from('practical_notes_content')
                .select('title, content_html, subject_name, component_name')
                .eq('subject_id', subjectId)
                .eq('component_slug', componentSlug)
                .maybeSingle();

            if (error) throw new Error(error.message);
            if (!data) throw new Error('Notes content not found');
            return data;
        },
        enabled: !!subjectId && !!componentSlug
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Loading notes...</span>
            </div>
        );
    }

    if (isError || !content) {
        return (
            <div className="min-h-screen p-8 bg-white dark:bg-gray-900">
                <Link to={`/practical-notes/subject/${subjectId}`} className="text-purple-600 dark:text-purple-400 flex items-center mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Modules
                </Link>
                <div className="text-center text-red-600 dark:text-red-400 border border-dashed p-10 rounded-lg">
                    Content not found for this module.
                </div>
            </div>
        );
    }

    // Decode the component name for display (optional, depending on how slug is created)
    const displayName = content.component_name || componentSlug.replace(/-/g, ' ').toUpperCase();


    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            <Seo title={`${content.subject_name} - ${displayName}`} description={`Detailed practical notes for ${displayName}.`} />

            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center max-w-7xl">
                    <Link to={`/practical-notes/subject/${subjectId}`} className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex-grow text-center">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{content.subject_name} - {displayName}</span>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{content.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">OSCE/VIVA Notes</p>
                </div>

                {/* Main Content Display Area */}
                <div className="prose dark:prose-invert max-w-none p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg">
                    {/* CRITICAL: Use dangerouslySetInnerHTML to render the HTML content */}
                    <div dangerouslySetInnerHTML={{ __html: content.content_html }} />
                </div>

                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                    <BookOpen className="inline-block h-4 w-4 mr-2" />
                    Remember, this content is for educational purposes and should be cross-referenced with your official curriculum.
                </div>
            </div>
        </div>
    );
};

export default PracticalContent;