// src/pages/AllSetPage.jsx
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles } from 'lucide-react'; // Icons for visual appeal

const AllSetPage = () => {
  const navigate = useNavigate();

  // Handler for the "Go to Dashboard" button
  const handleGoToDashboard = () => {
    navigate('/dashboard'); // Direct navigation to the dashboard
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-teal-950 px-4 text-center">
      <div className="relative mb-6">
        <CheckCircle className="w-24 h-24 text-green-600 dark:text-green-400 animate-scale-in" />
        <Sparkles className="absolute top-0 right-0 w-8 h-8 text-yellow-400 animate-pulse" style={{ transform: 'rotate(20deg)' }} />
        <Sparkles className="absolute bottom-0 left-0 w-6 h-6 text-blue-400 animate-pulse-slow" style={{ transform: 'rotate(-30deg)' }} />
      </div>
      <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
        You're All Set! 🎉
      </h1>
      <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl">
        Your profile is complete, and you're ready to dive into Medmqcs.
      </p>
      <Button
        onClick={handleGoToDashboard}
        className="px-8 py-4 text-lg bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
      >
        Go to Dashboard
      </Button>
    </div>
  );
};

export default AllSetPage;