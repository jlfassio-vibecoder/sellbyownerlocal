import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle, Save } from 'lucide-react';
import { updateVehicle } from '../../lib/seller-api';
import type { VehicleFormState } from '../../schemas';
import BasicsSection from './components/BasicsSection';
import type { DetailsSection } from './components/details-nav-types';
import DesktopRailNav from './components/DesktopRailNav';
import MobilePillNav from './components/MobilePillNav';
import DocumentsSection from './components/DocumentsSection';
import GallerySection from './components/GallerySection';
import HighlightsSection from './components/HighlightsSection';
import MarketValuationSection from './components/MarketValuationSection';
import MechanicalSection from './components/MechanicalSection';
import OverviewSection from './components/OverviewSection';
import VideoSection from './components/VideoSection';

interface DetailsEditorProps {
  vehicleId: string;
  formState: VehicleFormState;
  onChange: (state: VehicleFormState) => void;
}

const SECTION_IDS = [
  'basics',
  'overview',
  'mechanical',
  'market',
  'highlights',
  'video',
  'gallery',
  'documents',
] as const;
type SectionId = (typeof SECTION_IDS)[number];

const SECTION_LABELS: Record<SectionId, string> = {
  basics: 'Basics',
  overview: "Overview & Seller's Note",
  mechanical: 'Mechanical Integrity',
  market: 'Market Valuation',
  highlights: 'Highlights & Utility',
  video: 'Video',
  gallery: 'Gallery Photos',
  documents: 'Documents',
};

export default function DetailsEditor({ vehicleId, formState, onChange }: DetailsEditorProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('basics');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormState>({
    defaultValues: {
      ...formState,
      images: formState.images ?? [],
      marketValuation: formState.marketValuation ?? { comparables: [] },
    },
  });

  useEffect(() => {
    reset({
      ...formState,
      images: formState.images ?? [],
      marketValuation: formState.marketValuation ?? { comparables: [] },
    });
  }, [vehicleId, reset]);

  useEffect(() => {
    const sub = watch((values) => onChange(values as VehicleFormState));
    return () => sub.unsubscribe();
  }, [watch, onChange]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const onValidSubmit = async (data: VehicleFormState) => {
    try {
      await updateVehicle(vehicleId, data);
      showToast('Listing saved successfully!', 'success');
    } catch (err) {
      console.error('Failed to update details', err);
      showToast('Failed to save changes.', 'error');
    }
  };

  const values = watch();

  const isComplete: Record<SectionId, boolean> = {
    basics: !!(values.mileage && values.price),
    overview: !!(
      values.subtitle &&
      values.msrp &&
      values.sellersNoteIntro &&
      values.peaceOfMindText &&
      values.maintenanceText &&
      values.utilityTowingText &&
      values.luxuryOptionsText &&
      values.ctaText
    ),
    mechanical: !!(
      values.mechanicalIntegrityIntro &&
      values.mechanicalItem1Title &&
      values.mechanicalItem1Text &&
      values.mechanicalItem2Title &&
      values.mechanicalItem2Text &&
      values.mechanicalItem3Title &&
      values.mechanicalItem3Text
    ),
    market: !!(
      values.marketValuation?.contextText &&
      values.marketValuation?.dealerRealityText &&
      values.marketValuation?.kbbText &&
      values.marketValuation?.justificationText
    ),
    highlights: !!(
      values.highlight1Title &&
      values.highlight2Title &&
      values.highlight3Title &&
      values.highlight4Title
    ),
    video: !!(values.videoUrl && values.videoPosterUrl),
    gallery: !!(values.images && values.images.length > 0),
    documents: !!(
      values.windowStickerUrl ||
      values.carfaxReportUrl ||
      values.kbbReportUrl ||
      values.smogReportUrl
    ),
  };

  const sections: DetailsSection[] = SECTION_IDS.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    complete: isComplete[id],
  }));

  const sectionStyle = (id: SectionId): React.CSSProperties => ({
    display: activeSection === id ? 'block' : 'none',
  });

  const sectionProps = { register, control, errors, setValue, watch };

  return (
    <>
      <form
        onSubmit={handleSubmit(onValidSubmit)}
        className="flex-1 min-h-0 flex overflow-hidden bg-slate-50"
      >
        <DesktopRailNav
          sections={sections}
          activeId={activeSection}
          onSelect={(id) => setActiveSection(id as SectionId)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <MobilePillNav
            sections={sections}
            activeId={activeSection}
            onSelect={(id) => setActiveSection(id as SectionId)}
          />

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div style={sectionStyle('basics')}>
                <BasicsSection
                  {...sectionProps}
                  vehicleId={vehicleId}
                  onPopulate={(state) => reset(state)}
                />
              </div>
              <div style={sectionStyle('overview')}>
                <OverviewSection {...sectionProps} />
              </div>
              <div style={sectionStyle('mechanical')}>
                <MechanicalSection {...sectionProps} />
              </div>
              <div style={sectionStyle('market')}>
                <MarketValuationSection {...sectionProps} />
              </div>
              <div style={sectionStyle('highlights')}>
                <HighlightsSection {...sectionProps} />
              </div>
              <div style={sectionStyle('video')}>
                <VideoSection {...sectionProps} />
              </div>
              <div style={sectionStyle('gallery')}>
                <GallerySection vehicleId={vehicleId} {...sectionProps} />
              </div>
              <div style={sectionStyle('documents')}>
                <DocumentsSection vehicleId={vehicleId} {...sectionProps} />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-8 py-4 flex items-center gap-4">
            <span className="text-sm text-slate-500">{SECTION_LABELS[activeSection]}</span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Save size={18} />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

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
