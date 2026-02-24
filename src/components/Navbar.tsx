import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = ["Home", "Doctors", "Appointments", "About"];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <a href="/" className="flex items-center gap-2 font-display font-bold text-xl text-foreground">
          <HeartPulse className="w-6 h-6 text-primary" />
          MedMacs
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" className="font-semibold">
            Log in
          </Button>
          <Button size="sm" className="rounded-full px-5 font-semibold">
            Sign up
          </Button>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden bg-background border-b border-border px-6 pb-6"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <nav className="flex flex-col gap-4 pt-4">
              {links.map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  className="text-base font-medium text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  {l}
                </a>
              ))}
              <Button className="rounded-full font-semibold mt-2">
                Sign up
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
