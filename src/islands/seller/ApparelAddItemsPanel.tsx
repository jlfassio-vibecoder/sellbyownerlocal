import { useState } from 'react';
import type { ApparelFilterItem } from '../../lib/apparel';
import CatalogUploader from './CatalogUploader';
import BulkImageUploader from './BulkImageUploader';
import SingleCADUploader from './SingleCADUploader';

type AddMethod = 'pdf' | 'bulk' | 'cad';

interface ApparelAddItemsPanelProps {
  sellerId: string;
  onItemCreated: (item: ApparelFilterItem) => void;
}

const METHODS: {
  id: AddMethod;
  label: string;
  subcopy: string;
}[] = [
  {
    id: 'pdf',
    label: 'Upload a PDF catalog',
    subcopy: 'Best for a full line sheet',
  },
  {
    id: 'bulk',
    label: 'Add photos in bulk',
    subcopy: 'Match images to existing items',
  },
  {
    id: 'cad',
    label: 'Add one item from a CAD',
    subcopy: 'Create a single draft from a drawing',
  },
];

export default function ApparelAddItemsPanel({
  sellerId,
  onItemCreated,
}: ApparelAddItemsPanelProps) {
  const [activeMethod, setActiveMethod] = useState<AddMethod | null>(null);

  const toggleMethod = (method: AddMethod) => {
    setActiveMethod((current) => (current === method ? null : method));
  };

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">Add items</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choose how you want to add products. Your catalog stays below so you can get to it
          quickly.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {METHODS.map((method) => {
          const isActive = activeMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              aria-expanded={isActive}
              onClick={() => toggleMethod(method.id)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'border-red-600 bg-red-50 ring-1 ring-red-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{method.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{method.subcopy}</span>
            </button>
          );
        })}
      </div>

      {activeMethod ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">
              {METHODS.find((method) => method.id === activeMethod)?.label}
            </p>
            <button
              type="button"
              onClick={() => setActiveMethod(null)}
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
            >
              Hide
            </button>
          </div>

          {activeMethod === 'pdf' ? <CatalogUploader sellerId={sellerId} embedded /> : null}
          {activeMethod === 'bulk' ? <BulkImageUploader sellerId={sellerId} embedded /> : null}
          {activeMethod === 'cad' ? (
            <SingleCADUploader onItemCreated={onItemCreated} embedded />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
