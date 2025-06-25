import React, { useState } from 'react';

// --- Helper Icon Components (can be in the same file or a new one) ---
function EyeIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );
}


// --- The Upgraded FormInput Component ---
type FormInputProps = {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
    name,
    id,
    as = 'input',
    type = 'text',
    required = true
}: FormInputProps) {

    // State to manage password visibility, only used if type is 'password'
    const [isPasswordVisible, setPasswordVisible] = useState(false);

    const commonProps = {
        id: id || name,
        name: name,
        value: value,
        onChange: onChange,
        required: required,
        className: "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm",
    };

    const isPasswordField = type === 'password';
    const inputType = isPasswordField ? (isPasswordVisible ? 'text' : 'password') : type;

    return (
        <div>
            <label htmlFor={id || name} className="block text-sm font-medium text-gray-700">
                {label}
            </label>
            <div className="relative">
                {as === 'textarea' ? (
                    <textarea {...commonProps} rows={4} />
                ) : (
                    <input {...commonProps} type={inputType} />
                )}

                {/* If it's a password field, render the visibility toggle button */}
                {isPasswordField && (
                    <button
                        type="button" // Important: prevents form submission
                        onClick={() => setPasswordVisible(!isPasswordVisible)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    >
                        {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                )}
            </div>
        </div>
    );
}