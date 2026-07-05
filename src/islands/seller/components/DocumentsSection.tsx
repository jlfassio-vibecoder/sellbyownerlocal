import DocumentUploadFields, { type DocumentField } from '../DocumentUploadFields';
import type { VehicleFormState } from '../../../schemas';
import type { DetailsSectionFormProps } from './form-section-types';

interface DocumentsSectionProps extends DetailsSectionFormProps {
  vehicleId: string;
}

export default function DocumentsSection({
  vehicleId,
  watch,
  setValue,
}: DocumentsSectionProps) {
  const formState = watch() as VehicleFormState;

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Documents</h2>
      <DocumentUploadFields
        vehicleId={vehicleId}
        formState={formState}
        onFieldUpdate={(field: DocumentField, url: string) =>
          setValue(field, url, { shouldDirty: true })
        }
      />
    </>
  );
}
