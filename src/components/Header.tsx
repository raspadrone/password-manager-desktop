import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  // State to manage the open/closed status of the mobile menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Get auth status and functions from our context
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false); // Close menu on logout
    navigate('/login'); // Redirect to login page
  };

  // Define link styles for consistency
  const navLinkClasses = "block md:inline-block px-3 py-2 rounded-md text-base font-medium";
  const activeNavLinkClasses = "text-gray-700 hover:text-gray-900 hover:bg-gray-50";

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Branding/Logo */}
        <Link 
          to={isAuthenticated ? '/dashboard' : '/login'} 
          className="text-xl font-bold text-slate-800 hover:text-slate-600"
          onClick={() => setIsMenuOpen(false)}
        >
          PasswordSafe
        </Link>
        
        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center space-x-2">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={`${activeNavLinkClasses}`}>Dashboard</Link>
              <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-red-700 transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${activeNavLinkClasses}`}>Login</Link>
              <Link to="/register" className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-slate-700 transition-colors">
                Register
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button (Hamburger) */}
        <div className="md:hidden">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Open main menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className={`${navLinkClasses} ${activeNavLinkClasses}`}>Dashboard</Link>
                <button onClick={handleLogout} className={`w-full text-left text-red-600 ${navLinkClasses} ${activeNavLinkClasses}`}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className={`${navLinkClasses} ${activeNavLinkClasses}`}>Login</Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)} className={`${navLinkClasses} ${activeNavLinkClasses}`}>Register</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}