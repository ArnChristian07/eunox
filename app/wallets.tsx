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
  const { wallets, transfers, addWallet, transferBetweenWallets } = useBudget();
  const sym = selectedCurrency.symbol;

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newType, setNewType] = useState<WalletItem['iconType']>('ewallet');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromId, setFromId] = useState(wallets[0]?.id ?? '');
  const [toId, setToId] = useState(wallets[1]?.id ?? '');
  const [transferAmount, setTransferAmount] = useState('');

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const [whole, dec] = totalBalance.toFixed(2).split('.');

  const handleCreateWallet = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addWallet({
      name: trimmed,
      subtitle: newSubtitle.trim() || 'Local wallet',
      balance: parseFloat(newBalance) || 0,
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
                    {tr.dateLabel}
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
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-cream rounded-t-3xl p-6 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal">
                Transfer between wallets
              </Text>
              <Pressable onPress={() => setShowTransferModal(false)}>
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            <Text className="text-[13px] font-medium text-warm-gray mb-1.5">
              From
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {wallets.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => setFromId(w.id)}
                  className={`px-3.5 py-2 rounded-xl border ${
                    fromId === w.id
                      ? 'bg-charcoal border-charcoal'
                      : 'bg-white border-warm-border'
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      fromId === w.id ? 'text-white' : 'text-charcoal'
                    }`}
                  >
                    {w.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-[13px] font-medium text-warm-gray mb-1.5">
              To
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {wallets.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => setToId(w.id)}
                  className={`px-3.5 py-2 rounded-xl border ${
                    toId === w.id
                      ? 'bg-nox-lime border-charcoal'
                      : 'bg-white border-warm-border'
                  }`}
                >
                  <Text className="text-[13px] font-semibold text-charcoal">
                    {w.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="numeric"
              placeholder={`Amount (${sym})`}
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[16px] font-semibold text-charcoal mb-5"
            />

            <Pressable
              onPress={handleTransfer}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                Confirm transfer
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
