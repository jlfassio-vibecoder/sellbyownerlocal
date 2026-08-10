import SellerSettingToggle from './SellerSettingToggle';

interface SellerFabSettingsPanelProps {
  userId: string;
  initialHideFab?: boolean;
}

/** Vehicle dashboard: single hideFab toggle (apparel uses ApparelBuyerVisibilitySettings). */
export default function SellerFabSettingsPanel({
  userId,
  initialHideFab = false,
}: SellerFabSettingsPanelProps) {
  return (
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
  );
}
