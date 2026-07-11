import { useEffect, useState } from 'react';
import FilterableApparelGrid from '../shared/FilterableApparelGrid';
import type { ApparelFilterItem } from '../../lib/apparel';
import ApparelAddItemsPanel from './ApparelAddItemsPanel';

interface ApparelCatalogSectionProps {
  sellerId: string;
  initialItems: ApparelFilterItem[];
  storefrontSegment: string;
}

export default function ApparelCatalogSection({
  sellerId,
  initialItems,
  storefrontSegment,
}: ApparelCatalogSectionProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  return (
    <>
      <ApparelAddItemsPanel
        sellerId={sellerId}
        onItemCreated={(item) => setItems((prev) => [item, ...prev])}
      />
      <FilterableApparelGrid
        initialItems={items}
        isSellerView={true}
        storefrontSegment={storefrontSegment}
      />
    </>
  );
}
