import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, X, Zap } from 'lucide-react-native';
import { NoxMiniIcon } from '@/components/NoxMascot';
import { useBudget } from '@/context/BudgetContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { daysBetween, formatShortDate, toISODate } from '@/lib/dates';
import { isValidPositiveAmount, parseAmount } from '@/lib/format';
import { canReadReceipts, readTextFromPhoto } from '@/lib/receiptOcr';
import { guessCategory, parseReceipt } from '@/lib/receiptParser';

type Step = 'camera' | 'reading' | 'review';

interface Draft {
  amount: string;
  merchant: string;
  category: string;
  receiptDate: Date | null;
  useReceiptDate: boolean;
  itemCount: number;
  notice: string | null;
}

function deletePhoto(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The OS clears the cache eventually; nothing else to do.
  }
}

/**
 * Picks a bounded camera capture resolution suited for receipt OCR on Android
 * (1200–2048px longest edge) so 12MP–48MP sensors don't trigger OOM crashes on
 * low-RAM devices during native bitmap decoding.
 */
function pickOcrPictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((raw) => {
      const m = /^(\d+)x(\d+)$/i.exec(raw.trim());
      if (!m) return null;
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (!w || !h) return null;
      return { raw, maxDim: Math.max(w, h) };
    })
    .filter((s): s is { raw: string; maxDim: number } => s !== null);

  if (parsed.length === 0) return undefined;

  const ideal = parsed
    .filter((s) => s.maxDim >= 1200 && s.maxDim <= 2048)
    .sort((a, b) => b.maxDim - a.maxDim);
  if (ideal.length > 0) return ideal[0].raw;

  const aboveMin = parsed
    .filter((s) => s.maxDim >= 1200)
    .sort((a, b) => a.maxDim - b.maxDim);
  return aboveMin[0]?.raw;
}

export default function ScanReceiptScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { selectedCurrency } = useOnboarding();
  const { today, defaultWallet, wallets, expenseCategories, transactions, addTransaction } =
    useBudget();
  const sym = selectedCurrency.symbol;

  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const photoUriRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [torch, setTorch] = useState(false);
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [walletId, setWalletId] = useState<string | undefined>(defaultWallet?.id);
  const [error, setError] = useState<string | null>(null);

  const categoryNames = useMemo(
    () => expenseCategories.map((c) => c.name),
    [expenseCategories]
  );
  const fallbackCategory =
    categoryNames.find((n) => n.toLowerCase() === 'other') ?? categoryNames[0] ?? 'Other';
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? defaultWallet ?? wallets[0];
  const hasPermission = permission?.granted === true;

  // Photos are only kept while the receipt is on screen.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      deletePhoto(photoUriRef.current);
      photoUriRef.current = null;
    };
  }, []);

  // Re-check camera permission when returning from Android Settings or Privacy Dashboard.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        getPermission()
          .then((res) => {
            if (!isMountedRef.current) return;
            if (!res.granted) {
              setCameraReady(false);
              setTorch(false);
            }
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [getPermission]);

  const effectiveCameraReady = hasPermission && cameraReady;
  const effectiveTorch = hasPermission && torch;

  const setPhoto = (uri: string | null) => {
    deletePhoto(photoUriRef.current);
    photoUriRef.current = uri;
    setPhotoUri(uri);
  };

  const handleCameraReady = () => {
    setCameraReady(true);
    setError(null);
    if (Platform.OS === 'android' && !pictureSize && cameraRef.current) {
      cameraRef.current
        .getAvailablePictureSizesAsync()
        .then((sizes) => {
          if (!isMountedRef.current) return;
          const chosen = pickOcrPictureSize(sizes);
          if (chosen) setPictureSize(chosen);
        })
        .catch(() => {});
    }
  };

  const handleCameraMountError = () => {
    setCameraReady(false);
    setTorch(false);
    setError("Camera couldn't start. Close other camera apps or check permissions, then try again.");
    getPermission().catch(() => {});
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {
      if (isMountedRef.current) {
        setError("Couldn't open Settings. Enable camera access in your phone's Settings app.");
      }
    });
  };

  const startManualEntry = (notice: string) => {
    setDraft({
      amount: '',
      merchant: '',
      category: fallbackCategory,
      receiptDate: null,
      useReceiptDate: false,
      itemCount: 0,
      notice,
    });
    setCameraReady(false);
    setStep('review');
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady || step !== 'camera') return;
    setError(null);
    setStep('reading');

    let uri: string;
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!isMountedRef.current) {
        deletePhoto(picture.uri);
        return;
      }
      uri = picture.uri;
      setPhoto(uri);
    } catch {
      if (!isMountedRef.current) return;
      const latest = await getPermission().catch(() => null);
      if (!isMountedRef.current) return;
      setStep('camera');
      if (latest && !latest.granted) {
        setCameraReady(false);
        setTorch(false);
        return;
      }
      setError("Couldn't take the photo. Try again.");
      return;
    }
    setTorch(false);
    setCameraReady(false);

    try {
      const blocks = await readTextFromPhoto(uri);
      if (!isMountedRef.current) return;
      const parsed = parseReceipt(blocks, today);
      if (parsed.lines.length === 0) {
        startManualEntry("Nox couldn't find any text. Retake with the whole receipt in the frame, or type it in.");
        return;
      }
      const category =
        guessCategory(parsed, categoryNames, transactions) ?? fallbackCategory;
      const useReceiptDate = !!parsed.date && daysBetween(parsed.date, today) > 0;
      let notice: string | null = null;
      if (parsed.amount === null) {
        notice = "Nox couldn't find the total. Type it in below.";
      } else if (!parsed.amountFromTotalLine) {
        notice = 'No "Total" line found. Check the amount before saving.';
      }
      setDraft({
        amount: parsed.amount !== null ? parsed.amount.toFixed(2) : '',
        merchant: parsed.merchant ?? '',
        category,
        receiptDate: parsed.date,
        useReceiptDate,
        itemCount: parsed.itemCount,
        notice,
      });
      setStep('review');
    } catch (e) {
      if (!isMountedRef.current) return;
      const reason = e instanceof Error ? e.message : String(e);
      console.warn('Receipt text recognition failed:', reason);
      startManualEntry(
        "Nox couldn't read this photo. Type the details in, or retake it." +
          (__DEV__ ? ` (${reason})` : '')
      );
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setDraft(null);
    setError(null);
    setStep('camera');
  };

  const close = () => {
    // Opened from Add transaction: close both so the user lands where they started.
    if (from === 'add-transaction' && router.canDismiss()) router.dismiss(2);
    else router.back();
  };

  const handleSave = () => {
    if (!draft) return;
    const amount = parseAmount(draft.amount);
    if (!isValidPositiveAmount(amount)) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!selectedWallet) {
      setError('Create a wallet before recording entries.');
      return;
    }
    const date = draft.useReceiptDate && draft.receiptDate ? draft.receiptDate : today;
    const id = addTransaction({
      title: draft.merchant.trim() || draft.category,
      category: draft.category,
      amount,
      type: 'expense',
      date: toISODate(date),
      wallet: selectedWallet.name,
      walletId: selectedWallet.id,
      note:
        draft.itemCount > 0
          ? `${draft.itemCount} ${draft.itemCount === 1 ? 'item' : 'items'} · scanned receipt`
          : 'Scanned receipt',
    });
    if (!id) {
      setError('Could not save. Check the amount and wallet.');
      return;
    }
    setPhoto(null);
    close();
  };

  const cycleWallet = () => {
    if (wallets.length < 2 || !selectedWallet) return;
    const idx = wallets.findIndex((w) => w.id === selectedWallet.id);
    setWalletId(wallets[(idx + 1) % wallets.length].id);
  };

  return (
    <View className="flex-1 bg-[#141413]">
      {/* Live camera while scanning; avoid decoding <Image> during OCR to halve peak RAM */}
      {step === 'camera' && hasPermission && canReadReceipts ? (
        <CameraView
          ref={cameraRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          pictureSize={pictureSize}
          enableTorch={effectiveTorch}
          onCameraReady={handleCameraReady}
          onMountError={handleCameraMountError}
        />
      ) : null}
      {step === 'review' && photoUri ? (
        <Image
          source={{ uri: photoUri }}
          resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.55 }}
        />
      ) : null}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView edges={['top']} className="flex-1 justify-between">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Close scanner"
              className="w-11 h-11 rounded-2xl bg-[#272724] items-center justify-center active:opacity-75"
            >
              <X size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>

            <Text className="text-[17px] font-semibold text-white">Scan receipt</Text>

            {step === 'camera' && hasPermission ? (
              <Pressable
                onPress={() => setTorch((prev) => !prev)}
                accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
                className={`w-11 h-11 rounded-2xl items-center justify-center active:opacity-75 ${
                  torch ? 'bg-nox-lime' : 'bg-[#272724]'
                }`}
              >
                <Zap size={19} color={torch ? '#141413' : '#FFFFFF'} strokeWidth={2} />
              </Pressable>
            ) : (
              <View className="w-11 h-11" />
            )}
          </View>

          {step === 'camera' ? (
            <CameraStep
              permissionLoading={permission === null}
              hasPermission={hasPermission}
              canAskAgain={permission?.canAskAgain !== false}
              cameraReady={effectiveCameraReady}
              error={error}
              onRequestPermission={() => {
                requestPermission().catch(() => {});
              }}
              onOpenSettings={handleOpenSettings}
              onCapture={handleCapture}
              onManualEntry={() => startManualEntry('Type the receipt details in.')}
            />
          ) : null}

          {step === 'reading' ? (
            <View className="bg-cream rounded-t-3xl px-5 pt-6 pb-10 items-center">
              <ActivityIndicator color="#141413" />
              <Text className="mt-3 text-[15px] font-bold text-charcoal">
                Nox is reading your receipt
              </Text>
              <Text className="mt-1 text-[13px] text-warm-gray">
                On your phone. The photo is deleted after.
              </Text>
            </View>
          ) : null}

          {step === 'review' && draft ? (
            <ScrollView
              className="flex-grow-0 bg-cream rounded-t-3xl"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              <View className="flex-row items-center gap-2.5">
                <NoxMiniIcon size={24} />
                <Text className="text-[15px] font-bold text-charcoal">
                  {draft.notice ? 'Check the details' : 'Nox found'}
                </Text>
              </View>

              {draft.notice ? (
                <Text className="mt-2 text-[13px] leading-[18px] text-[#B85318]">
                  {draft.notice}
                </Text>
              ) : null}

              {/* Amount */}
              <View className="mt-4 flex-row items-center bg-white border border-warm-border rounded-2xl px-4 h-14">
                <Text className="text-[22px] font-bold text-charcoal">{sym}</Text>
                <TextInput
                  value={draft.amount}
                  onChangeText={(text) => {
                    setError(null);
                    // Some keypads type a decimal comma; parseAmount expects a dot.
                    setDraft({ ...draft, amount: text.replace(/,/g, '.').replace(/[^0-9.]/g, '') });
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#B5B3AA"
                  accessibilityLabel="Amount"
                  className="flex-1 ml-1 text-[22px] font-bold text-charcoal"
                />
              </View>

              {/* Merchant */}
              <TextInput
                value={draft.merchant}
                onChangeText={(text) => setDraft({ ...draft, merchant: text })}
                placeholder="Store or merchant"
                placeholderTextColor="#8A8880"
                accessibilityLabel="Merchant"
                className="mt-2.5 bg-white border border-warm-border rounded-2xl px-4 h-12 text-[15px] text-charcoal"
              />

              {/* Category */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                className="mt-3.5"
              >
                {categoryNames.map((name) => {
                  const active = draft.category === name;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => setDraft({ ...draft, category: name })}
                      className={`rounded-full px-3.5 py-1.5 border ${
                        active ? 'bg-nox-lime border-charcoal' : 'bg-white border-warm-border'
                      }`}
                    >
                      <Text className="text-[13px] font-semibold text-charcoal">{name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Date & wallet */}
              <View className="flex-row flex-wrap gap-2 mt-3">
                {draft.receiptDate && daysBetween(draft.receiptDate, today) > 0 ? (
                  <Pressable
                    onPress={() => setDraft({ ...draft, useReceiptDate: !draft.useReceiptDate })}
                    className="bg-white border border-warm-border rounded-full px-3 py-1.5 active:opacity-75"
                  >
                    <Text className="text-[12.5px] font-medium text-charcoal">
                      {draft.useReceiptDate
                        ? formatShortDate(draft.receiptDate, today)
                        : 'Today'}{' '}
                      · tap for {draft.useReceiptDate ? 'today' : 'receipt date'}
                    </Text>
                  </Pressable>
                ) : (
                  <View className="bg-white border border-warm-border rounded-full px-3 py-1.5">
                    <Text className="text-[12.5px] font-medium text-charcoal">Today</Text>
                  </View>
                )}
                {selectedWallet ? (
                  <Pressable
                    onPress={cycleWallet}
                    disabled={wallets.length < 2}
                    className="bg-white border border-warm-border rounded-full px-3 py-1.5 active:opacity-75"
                  >
                    <Text className="text-[12.5px] font-medium text-charcoal">
                      {selectedWallet.name}
                    </Text>
                  </Pressable>
                ) : null}
                {draft.itemCount > 0 ? (
                  <View className="bg-white border border-warm-border rounded-full px-3 py-1.5">
                    <Text className="text-[12.5px] font-medium text-charcoal">
                      {draft.itemCount} {draft.itemCount === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {error ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#B85318]">{error}</Text>
              ) : null}

              <View className="flex-row gap-3 mt-5">
                <Pressable
                  onPress={handleRetake}
                  className="flex-1 bg-white border border-warm-border rounded-full h-[52px] items-center justify-center active:opacity-75"
                >
                  <Text className="text-[15px] font-semibold text-charcoal">
                    {canReadReceipts ? 'Retake' : 'Back'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  className="flex-1 bg-charcoal rounded-full h-[52px] items-center justify-center active:opacity-85"
                >
                  <Text className="text-[15px] font-semibold text-white">Save expense</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function CameraStep({
  permissionLoading,
  hasPermission,
  canAskAgain,
  cameraReady,
  error,
  onRequestPermission,
  onOpenSettings,
  onCapture,
  onManualEntry,
}: {
  permissionLoading: boolean;
  hasPermission: boolean;
  canAskAgain: boolean;
  cameraReady: boolean;
  error: string | null;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  onCapture: () => void;
  onManualEntry: () => void;
}) {
  return (
    <>
      {/* Viewfinder */}
      <View className="items-center justify-center px-10">
        <View className="w-[230px] h-[290px] items-center justify-center relative">
          <View className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-nox-lime rounded-tl-xl" />
          <View className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-nox-lime rounded-tr-xl" />
          <View className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-nox-lime rounded-bl-xl" />
          <View className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-nox-lime rounded-br-xl" />

          {!permissionLoading && !hasPermission ? (
            <View className="items-center px-4">
              <Camera size={30} color="#FFFFFF" strokeWidth={1.8} />
              <Text className="mt-3 text-center text-[14px] leading-[20px] text-white/80">
                Eunox needs the camera to read receipts.
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="mt-5 text-[12.5px] text-white/70 text-center">
          {canReadReceipts
            ? 'Fit the whole receipt in the frame. It’s read on your phone and the photo is deleted after.'
            : 'Reading receipts needs the installed app build. It isn’t available in Expo Go or on the web.'}
        </Text>

        {error ? (
          <Text className="mt-2 text-[13px] font-semibold text-[#F2A675] text-center">{error}</Text>
        ) : null}
      </View>

      {/* Controls */}
      <View className="items-center pb-10 gap-4">
        {!canReadReceipts ? (
          <Pressable
            onPress={onManualEntry}
            className="bg-white rounded-full px-6 h-[48px] items-center justify-center active:opacity-85"
          >
            <Text className="text-[15px] font-semibold text-charcoal">Type it in instead</Text>
          </Pressable>
        ) : permissionLoading ? (
          <View className="h-[48px] items-center justify-center">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : !hasPermission ? (
          <Pressable
            onPress={canAskAgain ? onRequestPermission : onOpenSettings}
            className="bg-nox-lime rounded-full px-6 h-[48px] items-center justify-center active:opacity-85"
          >
            <Text className="text-[15px] font-semibold text-charcoal">
              {canAskAgain ? 'Allow camera' : 'Open settings'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onCapture}
            disabled={!cameraReady}
            accessibilityRole="button"
            accessibilityLabel="Take photo of receipt"
            className={`w-[76px] h-[76px] rounded-full border-4 border-white items-center justify-center ${
              cameraReady ? 'active:opacity-75' : 'opacity-50'
            }`}
          >
            <View className="w-[60px] h-[60px] rounded-full bg-white" />
          </Pressable>
        )}

        {canReadReceipts ? (
          <Pressable onPress={onManualEntry} className="active:opacity-75">
            <Text className="text-[13px] font-medium text-white/70">Type it in instead</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}
