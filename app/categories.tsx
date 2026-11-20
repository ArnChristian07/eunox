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
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  X,
} from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';

type CategoryTab = 'expenses' | 'income';

const EXPENSE_COUNTS: Record<string, number> = {
  Food: 23,
  Transport: 31,
  Bills: 4,
  Shopping: 6,
  Health: 2,
  Fun: 3,
};

const INCOME_CATEGORIES = [
  { id: 'inc-1', name: 'Salary', count: 2 },
  { id: 'inc-2', name: 'Freelance', count: 3 },
  { id: 'inc-3', name: 'Other', count: 1 },
];

export default function CategoriesScreen() {
  const { selectedCurrency } = useOnboarding();
  const { categories, addCategory, updateCategory, reorderCategory } =
    useBudget();
  const sym = selectedCurrency.symbol;

  const [tab, setTab] = useState<CategoryTab>('expenses');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catLimit, setCatLimit] = useState('');

  const openNewModal = () => {
    setEditingId(null);
    setCatName('');
    setCatLimit('');
    setModalVisible(true);
  };

  const openEditModal = (id: string, name: string, limit: number) => {
    setEditingId(id);
    setCatName(name);
    setCatLimit(limit > 0 ? String(limit) : '');
    setModalVisible(true);
  };

  const handleSave = () => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    const parsedLimit = parseFloat(catLimit) || 0;
    if (editingId) {
      updateCategory(editingId, trimmed, parsedLimit);
    } else {
      addCategory(trimmed, parsedLimit);
    }
    setModalVisible(false);
  };

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
              { id: 'expenses', label: 'Expenses' },
              { id: 'income', label: 'Income' },
            ] as { id: CategoryTab; label: string }[]
          ).map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
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
        <View className="bg-white border border-warm-border rounded-3xl px-4">
          {tab === 'expenses'
            ? categories.map((cat, idx) => (
                <Animated.View
                  key={cat.id}
                  entering={FadeInDown.delay(idx * 40).duration(220)}
                  className={`flex-row items-center justify-between py-3.5 ${
                    idx < categories.length - 1
                      ? 'border-b border-warm-border'
                      : ''
                  }`}
                >
                  <Pressable
                    onPress={() => openEditModal(cat.id, cat.name, cat.limit)}
                    className="flex-row items-center gap-2.5 flex-1 pr-2 active:opacity-70"
                  >
                    <GripVertical size={16} color="#B5B3AA" strokeWidth={2} />
                    <View className="w-10 h-10 rounded-xl bg-[#F3F2EC] items-center justify-center">
                      <Text className="text-[14px] font-bold text-charcoal">
                        {cat.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15.5px] font-semibold text-charcoal">
                        {cat.name}
                      </Text>
                      <Text className="text-[12.5px] text-warm-gray mt-0.5">
                        {cat.limit > 0
                          ? `Limit ${sym}${cat.limit.toLocaleString('en-US')}`
                          : 'No limit'}{' '}
                        · {EXPENSE_COUNTS[cat.name] ?? 0} this month
                      </Text>
                    </View>
                  </Pressable>

                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() => reorderCategory(cat.id, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 opacity-70"
                    >
                      <ArrowUp
                        size={14}
                        color={idx === 0 ? '#D9D7CE' : '#66655E'}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => reorderCategory(cat.id, 'down')}
                      disabled={idx === categories.length - 1}
                      className="p-1.5 opacity-70"
                    >
                      <ArrowDown
                        size={14}
                        color={
                          idx === categories.length - 1 ? '#D9D7CE' : '#66655E'
                        }
                      />
                    </Pressable>
                    <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
                  </View>
                </Animated.View>
              ))
            : INCOME_CATEGORIES.map((row, idx) => (
                <View
                  key={row.id}
                  className={`flex-row items-center justify-between py-3.5 ${
                    idx < INCOME_CATEGORIES.length - 1
                      ? 'border-b border-warm-border'
                      : ''
                  }`}
                >
                  <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                    <GripVertical size={16} color="#B5B3AA" strokeWidth={2} />
                    <View className="w-10 h-10 rounded-xl bg-nox-lime items-center justify-center">
                      <Text className="text-[14px] font-bold text-charcoal">
                        {row.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15.5px] font-semibold text-charcoal">
                        {row.name}
                      </Text>
                      <Text className="text-[12.5px] text-warm-gray mt-0.5">
                        {row.count} this month
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#8A8880" strokeWidth={2} />
                </View>
              ))}
        </View>

        {/* Nox Callout */}
        <View className="mt-4 bg-warm-stone rounded-2xl p-4 flex-row items-center gap-3">
          <NoxMiniIcon size={28} />
          <Text className="flex-1 text-[13px] leading-[18px] text-warm-gray">
            Nox sorts new entries into these. Rename one and Nox learns the new
            name. Use arrows to reorder.
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
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-cream rounded-t-3xl p-6 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[18px] font-bold text-charcoal">
                {editingId ? 'Edit category' : 'New category'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color="#141413" />
              </Pressable>
            </View>

            <TextInput
              value={catName}
              onChangeText={setCatName}
              placeholder="Category name (e.g. Pets)"
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-3"
            />
            <TextInput
              value={catLimit}
              onChangeText={setCatLimit}
              keyboardType="numeric"
              placeholder={`Monthly limit (${sym}2,000)`}
              placeholderTextColor="#8A8880"
              className="bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal mb-5"
            />

            <Pressable
              onPress={handleSave}
              className="bg-charcoal rounded-full h-12 items-center justify-center active:opacity-85"
            >
              <Text className="text-white text-[15px] font-semibold">
                {editingId ? 'Save changes' : 'Add category'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
