import React, { useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as StellarSdk from '@stellar/stellar-sdk';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { saveKeypair } from '../../services/stellar';
import api, { setAuthToken } from '../../services/api';
import Toast from 'react-native-toast-message';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: { role: 'Anchor' | 'Earner' };
  Login: undefined;
  AnchorDashboard: undefined;
  EarnerDashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleLogin = async () => {
    const trimmedSecret = secretKey.trim();
    
    if (!trimmedSecret) {
      Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please enter your Stellar Secret Key.', position: 'bottom' });
      return;
    }

    if (!trimmedSecret.startsWith('S') || trimmedSecret.length !== 56) {
      Toast.show({ type: 'error', text1: 'Invalid Key', text2: 'Stellar Secret Keys must start with "S" and be 56 characters long.', position: 'bottom' });
      return;
    }

    setLoading(true);
    setStatus('Validating cryptographic key...');

    try {
      // 1. Derive public key
      let publicKey = '';
      try {
        const kp = StellarSdk.Keypair.fromSecret(trimmedSecret);
        publicKey = kp.publicKey();
      } catch (err) {
        throw new Error('Cryptographic signature verification failed. Please check the secret key.');
      }

      setStatus('Authenticating with Toka server...');
      
      // 2. Authenticate with backend
      const res = await api.post('/auth/login', {
        stellar_public_key: publicKey
      });

      setStatus('Securing session...');
      
      // 3. Save secure credentials
      await saveKeypair(trimmedSecret);
      await setAuthToken(res.data.token);

      Toast.show({
        type: 'success',
        text1: 'Welcome Back!',
        text2: `Logged in successfully as ${res.data.display_name}.`,
        position: 'bottom'
      });

      // 4. Redirect based on role
      setTimeout(() => {
        if (res.data.role === 'anchor') {
          navigation.reset({ index: 0, routes: [{ name: 'AnchorDashboard' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'EarnerDashboard' }] });
        }
      }, 800);

    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Authentication Failed',
        text2: err.response?.data?.error || err.message || 'Failed to authenticate.',
        position: 'bottom'
      });
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Enter your secret key starting with 'S' to restore your family wallet.</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.cyan} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Stellar Secret Key</Text>
              <TextInput 
                style={styles.input}
                placeholder="S..."
                placeholderTextColor={COLORS.textMuted}
                value={secretKey}
                onChangeText={setSecretKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Text style={styles.helperText}>This key acts as your master password. It is stored offline on this device.</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Log In to Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  scrollContent: {
    padding: SPACING.lg,
    justifyContent: 'center',
    paddingTop: SPACING.xxl * 2,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: FONTS.heading,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl * 1.5,
    paddingHorizontal: SPACING.md,
  },
  formCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: SPACING.xl,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  input: {
    backgroundColor: COLORS.bgDeep,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    padding: SPACING.md,
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
  },
  button: {
    backgroundColor: COLORS.cyan,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: FONTS.body,
    marginTop: SPACING.md,
  }
});
