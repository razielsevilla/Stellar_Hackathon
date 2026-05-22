import React, { useCallback, useRef, useState } from 'react';
import {
  Animated, Modal, StyleSheet, Text, TouchableOpacity,
  View, Vibration,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { Delete, ShieldCheck } from 'lucide-react-native';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PINModalProps {
  visible:    boolean;
  mode:       'set' | 'verify';
  onSuccess:  (pin: string) => void;
  onCancel:   () => void;
  /** Only used in set mode — first-pass confirm */
  pendingPin?: string | null;
  onPendingPin?: (pin: string) => void;
  errorMessage?: string | null;
}

const PIN_LENGTH = 6;
const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function PINModal({
  visible,
  mode,
  onSuccess,
  onCancel,
  pendingPin,
  onPendingPin,
  errorMessage,
}: PINModalProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [phase, setPhase]   = useState<'enter' | 'confirm'>('enter'); // only in 'set' mode
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Vibration.vibrate(300);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const reset = () => {
    setDigits([]);
    setPhase('enter');
  };

  const handleKey = useCallback((key: string) => {
    if (key === '⌫') {
      setDigits(d => d.slice(0, -1));
      return;
    }
    if (digits.length >= PIN_LENGTH) return;

    const next = [...digits, key];
    setDigits(next);

    if (next.length === PIN_LENGTH) {
      const pin = next.join('');

      if (mode === 'verify') {
        // Let parent handle verification
        setTimeout(() => {
          onSuccess(pin);
          setDigits([]);
        }, 120);

      } else {
        // 'set' mode — two-phase confirmation
        if (phase === 'enter') {
          onPendingPin?.(pin);
          setPhase('confirm');
          setDigits([]);
        } else {
          // Confirm phase
          if (pin === pendingPin) {
            setTimeout(() => {
              onSuccess(pin);
              reset();
            }, 120);
          } else {
            shake();
            setTimeout(() => {
              setDigits([]);
              setPhase('enter');
            }, 600);
          }
        }
      }
    }
  }, [digits, mode, phase, pendingPin, onSuccess, onPendingPin]);

  const title = mode === 'set'
    ? (phase === 'enter' ? 'Create Your PIN' : 'Confirm Your PIN')
    : 'Enter PIN to Sign';

  const subtitle = mode === 'set'
    ? (phase === 'enter'
        ? 'Choose a 6-digit PIN to protect your wallet'
        : 'Re-enter your PIN to confirm')
    : 'Your PIN is required before every transaction';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <ShieldCheck size={28} color={COLORS.cyan} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {/* Error */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* PIN dots */}
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < digits.length && styles.dotFilled,
                ]}
              />
            ))}
          </Animated.View>

          {/* Numpad */}
          <View style={styles.numpad}>
            {NUMPAD.map((key, idx) => {
              if (key === '') {
                return <View key={idx} style={styles.numpadCell} />;
              }
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.numpadCell, styles.numpadKey]}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.6}
                >
                  {key === '⌫'
                    ? <Delete size={20} color={COLORS.textSecondary} />
                    : <Text style={styles.numpadText}>{key}</Text>
                  }
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onCancel(); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 44, 0.96)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
  },
  header: { alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  title:    { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  errorBanner: {
    backgroundColor: 'rgba(255,82,82,0.12)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },

  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dotFilled: {
    backgroundColor: COLORS.cyan,
    borderColor: COLORS.cyan,
  },

  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 260,
    marginBottom: SPACING.lg,
  },
  numpadCell: { width: 80, height: 68, justifyContent: 'center', alignItems: 'center' },
  numpadKey: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    margin: 3,
    width: 74,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  numpadText: { fontSize: 22, fontWeight: '600', color: COLORS.textPrimary },

  cancelBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl },
  cancelText: { fontSize: 14, color: COLORS.textMuted },
});
