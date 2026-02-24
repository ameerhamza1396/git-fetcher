import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { IonContent, IonPage } from '@ionic/react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Internal Components & Pages
import BackHandler from "@/components/backhandler";
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import MCQs from '@/pages/MCQs';
import Battle from '@/pages/Battle';
import AI from '@/pages/AI';
import AITestGeneratorPage from '@/pages/AITestGenerator';
import AIChatbotPage from '@/pages/AIChatbot';
import Leaderboard from '@/pages/Leaderboard';
import Profile from '@/pages/Profile';
import Pricing from '@/pages/Pricing';
import TermsAndConditions from '@/pages/TermsAndConditions';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Checkout from '@/pages/Checkout';
import NotFound from '@/pages/NotFound';
import ChangePassword from '@/pages/ChangePassword';
import MockTest from '@/pages/MockTest';
import TestCompletionPage from '@/pages/TestCompletion';
import Classroom from '@/pages/Classroom';
import VerifyEmail from '@/pages/VerifyEmail';
import UsernamePage from '@/pages/UsernamePage';
import WelcomeNewUserPage from './pages/WelcomeNewUserPage';
import AllSetPage from '@/pages/AllSetPage';
import MockTestResults from '@/pages/MockTestResults';
import TestCompletion from '@/pages/TestResults';
import Career from '@/pages/Career';
import TeachingAmbassadors from '@/pages/TeachingAmbassadors';
import InternshipApplication from '@/pages/InternshipApplication';
import SavedMCQsPage from '@/pages/SavedMCQsPage';
import Announcements from '@/pages/Announcements';
import ContactUsPage from '@/pages/ContactUsPage';
import FLP from '@/pages/FLP';
import FLPResults from '@/pages/FLPResults';
import FLPResultDetail from '@/components/FLPResultDetail';
import ForgotPassword from '@/pages/ForgotPassword';
import UpdatePassword from '@/pages/UpdatePassword';
import SelectYear from '@/pages/SelectYear';
import Teams from '@/pages/Team';
import InstallApp from '@/pages/InstallApp';
import Practicals from '@/pages/Practicals';
import PracticalNotesDetails from "@/components/PracticalNotes/PracticalNotesDetails";
import RedeemCode from '@/pages/RedeemCode';
import PurchaseHistory from '@/pages/PurchaseHistory';
import { VideoCallProvider } from '@/video-sdk/VideoCallProvider';

const queryClient = new QueryClient();

/**
 * StatusBarHandler: 
 * Watches for theme changes and updates the system icon colors.
 */
const StatusBarHandler = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Style.Dark means light icons (for dark background)
      // Style.Light means dark icons (for light background)
      StatusBar.setStyle({
        style: resolvedTheme === 'dark' ? Style.Dark : Style.Light,
      }).catch((err) => console.warn('Status bar error', err));
    }
  }, [resolvedTheme]);

  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        themes={['light', 'dark']}
      >
        <StatusBarHandler />

        <Router>
          {/* Crucial: The bg-background class here ensures the div 
              behind the status bar is dark as soon as the app loads.
          */}
          <div className="App min-h-screen w-full bg-background text-foreground transition-colors duration-300">
            <VideoCallProvider>
              <BackHandler />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/mcqs" element={<MCQs />} />
                <Route path="/battle" element={<Battle />} />
                <Route path="/ai" element={<AI />} />
                <Route path="/ai/test-generator" element={<AITestGeneratorPage />} />
                <Route path="/ai/chatbot" element={<AIChatbotPage />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/password" element={<ChangePassword />} />
                <Route path="/profile/upgrade" element={<Profile />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacypolicy" element={<PrivacyPolicy />} />
                <Route path="/mock-test" element={<MockTest />} />
                <Route path="/test-completed" element={<TestCompletionPage />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/classroom" element={<Classroom />} />
                <Route path="/welcome-new-user" element={<WelcomeNewUserPage />} />
                <Route path="/all-set" element={<AllSetPage />} />
                <Route path="/settings/username" element={<UsernamePage />} />
                <Route path="/results" element={<MockTestResults />} />
                <Route path="/test-summary" element={<TestCompletion />} />
                <Route path="/career" element={<Career />} />
                <Route path="/teaching-career" element={<TeachingAmbassadors />} />
                <Route path="/summerinternship2025" element={<InternshipApplication />} />
                <Route path="/saved-mcqs" element={<SavedMCQsPage />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/contact-us" element={<ContactUsPage />} />
                <Route path="/flp" element={<FLP />} />
                <Route path="/flp-result" element={<FLPResults />} />
                <Route path="/results/flp/:id" element={<FLPResultDetail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/select-year" element={<SelectYear />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/install-app" element={<InstallApp />} />
                <Route path="/practicals" element={<Practicals />} />
                <Route path="/practical-notes" element={<Practicals />} />
                <Route path="/practical-notes/subject/:id" element={<PracticalNotesDetails />} />
                <Route path="/redeem" element={<RedeemCode />} />
                <Route path="/purchase-history" element={<PurchaseHistory />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </VideoCallProvider>
            <Toaster />
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;