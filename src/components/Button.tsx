import React from 'react';

type ButtonProps = {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; // Allow event passing
    type?: 'button' | 'submit' | 'reset';
    fullWidth?: boolean;
    disabled?: boolean;
    className?: string;
};

export default function Button({
    children,
    type = 'button',
    fullWidth = false,
    disabled = false,
    className = '',
    ...props
}: ButtonProps) {
    const baseClasses = "font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const themeClasses = "bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500";
    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            disabled={disabled}
            {...props}
            // Combine base styles, theme styles, and any custom styles passed in
            className={`${baseClasses} ${themeClasses} ${widthClass} ${className}`}
        >
            {children}
        </button>
    );
}