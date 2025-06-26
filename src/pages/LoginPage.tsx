import { useEffect, useState } from 'react';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import apiClient from '../api';
import MenuButton from '../components/MenuButton';
import { useAppContext } from '../App';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // state for loading and error messages
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    // Get the location object, which contains the state
    const location = useLocation();
    const { login } = useAuth();
    const { openSidebar } = useAppContext();

    useEffect(() => {
        // A unique ID for our inactivity toast so we can control it
        const INACTIVITY_TOAST_ID = 'inactivity-logout-toast';

        if (location.state?.reason === 'inactivity') {
            // Show a toast that will linger forever until dismissed
            toast.error('You have been logged out due to inactivity (15 min).', {
                id: INACTIVITY_TOAST_ID,
                duration: Infinity,
            });

            // This function will run on the first user action
            const dismissToastOnActivity = () => {
                console.log('User activity detected, dismissing inactivity toast.');
                toast.dismiss(INACTIVITY_TOAST_ID);
                // IMPORTANT: Clean up the listeners immediately after they fire once
                window.removeEventListener('mousemove', dismissToastOnActivity);
                window.removeEventListener('keydown', dismissToastOnActivity);
            };

            // Add the event listeners
            window.addEventListener('mousemove', dismissToastOnActivity);
            window.addEventListener('keydown', dismissToastOnActivity);

            // This is a cleanup function that will run if the user navigates away
            // from the login page before dismissing the toast.
            return () => {
                window.removeEventListener('mousemove', dismissToastOnActivity);
                window.removeEventListener('keydown', dismissToastOnActivity);
            };
        }
    }, [location.state]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true); // Start loading
        setError(null);   // Clear previous errors

        try {
            const token = await invoke<string>('login', {
                usernameParam: username,
                passwordParam: password,
            });

            // --- SUCCESS ---
            login(token);
            navigate('/dashboard');
            // TODO: In next step, we will store this token.

        } catch (err: any) {
            // --- FAILURE ---
            console.error('Login failed:', err);
            if (err.response && err.response.data && err.response.data.error) {
                // Handle structured API errors from our Rust backend
                setError(err.response.data.error);
            } else {
                // Handle network errors or other unexpected issues
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false); // Stop loading, regardless of success or failure
        }
    };

    return (
        // Add `relative` positioning to the card
        <div className="relative max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            {/* Position the button absolutely within the card */}
            <div className="absolute top-4 right-4">
                <MenuButton onClick={openSidebar} />
            </div>
            <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
            <form onSubmit={handleSubmit}>
                {/* Conditionally render error message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                        {error}
                    </div>
                )}
                <div className="space-y-4">
                    <FormInput
                        label="Username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <FormInput
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div className="mt-6">
                    <Button type="submit" fullWidth disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </div>
            </form>
        </div>

    );
}