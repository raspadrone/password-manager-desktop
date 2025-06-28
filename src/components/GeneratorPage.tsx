import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import { useAppContext } from '../App';
import MenuButton from '../components/MenuButton';
import { invoke } from '@tauri-apps/api/core';

// Helper component for the copy icon
function CopyIcon() {
    return (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
        </svg>
    );
}

export default function GeneratorPage() {
    const { openSidebar } = useAppContext();

    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const newPassword = await invoke<string>('generate_password', {
            length,
            includeUppercase,
            includeNumbers,
            includeSymbols,
        });
        setGeneratedPassword(newPassword);
        toast.success('New password generated!');
    } catch (err) {
        toast.error('Failed to generate password.');
        console.error(err);
    } finally {
        setLoading(false);
    }
    };

    const handleCopyToClipboard = () => {
        if (!generatedPassword) return;
        navigator.clipboard.writeText(generatedPassword);
        toast.success('Password copied to clipboard!');
    };

    return (
        <>
            <div className="fixed top-4 right-4 z-30">
                <MenuButton onClick={openSidebar} />
            </div>
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Password Generator</h1>

                {/* --- Corrected Result Display --- */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700">Generated Password</label>
                    <div className="relative mt-1">
                        <input
                            type="text"
                            readOnly
                            value={generatedPassword}
                            className="font-mono block w-full pl-3 pr-10 py-2 bg-slate-100 border border-slate-300 rounded-md sm:text-sm"
                            placeholder="Click Generate..."
                        />
                        <button
                            type="button"
                            onClick={handleCopyToClipboard}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                            aria-label="Copy password"
                        >
                            <CopyIcon />
                        </button>
                    </div>
                </div>

                {/* --- Options --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                    <div>
                        <label htmlFor="length" className="block text-sm font-medium text-gray-700">Length: {length}</label>
                        <input
                            id="length"
                            type="range"
                            min="8"
                            max="64"
                            value={length}
                            onChange={(e) => setLength(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="flex flex-col space-y-2 pt-1">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={includeUppercase} onChange={(e) => setIncludeUppercase(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" />
                            <span>Include Uppercase (A-Z)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={includeNumbers} onChange={(e) => setIncludeNumbers(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" />
                            <span>Include Numbers (0-9)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={includeSymbols} onChange={(e) => setIncludeSymbols(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" />
                            <span>Include Symbols (!@#$)</span>
                        </label>
                    </div>
                </div>

                <Button onClick={handleGenerate} fullWidth disabled={loading}>
                    {loading ? 'Generating...' : 'Generate New Password'}
                </Button>
            </div>
        </>
    );
}