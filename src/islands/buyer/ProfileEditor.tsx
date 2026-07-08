import { useState, type FormEvent } from 'react';

interface ProfileEditorProps {
  userId: string;
  displayName: string;
  email: string;
}

export default function ProfileEditor({ userId, displayName: initialName, email }: ProfileEditorProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save profile');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Profile saved.
        </div>
      )}

      <div>
        <label htmlFor="profile-displayName" className="mb-1 block text-sm font-medium text-slate-700">
          Display name
        </label>
        <input
          type="text"
          id="profile-displayName"
          name="displayName"
          required
          maxLength={100}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-600"
        />
      </div>

      <div>
        <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          id="profile-email"
          name="email"
          readOnly
          disabled
          value={email}
          className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-slate-500"
        />
        <p className="mt-1 text-xs text-slate-400">Email is managed by your sign-in provider and cannot be changed here.</p>
      </div>

      <button
        type="submit"
        disabled={isSaving || !displayName.trim()}
        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
