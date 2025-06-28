import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import for redirection
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import { useAppContext } from '../App';
import MenuButton from '../components/MenuButton';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { openSidebar } = useAppContext(); // Get the function from the context
    // Initialize navigate hook
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // only API change is endpoint: /register
            await invoke('register', {
                usernameParam: username,
                passwordParam: password,
            });

            // --- SUCCESS ---
            toast.success('Registration successful!');
            navigate('/login'); // Redirect user to login page

        } catch (err: any) {
            // --- FAILURE ---
            const errorMessage = typeof err === 'string'
                ? err
                : 'An unexpected error occurred.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        // Add `relative` positioning to the card
        <div className="relative max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            {/* Position the button absolutely within the card */}
            <div className="absolute top-4 right-4">
                <MenuButton onClick={openSidebar} />
            </div>
            <h2 className="text-2xl font-bold mb-6 text-center">Create an Account</h2>
            <form onSubmit={handleSubmit}>
                {error && (
                    <div
                        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4"
                        role="alert"
                    >
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
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </div>
            </form>
        </div>

    );
}