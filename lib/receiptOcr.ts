import { requireOptionalNativeModule } from 'expo';

interface TextExtractorModule {
  isSupported: boolean;
  extractTextFromImage(uri: string): Promise<string[]>;
}

// Loaded optionally so the app still runs in Expo Go and on web, where the
// native text recognizer (ML Kit on Android, Vision on iOS) isn't bundled.
const extractor = requireOptionalNativeModule<TextExtractorModule>('ExpoTextExtractor');

/** True when this build can read text from photos on the device. */
export const canReadReceipts = extractor?.isSupported === true;

/** Reads text from a local photo on the device. Returns recognized text blocks. */
export async function readTextFromPhoto(uri: string): Promise<string[]> {
  if (!extractor || !canReadReceipts) {
    throw new Error('Receipt reading is not available in this build.');
  }
  return extractor.extractTextFromImage(uri.replace('file://', ''));
}
