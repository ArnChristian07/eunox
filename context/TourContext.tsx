import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { View } from 'react-native';
import { loadJSONSafe, saveJSON, STORAGE_KEYS } from '@/lib/storage';

export type TourTargetRef = React.RefObject<React.ComponentRef<typeof View> | null>;

/**
 * Ids of on-screen elements the tour can point at. Wrap the element in
 * <TourTarget id="..."> so the overlay can measure and spotlight it.
 */
export type TourTargetId =
  | 'home-balance'
  | 'home-recent'
  | 'home-settings'
  | 'tab-budgets'
  | 'tab-add'
  | 'tab-insights'
  | 'tab-nox'
  | 'add-keypad'
  | 'add-categories'
  | 'add-save'
  | 'add-done'
  | 'budgets-categories'
  | 'nox-ask';

/** Screens that report focus to the tour (see useTourScreen). */
export type TourScreen = 'home' | 'budgets' | 'insights' | 'nox' | 'add';
const TAB_SCREENS: TourScreen[] = ['home', 'budgets', 'insights', 'nox'];

/** Things the user does that a step can wait for. */
export type TourEvent =
  | 'amount-entered'
  | 'category-picked'
  | 'transaction-saved'
  | 'nox-asked'
  | `screen:${TourScreen}`;

export interface TourStep {
  key: string;
  /** Screen the step lives on; 'tabs' means any tab (for tab-bar targets). */
  screen: TourScreen | 'tabs';
  /** Element to spotlight. Null shows a floating card with no spotlight. */
  target: TourTargetId | null;
  title: string;
  body: string;
  /**
   * Hands-on steps: the action the user must do. Touches pass through the
   * spotlight so they can do it on the real UI. Screen events and `auto` steps
   * advance as soon as it happens; others unlock the Next button.
   */
  waitFor?: TourEvent;
  auto?: boolean;
  /** Shown until the action is done. */
  hint?: string;
  /** If the user lands on another tour screen mid-step, jump back to this step. */
  restartFrom?: string;
  /** If the target disappears while on the right screen, jump to this step. */
  ifMissing?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    key: 'welcome',
    screen: 'home',
    target: 'home-balance',
    title: 'Let’s learn by doing',
    body: 'This card shows what’s left to spend this month and what’s safe to spend today. Let’s log your first expense and watch it update.',
  },
  {
    key: 'open-add',
    screen: 'tabs',
    target: 'tab-add',
    title: 'Tap + to add an expense',
    body: 'The + button is always in the middle of the tab bar, on every tab.',
    waitFor: 'screen:add',
    hint: 'Tap the highlighted button',
  },
  {
    key: 'amount',
    screen: 'add',
    target: 'add-keypad',
    title: 'Type the amount',
    body: 'Use the keypad to enter how much you spent. You’ll see the amount appear at the top.',
    waitFor: 'amount-entered',
    hint: 'Enter an amount to continue',
    restartFrom: 'open-add',
  },
  {
    key: 'category',
    screen: 'add',
    target: 'add-categories',
    title: 'Pick a category',
    body: 'Choose what the money was for. It decides which budget the expense counts against. Next time, try typing “lunch 180” in Nox’s box. It fills in the amount and category for you.',
    waitFor: 'category-picked',
    hint: 'Tap a category to continue',
    restartFrom: 'open-add',
  },
  {
    key: 'save',
    screen: 'add',
    target: 'add-save',
    title: 'Save it',
    body: 'Tap Save. The date, wallet and note chips above are optional. They default to today and your main wallet.',
    waitFor: 'transaction-saved',
    auto: true,
    hint: 'Tap Save',
    restartFrom: 'open-add',
  },
  {
    key: 'saved',
    screen: 'add',
    target: 'add-done',
    title: 'Nice, it’s saved!',
    body: 'This screen shows how it affects that category’s budget, and has Undo if you ever make a mistake. Tap Done to go back.',
    waitFor: 'screen:home',
    hint: 'Tap Done',
    ifMissing: 'amount',
  },
  {
    key: 'recent',
    screen: 'home',
    target: 'home-recent',
    title: 'Here’s your expense',
    body: 'Your latest entries show up here. Tap one to edit or delete it, or tap See all to search everything.',
  },
  {
    key: 'settings',
    screen: 'home',
    target: 'home-settings',
    title: 'Settings',
    body: 'Change your budget and currency, and manage wallets, categories, recurring bills, savings goals, app lock and backups here.',
  },
  {
    key: 'open-budgets',
    screen: 'tabs',
    target: 'tab-budgets',
    title: 'Check your budgets',
    body: 'Let’s see where that expense went.',
    waitFor: 'screen:budgets',
    hint: 'Tap Budgets',
  },
  {
    key: 'budgets',
    screen: 'budgets',
    target: 'budgets-categories',
    title: 'Every category, at a glance',
    body: 'Each bar shows how much of that category’s limit you’ve used. To set or change limits, go to Settings → Categories.',
    restartFrom: 'open-budgets',
  },
  {
    key: 'insights',
    screen: 'tabs',
    target: 'tab-insights',
    title: 'Insights',
    body: 'After a few days of tracking, this tab shows where your money went and how it compares with last period.',
  },
  {
    key: 'open-nox',
    screen: 'tabs',
    target: 'tab-nox',
    title: 'Meet Nox',
    body: 'Nox answers questions about your money, right on your phone.',
    waitFor: 'screen:nox',
    hint: 'Tap Nox',
  },
  {
    key: 'ask',
    screen: 'nox',
    target: 'nox-ask',
    title: 'Ask a question',
    body: 'Tap a suggestion or type your own, like “How much did I spend this week?”, then send it.',
    waitFor: 'nox-asked',
    auto: true,
    hint: 'Send a question to Nox',
    restartFrom: 'open-nox',
  },
  {
    key: 'done',
    screen: 'nox',
    target: null,
    title: 'You’re ready!',
    body: 'That’s the basics: log with +, check Budgets, ask Nox. You can replay this tutorial any time from Settings.',
  },
];

function stepIndexByKey(key: string | undefined) {
  return key ? TOUR_STEPS.findIndex((s) => s.key === key) : -1;
}

export function stepMatchesScreen(step: TourStep, screen: TourScreen | null) {
  if (!screen) return false;
  return step.screen === 'tabs' ? TAB_SCREENS.includes(screen) : step.screen === screen;
}

interface PersistedTour {
  pending: boolean;
}

interface TourContextValue {
  active: boolean;
  stepIndex: number;
  /** True once the current step's action has been done (unlocks Next). */
  satisfied: boolean;
  /** The tour screen currently focused, or null for any other screen. */
  screen: TourScreen | null;
  /** Queue the tour to start when Home is next focused. */
  requestTour: () => void;
  next: () => void;
  goToStep: (key: string) => void;
  finish: () => void;
  /** Report that the user did something (see TourEvent). */
  signal: (event: TourEvent) => void;
  /** Called by screens on focus/blur (use useTourScreen). */
  setScreenFocused: (screen: TourScreen, focused: boolean) => void;
  registerTarget: (id: TourTargetId, ref: TourTargetRef) => void;
  unregisterTarget: (id: TourTargetId) => void;
  getTarget: (id: TourTargetId) => TourTargetRef | undefined;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [satisfied, setSatisfied] = useState(false);
  const [screen, setScreen] = useState<TourScreen | null>(null);
  const targets = useRef(new Map<TourTargetId, TourTargetRef>());

  // Screens call signal/setScreenFocused from their own effects, so read the
  // latest tour state from refs to avoid stale closures.
  const state = useRef({ hydrated, pending, active, stepIndex });
  state.current = { hydrated, pending, active, stepIndex };

  useEffect(() => {
    loadJSONSafe<PersistedTour>(STORAGE_KEYS.tour).then((result) => {
      if (result.status === 'ok') setPending(!!result.data.pending);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(STORAGE_KEYS.tour, { pending } satisfies PersistedTour);
  }, [hydrated, pending]);

  const jump = useCallback((index: number) => {
    state.current.stepIndex = index;
    setStepIndex(index);
    setSatisfied(false);
  }, []);

  const finish = useCallback(() => {
    state.current.active = false;
    setActive(false);
    setPending(false);
    jump(0);
  }, [jump]);

  const next = useCallback(() => {
    const following = state.current.stepIndex + 1;
    if (following >= TOUR_STEPS.length) finish();
    else jump(following);
  }, [finish, jump]);

  const goToStep = useCallback(
    (key: string) => {
      const index = stepIndexByKey(key);
      if (index !== -1) jump(index);
    },
    [jump]
  );

  const signal = useCallback(
    (event: TourEvent) => {
      if (!state.current.active) return;
      const step = TOUR_STEPS[state.current.stepIndex];
      if (step?.waitFor !== event) return;
      if (step.auto || event.startsWith('screen:')) next();
      else setSatisfied(true);
    },
    [next]
  );

  const setScreenFocused = useCallback(
    (name: TourScreen, focused: boolean) => {
      if (!focused) {
        setScreen((cur) => (cur === name ? null : cur));
        return;
      }
      setScreen(name);

      const { hydrated: ready, pending: queued, active: running } = state.current;
      // Start (or resume after a restart) when Home appears.
      if (!running) {
        if (name === 'home' && ready && queued) {
          state.current.active = true;
          setActive(true);
          jump(0);
        }
        return;
      }

      const step = TOUR_STEPS[state.current.stepIndex];
      if (step?.waitFor === `screen:${name}`) {
        next();
        return;
      }
      // The user wandered off mid-task (e.g. closed Add without saving).
      const restart = TOUR_STEPS[stepIndexByKey(step?.restartFrom)];
      if (step && restart && !stepMatchesScreen(step, name) && stepMatchesScreen(restart, name)) {
        goToStep(restart.key);
      }
    },
    [jump, next, goToStep]
  );

  const requestTour = useCallback(() => {
    state.current.pending = true;
    setPending(true);
  }, []);

  const registerTarget = useCallback((id: TourTargetId, ref: TourTargetRef) => {
    targets.current.set(id, ref);
  }, []);
  const unregisterTarget = useCallback((id: TourTargetId) => {
    targets.current.delete(id);
  }, []);
  const getTarget = useCallback((id: TourTargetId) => targets.current.get(id), []);

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      stepIndex,
      satisfied,
      screen,
      requestTour,
      next,
      goToStep,
      finish,
      signal,
      setScreenFocused,
      registerTarget,
      unregisterTarget,
      getTarget,
    }),
    [
      active,
      stepIndex,
      satisfied,
      screen,
      requestTour,
      next,
      goToStep,
      finish,
      signal,
      setScreenFocused,
      registerTarget,
      unregisterTarget,
      getTarget,
    ]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
