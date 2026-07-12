import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';

interface ShareCatalogButtonProps {
  storefrontUrl: string;
}

export default function ShareCatalogButton({ storefrontUrl }: ShareCatalogButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your storefront link:', storefrontUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
      title={storefrontUrl}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      {copied ? 'Link copied' : 'Share Catalog'}
    </button>
  );
}
