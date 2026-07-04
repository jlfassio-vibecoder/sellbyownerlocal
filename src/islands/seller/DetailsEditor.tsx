import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle, Save, Settings } from 'lucide-react';
import { updateVehicle } from '../../lib/seller-api';
import type { VehicleFormState } from '../../schemas';
import DocumentUploadFields from './DocumentUploadFields';

interface DetailsEditorProps {
  vehicleId: string;
  formState: VehicleFormState;
  onChange: (state: VehicleFormState) => void;
}

export default function DetailsEditor({ vehicleId, formState, onChange }: DetailsEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateVehicle(vehicleId, formState);
      showToast('Listing saved successfully!', 'success');
    } catch (err) {
      console.error('Failed to update details', err);
      showToast('Failed to save changes.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setField = <K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) => {
    onChange({ ...formState, [key]: value });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Settings className="text-slate-400" /> Manage Listing Details
          </h2>

          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            <div>
              <label htmlFor="mileage" className="block text-sm font-medium text-slate-700 mb-2">
                Current Mileage
              </label>
              <input
                type="text"
                id="mileage"
                value={formState.mileage}
                onChange={(e) => setField('mileage', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-slate-900"
                placeholder="e.g. 78,000"
              />
              <p className="text-xs text-slate-500 mt-2">
                This is displayed in the Seller&apos;s Note section.
              </p>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-2">
                Asking Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-500 font-medium">$</span>
                </div>
                <input
                  type="text"
                  id="price"
                  value={formState.price}
                  onChange={(e) => setField('price', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-slate-900"
                  placeholder="e.g. 23,900"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This is displayed in the Seller&apos;s Note and Market Valuation sections.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Overview & Seller&apos;s Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={formState.subtitle || ''}
                    onChange={(e) => setField('subtitle', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900"
                    placeholder="2017 Ram 1500 Crew Cab Night Edition..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Original MSRP
                  </label>
                  <input
                    type="text"
                    value={formState.msrp || ''}
                    onChange={(e) => setField('msrp', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900"
                    placeholder="$59,895"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Seller&apos;s Note Intro Paragraphs
                  </label>
                  <textarea
                    value={formState.sellersNoteIntro || ''}
                    onChange={(e) => setField('sellersNoteIntro', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[100px]"
                    placeholder="If you are looking for a fully-loaded..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Peace of Mind Guarantee Text
                  </label>
                  <textarea
                    value={formState.peaceOfMindText || ''}
                    onChange={(e) => setField('peaceOfMindText', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Recent Maintenance Text/List
                  </label>
                  <textarea
                    value={formState.maintenanceText || ''}
                    onChange={(e) => setField('maintenanceText', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Utility & Towing Text/List
                  </label>
                  <textarea
                    value={formState.utilityTowingText || ''}
                    onChange={(e) => setField('utilityTowingText', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Luxury Options Text/List
                  </label>
                  <textarea
                    value={formState.luxuryOptionsText || ''}
                    onChange={(e) => setField('luxuryOptionsText', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Call to Action Box Text
                  </label>
                  <textarea
                    value={formState.ctaText || ''}
                    onChange={(e) => setField('ctaText', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[100px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Mechanical Integrity & Upgrades
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Section Intro Text
                  </label>
                  <textarea
                    value={formState.mechanicalIntegrityIntro || ''}
                    onChange={(e) => setField('mechanicalIntegrityIntro', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={formState.mechanicalItem1Title || ''}
                    onChange={(e) => setField('mechanicalItem1Title', e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="Item 1 Title"
                  />
                  <textarea
                    value={formState.mechanicalItem1Text || ''}
                    onChange={(e) => setField('mechanicalItem1Text', e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900"
                    placeholder="Item 1 Text"
                  />
                  <input
                    type="text"
                    value={formState.mechanicalItem2Title || ''}
                    onChange={(e) => setField('mechanicalItem2Title', e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="Item 2 Title"
                  />
                  <textarea
                    value={formState.mechanicalItem2Text || ''}
                    onChange={(e) => setField('mechanicalItem2Text', e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900"
                    placeholder="Item 2 Text"
                  />
                  <input
                    type="text"
                    value={formState.mechanicalItem3Title || ''}
                    onChange={(e) => setField('mechanicalItem3Title', e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="Item 3 Title"
                  />
                  <textarea
                    value={formState.mechanicalItem3Text || ''}
                    onChange={(e) => setField('mechanicalItem3Text', e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900"
                    placeholder="Item 3 Text"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Market Valuation Context</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Intro Text</label>
                  <textarea
                    value={formState.marketValuationIntro || ''}
                    onChange={(e) => setField('marketValuationIntro', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dealer Retail Reality Text
                  </label>
                  <textarea
                    value={formState.marketDealerReality || ''}
                    onChange={(e) => setField('marketDealerReality', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    KBB Private Party Value Text
                  </label>
                  <textarea
                    value={formState.marketKbbValue || ''}
                    onChange={(e) => setField('marketKbbValue', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    This Vehicle Text
                  </label>
                  <textarea
                    value={formState.marketThisTruck || ''}
                    onChange={(e) => setField('marketThisTruck', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Vehicle Highlights & Utility
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formState.highlight1Title || ''}
                  onChange={(e) => setField('highlight1Title', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900"
                  placeholder="Highlight 1 Title"
                />
                <textarea
                  value={formState.highlight1Text || ''}
                  onChange={(e) => setField('highlight1Text', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900"
                  placeholder="Highlight 1 Text"
                />
                <input
                  type="text"
                  value={formState.highlight2Title || ''}
                  onChange={(e) => setField('highlight2Title', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900"
                  placeholder="Highlight 2 Title"
                />
                <textarea
                  value={formState.highlight2Text || ''}
                  onChange={(e) => setField('highlight2Text', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900"
                  placeholder="Highlight 2 Text"
                />
                <input
                  type="text"
                  value={formState.highlight3Title || ''}
                  onChange={(e) => setField('highlight3Title', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900"
                  placeholder="Highlight 3 Title"
                />
                <textarea
                  value={formState.highlight3Text || ''}
                  onChange={(e) => setField('highlight3Text', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900"
                  placeholder="Highlight 3 Text"
                />
                <input
                  type="text"
                  value={formState.highlight4Title || ''}
                  onChange={(e) => setField('highlight4Title', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900"
                  placeholder="Highlight 4 Title"
                />
                <textarea
                  value={formState.highlight4Text || ''}
                  onChange={(e) => setField('highlight4Text', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900"
                  placeholder="Highlight 4 Text"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Video Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Walkaround Video URL (MP4)
                  </label>
                  <input
                    type="text"
                    value={formState.videoUrl || ''}
                    onChange={(e) => setField('videoUrl', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900"
                    placeholder="https://example.com/video.mp4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Video Poster / Thumbnail URL
                  </label>
                  <input
                    type="text"
                    value={formState.videoPosterUrl || ''}
                    onChange={(e) => setField('videoPosterUrl', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900"
                    placeholder="https://example.com/poster.jpg"
                  />
                </div>
              </div>
            </div>

            <DocumentUploadFields
              vehicleId={vehicleId}
              formState={formState}
              onFieldUpdate={(field, url) => onChange({ ...formState, [field]: url })}
            />

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <Save size={18} />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md p-4 font-medium text-white shadow-lg transition-all duration-300 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} aria-hidden="true" />
          ) : (
            <AlertCircle size={20} aria-hidden="true" />
          )}
          {toast.message}
        </div>
      )}
    </>
  );
}
