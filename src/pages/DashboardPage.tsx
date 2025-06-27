import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAppContext } from '../App';
import MenuButton from '../components/MenuButton';
import apiClient from '../api';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import PasswordGenerator from '../components/PasswordGenerator';
import { useAuth } from '../context/AuthContext';
import { invoke } from '@tauri-apps/api/core';

// The updated Password type for the frontend
type Password = {
    id: string;
    key: string;
    value: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    notes: string | null;
};

// --- The Create Password Form Component ---
function CreatePasswordForm({ onFormSubmit }: { onFormSubmit: () => void }) {
    const { token } = useAuth();
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (!token) {
            toast.error("Authentication error. Please log in again.");
            setIsSubmitting(false);
            return;
        }
        try {
            await invoke('create_password', {
                token,
                someKey: key,
                someValue: value,
                someNotes: notes || null,
            });
            toast.success('Password created successfully!');
            onFormSubmit(); // Notify parent to close modal and refresh
        } catch (err: any) {
            toast.error(err as string);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <FormInput label="Key (e.g., 'Gmail')" type="text" value={key} onChange={(e) => setKey(e.target.value)} />
                <FormInput label="Value (the password)" type="password" value={value} onChange={(e) => setValue(e.target.value)} />
                <FormInput label="Notes (optional)" as="textarea" type="text" value={notes} required={false} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Password'}</Button>
            </div>
            <PasswordGenerator onPasswordGenerated={(password) => setValue(password)} />
        </form>
    );
}

type EditPasswordFormProps = {
    password: Password;
    onFormSubmit: () => void; // Callback to notify parent on success
};

// --- Edit Password Form Component ---
function EditPasswordForm({ password, onFormSubmit }: EditPasswordFormProps) {
    // Form state is initialized from the prop
    const [value, setValue] = useState(password.value);
    const [notes, setNotes] = useState(password.notes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // This special hook syncs the form state if the user clicks a different
    // password while the modal is already open.
    useEffect(() => {
        setValue(password.value);
        setNotes(password.notes || '');
    }, [password]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // We use a PUT request to the specific key
            await apiClient.put(`/passwords/${password.key}`, { value, notes });
            toast.success(`'${password.key}' was updated successfully!`);
            onFormSubmit(); // Tell the parent we are done
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                {/* The Key is not editable, so we display it as text */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Key</label>
                    <p className="mt-1 font-mono p-2 bg-slate-100 rounded-md">{password.key}</p>
                </div>
                <FormInput label="New Value (the password)" type="password" value={value} onChange={(e) => setValue(e.target.value)} />
                <FormInput label="Notes" as="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} required={false} />
            </div>
            <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
            <PasswordGenerator onPasswordGenerated={(password) => setValue(password)} />
        </form>
    );
}

// --- The Dashboard Page Component ---
export default function DashboardPage() {
    const { openSidebar } = useAppContext();
    const [passwords, setPasswords] = useState<Password[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingPassword, setEditingPassword] = useState<Password | null>(null);
    const [deletingPassword, setDeletingPassword] = useState<Password | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { token } = useAuth();

    const fetchPasswords = useCallback(async () => {
        if (!token) {
            setLoading(false);
            setError("Authentication token not found.");
            return;
        }
        try {
            setLoading(true);
            const result = await invoke<Password[]>('get_all_passwords', { token });
            setPasswords(result);
        } catch (err: any) {
            const errorMessage = typeof err === 'string' ? err : 'Failed to fetch passwords.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPasswords();
    }, [fetchPasswords]);

    const handleCreateSuccess = () => {
        setCreateModalOpen(false);
        fetchPasswords();
    };
    // const handleUpdateSuccess = () => { setEditingPassword(null); fetchPasswords(); };
    const handleDeletePassword = async () => {
        if (!deletingPassword) return; // Safety check
        try {
            await apiClient.delete(`/passwords/${deletingPassword.key}`);
            toast.success(`'${deletingPassword.key}' was deleted.`);
            setDeletingPassword(null); // Close the confirmation modal
            fetchPasswords();          // Refresh the list
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete password.');
        }
    };

    const filteredPasswords = passwords.filter(p =>
        p.key.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderContent = () => {
        if (loading) {
            return <p>Loading passwords...</p>;
        }

        if (error) {
            return <div className="text-red-500 bg-red-100 p-4 rounded-md">Error: {error}</div>;
        }

        if (passwords.length === 0) {
            return <p>You haven't saved any passwords yet. Click "New Password" to get started.</p>;
        }

        // New: Check if there are passwords, but the filter returns none
        if (filteredPasswords.length === 0) {
            return <p>No passwords found matching your search.</p>;
        }

        return (
            <ul className="space-y-3">
                {/* Change `passwords.map` to `filteredPasswords.map` */}
                {filteredPasswords.map((p) => (
                    <li key={p.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                        <div className="flex-grow cursor-pointer pr-4" onClick={() => setEditingPassword(p)}>
                            <p className="font-mono font-semibold text-slate-800">{p.key}</p>
                            {p.notes && <p className="text-sm text-slate-500 truncate">{p.notes}</p>}
                        </div>
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeletingPassword(p);
                            }}
                            className="!bg-red-100 !text-red-700 hover:!bg-red-200 focus:!ring-red-500 text-sm !py-1 !px-2"
                        >
                            Delete
                        </Button>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div>
            <div className="fixed top-4 right-4 z-30"><MenuButton onClick={openSidebar} /></div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <Button onClick={() => setCreateModalOpen(true)}>New Password</Button>
            </div>
            <div className="mb-6">
                <FormInput
                    label="Search Passwords"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    required={false}
                />
            </div>
            {renderContent()}
            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Password">
                <CreatePasswordForm onFormSubmit={handleCreateSuccess} />
            </Modal>
            {editingPassword && (
                <Modal
                    isOpen={!!editingPassword}
                    onClose={() => setEditingPassword(null)}
                    title={`Edit: ${editingPassword.key}`}
                >
                    <EditPasswordForm
                        password={editingPassword}
                        onFormSubmit={() => {
                            setEditingPassword(null); // Close the modal
                            fetchPasswords();         // Refresh the list
                        }}
                    />
                </Modal>
            )}
            {deletingPassword && (
                <Modal isOpen={!!deletingPassword} onClose={() => setDeletingPassword(null)} title={`Delete: ${deletingPassword.key}`}>
                    <div>
                        <p className="mb-6">Are you sure you want to permanently delete this password? This action cannot be undone.</p>
                        <div className="flex justify-end space-x-4">
                            <Button onClick={() => setDeletingPassword(null)} className="!bg-gray-200 !text-gray-800 hover:!bg-gray-300 focus:!ring-gray-400">
                                Cancel
                            </Button>
                            <Button onClick={handleDeletePassword} className="!bg-red-600 !text-white hover:!bg-red-700 focus:!ring-red-500">
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}