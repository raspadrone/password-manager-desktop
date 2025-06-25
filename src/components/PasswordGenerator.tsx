import { useState } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import Button from './Button';

// This component will receive a function from its parent to call when a password is generated and "used"
type PasswordGeneratorProps = {
    onPasswordGenerated: (password: string) => void;
};

export default function PasswordGenerator({ onPasswordGenerated }: PasswordGeneratorProps) {
    // State for the generator's options
    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);

    // State for the result and loading status
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        setGeneratedPassword('');
        try {
            const params = {
                length,
                include_uppercase: includeUppercase,
                include_numbers: includeNumbers,
                include_symbols: includeSymbols,
            };
            const response = await apiClient.get('/generate-password', { params });
            setGeneratedPassword(response.data.password);
        } catch (err) {
            toast.error('Failed to generate password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUsePassword = () => {
        onPasswordGenerated(generatedPassword);
        toast.success('Password filled!');
        setGeneratedPassword(''); // Clear the generated password after using it
    };

    return (
        <div className="p-4 border-t mt-6">
            <h4 className="font-semibold text-gray-700 mb-3">Generate a Secure Password</h4>

            {/* --- Options --- */}
            <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                    <label htmlFor="length" className="text-sm font-medium text-gray-600">Length: {length}</label>
                    <input
                        id="length"
                        type="range"
                        min="8"
                        max="32"
                        value={length}
                        onChange={(e) => setLength(parseInt(e.target.value, 10))}
                        className="w-48"
                    />
                </div>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={includeUppercase} onChange={() => setIncludeUppercase(!includeUppercase)} /><span>Uppercase</span></label>
                    <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={includeNumbers} onChange={() => setIncludeNumbers(!includeNumbers)} /><span>Numbers</span></label>
                    <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={includeSymbols} onChange={() => setIncludeSymbols(!includeSymbols)} /><span>Symbols</span></label>
                </div>
            </div>

            <Button onClick={handleGenerate} disabled={isLoading} className="w-full !text-sm">
                {isLoading ? 'Generating...' : 'Generate New Password'}
            </Button>

            {/* --- Result Display --- */}
            {generatedPassword && (
                <div className="mt-4 p-2 bg-slate-100 rounded-md flex items-center justify-between gap-2">
                    <span className="font-mono text-sm break-all">{generatedPassword}</span>
                    <Button onClick={handleUsePassword} className="!text-xs !py-1 !px-2 flex-shrink-0">
                        Use
                    </Button>
                </div>
            )}
        </div>
    );
}