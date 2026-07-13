import { useRef, useState, type FormEvent } from 'react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../../lib/firebase-client';
import {
  getStorefrontPath,
  isValidStorefrontSlug,
  slugifyStorefrontPart,
} from '../../utils/url-helpers';

const MAX_HERO_BYTES = 10 * 1024 * 1024;

interface ProfileEditorProps {
  userId: string;
  displayName: string;
  email: string;
  storefrontSlug?: string;
  storefrontName?: string;
  storefrontTagline?: string;
  storefrontHeroUrl?: string;
  /** profile = display name only; storefront = branding fields only */
  mode?: 'profile' | 'storefront';
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default function ProfileEditor({
  userId,
  displayName: initialName,
  email,
  storefrontSlug: initialSlug = '',
  storefrontName: initialStorefrontName,
  storefrontTagline: initialStorefrontTagline,
  storefrontHeroUrl: initialStorefrontHeroUrl,
  mode = 'profile',
}: ProfileEditorProps) {
  const isProfileMode = mode === 'profile';
  const isStorefrontMode = mode === 'storefront';
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialName);
  const [storefrontInput, setStorefrontInput] = useState(initialSlug);
  const [storefrontName, setStorefrontName] = useState(initialStorefrontName ?? '');
  const [storefrontTagline, setStorefrontTagline] = useState(initialStorefrontTagline ?? '');
  const [storefrontHeroUrl, setStorefrontHeroUrl] = useState(initialStorefrontHeroUrl ?? '');
  const [isUploadingHero, setIsUploadingHero] = useState(false);
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

  const handleHeroSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);

    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file only (PNG, JPEG, WebP, etc.).');
      return;
    }

    if (file.size > MAX_HERO_BYTES) {
      setError('Hero image must be 10MB or smaller.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be signed in to upload. Please sign in again from the login page.');
      return;
    }
    if (user.uid !== userId) {
      setError('Account mismatch. Please sign in with the correct seller account.');
      return;
    }

    setIsUploadingHero(true);
    try {
      const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
      const objectRef = ref(storage, `storefront-heroes/${userId}/${filename}`);
      const task = uploadBytesResumable(objectRef, file, {
        contentType: file.type || 'image/jpeg',
      });

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', () => {}, reject, () => resolve());
      });

      const downloadUrl = await getDownloadURL(task.snapshot.ref);
      setStorefrontHeroUrl(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload hero image');
    } finally {
      setIsUploadingHero(false);
      if (heroInputRef.current) {
        heroInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (isStorefrontMode && storefrontInput.trim() && slugError) {
      setError(slugError);
      return;
    }

    if (isProfileMode && !displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setIsSaving(true);

    try {
      const body: {
        displayName?: string;
        storefrontSlug?: string;
        storefrontName?: string;
        storefrontTagline?: string;
        storefrontHeroUrl?: string;
      } = {};

      if (isProfileMode) {
        body.displayName = displayName.trim();
      }

      if (isStorefrontMode) {
        body.storefrontName = storefrontName.trim();
        body.storefrontTagline = storefrontTagline.trim();
        body.storefrontHeroUrl = storefrontHeroUrl;
        if (previewSlug) {
          body.storefrontSlug = previewSlug;
        }
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

      if (isStorefrontMode) {
        if (typeof data.storefrontSlug === 'string') {
          setStorefrontInput(data.storefrontSlug);
        }
        if (typeof data.storefrontName === 'string') {
          setStorefrontName(data.storefrontName);
        } else if (data.storefrontName === undefined) {
          setStorefrontName('');
        }
        if (typeof data.storefrontTagline === 'string') {
          setStorefrontTagline(data.storefrontTagline);
        } else if (data.storefrontTagline === undefined) {
          setStorefrontTagline('');
        }
        if (typeof data.storefrontHeroUrl === 'string') {
          setStorefrontHeroUrl(data.storefrontHeroUrl);
        } else if (data.storefrontHeroUrl === undefined) {
          setStorefrontHeroUrl('');
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = isProfileMode
    ? !!displayName.trim() && !isSaving
    : !isSaving &&
      !isUploadingHero &&
      !(storefrontInput.trim() && !!slugError);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {isProfileMode ? 'Profile saved.' : 'Storefront settings saved.'}
        </div>
      )}

      {isProfileMode ? (
        <>
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
            <p className="mt-1 text-xs text-slate-400">
              Email is managed by your sign-in provider and cannot be changed here.
            </p>
          </div>
        </>
      ) : (
        <>
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

          <fieldset className="space-y-4 border-t border-slate-200 pt-4">
            <legend className="text-sm font-semibold text-slate-900">Storefront Branding</legend>
            <p className="text-xs text-slate-400">
              Shown on your public storefront. Does not change your account display name.
            </p>

            <div>
              <label htmlFor="profile-storefrontName" className="mb-1 block text-sm font-medium text-slate-700">
                Storefront name
              </label>
              <input
                type="text"
                id="profile-storefrontName"
                name="storefrontName"
                maxLength={50}
                value={storefrontName}
                onChange={(e) => setStorefrontName(e.target.value)}
                placeholder="E.g. Acme Apparel"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label
                htmlFor="profile-storefrontTagline"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Storefront tagline
              </label>
              <textarea
                id="profile-storefrontTagline"
                name="storefrontTagline"
                maxLength={150}
                rows={2}
                value={storefrontTagline}
                onChange={(e) => setStorefrontTagline(e.target.value)}
                placeholder="A short description of your brand"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label htmlFor="profile-storefrontHero" className="mb-1 block text-sm font-medium text-slate-700">
                Hero image
              </label>
              {storefrontHeroUrl ? (
                <div className="mb-3 overflow-hidden rounded-lg border border-slate-200">
                  <img
                    src={storefrontHeroUrl}
                    alt="Storefront hero preview"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={heroInputRef}
                  type="file"
                  id="profile-storefrontHero"
                  name="storefrontHero"
                  accept="image/*"
                  disabled={isUploadingHero || isSaving}
                  onChange={(e) => void handleHeroSelected(e.target.files)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {storefrontHeroUrl ? (
                  <button
                    type="button"
                    disabled={isUploadingHero || isSaving}
                    onClick={() => setStorefrontHeroUrl('')}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove Image
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {isUploadingHero
                  ? 'Uploading…'
                  : 'PNG, JPEG, or WebP up to 10MB. Saved when you click Save.'}
              </p>
            </div>
          </fieldset>
        </>
      )}

      <button
        type="submit"
        disabled={!canSave}
        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : isUploadingHero ? 'Uploading...' : 'Save'}
      </button>
    </form>
  );
}
