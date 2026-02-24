import React from 'react';
// Link is assumed to be available from react-router-dom, but for a self-contained
// example, we'll use a simple anchor tag as a placeholder if react-router-dom
// isn't explicitly imported for the canvas preview.
// For a live application, ensure 'react-router-dom' is installed and used.
// import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react'; // Icon for login

// Mock components for Button. Card components are no longer needed.
const Button = ({ children, className, onClick }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${className}`}
    onClick={onClick}
  >
    {children}
  </button>
);

// Define props for the SignInPrompt component
const SignInPrompt = ({
  title = "Authentication Required", // Updated default title for a more professional tone
  description = "Please sign in or create an account to unlock all features and continue your journey.", // Updated description
  buttonText = "Sign In / Register", // Updated button text
  redirectPath = "/login", // Default redirect path for the button, changed from /auth
  showNewUserPrompt = true // Control visibility of "New user?" text
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 font-sans text-center">
      <style>
        {`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        html, body, #root {
            height: 100%;
            margin: 0;
            overflow: hidden; /* Prevent scrolling if not needed */
        }
        `}
      </style>
      <div className="w-full max-w-md p-8 animate-fade-in transform hover:scale-100 transition-transform duration-300"> {/* Adjusted padding and removed card specific styling */}
        <LogIn className="h-20 w-20 mx-auto mb-6 text-purple-700 dark:text-purple-300 transform transition-transform duration-500 hover:rotate-6" /> {/* Increased icon size */}
        <h1 className="text-gray-900 dark:text-white text-4xl font-extrabold mb-4 leading-tight"> {/* Changed to h1 and increased size */}
          {title}
        </h1>
        <p className="text-gray-700 dark:text-gray-300 text-lg mt-4 mb-8 leading-relaxed"> {/* Changed to p and adjusted size */}
          {description}
        </p>
        {/* Using an anchor tag for Link to ensure it works in canvas preview without react-router-dom */}
        <a href={redirectPath} className="block max-w-sm mx-auto mb-4"> {/* Centered button and restricted its max width, added margin-bottom */}
          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white w-full py-4 text-xl font-bold rounded-lg shadow-xl transform transition-transform hover:-translate-y-1"> {/* Increased button size and font weight */}
            {buttonText}
          </Button>
        </a>
        {/* New "Go to Homepage" button */}
        <a href="/" className="block max-w-sm mx-auto"> {/* Centered button and restricted its max width */}
          <Button className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full py-4 text-xl font-bold rounded-lg shadow-md transform transition-transform hover:-translate-y-1">
            Go to Homepage
          </Button>
        </a>
        {showNewUserPrompt && (
          <p className="mt-8 text-md text-gray-600 dark:text-gray-400"> {/* Adjusted font size */}
            New to our platform? <a href="/signup" className="text-purple-700 dark:text-purple-400 hover:underline font-semibold">Create an account</a> to get started! {/* Changed redirect path to /signup */}
          </p>
        )}
      </div>
    </div>
  );
};

export default SignInPrompt;
