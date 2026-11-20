import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AlertTriangle,
  ChevronLeft,
  Download,
  ShieldCheck,
  Table,
  Upload,
} from 'lucide-react-native';

export default function BackupScreen() {
  const [passwordLock, setPasswordLock] = useState(true);
  const [weeklyReminder, setWeeklyReminder] = useState(true);

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

        {/* Backup Status Card */}
        <View className="bg-white border border-warm-border rounded-3xl p-4">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-2xl bg-[#F3F2EC] items-center justify-center">
              <ShieldCheck size={22} color="#141413" strokeWidth={1.9} />
            </View>
            <View className="flex-1">
              <Text className="text-[15.5px] font-bold text-charcoal">
                Last backup: Tue, Nov 17
              </Text>
              <Text className="text-[13px] text-warm-gray mt-0.5">
                eunox-2026-11-17.eunox · 184 KB
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() =>
              Alert.alert(
                'Backup saved',
                'Created eunox-2026-11-20.eunox on your device.'
              )
            }
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
            onPress={() =>
              Alert.alert('Export CSV', 'Exported November transactions to CSV.')
            }
            className="bg-white border border-warm-border rounded-2xl px-4 py-4 flex-row items-center gap-3 active:opacity-75"
          >
            <Table size={19} color="#141413" strokeWidth={1.9} />
            <Text className="text-[15px] font-semibold text-charcoal">
              Export as spreadsheet (CSV)
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                'Restore from backup',
                'Choose a .eunox backup file from your device.'
              )
            }
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
    </SafeAreaView>
  );
}
