import React, {
    createContext,
    useState,
    useContext,
    type ReactNode,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define our timeout period in milliseconds (15 minutes)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        return storedToken;
    });

    // Use a ref to hold the timer ID. A ref's value persists across renders
    // without causing the component to re-render when it changes.
    const inactivityTimerRef = useRef<number | null>(null);

    // We wrap logout in useCallback so its reference doesn't change on every render,
    // which is important for our useEffect dependency array.
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        delete apiClient.defaults.headers.common['Authorization'];
        setToken(null);
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
    }, []);

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
    };

    // This function resets the timer. It's the core of our inactivity logic.
    // We also wrap this in useCallback.
    const resetInactivityTimer = useCallback(() => {
        // Clear any existing timer
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        // Set a new timer
        inactivityTimerRef.current = window.setTimeout(() => {
            toast.error('You have been logged out due to inactivity (15 min).');
            logout();
        }, INACTIVITY_TIMEOUT_MS);
    }, [logout]);


    // This is the main effect for managing the inactivity logic
    useEffect(() => {
        // A list of events that count as user activity
        const activityEvents: (keyof WindowEventMap)[] = [
            'mousemove', 'keydown', 'mousedown', 'touchstart'
        ];

        // Only set up listeners and timers if the user is authenticated
        if (token) {
            // Start the timer when the user logs in or the page loads with a token
            resetInactivityTimer();
            // Add event listeners for all activity types
            activityEvents.forEach(event => {
                window.addEventListener(event, resetInactivityTimer);
            });
        }

        // This is the crucial cleanup function. It runs when the component
        // unmounts or when the `token` value changes.
        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetInactivityTimer);
            });
        };
    }, [token, resetInactivityTimer]); // Re-run this effect if the token changes

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}