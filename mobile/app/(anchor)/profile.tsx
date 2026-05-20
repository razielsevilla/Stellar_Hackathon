import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { Trophy, User, Save, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export default function AnchorProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState('');

  const navigation = useNavigation<any>();

  const fetchData = async () => {
    try {
      const meRes = await api.get('/users/me');
      setProfile(meRes.data);
      setDisplayName(meRes.data.display_name || '');
      setRelationship(meRes.data.relationship || '');

      const famRes = await api.get('/family/members');
      setMembers(famRes.data);
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Toast.show({ type: 'error', text1: 'Invalid Name', text2: 'Display name cannot be empty.', position: 'bottom' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/profile/update', {
        display_name: displayName.trim(),
        relationship: relationship.trim()
      });
      Toast.show({ type: 'success', text1: 'Profile Updated! 👤', text2: 'Your profile changes have been saved.', position: 'bottom' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Failed to update profile details.', position: 'bottom' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  const userInitials = profile?.display_name
    ? profile.display_name.split(' ').map((n: any) => n[0]).join('').toUpperCase()
    : 'A';

  // Sibling leaderboards sorted by XP
  const leaderboard = members
    .filter((m: any) => m.role === 'earner')
    .sort((a, b) => (b.xp || 0) - (a.xp || 0));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* 1. Header Profile */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </View>
        <Text style={styles.userName}>{profile?.display_name}</Text>
        <Text style={styles.userSub}>{profile?.role.toUpperCase()} • FAMILY PORTAL</Text>
        <View style={styles.familyBadge}>
          <ShieldCheck size={14} color={COLORS.cyan} style={{ marginRight: 6 }} />
          <Text style={styles.familyName}>{profile?.family_name} Household</Text>
        </View>
      </View>

      {/* 2. Sibling Leaderboard (Competition Aspect) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Trophy size={20} color={COLORS.cyan} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Household Leaderboard</Text>
        </View>
        {leaderboard.length === 0 ? (
          <Text style={styles.noLeaderboard}>No earners registered in this household.</Text>
        ) : (
          leaderboard.map((m, index) => {
            const level = Math.floor((m.xp || 0) / 100) + 1;
            const placeColors = [COLORS.warning, COLORS.cyan, COLORS.orange];
            const medalColor = index < 3 ? placeColors[index] : COLORS.textMuted;
            
            return (
              <View key={m.id} style={styles.leaderboardRow}>
                <View style={styles.rankContainer}>
                  <Text style={[styles.rankText, { color: medalColor }]}>#{index + 1}</Text>
                </View>
                <View style={styles.earnerMeta}>
                  <Text style={styles.earnerName}>{m.display_name}</Text>
                  <Text style={styles.earnerLevel}>Level {level} • {m.xp || 0} XP</Text>
                </View>
                <View style={styles.earnerBalanceContainer}>
                  <Text style={styles.earnerBalance}>{m.savings_balance || '0.00'}</Text>
                  <Text style={styles.currencyLabel}>TOKA SAVED</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 3. Profile Info Edit */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <User size={20} color={COLORS.cyan} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Edit Profile Settings</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Parent Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor={COLORS.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Household Role / Relationship</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Father, Mother, Guardian"
            placeholderTextColor={COLORS.textMuted}
            value={relationship}
            onChangeText={setRelationship}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.disabledBtn]} 
          onPress={handleUpdateProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.bgDeep} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Save size={16} color={COLORS.bgDeep} style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Save Profile Changes</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cyan,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.cyan,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  familyName: {
    fontSize: 12,
    color: COLORS.cyan,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  noLeaderboard: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: SPACING.md,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  earnerMeta: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  earnerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  earnerLevel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  earnerBalanceContainer: {
    alignItems: 'flex-end',
  },
  earnerBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.cyan,
  },
  currencyLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: 'bold',
    marginTop: 2,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  saveBtn: {
    backgroundColor: COLORS.cyan,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 14,
  }
});
