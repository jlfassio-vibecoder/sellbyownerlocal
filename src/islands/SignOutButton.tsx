import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { auth } from '../lib/firebase-client';

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with client sign-out even if API fails
    }
    try {
      await signOut(auth);
    } catch {
      // Session cookie clear is enough to leave the account page
    }
    window.location.href = '/login';
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-70"
    >
      <LogOut size={14} aria-hidden="true" />
      {busy ? 'Signing out…' : 'Sign Out'}
    </button>
  );
}
