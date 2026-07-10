import { useEffect, useState } from 'react';
import FilterableApparelGrid from '../shared/FilterableApparelGrid';
import type { ApparelFilterItem } from '../../lib/apparel';
import SingleCADUploader from './SingleCADUploader';

interface ApparelCatalogSectionProps {
  initialItems: ApparelFilterItem[];
  storefrontSegment: string;
}

export default function ApparelCatalogSection({
  initialItems,
  storefrontSegment,
}: ApparelCatalogSectionProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  return (
    <>
      <SingleCADUploader onItemCreated={(item) => setItems((prev) => [item, ...prev])} />
      <FilterableApparelGrid
        initialItems={items}
        isSellerView={true}
        storefrontSegment={storefrontSegment}
      />
    </>
  );
}
