import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void; // Function to allow parent to close the sidebar
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        onClose(); // Close the sidebar
        navigate('/login');
    };

    const navLinkClasses = "block px-4 py-3 rounded-md text-lg font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100";

    return (
    <>
      {/* The Overlay: This div is now responsible for both dimming AND blurring the background.
        We give it a semi-transparent black background and the backdrop-blur utility.
      */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 transition-opacity
                    ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose} 
      />
      
      {/* The Sidebar/Drawer: This slides in on top of the blurred overlay. 
        We can give it a high-opacity white background so the text is easily readable.
      */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-50 
                    transform transition-transform ease-in-out duration-300
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-2xl font-bold">Menu</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200" aria-label="Close menu">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <nav className="flex flex-col space-y-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={onClose} className={navLinkClasses}>Dashboard</Link>
                <Link to="/generator" onClick={onClose} className={navLinkClasses}>Generator</Link>
                <button onClick={handleLogout} className={`w-full text-left text-red-600 ${navLinkClasses}`}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={onClose} className={navLinkClasses}>Login</Link>
                <Link to="/register" onClick={onClose} className={navLinkClasses}>Register</Link>
                <Link to="/generator" onClick={onClose} className={navLinkClasses}>Generator</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}