import type { DetailsSectionFormProps } from './form-section-types';
import { INPUT_CLASS_SIMPLE } from './form-section-types';

export default function VideoSection({ register }: DetailsSectionFormProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Video Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Walkaround Video URL or Embed
          </label>
          <input
            type="text"
            {...register('videoUrl')}
            className={INPUT_CLASS_SIMPLE}
            placeholder="https://youtu.be/…, https://vimeo.com/…, MP4 URL, or iframe embed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Video Poster / Thumbnail URL
          </label>
          <input
            type="text"
            {...register('videoPosterUrl')}
            className={INPUT_CLASS_SIMPLE}
            placeholder="https://example.com/poster.jpg"
          />
        </div>
      </div>
    </>
  );
}
