import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BarChart2,
  Home,
  MessageSquare,
  PieChart,
  Plus,
} from 'lucide-react-native';

interface FloatingTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigateToTab: (routeKey: string) => void;
}

const TAB_CONFIG: Record<
  string,
  { label: string; icon: typeof Home }
> = {
  index: { label: 'Home', icon: Home },
  budgets: { label: 'Budgets', icon: PieChart },
  insights: { label: 'Insights', icon: BarChart2 },
  nox: { label: 'Nox', icon: MessageSquare },
};

export function FloatingTabBar({ state, navigateToTab }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) {
    return null;
  }

  const renderTab = (
    route: { key: string; name: string },
    index: number
  ) => {
    const config = TAB_CONFIG[route.name];
    if (!config) return null;

    const isFocused = state.index === index;
    const Icon = config.icon;
    const color = isFocused ? '#141413' : '#7D7B73';

    return (
      <Pressable
        key={route.key}
        onPress={() => navigateToTab(route.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        className="flex-1 items-center justify-center py-1.5"
      >
        <Icon size={20} color={color} strokeWidth={isFocused ? 2.2 : 1.75} />
        <Text
          className={`text-[11px] mt-1 ${
            isFocused ? 'font-bold text-charcoal' : 'font-medium text-[#7D7B73]'
          }`}
        >
          {config.label}
        </Text>
      </Pressable>
    );
  };

  const routes = state.routes;
  const leftRoutes = routes.slice(0, 2);
  const rightRoutes = routes.slice(2, 4);

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      className="bg-cream px-4 pt-2"
    >
      <View className="flex-row items-center bg-white border border-warm-border rounded-full px-2 py-2 shadow-sm">
        {leftRoutes.map((route, i) => renderTab(route, i))}

        <Pressable
          onPress={() => router.push('/add-transaction')}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          className="w-14 h-12 rounded-2xl bg-charcoal items-center justify-center mx-1 active:opacity-85"
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>

        {rightRoutes.map((route, i) => renderTab(route, i + 2))}
      </View>
    </View>
  );
}
