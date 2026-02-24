import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import DoctorsSection from "@/components/DoctorsSection";
import AppointmentsSection from "@/components/AppointmentsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <DoctorsSection />
        <AppointmentsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
