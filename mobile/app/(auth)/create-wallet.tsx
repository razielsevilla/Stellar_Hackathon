import React, { useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import {
  generateKeypair,
  saveKeypair,
  fundTestnetAccount,
  createTrustline
} from '../../services/stellar';
import api, { setAuthToken } from '../../services/api';
import Toast from 'react-native-toast-message';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: { role: 'Anchor' | 'Earner' };
  AnchorDashboard: undefined;
  EarnerDashboard: undefined;
};

type CreateWalletRouteProp = RouteProp<RootStackParamList, 'CreateWallet'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateWallet'>;

export default function CreateWalletScreen() {
  const route = useRoute<CreateWalletRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { role } = route.params;

  const [isJoining, setIsJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [age, setAge] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  
  const anchorEmojis = ['👑', '👨‍👩‍👧‍👦', '👩‍🍳', '👨‍💻', '🦸‍♂️', '👩‍🚀'];
  const earnerEmojis = ['🏃', '🦄', '🎮', '🛹', '🎓', '🎨'];
  const emojis = role === 'Anchor' ? anchorEmojis : earnerEmojis;
  const [selectedEmoji, setSelectedEmoji] = useState(emojis[0]);

  const [generatedInvite, setGeneratedInvite] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const relationshipPresets = ['Mother', 'Father', 'OFW Parent', 'Guardian', 'Uncle', 'Aunt'];

  const handleSetup = async () => {
    // Frontend Validations
    if (!displayName.trim()) {
      Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please enter your name.', position: 'bottom' });
      return;
    }

    if (role === 'Anchor') {
      if (isJoining && !inviteCode.trim()) {
        Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please enter the Family Invite Code.', position: 'bottom' });
        return;
      }
      if (!isJoining && !familyName.trim()) {
        Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please enter a family name (e.g. Santos Family).', position: 'bottom' });
        return;
      }
      if (!relationship.trim()) {
        Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please select or enter your relationship role.', position: 'bottom' });
        return;
      }
    }

    if (role === 'Earner') {
      if (!inviteCode.trim()) {
        Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please enter the Family Invite Code provided by your parent.', position: 'bottom' });
        return;
      }
      if (!age.trim() || isNaN(Number(age))) {
        Toast.show({ type: 'error', text1: 'Invalid Field', text2: 'Please enter a valid age.', position: 'bottom' });
        return;
      }
      if (!savingsGoal.trim()) {
        Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please enter what you are saving for.', position: 'bottom' });
        return;
      }
    }

    try {
      setError(null);
      setStatus('Generating secure keypair...');
      const keypair = generateKeypair();
      
      setStatus('Encrypting wallet keys...');
      await saveKeypair(keypair.secretKey);
      
      setStatus('Funding account on Stellar Testnet...');
      const isFunded = await fundTestnetAccount(keypair.publicKey);
      if (!isFunded) {
        throw new Error('Failed to fund account via Friendbot.');
      }

      setStatus('Creating trustline for TOKA token...');
      await createTrustline(keypair.secretKey);

      setStatus('Saving your profile...');
      if (role === 'Anchor' && !isJoining) {
        const res = await api.post('/auth/register', {
          vault_address: keypair.publicKey,
          family_name: familyName.trim(),
          stellar_public_key: keypair.publicKey,
          display_name: displayName.trim(),
          avatar_emoji: selectedEmoji,
          relationship: relationship.trim()
        });
        await setAuthToken(res.data.token);
        setGeneratedInvite(res.data.invite_code);
        setStatus('Wallet and profile setup complete!');
      } else if (role === 'Anchor' && isJoining) {
        const res = await api.post('/auth/join', {
          invite_code: inviteCode.trim().toUpperCase(),
          stellar_public_key: keypair.publicKey,
          display_name: displayName.trim(),
          avatar_emoji: selectedEmoji,
          relationship: relationship.trim(),
          role: 'anchor'
        });
        await setAuthToken(res.data.token);
        setStatus('Wallet and profile setup complete!');
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'AnchorDashboard' }] });
        }, 1000);
      } else {
        const res = await api.post('/auth/join', {
          invite_code: inviteCode.trim().toUpperCase(),
          stellar_public_key: keypair.publicKey,
          display_name: displayName.trim(),
          avatar_emoji: selectedEmoji,
          age: parseInt(age.trim(), 10),
          savings_goal: savingsGoal.trim(),
          role: 'earner'
        });
        await setAuthToken(res.data.token);
        setStatus('Wallet and profile setup complete!');
        
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'EarnerDashboard' }] });
        }, 1000);
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'An error occurred during wallet setup.');
      setStatus(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create {role} Profile</Text>
        
        {!status && (
          <View style={styles.formCard}>
            
            {/* ANCHOR TYPE TOGGLE */}
            {role === 'Anchor' && (
              <View style={styles.toggleRow}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, !isJoining && styles.toggleBtnActive]} 
                  onPress={() => setIsJoining(false)}
                >
                  <Text style={[styles.toggleBtnText, !isJoining && styles.toggleBtnTextActive]}>Create Family Vault</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, isJoining && styles.toggleBtnActive]} 
                  onPress={() => setIsJoining(true)}
                >
                  <Text style={[styles.toggleBtnText, isJoining && styles.toggleBtnTextActive]}>Join Co-Parent</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* INVITATION CODE (Earner or joining Anchor) */}
            {(role === 'Earner' || (role === 'Anchor' && isJoining)) && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Family Invite Code</Text>
                <TextInput 
                  style={[styles.input, styles.inviteInput]}
                  placeholder="CODE12"
                  placeholderTextColor={COLORS.textMuted}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <Text style={styles.helperText}>Ask the primary Anchor for the 6-character code.</Text>
              </View>
            )}

            {/* FULL NAME */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. Juan Dela Cruz"
                placeholderTextColor={COLORS.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            {/* FAMILY NAME (Anchor Only & Not Joining) */}
            {role === 'Anchor' && !isJoining && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Family/Household Name</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. Dela Cruz Family"
                  placeholderTextColor={COLORS.textMuted}
                  value={familyName}
                  onChangeText={setFamilyName}
                />
              </View>
            )}

            {/* RELATIONSHIP PRESETS & INPUT (Anchor Only) */}
            {role === 'Anchor' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Role / Relationship</Text>
                <View style={styles.presetContainer}>
                  {relationshipPresets.map((preset) => {
                    const isSelected = relationship === preset;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.presetPill, isSelected && styles.presetPillActive]}
                        onPress={() => setRelationship(preset)}
                      >
                        <Text style={[styles.presetPillText, isSelected && styles.presetPillTextActive]}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput 
                  style={[styles.input, { marginTop: SPACING.sm }]}
                  placeholder="Or enter custom role (e.g. Big Brother)"
                  placeholderTextColor={COLORS.textMuted}
                  value={relationshipPresets.includes(relationship) ? '' : relationship}
                  onChangeText={(val) => setRelationship(val || 'Parent')}
                />
              </View>
            )}

            {/* AGE (Earner Only) */}
            {role === 'Earner' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Age</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. 14"
                  placeholderTextColor={COLORS.textMuted}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            )}

            {/* SAVINGS GOAL (Earner Only) */}
            {role === 'Earner' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What are you saving for?</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. A new school backpack, College savings"
                  placeholderTextColor={COLORS.textMuted}
                  value={savingsGoal}
                  onChangeText={setSavingsGoal}
                />
              </View>
            )}

            {/* AVATAR EMOJI SELECTOR */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choose Avatar Character</Text>
              <View style={styles.emojiRow}>
                {emojis.map((emoji) => {
                  const isSelected = selectedEmoji === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.emojiBubble, isSelected && styles.emojiBubbleActive]}
                      onPress={() => setSelectedEmoji(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ACTION BUTTON */}
            <TouchableOpacity style={styles.button} onPress={handleSetup}>
              <Text style={styles.buttonText}>
                {role === 'Anchor' ? '🚀 Set Up Family Vault' : '⚡ Initialize Profile'}
              </Text>
            </TouchableOpacity>

          </View>
        )}

        {status && !generatedInvite && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.cyan} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}

        {generatedInvite && (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Family Vault Established!</Text>
            <Text style={styles.successDesc}>Invite members using this shared code:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{generatedInvite}</Text>
            </View>
            <Text style={styles.successSubtext}>They will enter this code to join your household network.</Text>
            <TouchableOpacity 
              style={[styles.button, { width: '100%', marginTop: SPACING.md }]} 
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'AnchorDashboard' }] })}
            >
              <Text style={styles.buttonText}>Go to Family Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={[styles.button, { marginTop: SPACING.md }]} onPress={() => setError(null)}>
              <Text style={styles.buttonText}>Try Again</Text>
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
    paddingBottom: SPACING.xxl,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: FONTS.heading,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.lg,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.bgDeep,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    padding: SPACING.md,
    fontSize: 16,
  },
  inviteInput: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
    borderColor: COLORS.cyan,
    color: COLORS.cyan,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  presetPill: {
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  presetPillActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  presetPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  presetPillTextActive: {
    color: COLORS.cyan,
    fontWeight: 'bold',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  emojiBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBubbleActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    transform: [{ scale: 1.1 }],
  },
  emojiText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: COLORS.cyan,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
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
    fontSize: 16,
    fontFamily: FONTS.body,
    marginTop: SPACING.md,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginTop: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  successTitle: {
    color: COLORS.success,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  successDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  successSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  codeBox: {
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  codeText: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  toggleBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: COLORS.cyan,
    fontWeight: 'bold',
  }
});
