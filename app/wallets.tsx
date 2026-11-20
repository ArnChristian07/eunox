import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
  Star,
  Trash2,
  X,
} from 'lucide-react-native';
import { TransferRecord, useBudget, WalletItem } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { formatShortDate, parseISODate } from '@/lib/dates';
import {
  formatMoney,
  isValidPositiveAmount,
  parseAmount,
  splitMoneyParts,
  sumMoney,
} from '@/lib/format';

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
  const {
    today,
    wallets,
    transfers,
    storageError,
    addWallet,
    updateWallet,
    setDefaultWallet,
    deleteWallet,
    transferBetweenWallets,
    deleteTransfer,
  } = useBudget();
  const sym = selectedCurrency.symbol;

  const [showAllTransfers, setShowAllTransfers] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newType, setNewType] = useState<WalletItem['iconType']>('ewallet');
  const [walletError, setWalletError] = useState<string | null>(null);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromId, setFromId] = useState(wallets[0]?.id ?? '');
  const [toId, setToId] = useState(wallets[1]?.id ?? '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

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

  const totalBalance = sumMoney(wallets.map((w) => w.balance));
  const { sign: totalSign, whole, dec } = splitMoneyParts(totalBalance);

  const openAddWallet = () => {
    setEditingWallet(null);
    setNewName('');
    setNewSubtitle('');
    setNewBalance('');
    setNewType('ewallet');
    setWalletError(null);
    setShowAddModal(true);
  };

  const openEditWallet = (w: WalletItem) => {
    setEditingWallet(w);
    setNewName(w.name);
    setNewSubtitle(w.subtitle);
    setNewType(w.iconType);
    setWalletError(null);
    setShowAddModal(true);
  };

  const handleSaveWallet = () => {
    const trimmed = newName.trim();
    if (!trimmed) return setWalletError('Give the wallet a name');
    const taken = wallets.some(
      (w) =>
        w.id !== editingWallet?.id && w.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (taken) return setWalletError(`You already have a wallet called ${trimmed}`);
    if (editingWallet) {
      updateWallet(editingWallet.id, {
        name: trimmed,
        subtitle: newSubtitle.trim() || 'Local wallet',
        iconType: newType,
      });
    } else {
      addWallet({
        name: trimmed,
        subtitle: newSubtitle.trim() || 'Local wallet',
        initialBalance: parseAmount(newBalance, { allowNegative: true }),
        iconType: newType,
      });
    }
    setShowAddModal(false);
  };

  const handleDeleteWallet = () => {
    if (!editingWallet) return;
    const target = editingWallet;
    Alert.alert(`Delete ${target.name}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const problem = deleteWallet(target.id);
          if (problem) setWalletError(problem);
          else setShowAddModal(false);
        },
      },
    ]);
  };

  const handleTransfer = () => {
    const amt = parseAmount(transferAmount);
    const activeFromId = fromWallet?.id ?? '';
    const activeToId = toWallet?.id ?? '';
    if (!activeFromId || !activeToId || activeFromId === activeToId) {
      return setTransferError('Pick two different wallets');
    }
    if (!isValidPositiveAmount(amt)) {
      return setTransferError('Enter a valid amount greater than 0');
    }
    const err = transferBetweenWallets(activeFromId, activeToId, amt);
    if (err) {
      return setTransferError(err);
    }
    setTransferAmount('');
    setTransferError(null);
    setShowTransferModal(false);
  };

  const confirmDeleteTransfer = (tr: TransferRecord) => {
    Alert.alert(
      'Undo this transfer?',
      `${formatMoney(tr.amount, sym)} goes back from ${tr.to} to ${tr.from}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo transfer', style: 'destructive', onPress: () => deleteTransfer(tr.id) },
      ]
    );
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

          {storageError ? (
            <View className="mb-4 bg-[#FCEEE4] border border-[#E5B89B] rounded-2xl px-4 py-3">
              <Text className="text-[13px] font-semibold text-[#B85318]">
                {storageError}
              </Text>
            </View>
          ) : null}

          {/* Total Balance */}
          <Text className="text-[13.5px] text-warm-gray">
            Total across {wallets.length} wallets
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-[36px] leading-[42px] font-bold tracking-tight text-charcoal">
              {totalSign}
              {sym}
              {whole}
            </Text>
            <Text className="text-[32px] leading-[38px] font-bold text-[#8A8880]">
              .{dec}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-4 mb-5">
            <Pressable
              onPress={() => {
                if (wallets.length < 2) {
                  Alert.alert('Add another wallet', 'Transfers need at least two wallets.');
                  return;
                }
                setFromId(wallets[0].id);
                setToId(wallets[1].id);
                setTransferAmount('');
                setTransferError(null);
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
              onPress={openAddWallet}
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
                >
                <Pressable
                  onPress={() => openEditWallet(w)}
                  className="bg-white border border-warm-border rounded-3xl p-4 flex-row items-center justify-between active:opacity-85"
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
                        {w.isDefault ? 'Default · ' : ''}
                        {w.subtitle}
                      </Text>
                    </View>
                  </View>

                  <Text
                    className={`text-[15.5px] font-bold ${
                      w.balance < 0 ? 'text-[#B85318]' : 'text-charcoal'
                    }`}
                  >
                    {formatMoney(w.balance, sym)}
                  </Text>
                </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* Recent Transfers */}
          <Text className="mt-6 mb-3 text-[16px] font-bold text-charcoal">
            Recent transfers
          </Text>
          {transfers.length === 0 ? (
            <Text className="text-[13px] text-warm-gray">
              No transfers yet. Use Transfer to move money between wallets.
            </Text>
          ) : null}
          <View className="gap-3">
            {(showAllTransfers ? transfers : transfers.slice(0, 20)).map((tr) => (
              <Pressable
                key={tr.id}
                onPress={() => confirmDeleteTransfer(tr)}
                accessibilityHint="Undo this transfer"
                className="flex-row items-center justify-between active:opacity-70"
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
                  {formatMoney(tr.amount, sym)}
                </Text>
              </Pressable>
            ))}
          </View>
          {transfers.length > 20 ? (
            <Pressable
              onPress={() => setShowAllTransfers((prev) => !prev)}
              className="mt-3 py-2 items-center active:opacity-70"
            >
              <Text className="text-[13.5px] font-semibold text-charcoal">
                {showAllTransfers
                  ? 'Show fewer transfers'
                  : `View all ${transfers.length} transfers`}
              </Text>
            </Pressable>
          ) : null}
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View className="flex-1 bg-black/40 justify-end">
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              className="bg-cream rounded-t-3xl"
              contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal">
                {editingWallet ? 'Edit wallet' : 'Add wallet'}
              </Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            <TextInput
              value={newName}
              onChangeText={(v) => {
                setNewName(v);
                setWalletError(null);
              }}
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
            {editingWallet ? null : (
              <TextInput
                value={newBalance}
                onChangeText={setNewBalance}
                keyboardType="numeric"
                placeholder={`Starting balance (${sym}0)`}
                placeholderTextColor="#8A8880"
                className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-4"
              />
            )}
            {editingWallet ? <View className="h-1" /> : null}

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

            {walletError ? (
              <Text className="mb-3 text-[13px] font-semibold text-[#B85318]">
                {walletError}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSaveWallet}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                {editingWallet ? 'Save changes' : 'Create wallet'}
              </Text>
            </Pressable>

            {editingWallet ? (
              <View className="flex-row gap-3 mt-3">
                {!editingWallet.isDefault ? (
                  <Pressable
                    onPress={() => {
                      setDefaultWallet(editingWallet.id);
                      setShowAddModal(false);
                    }}
                    className="flex-1 h-11 rounded-full bg-white border border-warm-border flex-row items-center justify-center gap-1.5 active:opacity-75"
                  >
                    <Star size={15} color="#141413" strokeWidth={2} />
                    <Text className="text-[14px] font-semibold text-charcoal">Make default</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={handleDeleteWallet}
                  className="flex-1 h-11 rounded-full flex-row items-center justify-center gap-1.5 active:opacity-70"
                >
                  <Trash2 size={15} color="#B85318" strokeWidth={2} />
                  <Text className="text-[14px] font-semibold text-[#B85318]">Delete</Text>
                </Pressable>
              </View>
            ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View className="flex-1 bg-black/45 justify-end">
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              className="bg-cream rounded-t-3xl"
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
                disabled={(fromWallet?.balance ?? 0) <= 0}
                onPress={() => {
                  const bal = fromWallet?.balance ?? 0;
                  if (bal > 0) {
                    setTransferAmount(bal.toFixed(2));
                    setTransferError(null);
                  }
                }}
                className={`rounded-full px-4 py-2 bg-white border border-warm-border ${
                  (fromWallet?.balance ?? 0) <= 0 ? 'opacity-40' : ''
                }`}
              >
                <Text className="text-[13px] font-semibold text-charcoal">
                  All
                </Text>
              </Pressable>
            </View>

            <Text
              className={`mt-4 mb-4 text-center text-[12px] ${
                transferError ? 'text-[#B85318] font-semibold' : 'text-warm-gray'
              }`}
            >
              {transferError ??
                "Transfers move money between wallets. They don't count as spending."}
            </Text>

            <Pressable
              onPress={handleTransfer}
              className="bg-charcoal rounded-full h-[52px] items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15.5px] font-semibold">
                Transfer {formatMoney(parseAmount(transferAmount), sym)}
              </Text>
            </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
