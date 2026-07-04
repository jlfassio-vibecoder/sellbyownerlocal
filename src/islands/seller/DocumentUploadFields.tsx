import { useRef, useState, type RefObject } from 'react';
import { CheckCircle2, Loader2, Upload } from 'lucide-react';
import { uploadDocument } from '../../lib/seller-api';
import type { VehicleFormState } from '../../schemas';

export type DocumentField =
  | 'windowStickerUrl'
  | 'carfaxReportUrl'
  | 'kbbReportUrl'
  | 'smogReportUrl';

interface DocumentUploadFieldsProps {
  vehicleId: string;
  formState: VehicleFormState;
  onFieldUpdate: (field: DocumentField, url: string) => void;
}

export default function DocumentUploadFields({
  vehicleId,
  formState,
  onFieldUpdate,
}: DocumentUploadFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const carfaxInputRef = useRef<HTMLInputElement>(null);
  const kbbInputRef = useRef<HTMLInputElement>(null);
  const smogInputRef = useRef<HTMLInputElement>(null);
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DocumentField, string>>>({});

  const handleDocumentUpload = async (file: File, field: DocumentField) => {
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: 'File size exceeds 5MB limit.',
      }));
      return;
    }

    setUploadingField(field);
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

    try {
      const url = await uploadDocument(vehicleId, file);
      onFieldUpdate(field, url);
    } catch (err) {
      console.error('Upload failed', err);
      setFieldErrors((prev) => ({
        ...prev,
        [field]: err instanceof Error ? err.message : 'Failed to upload file. Please try again.',
      }));
    } finally {
      setUploadingField(null);
    }
  };

  const renderUploadZone = (
    field: DocumentField,
    inputRef: RefObject<HTMLInputElement | null>,
    label: string,
    uploadedLabel: string,
    emptyLabel: string,
    isLast = false
  ) => {
    const isUploading = uploadingField === field;
    const error = fieldErrors[field];

    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleDocumentUpload(file, field);
          }}
          className="hidden"
          accept=".pdf,image/png,image/jpeg,image/webp"
        />
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file) handleDocumentUpload(file, field);
          }}
          className={`border-2 border-dashed border-slate-300 rounded-lg p-8 text-center flex flex-col items-center hover:bg-slate-50 transition-colors cursor-pointer group ${isLast ? '' : 'mb-6'} ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 size={32} className="text-slate-400 mb-3 animate-spin" />
              <p className="text-sm font-medium text-slate-900">Uploading...</p>
            </div>
          ) : formState[field] ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 size={32} className="text-green-500 mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">{uploadedLabel}</p>
              <p className="text-xs text-slate-500">Click or drag here to change document</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} className="text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">{emptyLabel}</p>
              <p className="text-xs text-slate-500">PDF, PNG, JPG, or WebP (max. 5MB)</p>
            </>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="pt-6 border-t border-slate-100">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Documents</h3>
      {renderUploadZone(
        'windowStickerUrl',
        fileInputRef,
        'Window Sticker Document',
        'Document uploaded',
        'Click or drag to upload original window sticker'
      )}
      {renderUploadZone(
        'carfaxReportUrl',
        carfaxInputRef,
        'Carfax Report',
        'Carfax Report uploaded',
        'Click or drag to upload Carfax Report'
      )}
      {renderUploadZone(
        'kbbReportUrl',
        kbbInputRef,
        'Kelley Blue Book Report',
        'KBB Report uploaded',
        'Click or drag to upload KBB Report'
      )}
      {renderUploadZone(
        'smogReportUrl',
        smogInputRef,
        'Smog Report',
        'Smog Report uploaded',
        'Click or drag to upload Smog Report',
        true
      )}
    </div>
  );
}
