import SellerSettingToggle from './SellerSettingToggle';

interface SellerFabSettingsPanelProps {
  userId: string;
  initialHideFab?: boolean;
  initialHideListingsBackLink?: boolean;
}

/** Vehicle dashboard buyer-visibility toggles. */
export default function SellerFabSettingsPanel({
  userId,
  initialHideFab = false,
  initialHideListingsBackLink = false,
}: SellerFabSettingsPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SellerSettingToggle
        userId={userId}
        field="hideFab"
        initialValue={initialHideFab}
        title="Hide buyer contact widget"
        description="When enabled, buyers will not see Owner Messaging on your vehicle listings."
        ariaLabel="Hide buyer contact widget"
        enabledToast="Buyer contact widget hidden on your listings."
        disabledToast="Buyer contact widget visible on your listings."
      />
      <SellerSettingToggle
        userId={userId}
        field="hideListingsBackLink"
        initialValue={initialHideListingsBackLink}
        title="Hide All Listings back link"
        description="When enabled, buyers will not see the All Listings / Back link on your vehicle listing pages."
        ariaLabel="Hide All Listings back link"
        enabledToast="All Listings back link hidden on your listings."
        disabledToast="All Listings back link visible on your listings."
      />
    </div>
  );
}
