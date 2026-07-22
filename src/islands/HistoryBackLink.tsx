import type { ReactNode } from 'react';

interface HistoryBackLinkProps {
  fallbackHref?: string;
  className?: string;
  children: ReactNode;
}

function hasSameOriginReferrer(): boolean {
  if (!document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export default function HistoryBackLink({
  fallbackHref = '/vehicles',
  className,
  children,
}: HistoryBackLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasSameOriginReferrer()) {
      return;
    }
    event.preventDefault();
    window.history.back();
  };

  return (
    <a href={fallbackHref} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
