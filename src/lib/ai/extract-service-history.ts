import { generateObject, type FilePart, type TextPart } from 'ai';
import type { VehicleResponse } from '../../schemas';
import { downloadHistoryReportsForAi } from '../download-history-reports-for-ai';
import { ExtractServiceHistoryRecordSchema } from '../../schemas';
import { z } from 'zod';
import { GEMINI_TEXT_MODEL, getGeminiTextModel } from './gemini';

const MULTIMODAL_GENERATION_TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT =
  "You are an automotive data extraction assistant. Read the provided vehicle history reports. Extract all maintenance and service records chronologically. Ignore registration renewals, title changes, or duplicate entries. Output a JSON array of objects with 'date' (e.g., 'NOV 14, 2024') and 'description' (concise, e.g., 'Full synthetic oil change'). Max 30 records.";

const AiExtractedServiceHistorySchema = z.object({
  records: z.array(ExtractServiceHistoryRecordSchema).max(30),
});

export type ExtractServiceHistoryResult = {
  records: z.infer<typeof ExtractServiceHistoryRecordSchema>[];
  model: string;
};

function buildUserMessageContent(
  vehicle: VehicleResponse,
  files: Awaited<ReturnType<typeof downloadHistoryReportsForAi>>
): Array<TextPart | FilePart> {
  const parts: Array<TextPart | FilePart> = [
    {
      type: 'text',
      text: `Extract service history for ${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
    },
  ];

  for (const file of files) {
    parts.push({
      type: 'file',
      data: file.base64,
      mediaType: file.mediaType,
    });
  }

  return parts;
}

export async function extractServiceHistory(
  vehicle: VehicleResponse
): Promise<ExtractServiceHistoryResult> {
  const files = await downloadHistoryReportsForAi(vehicle.id, vehicle);

  const result = await generateObject({
    model: getGeminiTextModel(),
    schema: AiExtractedServiceHistorySchema,
    instructions: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildUserMessageContent(vehicle, files),
      },
    ],
    abortSignal: AbortSignal.timeout(MULTIMODAL_GENERATION_TIMEOUT_MS),
  });

  return {
    records: result.object.records,
    model: GEMINI_TEXT_MODEL,
  };
}
