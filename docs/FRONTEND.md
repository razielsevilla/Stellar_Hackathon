# 🎨 FRONTEND.md — React Native / Expo UI Guide

## Setup

```bash
# Create the Expo project
npx create-expo-app@latest toka-mobile --template blank-typescript
cd toka-mobile

# Install dependencies
npx expo install expo-camera expo-secure-store expo-file-system expo-image-picker
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-safe-area-context react-native-screens
npm install @stellar/stellar-sdk
npm install zustand
npm install axios
npx expo install expo-linear-gradient
```

---

## App Structure

```
mobile/
├── app/
│   ├── index.tsx              # Splash / route decider
│   ├── (auth)/
│   │   ├── welcome.tsx        # Welcome + role selection
│   │   ├── create-wallet.tsx  # Generate keypair
│   │   └── join-family.tsx    # Enter invite code
│   ├── (anchor)/
│   │   ├── dashboard.tsx      # Family overview
│   │   ├── create-task.tsx    # New task form
│   │   ├── approvals.tsx      # Pending approvals list
│   │   └── vault.tsx          # Fund vault screen
│   └── (earner)/
│       ├── dashboard.tsx      # My tasks + balance
│       ├── task-detail.tsx    # Task info + submit proof
│       └── wallet.tsx         # Earnings history
├── components/
│   ├── TaskCard.tsx
│   ├── WalletWidget.tsx
│   ├── TokaBitMascot.tsx
│   ├── ProofUploader.tsx
│   ├── BalancePill.tsx
│   └── TransactionItem.tsx
├── stores/
│   ├── authStore.ts
│   ├── taskStore.ts
│   └── walletStore.ts
├── services/
│   ├── stellar.ts
│   └── api.ts
├── constants/
│   └── theme.ts
└── hooks/
    └── useStellarBalance.ts
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

## State Management (Zustand)

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Keypair } from '@stellar/stellar-sdk';

interface AuthState {
  publicKey: string | null;
  role: 'anchor' | 'earner' | null;
  familyId: string | null;
  displayName: string | null;
  isLoaded: boolean;
  setAuth: (data: Partial<AuthState>) => void;
  loadFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  publicKey: null,
  role: null,
  familyId: null,
  displayName: null,
  isLoaded: false,

  setAuth: (data) => set((state) => ({ ...state, ...data })),

  loadFromStorage: async () => {
    const secret = await SecureStore.getItemAsync('stellar_secret');
    const role = await SecureStore.getItemAsync('user_role');
    const familyId = await SecureStore.getItemAsync('family_id');
    const displayName = await SecureStore.getItemAsync('display_name');

    if (secret) {
      const keypair = Keypair.fromSecret(secret);
      set({
        publicKey: keypair.publicKey(),
        role: role as 'anchor' | 'earner',
        familyId,
        displayName,
        isLoaded: true,
      });
    } else {
      set({ isLoaded: true });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('stellar_secret');
    await SecureStore.deleteItemAsync('user_role');
    await SecureStore.deleteItemAsync('family_id');
    set({ publicKey: null, role: null, familyId: null });
  },
}));
```

```typescript
// stores/taskStore.ts
import { create } from 'zustand';
import { api } from '../services/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  reward_amount: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  assigned_to: string;
  proof_ipfs_cid?: string;
  deadline?: string;
  created_at: string;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: (familyId: string) => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<void>;
  submitTask: (taskId: string, proofCid: string) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  rejectTask: (taskId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,

  fetchTasks: async (familyId) => {
    set({ isLoading: true });
    const tasks = await api.get(`/tasks?family_id=${familyId}`);
    set({ tasks: tasks.data, isLoading: false });
  },

  createTask: async (data) => {
    const task = await api.post('/tasks', data);
    set((state) => ({ tasks: [task.data, ...state.tasks] }));
  },

  submitTask: async (taskId, proofCid) => {
    await api.post(`/tasks/${taskId}/submit`, { proof_cid: proofCid });
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'submitted', proof_ipfs_cid: proofCid } : t
      ),
    }));
  },

  approveTask: async (taskId) => {
    await api.post(`/tasks/${taskId}/approve`);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'approved' } : t
      ),
    }));
  },

  rejectTask: async (taskId) => {
    await api.post(`/tasks/${taskId}/reject`);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'rejected' } : t
      ),
    }));
  },
}));
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

```typescript
// hooks/useStellarBalance.ts
import { useState, useEffect } from 'react';
import { getTokaBalance, getXlmBalance } from '../services/stellar';

export function useStellarBalance(publicKey: string | null) {
  const [toka, setToka] = useState('0');
  const [xlm, setXlm] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) return;

    async function fetch() {
      setLoading(true);
      const [tokaBalance, xlmBalance] = await Promise.all([
        getTokaBalance(publicKey!),
        getXlmBalance(publicKey!),
      ]);
      setToka(tokaBalance);
      setXlm(xlmBalance);
      setLoading(false);
    }

    fetch();
    // Refresh every 10 seconds
    const interval = setInterval(fetch, 10_000);
    return () => clearInterval(interval);
  }, [publicKey]);

  return { toka, xlm, loading };
}
```
