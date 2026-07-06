export const STICKER_SOURCE_OF_TRUTH_DIRECTIVE = [
  'If a window sticker image or PDF is provided, it is your ABSOLUTE SOURCE OF TRUTH.',
  'You must extract the Standard Equipment and Optional Equipment exactly as written on the document.',
  'Preserve the exact category headers (e.g. FUNCTIONAL/SAFETY FEATURES, INTERIOR FEATURES) and list every single bullet point verbatim.',
  'Do NOT invent, guess, or infer standard equipment.',
  'If a file is provided, do not rely on generic VIN knowledge for the Monroney schema — use only what appears on the sticker for monroney pricing, options, and standardEquipment.',
].join(' ');

export const MONRONEY_FROM_STICKER_USER_LINES = [
  'Extract Monroney window sticker data from the uploaded document.',
  '- baseMsrp, destinationCharge, totalMsrp, options, and standardEquipment must match the sticker exactly',
  '- preserve exact standardEquipment category names and bullet text from the sticker',
  '- optional equipment line items must match the sticker labels and prices exactly',
  '- include warranty and partsContent when visible on the sticker',
  '- do NOT include styleLine, factorySpecs, epa, safetyRatings, assembly, or manufacturerInfo — those are added server-side when a VIN is available',
];
