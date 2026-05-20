import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { ShieldCheck, Wallet, ChevronRight } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { saveKeypair } from '../../services/stellar';
import api, { setAuthToken } from '../../services/api';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: { role: 'Anchor' | 'Earner' };
  Login: undefined;
  AnchorDashboard: undefined;
  EarnerDashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loadingRole, setLoadingRole] = useState<'Anchor' | 'Earner' | null>(null);

  const handleSelectRole = (role: 'Anchor' | 'Earner') => {
    navigation.navigate('CreateWallet', { role });
  };

  const handleDemoLogin = async (role: 'Anchor' | 'Earner') => {
    try {
      setLoadingRole(role);
      const res = await api.post('/auth/demo-login', { role });
      
      // Save pre-seeded Stellar keypair
      await saveKeypair(res.data.stellar_secret_key);
      
      // Save backend token
      await setAuthToken(res.data.token);
      
      // Instantly reset dashboard
      if (role === 'Anchor') {
        navigation.reset({ index: 0, routes: [{ name: 'AnchorDashboard' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'EarnerDashboard' }] });
      }
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Demo Login Failed',
        text2: err.response?.data?.error || 'Could not connect to the backend server.',
        position: 'bottom',
      });
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Toka.</Text>
          <Text style={styles.subtitle}>The smart way to manage chores, rewards, and family finances.</Text>
        </View>

        <View style={styles.cardContainer}>
          <TouchableOpacity 
            style={[styles.card, { borderColor: 'rgba(0, 229, 255, 0.2)' }]} 
            onPress={() => handleSelectRole('Anchor')}
            activeOpacity={0.8}
            disabled={loadingRole !== null}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 229, 255, 0.1)', borderColor: 'rgba(0, 229, 255, 0.3)' }]}>
              <ShieldCheck color={COLORS.cyan} size={28} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>I am an Anchor</Text>
              <Text style={styles.cardDescription}>Parent • Guardian • Sponsor</Text>
            </View>
            <ChevronRight color="rgba(0, 229, 255, 0.5)" size={24} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, { borderColor: 'rgba(255, 107, 53, 0.2)' }]} 
            onPress={() => handleSelectRole('Earner')}
            activeOpacity={0.8}
            disabled={loadingRole !== null}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 107, 53, 0.1)', borderColor: 'rgba(255, 107, 53, 0.3)' }]}>
              <Wallet color={COLORS.orange} size={28} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>I am an Earner</Text>
              <Text style={styles.cardDescription}>Child • Student • Worker</Text>
            </View>
            <ChevronRight color="rgba(255, 107, 53, 0.5)" size={24} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
          disabled={loadingRole !== null}
        >
          <Text style={styles.loginLinkText}>
            Already have a wallet? <Text style={{ color: COLORS.cyan, fontWeight: 'bold' }}>Log In</Text>
          </Text>
        </TouchableOpacity>

        {/* DEMO PROTOTYPE SHORTCUTS */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>💡 PROTOTYPE DEMO MODE</Text>
          <View style={styles.demoBtnRow}>
            <TouchableOpacity 
              style={[styles.demoButton, { borderColor: COLORS.cyan }]} 
              onPress={() => handleDemoLogin('Anchor')}
              disabled={loadingRole !== null}
            >
              {loadingRole === 'Anchor' ? (
                <ActivityIndicator size="small" color={COLORS.cyan} />
              ) : (
                <Text style={[styles.demoBtnText, { color: COLORS.cyan }]}>Demo Parent (Anchor)</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.demoButton, { borderColor: COLORS.orange }]} 
              onPress={() => handleDemoLogin('Earner')}
              disabled={loadingRole !== null}
            >
              {loadingRole === 'Earner' ? (
                <ActivityIndicator size="small" color={COLORS.orange} />
              ) : (
                <Text style={[styles.demoBtnText, { color: COLORS.orange }]}>Demo Child (Earner)</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.demoHelpText}>Instant swap without generating or funding new Stellar accounts.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: SPACING.xl * 1.5,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 40,
    fontWeight: '900',
    fontFamily: FONTS.heading,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontFamily: FONTS.body,
    lineHeight: 28,
  },
  cardContainer: {
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(15, 22, 64, 0.6)',
    padding: SPACING.lg,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  demoSection: {
    marginTop: SPACING.xxl,
    paddingTop: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  demoTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    letterSpacing: 2,
  },
  demoBtnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  demoButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    backgroundColor: 'rgba(15, 22, 64, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  demoHelpText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  loginLink: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
    paddingVertical: SPACING.xs,
  },
  loginLinkText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  }
});
