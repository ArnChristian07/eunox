import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import type { BudgetSnapshot, Transaction } from '@/context/BudgetContext';
import type { MoneySettings } from '@/context/OnboardingContext';
import { toISODate } from '@/lib/dates';

export const BACKUP_APP_ID = 'eunox';

export interface BackupFile extends BudgetSnapshot {
  app: typeof BACKUP_APP_ID;
  exportedAt: string;
  settings?: MoneySettings;
}

export interface SavedFile {
  fileName: string;
  sizeKb: number;
}

export interface PickedBackup {
  fileName: string;
  sizeKb: number;
  data: BackupFile;
}

export function buildBackup(snapshot: BudgetSnapshot, settings: MoneySettings): BackupFile {
  return {
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    settings,
    ...snapshot,
  };
}

export function backupFileName(now: Date = new Date()): string {
  return `eunox-backup-${toISODate(now)}.json`;
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCsv(transactions: Transaction[]): string {
  const header = 'Date,Title,Category,Type,Wallet,Amount,Note';
  const rows = transactions.map((t) =>
    [
      t.date,
      csvCell(t.title),
      csvCell(t.category),
      t.type,
      csvCell(t.wallet),
      t.amount.toFixed(2),
      csvCell(t.note ?? ''),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function downloadOnWeb(fileName: string, contents: string, mimeType: string) {
  const doc = (globalThis as any).document;
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Writes the file and opens the share sheet so the user can save it to Files,
 * a drive, or send it to themselves. Resolves once the file exists.
 */
export async function saveAndShareFile(
  fileName: string,
  contents: string,
  mimeType: string
): Promise<SavedFile> {
  const sizeKb = Math.max(1, Math.round(contents.length / 1024));

  if (Platform.OS === 'web') {
    downloadOnWeb(fileName, contents, mimeType);
    return { fileName, sizeKb };
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(contents);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
  } else {
    await Share.share({ title: fileName, message: contents });
  }
  return { fileName, sizeKb };
}

export function parseBackup(text: string): BackupFile | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const snap = data as Partial<BackupFile>;
  const arrays = [
    snap.transactions,
    snap.categories,
    snap.wallets,
    snap.transfers,
    snap.goals,
    snap.bills,
  ];
  if (!arrays.every(Array.isArray)) return null;
  if ((snap.wallets ?? []).length === 0) return null;
  return snap as BackupFile;
}

export type PickResult =
  | { status: 'picked'; backup: PickedBackup }
  | { status: 'cancelled' }
  | { status: 'invalid'; fileName: string };

export async function pickBackupFile(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };

  const asset = result.assets[0];
  let text: string;
  try {
    text =
      Platform.OS === 'web'
        ? await (asset.file ? asset.file.text() : fetch(asset.uri).then((r) => r.text()))
        : await new File(asset.uri).text();
  } catch {
    return { status: 'invalid', fileName: asset.name };
  }

  const data = parseBackup(text);
  if (!data) return { status: 'invalid', fileName: asset.name };
  return {
    status: 'picked',
    backup: {
      fileName: asset.name,
      sizeKb: Math.max(1, Math.round((asset.size ?? text.length) / 1024)),
      data,
    },
  };
}
