import SellerSettingToggle from './SellerSettingToggle';

interface ApparelBuyerVisibilitySettingsProps {
  userId: string;
  initialHideFab?: boolean;
  initialHideItemDetails?: boolean;
}

export default function ApparelBuyerVisibilitySettings({
  userId,
  initialHideFab = false,
  initialHideItemDetails = false,
}: ApparelBuyerVisibilitySettingsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SellerSettingToggle
        userId={userId}
        field="hideFab"
        initialValue={initialHideFab}
        title="Hide buyer contact widget"
        description="When enabled, buyers will not see the floating Request Quote button on your apparel storefront."
        ariaLabel="Hide buyer contact widget"
        enabledToast="Buyer contact widget hidden on your storefront."
        disabledToast="Buyer contact widget visible on your storefront."
      />
      <SellerSettingToggle
        userId={userId}
        field="hideItemDetails"
        initialValue={initialHideItemDetails}
        title="Hide item details click-through"
        description="When enabled, buyers can browse your storefront catalog but cannot open individual item pages."
        ariaLabel="Hide item details click-through"
        enabledToast="Item detail pages hidden from buyers."
        disabledToast="Item detail pages visible to buyers."
      />
    </div>
  );
}
