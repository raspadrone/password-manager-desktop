export default function MenuButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-2 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-colors"
            aria-label="Open navigation menu"
        >
            <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                />
            </svg>
        </button>
    );
}


// function HamburgerIcon() {
//     return (
//         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
//         </svg>
//     );
// }

// export default function MenuButton({ onClick }: { onClick: () => void }) {
//     return (
//         <button
//             onClick={onClick}
//             className="p-2 rounded-full hover:bg-slate-200 transition-colors"
//             aria-label="Open navigation menu"
//         >
//             <HamburgerIcon />
//         </button>
//     );
// }