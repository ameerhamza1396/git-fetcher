import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes'; // Assuming useTheme is correctly imported/provided by next-themes

/**
 * A reusable header component for Admin pages.
 * It includes navigation back to the main admin panel, logo, theme toggle,
 * admin badge, and user initials.
 */
export default function AdminHeader({ userEmail }) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
        {/* Link back to the main Admin Panel */}
        <Link to="/admin" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Go to Admin Panel</span>
        </Link>

        {/* Medistics Logo and Panel Title */}
        <div className="flex items-center space-x-3">
          <img
            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
            alt="Medistics Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</span>
        </div>

        {/* Theme Toggle, Admin Badge, and User Initials */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Badge
            variant="secondary"
            className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700"
          >
            Admin
          </Badge>
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {userEmail?.substring(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
