import { useState, type FormEvent } from 'react';
import {
  getStorefrontPath,
  isValidStorefrontSlug,
  slugifyStorefrontPart,
} from '../../utils/url-helpers';

interface ProfileEditorProps {
  userId: string;
  displayName: string;
  email: string;
  storefrontSlug?: string;
}

export default function ProfileEditor({
  userId,
  displayName: initialName,
  email,
  storefrontSlug: initialSlug = '',
}: ProfileEditorProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [storefrontInput, setStorefrontInput] = useState(initialSlug);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const previewSlug = slugifyStorefrontPart(storefrontInput);
  const slugError = (() => {
    if (!storefrontInput.trim()) return null;
    if (!previewSlug) {
      return 'Enter letters or numbers to build a storefront URL.';
    }
    if (!isValidStorefrontSlug(previewSlug)) {
      return 'Use 3–48 characters: lowercase letters, numbers, and hyphens only. Some words are reserved.';
    }
    return null;
  })();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (storefrontInput.trim() && slugError) {
      setError(slugError);
      return;
    }

    setIsSaving(true);

    try {
      const body: { displayName: string; storefrontSlug?: string } = {
        displayName: displayName.trim(),
      };
      if (previewSlug) {
        body.storefrontSlug = previewSlug;
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        throw new Error(data.error || 'Storefront URL is already taken');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      if (typeof data.storefrontSlug === 'string') {
        setStorefrontInput(data.storefrontSlug);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave =
    !!displayName.trim() && !isSaving && !(storefrontInput.trim() && !!slugError);

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
        <label htmlFor="profile-storefrontSlug" className="mb-1 block text-sm font-medium text-slate-700">
          Storefront URL
        </label>
        <input
          type="text"
          id="profile-storefrontSlug"
          name="storefrontSlug"
          maxLength={48}
          value={storefrontInput}
          onChange={(e) => setStorefrontInput(e.target.value)}
          placeholder="my-brand"
          className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-600"
        />
        {previewSlug ? (
          <p className="mt-1 font-mono text-xs text-slate-500">
            Preview: {getStorefrontPath(previewSlug)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            Choose a public URL for your apparel storefront (optional).
          </p>
        )}
        {slugError && storefrontInput.trim() ? (
          <p className="mt-1 text-xs text-red-600">{slugError}</p>
        ) : null}
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
        disabled={!canSave}
        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
