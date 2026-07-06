import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase-client';
import SellerHeader from './SellerHeader';

interface SellerPreviewFrameProps {
  vehicleId: string;
  vehicleTitle: string;
  sellerUid: string;
  inquiryCount: number;
}

export default function SellerPreviewFrame({
  vehicleId,
  vehicleTitle,
  sellerUid,
  inquiryCount,
}: SellerPreviewFrameProps) {
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with client sign-out even if API fails
    }
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <SellerHeader
      navigationMode="link"
      linkBasePath={`/seller/vehicles/${vehicleId}`}
      inquiryCount={inquiryCount}
      vehicleTitle={vehicleTitle}
      sellerUid={sellerUid}
      onSignOut={handleSignOut}
    />
  );
}
