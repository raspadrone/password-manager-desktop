import React, { useState } from 'react';

function EyeIcon() {
    return (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.43-4.43a1.012 1.012 0 011.414 0l4.43 4.43a1.012 1.012 0 010 .639l-4.43 4.43a1.012 1.012 0 01-1.414 0l-4.43-4.43z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function EyeSlashIcon() {
    return (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
        </svg>
    );
}

function XCircleIcon() {
    return (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}



type FormInputProps = {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onClear?: () => void;
    name?: string;
    id?: string;
    as?: 'input' | 'textarea';
    type?: string;
    required?: boolean;
};

export default function FormInput({
    label,
    value,
    onChange,
    onClear,
    name,
    id,
    as = 'input',
    type = 'text',
    required = true,
}: FormInputProps) {
    const [isPasswordVisible, setPasswordVisible] = useState(false);

    const commonProps = {
        id: id || name,
        name: name,
        value: value,
        onChange: onChange,
        required: required,
        className:
            'mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm',
    };

    const isPasswordField = type === 'password';
    const inputType = isPasswordField ? (isPasswordVisible ? 'text' : 'password') : type;
    const showClearButton = !!onClear && !isPasswordField && value.length > 0;

    return (
        <div>
            <label
                htmlFor={id || name}
                className="block text-sm font-medium text-gray-700"
            >
                {label}
            </label>
            <div className="relative">
                {as === 'textarea' ? (
                    <textarea {...commonProps} rows={4} />
                ) : (
                    <input {...commonProps} type={inputType} />
                )}

                {isPasswordField && (
                    <button
                        type="button"
                        onClick={() => setPasswordVisible(!isPasswordVisible)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                        aria-label={
                            isPasswordVisible ? 'Hide password' : 'Show password'
                        }
                    >
                        {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                )}

                {showClearButton && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                        aria-label="Clear input"
                    >
                        <XCircleIcon />
                    </button>
                )}
            </div>
        </div>
    );
}