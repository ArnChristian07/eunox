import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Banknote,
  ChevronLeft,
  Info,
  Landmark,
  Plus,
  Smartphone,
  X,
} from 'lucide-react-native';
import { useBudget, WalletItem } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { formatShortDate, parseISODate } from '@/lib/dates';

function getWalletIcon(type: WalletItem['iconType']) {
  switch (type) {
    case 'cash':
      return Banknote;
    case 'ewallet':
      return Smartphone;
    case 'bank':
      return Landmark;
  }
}

export default function WalletsScreen() {
  const { selectedCurrency } = useOnboarding();
  const { today, wallets, transfers, addWallet, transferBetweenWallets } =
    useBudget();
  const sym = selectedCurrency.symbol;

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newType, setNewType] = useState<WalletItem['iconType']>('ewallet');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromId, setFromId] = useState(wallets[0]?.id ?? '');
  const [toId, setToId] = useState(wallets[1]?.id ?? '');
  const [transferAmount, setTransferAmount] = useState('1000');

  const fromWallet = wallets.find((w) => w.id === fromId) ?? wallets[0];
  const toWallet = wallets.find((w) => w.id === toId) ?? wallets[1] ?? wallets[0];

  const cycleWallet = (currentId: string, setter: (id: string) => void) => {
    const idx = wallets.findIndex((w) => w.id === currentId);
    const next = wallets[(idx + 1) % wallets.length];
    if (next) setter(next.id);
  };

  const swapWallets = () => {
    const prevFrom = fromId;
    setFromId(toId);
    setToId(prevFrom);
  };

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const [whole, dec] = totalBalance.toFixed(2).split('.');

  const handleCreateWallet = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addWallet({
      name: trimmed,
      subtitle: newSubtitle.trim() || 'Local wallet',
      initialBalance: parseFloat(newBalance) || 0,
      iconType: newType,
    });
    setNewName('');
    setNewSubtitle('');
    setNewBalance('');
    setShowAddModal(false);
  };

  const handleTransfer = () => {
    const amt = parseFloat(transferAmount) || 0;
    if (amt <= 0 || !fromId || !toId || fromId === toId) return;
    transferBetweenWallets(fromId, toId, amt);
    setTransferAmount('');
    setShowTransferModal(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5 pb-5 justify-between">
        <ScrollView showsVerticalScrollIndicator={false}>
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
              Wallets
            </Text>
          </View>

          {/* Total Balance */}
          <Text className="text-[13.5px] text-warm-gray">
            Total across {wallets.length} wallets
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-[36px] leading-[42px] font-bold tracking-tight text-charcoal">
              {sym}
              {Number(whole).toLocaleString('en-US')}
            </Text>
            <Text className="text-[32px] leading-[38px] font-bold text-[#8A8880]">
              .{dec}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-4 mb-5">
            <Pressable
              onPress={() => {
                setFromId(wallets[0]?.id ?? '');
                setToId(wallets[1]?.id ?? wallets[0]?.id ?? '');
                setShowTransferModal(true);
              }}
              className="flex-1 bg-charcoal rounded-2xl h-12 flex-row items-center justify-center gap-2 active:opacity-85"
            >
              <ArrowLeftRight size={16} color="#FFFFFF" strokeWidth={2} />
              <Text className="text-white text-[14.5px] font-semibold">
                Transfer
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowAddModal(true)}
              className="flex-1 bg-white border border-warm-border rounded-2xl h-12 flex-row items-center justify-center gap-1.5 active:opacity-75"
            >
              <Plus size={16} color="#141413" strokeWidth={2.2} />
              <Text className="text-charcoal text-[14.5px] font-semibold">
                Add wallet
              </Text>
            </Pressable>
          </View>

          {/* Wallet Cards */}
          <View className="gap-3">
            {wallets.map((w, idx) => {
              const Icon = getWalletIcon(w.iconType);
              return (
                <Animated.View
                  key={w.id}
                  entering={FadeInDown.delay(idx * 60).duration(280)}
                  className="bg-white border border-warm-border rounded-3xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                    <View
                      className={`w-11 h-11 rounded-2xl items-center justify-center ${
                        w.isDefault ? 'bg-nox-lime' : 'bg-[#F3F2EC]'
                      }`}
                    >
                      <Icon size={20} color="#141413" strokeWidth={1.9} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15.5px] font-semibold text-charcoal">
                        {w.name}
                      </Text>
                      <Text className="text-[12.5px] text-warm-gray mt-0.5">
                        {w.subtitle}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-[15.5px] font-bold text-charcoal">
                    {sym}
                    {w.balance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          {/* Recent Transfers */}
          <Text className="mt-6 mb-3 text-[16px] font-bold text-charcoal">
            Recent transfers
          </Text>
          <View className="gap-3">
            {transfers.map((tr) => (
              <View
                key={tr.id}
                className="flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-[14.5px] font-semibold text-charcoal">
                    {tr.from} → {tr.to}
                  </Text>
                  <Text className="text-[12.5px] text-warm-gray mt-0.5">
                    {formatShortDate(parseISODate(tr.date), today)}
                  </Text>
                </View>
                <Text className="text-[14.5px] font-semibold text-charcoal">
                  {sym}
                  {tr.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Info */}
        <View className="flex-row items-start gap-2.5 pt-4">
          <Info size={16} color="#8A8880" strokeWidth={2} />
          <Text className="flex-1 text-[12.5px] leading-[18px] text-warm-gray">
            Balances come from what you record. Eunox never connects to your
            bank or e-wallet.
          </Text>
        </View>
      </View>

      {/* Add Wallet Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-cream rounded-t-3xl p-6 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal">
                Add wallet
              </Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Wallet name (e.g. Travel fund)"
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-3"
            />
            <TextInput
              value={newSubtitle}
              onChangeText={setNewSubtitle}
              placeholder="Note (optional)"
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-3"
            />
            <TextInput
              value={newBalance}
              onChangeText={setNewBalance}
              keyboardType="numeric"
              placeholder={`Starting balance (${sym}0)`}
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-4"
            />

            <View className="flex-row gap-2 mb-5">
              {(['cash', 'ewallet', 'bank'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setNewType(t)}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${
                    newType === t
                      ? 'bg-charcoal border-charcoal'
                      : 'bg-white border-warm-border'
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold capitalize ${
                      newType === t ? 'text-white' : 'text-charcoal'
                    }`}
                  >
                    {t === 'ewallet' ? 'E-wallet' : t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleCreateWallet}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                Create wallet
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View className="flex-1 bg-black/45 justify-end">
          <View className="bg-cream rounded-t-3xl px-6 pt-3 pb-8">
            <View className="w-10 h-1 rounded-full bg-[#D5D3CA] self-center mb-4" />

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[20px] font-bold text-charcoal">
                Transfer
              </Text>
              <Pressable
                onPress={() => setShowTransferModal(false)}
                className="w-9 h-9 rounded-xl bg-white border border-warm-border items-center justify-center"
              >
                <X size={18} color="#141413" />
              </Pressable>
            </View>

            {/* From / To Stacked Cards with Swap Button */}
            <View className="relative">
              <Pressable
                onPress={() => cycleWallet(fromId, setFromId)}
                className="bg-white border border-warm-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-[12px] text-warm-gray">From</Text>
                  <Text className="text-[15.5px] font-bold text-charcoal mt-0.5">
                    {fromWallet?.name}
                  </Text>
                </View>
                <Text className="text-[14px] text-warm-gray">
                  {sym}
                  {(fromWallet?.balance ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => cycleWallet(toId, setToId)}
                className="mt-2 bg-white border border-warm-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-[12px] text-warm-gray">To</Text>
                  <Text className="text-[15.5px] font-bold text-charcoal mt-0.5">
                    {toWallet?.name}
                  </Text>
                </View>
                <Text className="text-[14px] text-warm-gray">
                  {sym}
                  {(toWallet?.balance ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </Pressable>

              <Pressable
                onPress={swapWallets}
                accessibilityLabel="Swap wallets"
                className="absolute right-6 top-1/2 -mt-4 w-9 h-9 rounded-full bg-charcoal items-center justify-center border-2 border-cream"
              >
                <ArrowUpDown size={15} color="#FFFFFF" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Amount */}
            <View className="items-center mt-5">
              <Text className="text-[12.5px] text-warm-gray">Amount</Text>
              <View className="flex-row items-center justify-center mt-1">
                <Text className="text-[32px] font-bold text-charcoal mr-1">
                  {sym}
                </Text>
                <TextInput
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#B5B2A8"
                  className="text-[34px] font-bold text-charcoal min-w-[80px] text-center p-0"
                />
              </View>
            </View>

            {/* Quick Amount Chips */}
            <View className="flex-row justify-center gap-2 mt-4">
              {['500', '1000', '5000'].map((preset) => {
                const active = transferAmount === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setTransferAmount(preset)}
                    className={`rounded-full px-4 py-2 border ${
                      active
                        ? 'bg-charcoal border-charcoal'
                        : 'bg-white border-warm-border'
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        active ? 'text-white' : 'text-charcoal'
                      }`}
                    >
                      {sym}
                      {Number(preset).toLocaleString('en-US')}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() =>
                  setTransferAmount(String(fromWallet?.balance ?? 0))
                }
                className="rounded-full px-4 py-2 bg-white border border-warm-border"
              >
                <Text className="text-[13px] font-semibold text-charcoal">
                  All
                </Text>
              </Pressable>
            </View>

            <Text className="mt-4 mb-4 text-center text-[12px] text-warm-gray">
              Transfers move money between wallets. They don&apos;t count as
              spending.
            </Text>

            <Pressable
              onPress={handleTransfer}
              className="bg-charcoal rounded-full h-[52px] items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15.5px] font-semibold">
                Transfer {sym}
                {(parseFloat(transferAmount) || 0).toLocaleString('en-US')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
