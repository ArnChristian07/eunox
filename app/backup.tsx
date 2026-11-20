import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Download,
  FileText,
  RotateCcw,
  ShieldCheck,
  Table,
  Upload,
  X,
} from 'lucide-react-native';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import {
  backupFileName,
  buildBackup,
  buildCsv,
  PickedBackup,
  pickBackupFile,
  saveAndShareFile,
} from '@/lib/backup';
import { formatFullDate, formatTimeAgo, toISODate } from '@/lib/dates';

type Banner = { kind: 'ok' | 'error'; text: string };

export default function BackupScreen() {
  const { transactions, lastBackup, exportSnapshot, recordBackup, restoreSnapshot } =
    useBudget();
  const { hasCompletedOnboarding, getMoneySettings, applyMoneySettings } =
    useOnboarding();

  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState<'backup' | 'csv' | 'pick' | 'restore' | null>(null);
  const [picked, setPicked] = useState<PickedBackup | null>(null);
  const [backupBeforeRestore, setBackupBeforeRestore] = useState(true);

  const hasLocalData = transactions.length > 0;

  const backUpNow = async (): Promise<boolean> => {
    const payload = JSON.stringify(buildBackup(exportSnapshot(), getMoneySettings()));
    try {
      const saved = await saveAndShareFile(backupFileName(), payload, 'application/json');
      recordBackup({ at: new Date().toISOString(), ...saved });
      setBanner({ kind: 'ok', text: `Saved ${saved.fileName} (${saved.sizeKb} KB)` });
      return true;
    } catch {
      setBanner({ kind: 'error', text: "Couldn't create the backup file" });
      return false;
    }
  };

  const handleBackupNow = async () => {
    setBusy('backup');
    await backUpNow();
    setBusy(null);
  };

  const handleExportCsv = async () => {
    if (!hasLocalData) {
      setBanner({ kind: 'error', text: 'No transactions to export yet' });
      return;
    }
    setBusy('csv');
    try {
      await saveAndShareFile(
        `eunox-transactions-${toISODate(new Date())}.csv`,
        buildCsv(transactions),
        'text/csv'
      );
      setBanner({
        kind: 'ok',
        text: `Exported ${transactions.length} transactions as CSV`,
      });
    } catch {
      setBanner({ kind: 'error', text: "Couldn't create the CSV file" });
    }
    setBusy(null);
  };

  const handlePickFile = async () => {
    setBusy('pick');
    try {
      const result = await pickBackupFile();
      if (result.status === 'picked') {
        setBackupBeforeRestore(hasLocalData);
        setPicked(result.backup);
      } else if (result.status === 'invalid') {
        setBanner({
          kind: 'error',
          text: `${result.fileName} isn't a Eunox backup file`,
        });
      }
    } catch {
      setBanner({ kind: 'error', text: "Couldn't open the file" });
    }
    setBusy(null);
  };

  const handleConfirmRestore = async () => {
    if (!picked) return;
    setBusy('restore');
    if (backupBeforeRestore && hasLocalData) {
      const ok = await backUpNow();
      if (!ok) {
        setBusy(null);
        return;
      }
    }
    const restored = restoreSnapshot(picked.data);
    setBusy(null);
    setPicked(null);
    if (!restored) {
      setBanner({ kind: 'error', text: 'That backup file is damaged' });
      return;
    }
    const wasOnboarding = !hasCompletedOnboarding;
    applyMoneySettings(picked.data.settings ?? {});
    setBanner({
      kind: 'ok',
      text: `Restored ${picked.data.transactions.length} transactions`,
    });
    if (wasOnboarding) {
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(tabs)');
    }
  };

  const pickedDate = picked?.data.exportedAt
    ? formatFullDate(toISODate(new Date(picked.data.exportedAt)))
    : 'an unknown date';

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 pt-2 pb-4">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
          >
            <ChevronLeft size={20} color="#141413" strokeWidth={2} />
          </Pressable>
          <Text className="text-[22px] font-bold tracking-tight text-charcoal">
            Backup and restore
          </Text>
        </View>

        {banner ? (
          <View
            className={`mb-4 rounded-2xl px-4 py-3 flex-row items-center justify-between ${
              banner.kind === 'ok' ? 'bg-nox-lime' : 'bg-[#FCEEE4]'
            }`}
          >
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              {banner.kind === 'ok' ? (
                <Check size={16} color="#141413" strokeWidth={2.5} />
              ) : (
                <AlertTriangle size={16} color="#B85318" strokeWidth={2.2} />
              )}
              <Text
                className={`text-[13.5px] font-semibold ${
                  banner.kind === 'ok' ? 'text-charcoal' : 'text-[#B85318]'
                }`}
              >
                {banner.text}
              </Text>
            </View>
            <Pressable onPress={() => setBanner(null)} accessibilityLabel="Dismiss">
              <X size={16} color="#141413" />
            </Pressable>
          </View>
        ) : null}

        {/* Backup Status Card */}
        <View className="bg-white border border-warm-border rounded-3xl p-4">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-2xl bg-[#F3F2EC] items-center justify-center">
              <ShieldCheck size={22} color="#141413" strokeWidth={1.9} />
            </View>
            <View className="flex-1">
              <Text className="text-[15.5px] font-bold text-charcoal">
                {lastBackup
                  ? `Last backup: ${formatTimeAgo(lastBackup.at)}`
                  : 'No backup yet'}
              </Text>
              <Text className="text-[13px] text-warm-gray mt-0.5">
                {lastBackup
                  ? `${lastBackup.fileName} · ${lastBackup.sizeKb} KB`
                  : 'Your data only lives on this phone'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleBackupNow}
            disabled={busy !== null}
            className="mt-4 bg-charcoal rounded-full h-[50px] flex-row items-center justify-center gap-2 active:opacity-85"
          >
            {busy === 'backup' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Upload size={17} color="#FFFFFF" strokeWidth={2.1} />
            )}
            <Text className="text-white text-[15px] font-semibold">Back up now</Text>
          </Pressable>

          <Text className="mt-3 text-[12.5px] leading-[18px] text-warm-gray">
            Saves one file with everything: entries, wallets, categories, goals,
            bills and your currency. Keep it in Files, a drive, or send it to
            yourself.
          </Text>
        </View>

        {/* Other Options */}
        <Text className="mt-5 mb-2.5 px-1 text-[13px] font-medium text-warm-gray">
          Other options
        </Text>

        <View className="gap-3">
          <Pressable
            onPress={handleExportCsv}
            disabled={busy !== null}
            className="bg-white border border-warm-border rounded-2xl px-4 py-4 flex-row items-center gap-3 active:opacity-75"
          >
            <Table size={19} color="#141413" strokeWidth={1.9} />
            <Text className="flex-1 text-[15px] font-semibold text-charcoal">
              Export as spreadsheet (CSV)
            </Text>
            {busy === 'csv' ? <ActivityIndicator color="#141413" /> : null}
          </Pressable>

          <Pressable
            onPress={handlePickFile}
            disabled={busy !== null}
            className="bg-white border border-warm-border rounded-2xl px-4 py-4 flex-row items-center gap-3 active:opacity-75"
          >
            <Download size={19} color="#141413" strokeWidth={1.9} />
            <Text className="flex-1 text-[15px] font-semibold text-charcoal">
              Restore from backup file
            </Text>
            {busy === 'pick' ? <ActivityIndicator color="#141413" /> : null}
          </Pressable>
        </View>

        {/* Warning */}
        <View className="flex-row items-start gap-2.5 mt-4 px-1">
          <AlertTriangle size={16} color="#B85318" strokeWidth={2} />
          <Text className="flex-1 text-[13px] leading-[18px] text-[#B85318]">
            Backup files are not encrypted. Restoring replaces everything on this
            phone.
          </Text>
        </View>
      </ScrollView>

      {/* Restore Confirmation Modal */}
      <Modal
        visible={picked !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicked(null)}
      >
        <View className="flex-1 bg-black/45 items-center justify-center px-6">
          <View className="w-full bg-white rounded-3xl p-6">
            <View className="w-12 h-12 rounded-2xl bg-[#FCEEE4] items-center justify-center mb-4">
              <RotateCcw size={22} color="#B85318" strokeWidth={2} />
            </View>

            <Text className="text-[20px] leading-[26px] font-bold text-charcoal">
              {hasLocalData ? 'Replace everything on this phone?' : 'Restore this backup?'}
            </Text>
            <Text className="mt-2 text-[13.5px] leading-[19px] text-warm-gray">
              This backup is from {pickedDate}.
              {hasLocalData
                ? ` The ${transactions.length} transactions on this phone will be replaced.`
                : ''}
            </Text>

            <View className="mt-4 bg-[#F3F2EC] rounded-2xl p-3.5 flex-row items-center gap-3">
              <FileText size={18} color="#66655E" strokeWidth={1.9} />
              <View className="flex-1">
                <Text className="text-[13.5px] font-semibold text-charcoal" numberOfLines={1}>
                  {picked?.fileName}
                </Text>
                <Text className="text-[12px] text-warm-gray mt-0.5">
                  {picked?.sizeKb} KB · {picked?.data.transactions.length ?? 0}{' '}
                  transactions · {picked?.data.wallets.length ?? 0} wallets
                </Text>
              </View>
            </View>

            {hasLocalData ? (
              <View className="flex-row items-center justify-between mt-4">
                <Text className="flex-1 pr-3 text-[13.5px] font-medium text-charcoal">
                  Back up today&apos;s data first
                </Text>
                <Switch
                  value={backupBeforeRestore}
                  onValueChange={setBackupBeforeRestore}
                  trackColor={{ false: '#D9D7CE', true: '#141413' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ) : null}

            <View className="flex-row gap-3 mt-5">
              <Pressable
                onPress={() => setPicked(null)}
                disabled={busy === 'restore'}
                className="flex-1 h-12 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
              >
                <Text className="text-[15px] font-semibold text-charcoal">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmRestore}
                disabled={busy === 'restore'}
                className="flex-1 h-12 rounded-2xl bg-[#B85318] items-center justify-center active:opacity-85"
              >
                {busy === 'restore' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-[15px] font-semibold text-white">Restore</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
