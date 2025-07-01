import { useEffect, useRef, useState } from 'react';
// Import the context hooks from react-router-dom
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Define the shape of the context we'll provide to child routes
type AppContextType = {
    openSidebar: () => void;
};

// Its sole purpose is to watch for auth changes and trigger redirects.
function AuthWatcher() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // We use a ref to track the previous value of isAuthenticated
    // This helps us detect the change from `true` to `false`.
    const wasAuthenticated = useRef(isAuthenticated);

    useEffect(() => {
        // Check if the user WAS authenticated but is NOT anymore
        if (wasAuthenticated.current && !isAuthenticated) {
            // This means a logout event just happened (e.g., from the inactivity timer)
            console.log('User logged out, redirecting to login...');
            // We navigate to /login and pass a state object to tell the
            // login page WHY we are here.
            navigate('/login', { state: { reason: 'inactivity' } });
        }

        // Update the ref to the current state for the next render cycle
        wasAuthenticated.current = isAuthenticated;
    }, [isAuthenticated, navigate]);

    // This component doesn't render any visible UI
    return null;
}

function App() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 antialiased">
            <Toaster position="bottom-center" />
            <AuthWatcher />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="container mx-auto p-4 pr-20">
                <div className="mt-4 md:mt-8">
                    {/* pass openSidebar function down to Outlet */}
                    <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
                </div>
            </main>
        </div>
    );
}

// custom hook to easily access context in child components
export function useAppContext() {
    return useOutletContext<AppContextType>();
}

export default App;