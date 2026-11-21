import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { CategoryBudget, CategoryType, useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { parseAmount } from '@/lib/format';

type CategoryTab = 'expenses' | 'income';

export default function CategoriesScreen() {
  const { selectedCurrency } = useOnboarding();
  const {
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
  } = useBudget();
  const sym = selectedCurrency.symbol;

  const [tab, setTab] = useState<CategoryTab>('expenses');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CategoryBudget | null>(null);
  const [catName, setCatName] = useState('');
  const [catLimit, setCatLimit] = useState('');
  const [modalType, setModalType] = useState<CategoryType>('expense');
  const [autoMovePast, setAutoMovePast] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const list = tab === 'expenses' ? expenseCategories : incomeCategories;
  const isIncomeTab = tab === 'income';

  const openNewModal = () => {
    setEditing(null);
    setCatName('');
    setCatLimit('');
    setModalType(isIncomeTab ? 'income' : 'expense');
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (cat: CategoryBudget) => {
    setEditing(cat);
    setCatName(cat.name);
    setCatLimit(cat.limit > 0 ? String(cat.limit) : '');
    setModalType(cat.type);
    setFormError(null);
    setModalVisible(true);
  };

  const nameTaken = (name: string, type: CategoryType, exceptId?: string) =>
    [...expenseCategories, ...incomeCategories].some(
      (c) =>
        c.type === type &&
        c.id !== exceptId &&
        c.name.trim().toLowerCase() === name.toLowerCase()
    );

  const handleSave = () => {
    const trimmed = catName.trim();
    if (!trimmed) {
      setFormError('Give the category a name');
      return;
    }
    const type = editing ? editing.type : modalType;
    if (nameTaken(trimmed, type, editing?.id)) {
      setFormError(`You already have a ${type} category called ${trimmed}`);
      return;
    }
    const parsedLimit = type === 'expense' ? parseAmount(catLimit) : 0;
    if (editing) {
      updateCategory(editing.id, trimmed, parsedLimit);
      setModalVisible(false);
      return;
    }
    const moved = addCategory(trimmed, parsedLimit, type, {
      movePastMatches: autoMovePast,
    });
    setModalVisible(false);
    setTab(type === 'income' ? 'income' : 'expenses');
    if (moved > 0) {
      Alert.alert(
        'Category created',
        `Moved ${moved} past ${moved === 1 ? 'entry' : 'entries'} mentioning "${trimmed}" into it.`
      );
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert(
      `Delete ${editing.name}?`,
      editing.count > 0
        ? `Past entries keep the "${editing.name}" label, but it won't be offered for new ones.`
        : "It won't be offered for new entries.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCategory(editing.id);
            setModalVisible(false);
          },
        },
      ]
    );
  };

  const effectiveType = editing ? editing.type : modalType;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2 pb-4">
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              accessibilityLabel="Back"
              className="w-11 h-11 rounded-2xl bg-white border border-warm-border items-center justify-center active:opacity-75"
            >
              <ChevronLeft size={20} color="#141413" strokeWidth={2} />
            </Pressable>
            <Text className="text-[22px] font-bold tracking-tight text-charcoal">
              Categories
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={openNewModal}
            className="flex-row items-center gap-1.5 bg-charcoal rounded-full px-4 py-2.5 active:opacity-85"
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.3} />
            <Text className="text-[13.5px] font-semibold text-white">New</Text>
          </Pressable>
        </View>

        {/* Segmented Control */}
        <View className="flex-row bg-[#EAE8E1] p-1 rounded-2xl mb-4">
          {(
            [
              { id: 'expenses', label: `Expenses · ${expenseCategories.length}` },
              { id: 'income', label: `Income · ${incomeCategories.length}` },
            ] as { id: CategoryTab; label: string }[]
          ).map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                key={item.id}
                onPress={() => setTab(item.id)}
                className={`flex-1 py-2.5 rounded-xl items-center ${
                  active ? 'bg-white' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-[14px] font-semibold ${
                    active ? 'text-charcoal' : 'text-warm-gray'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Categories Card */}
        {list.length === 0 ? (
          <View className="bg-white border border-warm-border rounded-3xl p-6 items-center">
            <Text className="text-[15px] font-semibold text-charcoal">
              No {isIncomeTab ? 'income' : 'expense'} categories yet
            </Text>
            <Text className="mt-1 text-[13px] text-warm-gray text-center">
              Tap New to add one.
            </Text>
          </View>
        ) : (
          <View className="bg-white border border-warm-border rounded-3xl px-4">
            {list.map((cat, idx) => (
              <Animated.View
                key={cat.id}
                entering={FadeInDown.delay(idx * 40).duration(220)}
                className={`flex-row items-center justify-between py-3.5 ${
                  idx < list.length - 1 ? 'border-b border-warm-border' : ''
                }`}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openEditModal(cat)}
                  className="flex-row items-center gap-2.5 flex-1 pr-2 active:opacity-70"
                >
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center ${
                      isIncomeTab ? 'bg-nox-lime' : 'bg-[#F3F2EC]'
                    }`}
                  >
                    <Text className="text-[14px] font-bold text-charcoal">
                      {cat.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15.5px] font-semibold text-charcoal">
                      {cat.name}
                    </Text>
                    <Text className="text-[12.5px] text-warm-gray mt-0.5">
                      {isIncomeTab
                        ? ''
                        : cat.limit > 0
                          ? `Limit ${sym}${cat.limit.toLocaleString('en-US')} · `
                          : 'No limit · '}
                      {cat.count} this month
                    </Text>
                  </View>
                </Pressable>

                <View className="flex-row items-center gap-1">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => reorderCategory(cat.id, 'up')}
                    disabled={idx === 0}
                    accessibilityLabel={`Move ${cat.name} up`}
                    className="p-1.5 opacity-70"
                  >
                    <ArrowUp size={14} color={idx === 0 ? '#D9D7CE' : '#66655E'} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => reorderCategory(cat.id, 'down')}
                    disabled={idx === list.length - 1}
                    accessibilityLabel={`Move ${cat.name} down`}
                    className="p-1.5 opacity-70"
                  >
                    <ArrowDown
                      size={14}
                      color={idx === list.length - 1 ? '#D9D7CE' : '#66655E'}
                    />
                  </Pressable>
                  <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Nox Callout */}
        <View className="mt-4 bg-warm-stone rounded-2xl p-4 flex-row items-center gap-3">
          <NoxMiniIcon size={28} />
          <Text className="flex-1 text-[13px] leading-[18px] text-warm-gray">
            Tap a category to rename or delete it. Renaming keeps past entries
            attached. Use the arrows to reorder.
          </Text>
        </View>
      </ScrollView>

      {/* New / Edit Category Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
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

            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[20px] font-bold text-charcoal">
                {editing ? 'Edit category' : 'New category'}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={4}
                className="w-9 h-9 rounded-xl bg-white border border-warm-border items-center justify-center"
              >
                <X size={18} color="#141413" />
              </Pressable>
            </View>

            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-12 h-12 rounded-2xl bg-[#EAE8E1] items-center justify-center">
                <Text className="text-[18px] font-bold text-charcoal">
                  {(catName.trim().charAt(0) || 'C').toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-medium text-warm-gray mb-1">Name</Text>
                <TextInput
                  value={catName}
                  onChangeText={(v) => {
                    setCatName(v);
                    setFormError(null);
                  }}
                  accessibilityLabel="Category name"
                  placeholder={effectiveType === 'income' ? 'Freelance' : 'Coffee'}
                  placeholderTextColor="#8A8880"
                  className="bg-white border-[1.5px] border-charcoal rounded-2xl px-4 h-11 text-[15px] font-medium text-charcoal"
                />
              </View>
            </View>

            {/* Expense / Income Toggle (type is fixed once created) */}
            {!editing ? (
              <View className="flex-row bg-[#EAE8E1] p-1 rounded-2xl mb-4">
                {(['expense', 'income'] as const).map((t) => {
                  const active = modalType === t;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={t}
                      onPress={() => setModalType(t)}
                      className={`flex-1 py-2.5 rounded-xl items-center ${
                        active ? 'bg-white' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-[14px] font-semibold capitalize ${
                          active ? 'text-charcoal' : 'text-warm-gray'
                        }`}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {effectiveType === 'expense' ? (
              <>
                <Text className="text-[12.5px] font-medium text-warm-gray mb-1.5">
                  Monthly limit (optional)
                </Text>
                <View className="flex-row items-center bg-white border border-muted-gray rounded-2xl px-4 h-12 mb-4">
                  <Text className="text-[16px] font-bold text-charcoal mr-1">{sym}</Text>
                  <TextInput
                    value={catLimit}
                    onChangeText={setCatLimit}
                    accessibilityLabel={`Monthly limit in ${sym}, optional`}
                    keyboardType="decimal-pad"
                    placeholder="800"
                    placeholderTextColor="#8A8880"
                    className="flex-1 text-[16px] font-semibold text-charcoal"
                  />
                </View>
              </>
            ) : null}

            {!editing ? (
              <View className="bg-white border border-warm-border rounded-2xl p-3.5 flex-row items-center gap-3 mb-4">
                <NoxMiniIcon size={26} />
                <Text className="flex-1 text-[13px] leading-[18px] text-charcoal">
                  Move past entries that mention &quot;
                  {(catName.trim() || 'this').toLowerCase()}&quot; into it
                </Text>
                <Switch
                  value={autoMovePast}
                  onValueChange={setAutoMovePast}
                  accessibilityLabel="Move matching past entries into this category"
                  trackColor={{ false: '#8A8880', true: '#141413' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ) : null}

            {formError ? (
              <Text style={{ color: '#C2410C' }} className="mb-3 text-[13px] font-semibold">
                {formError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              className="bg-charcoal rounded-full h-[52px] items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15.5px] font-semibold">
                {editing ? 'Save changes' : 'Create category'}
              </Text>
            </Pressable>

            {editing ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleDelete}
                className="mt-3 h-12 flex-row items-center justify-center gap-2 active:opacity-70"
              >
                <Trash2 size={16} color="#C2410C" strokeWidth={2} />
                <Text style={{ color: '#C2410C' }} className="text-[15px] font-semibold">
                  Delete category
                </Text>
              </Pressable>
            ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
