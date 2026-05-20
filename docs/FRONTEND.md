# 🎨 FRONTEND.md — React Native / Expo UI Guide

## Setup

```bash
# Create the Expo project
npx create-expo-app@latest toka-mobile --template blank-typescript
cd toka-mobile

# Install dependencies
npx expo install expo-camera expo-secure-store expo-file-system expo-image-picker expo-router expo-status-bar
npm install @stellar/stellar-sdk axios expo-linear-gradient lucide-react-native
```

---

## App Structure

```
mobile/
├── app/
│   ├── _layout.tsx            # Main application layout and providers
│   ├── index.tsx              # Initial routing gateway
│   ├── (auth)/
│   │   ├── create-wallet.tsx  # Generate keypair
│   │   ├── login.tsx          # Device PIN / welcome login screen
│   │   └── welcome.tsx        # App entry & role select
│   ├── (anchor)/
│   │   ├── AnchorNavigator.tsx # Parent tab layout wrapper
│   │   ├── approvals.tsx      # Chores under review
│   │   ├── create-task.tsx    # Assign task form
│   │   ├── dashboard.tsx      # Family roster and chores overview
│   │   ├── marketplace.tsx    # Custom shop rewards & auctions dashboard
│   │   ├── profile.tsx        # Profile configuration
│   │   └── wallet.tsx         # Family vault funding & details
│   └── (earner)/
│       ├── EarnerNavigator.tsx # Child tab layout wrapper
│       ├── dashboard.tsx      # Quests list
│       ├── profile.tsx        # Savings goal progress & XP levels
│       ├── shop.tsx           # Store rewards, Cashouts, & Auctions bidding
│       ├── task-detail.tsx    # Upload proof photo and submit
│       └── wallet.tsx         # Individual savings balance & transfers
├── components/
│   ├── TaskCard.tsx
│   ├── TokaBitMascot.tsx
│   └── WalletWidget.tsx
├── hooks/
│   └── useStellarBalance.ts
├── utils/
│   └── storage.ts             # Cross-platform secure store
└── services/
    └── api.ts                 # Axios API configuration
```

---

## Theme & Design Tokens

```typescript
// constants/theme.ts
export const COLORS = {
  // Backgrounds
  bgDeep: '#0A0F2C',
  bgCard: '#0F1640',
  bgGlass: 'rgba(0, 229, 255, 0.08)',

  // Brand
  cyan: '#00E5FF',
  cyanDim: '#00B8CC',
  orange: '#FF6B35',
  orangeDim: '#CC5228',

  // Semantic
  success: '#00E676',
  warning: '#FFD740',
  error: '#FF5252',
  pending: '#FFB300',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8B9CC8',
  textMuted: '#4A5580',

  // Task status colors
  statusPending: '#FFB300',
  statusSubmitted: '#00E5FF',
  statusApproved: '#00E676',
  statusRejected: '#FF5252',
};

export const FONTS = {
  heading: 'SpaceGrotesk-Bold',     // or system bold for MVP
  body: 'Inter-Regular',
  mono: 'JetBrainsMono-Regular',    // for public keys, tx hashes
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};
```

---

## Storage & Session Management

To ensure reliable, cross-platform persistence of secret keys, roles, and session tokens across iOS, Android, and Web browsers, the app utilizes a custom wrapper around `expo-secure-store`. It fallbacks to `localStorage` when running on a web target:

```typescript
// utils/storage.ts
import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

const SecureStore = {
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage is not available');
      }
    } else {
      await ExpoSecureStore.setItemAsync(key, value);
    }
  },
  getItemAsync: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage is not available');
        return null;
      }
    } else {
      return await ExpoSecureStore.getItemAsync(key);
    }
  },
  deleteItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage is not available');
      }
    } else {
      await ExpoSecureStore.deleteItemAsync(key);
    }
  }
};

export default SecureStore;
```


---

## Key Components

### TaskCard.tsx

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { Task } from '../stores/taskStore';

const STATUS_COLORS = {
  pending: COLORS.statusPending,
  submitted: COLORS.statusSubmitted,
  approved: COLORS.statusApproved,
  rejected: COLORS.statusRejected,
};

const STATUS_LABELS = {
  pending: '⏳ Pending',
  submitted: '👁 Under Review',
  approved: '✅ Paid',
  rejected: '❌ Rejected',
};

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
  const statusColor = STATUS_COLORS[task.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Status indicator bar */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
          <View style={[styles.statusPill, { borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[task.status]}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.reward}>
            🪙 {task.reward_amount} TOKA
          </Text>
          {task.deadline && (
            <Text style={styles.deadline}>
              Due: {new Date(task.deadline).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.12)',
  },
  statusBar: { width: 4 },
  content: { flex: 1, padding: SPACING.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  reward: { color: COLORS.cyan, fontSize: 14, fontWeight: '700' },
  deadline: { color: COLORS.textSecondary, fontSize: 12 },
});
```

### WalletWidget.tsx

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface WalletWidgetProps {
  tokaBalance: string;
  xlmBalance: string;
  publicKey: string;
}

export function WalletWidget({ tokaBalance, xlmBalance, publicKey }: WalletWidgetProps) {
  const shortKey = `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`;
  const phpEquivalent = (parseFloat(tokaBalance) * 1).toFixed(2); // 1 TOKA = 1 PHP

  return (
    <LinearGradient
      colors={['#0F2060', '#0A1440']}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Glow effect */}
      <View style={styles.glowDot} />

      <Text style={styles.label}>My Toka Wallet</Text>

      <Text style={styles.balance}>{parseFloat(tokaBalance).toLocaleString()}</Text>
      <Text style={styles.unit}>TOKA</Text>

      <Text style={styles.phpEquiv}>≈ ₱{phpEquivalent}</Text>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>XLM: {parseFloat(xlmBalance).toFixed(4)}</Text>
        <Text style={styles.address}>{shortKey}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    position: 'relative',
  },
  glowDot: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,229,255,0.1)',
    top: -40,
    right: -20,
  },
  label: { color: COLORS.textSecondary, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  balance: { color: COLORS.textPrimary, fontSize: 48, fontWeight: '800', marginTop: SPACING.sm },
  unit: { color: COLORS.cyan, fontSize: 18, fontWeight: '600' },
  phpEquiv: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.xs },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: SPACING.md },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLabel: { color: COLORS.textSecondary, fontSize: 12 },
  address: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'monospace' },
});
```

### ProofUploader.tsx

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface ProofUploaderProps {
  onUploadComplete: (cid: string) => void;
}

export function ProofUploader({ onUploadComplete }: ProofUploaderProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cid, setCid] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      await uploadToIPFS(result.assets[0].uri);
    }
  };

  const uploadToIPFS = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: `proof_${Date.now()}.jpg`,
      } as any);

      const response = await api.post('/ipfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const ipfsCid = response.data.cid;
      setCid(ipfsCid);
      onUploadComplete(ipfsCid);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={uploading}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <Text style={styles.placeholder}>📸 Take Proof Photo</Text>
        )}
        {uploading && (
          <View style={styles.overlay}>
            <ActivityIndicator color={COLORS.cyan} />
            <Text style={styles.uploadingText}>Uploading to IPFS...</Text>
          </View>
        )}
      </TouchableOpacity>
      {cid && <Text style={styles.cid}>✅ Uploaded: {cid.slice(0, 20)}...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: SPACING.md },
  button: {
    height: 200,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.cyan,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: { color: COLORS.cyan, fontSize: 16 },
  preview: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: { color: COLORS.textPrimary, marginTop: SPACING.sm },
  cid: { color: COLORS.success, fontSize: 12, marginTop: SPACING.sm, fontFamily: 'monospace' },
});
```

---

## Screen Flow

```
Splash (index.tsx)
  ↓ (no wallet found)
Welcome → Create Wallet OR Join Family
  ↓ (wallet exists)
  ├── Role: anchor → Anchor Dashboard
  │     ├── Create Task
  │     ├── Approvals (pending submissions)
  │     └── Vault (fund & manage)
  └── Role: earner → Earner Dashboard
        ├── Task List → Task Detail → Submit Proof
        └── Wallet (balance + history)
```

---

## Custom Hook: useStellarBalance

The `useStellarBalance` custom hook manages loading and state for the child's TOKA balance. It also listens to the React Native `AppState` to refresh when the application is brought to the foreground, and polls every 10 seconds for real-time updates:

```typescript
// hooks/useStellarBalance.ts
import { useState, useEffect, useCallback } from 'react';
import { getPublicKey, getTokaBalance } from '../services/stellar';
import { AppState, AppStateStatus } from 'react-native';

export function useStellarBalance() {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const pubKey = await getPublicKey();
      if (pubKey) {
        const bal = await getTokaBalance(pubKey);
        setBalance(bal);
      }
    } catch (error) {
      console.error('Error fetching Stellar balance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchBalance();
      }
    });

    const interval = setInterval(fetchBalance, 10000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
```

