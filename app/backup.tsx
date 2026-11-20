import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Download,
  ShieldCheck,
  Table,
  Upload,
  X,
} from 'lucide-react-native';
import { useBudget } from '@/context/BudgetContext';

export default function BackupScreen() {
  const { transactions, categories, wallets, goals, bills } = useBudget();

  const [passwordLock, setPasswordLock] = useState(true);
  const [weeklyReminder, setWeeklyReminder] = useState(true);
  const [lastBackupLabel, setLastBackupLabel] = useState('Tue, Nov 17');
  const [backupFileName, setBackupFileName] = useState(
    'eunox-2026-11-17.eunox'
  );
  const [backupSizeKb, setBackupSizeKb] = useState(184);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');

  const handleBackupNow = async () => {
    const payload = JSON.stringify({
      version: '1.0',
      encrypted: passwordLock,
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      wallets,
      goals,
      bills,
    });
    const kb = Math.max(1, Math.round(payload.length / 1024));
    const fileName = 'eunox-2026-11-20.eunox';
    setLastBackupLabel('Today, just now');
    setBackupFileName(fileName);
    setBackupSizeKb(kb);
    setStatusBanner(`Saved ${fileName} (${kb} KB)`);

    try {
      await Share.share({
        title: fileName,
        message: payload,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleExportCsv = async () => {
    const header = 'Date,Title,Category,Type,Wallet,Amount,Note';
    const rows = transactions.map((t) =>
      [
        t.fullDate ?? t.dateLabel,
        `"${t.title.replace(/"/g, '""')}"`,
        t.category,
        t.type,
        t.wallet,
        t.amount.toFixed(2),
        `"${(t.note ?? '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    setStatusBanner(`Prepared CSV with ${transactions.length} transactions`);

    try {
      await Share.share({
        title: 'eunox-transactions.csv',
        message: csv,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleConfirmRestore = () => {
    if (passwordLock && !restorePassword.trim()) return;
    setRestorePassword('');
    setShowRestoreModal(false);
    setStatusBanner('Restored data from local backup');
  };

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

        {statusBanner ? (
          <View className="mb-4 bg-nox-lime rounded-2xl px-4 py-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              <Check size={16} color="#141413" strokeWidth={2.5} />
              <Text className="text-[13.5px] font-semibold text-charcoal">
                {statusBanner}
              </Text>
            </View>
            <Pressable onPress={() => setStatusBanner(null)}>
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
                Last backup: {lastBackupLabel}
              </Text>
              <Text className="text-[13px] text-warm-gray mt-0.5">
                {backupFileName} · {backupSizeKb} KB
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleBackupNow}
            className="mt-4 bg-charcoal rounded-full h-[50px] flex-row items-center justify-center gap-2 active:opacity-85"
          >
            <Upload size={17} color="#FFFFFF" strokeWidth={2.1} />
            <Text className="text-white text-[15px] font-semibold">
              Back up now
            </Text>
          </Pressable>

          <Text className="mt-3 text-[12.5px] leading-[18px] text-warm-gray">
            Saves one file you can keep on your phone, a USB drive, or send to
            yourself.
          </Text>
        </View>

        {/* Backup Options */}
        <View className="mt-4 bg-white border border-warm-border rounded-3xl px-4">
          <View className="flex-row items-center justify-between py-3.5 border-b border-warm-border">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                Lock file with a password
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Needed to restore it later
              </Text>
            </View>
            <Switch
              value={passwordLock}
              onValueChange={setPasswordLock}
              trackColor={{ false: '#D9D7CE', true: '#141413' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row items-center justify-between py-3.5">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-charcoal">
                Weekly reminder
              </Text>
              <Text className="text-[12.5px] text-warm-gray mt-0.5">
                Every Sunday evening
              </Text>
            </View>
            <Switch
              value={weeklyReminder}
              onValueChange={setWeeklyReminder}
              trackColor={{ false: '#D9D7CE', true: '#141413' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Other Options */}
        <Text className="mt-5 mb-2.5 px-1 text-[13px] font-medium text-warm-gray">
          Other options
        </Text>

        <View className="gap-3">
          <Pressable
            onPress={handleExportCsv}
            className="bg-white border border-warm-border rounded-2xl px-4 py-4 flex-row items-center gap-3 active:opacity-75"
          >
            <Table size={19} color="#141413" strokeWidth={1.9} />
            <Text className="text-[15px] font-semibold text-charcoal">
              Export as spreadsheet (CSV)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowRestoreModal(true)}
            className="bg-white border border-warm-border rounded-2xl px-4 py-4 flex-row items-center gap-3 active:opacity-75"
          >
            <Download size={19} color="#141413" strokeWidth={1.9} />
            <Text className="text-[15px] font-semibold text-charcoal">
              Restore from backup file
            </Text>
          </Pressable>
        </View>

        {/* Warning */}
        <View className="flex-row items-start gap-2.5 mt-4 px-1">
          <AlertTriangle size={16} color="#B85318" strokeWidth={2} />
          <Text className="flex-1 text-[13px] leading-[18px] text-[#B85318]">
            Restoring replaces everything on this phone. Back up first.
          </Text>
        </View>
      </ScrollView>

      {/* Restore Confirmation Modal */}
      <Modal
        visible={showRestoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-cream rounded-t-3xl p-6 pb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[18px] font-bold text-charcoal">
                Restore from {backupFileName}
              </Text>
              <Pressable onPress={() => setShowRestoreModal(false)}>
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            <Text className="text-[14px] text-warm-gray mb-4">
              This will restore your local budget snapshot from {lastBackupLabel}.
            </Text>

            {passwordLock ? (
              <TextInput
                value={restorePassword}
                onChangeText={setRestorePassword}
                secureTextEntry
                placeholder="Enter backup password"
                placeholderTextColor="#8A8880"
                className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-4"
              />
            ) : null}

            <Pressable
              onPress={handleConfirmRestore}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                Restore backup
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
