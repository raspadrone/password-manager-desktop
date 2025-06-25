import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import GeneratorPage from './components/GeneratorPage.tsx';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />, // 'App' acts as root layout component
        children: [
            {
                index: true,
                element: <Navigate to="/login" replace />,
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
            {
                path: 'register',
                element: <RegisterPage />,
            },
            {
                path: 'dashboard',
                element: <DashboardPage />,
            },
            { 
                path: 'generator', 
                element: <GeneratorPage /> 
            },
        ],
    },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider >
            <RouterProvider router={router} />
        </AuthProvider>

    </React.StrictMode>
);