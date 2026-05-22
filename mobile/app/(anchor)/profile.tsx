import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { getLevelInfo } from '../../constants/levels';
import api from '../../services/api';
import { Trophy, User, Save, ShieldCheck, Flame, Target, Medal } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

// ── Medal colours for top-3 spots ─────────────────────────────────────────────
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function AnchorProfile() {
  const [profile,   setProfile]   = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const [displayName,  setDisplayName]  = useState('');
  const [relationship, setRelationship] = useState('');

  const navigation = useNavigation<any>();

  const fetchData = async () => {
    try {
      const [meRes, lbRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/leaderboard'),
      ]);
      setProfile(meRes.data);
      setDisplayName(meRes.data.display_name || '');
      setRelationship(meRes.data.relationship || '');
      setLeaderboard(lbRes.data);
    } catch (err) {
      console.error('Failed to load anchor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', fetchData);
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
        relationship: relationship.trim(),
      });
      Toast.show({ type: 'success', text1: 'Profile Updated! 👤', text2: 'Changes saved.', position: 'bottom' });
      fetchData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not save profile.', position: 'bottom' });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </View>
        <Text style={styles.userName}>{profile?.display_name}</Text>
        <Text style={styles.userSub}>ANCHOR · FAMILY PORTAL</Text>
        <View style={styles.familyBadge}>
          <ShieldCheck size={14} color={COLORS.cyan} style={{ marginRight: 6 }} />
          <Text style={styles.familyName}>{profile?.family_name} Household</Text>
        </View>
      </View>

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Trophy size={20} color={COLORS.cyan} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Household Leaderboard</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.memberCount}>{leaderboard.length} earner{leaderboard.length !== 1 ? 's' : ''}</Text>
        </View>

        {leaderboard.length === 0 ? (
          <Text style={styles.noLeaderboard}>
            No earners registered in this household yet.{'\n'}Share your invite code so children can join!
          </Text>
        ) : (
          leaderboard.map((m, index) => {
            const levelInfo    = getLevelInfo(m.xp || 0);
            const rankColor    = index < 3 ? RANK_COLORS[index] : COLORS.textMuted;
            const streak       = m.task_streak || 0;
            const goalAmt      = parseFloat(m.savings_goal_amount) || 0;
            const goalBalance  = parseFloat(m.savings_balance) || 0;
            const goalPct      = goalAmt > 0 ? Math.min(100, Math.round((goalBalance / goalAmt) * 100)) : 0;

            return (
              <View key={m.id} style={[styles.leaderboardRow, index === leaderboard.length - 1 && styles.lastRow]}>
                {/* Rank */}
                <View style={styles.rankContainer}>
                  {index < 3 ? (
                    <Medal size={22} color={rankColor} />
                  ) : (
                    <Text style={[styles.rankText, { color: rankColor }]}>#{index + 1}</Text>
                  )}
                </View>

                {/* Earner details */}
                <View style={styles.earnerInfo}>
                  <View style={styles.earnerNameRow}>
                    <Text style={styles.earnerName}>{m.display_name}</Text>
                    {/* Level badge */}
                    <View style={[styles.levelChip, { backgroundColor: `${levelInfo.color}20`, borderColor: `${levelInfo.color}40` }]}>
                      <Text style={styles.levelChipEmoji}>{levelInfo.emoji}</Text>
                      <Text style={[styles.levelChipText, { color: levelInfo.color }]}>Lv{levelInfo.level}</Text>
                    </View>
                  </View>

                  {/* XP mini-bar */}
                  <View style={styles.xpBarBg}>
                    <View
                      style={[
                        styles.xpBarFill,
                        {
                          width: `${levelInfo.progressPercent}%`,
                          backgroundColor: levelInfo.color,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.earnerMeta}>
                    <Text style={styles.xpText}>{(m.xp || 0).toLocaleString()} XP</Text>

                    {/* Streak pill */}
                    {streak > 0 && (
                      <View style={styles.streakPill}>
                        <Flame size={10} color={COLORS.orange} />
                        <Text style={styles.streakPillText}>{streak} streak</Text>
                      </View>
                    )}
                  </View>

                  {/* Savings goal mini-bar (only shown if a goal is set) */}
                  {goalAmt > 0 && (
                    <View style={styles.savingsGoalRow}>
                      <Target size={10} color={COLORS.cyan} style={{ marginRight: 4 }} />
                      <View style={styles.savingsBarBg}>
                        <View style={[styles.savingsBarFill, { width: `${goalPct}%` }]} />
                      </View>
                      <Text style={styles.savingsPct}>{goalPct}%</Text>
                      <Text style={styles.savingsGoalName} numberOfLines={1}>
                        {m.savings_goal || 'Savings Goal'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Right side — savings balance */}
                <View style={styles.earnerRight}>
                  <Text style={styles.earnerBalance}>{(m.savings_balance || 0).toFixed(0)}</Text>
                  <Text style={styles.currencyLabel}>SAVED</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Profile Edit ────────────────────────────────────────────────── */}
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
  container:        { flex: 1, backgroundColor: COLORS.bgDeep },
  contentContainer: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bgDeep, justifyContent: 'center', alignItems: 'center' },

  // Header
  profileHeader: { alignItems: 'center', marginBottom: SPACING.lg, paddingTop: SPACING.md },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.cyan,
    shadowColor: COLORS.cyan, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    marginBottom: SPACING.sm,
  },
  avatarText:  { color: COLORS.textPrimary, fontSize: 28, fontWeight: 'bold' },
  userName:    { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  userSub:     { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1, marginBottom: SPACING.sm },
  familyBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,229,255,0.1)',
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: RADIUS.full,
  },
  familyName:   { fontSize: 12, color: COLORS.cyan, fontWeight: '600' },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle:   { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  memberCount:    { fontSize: 12, color: COLORS.textMuted },

  // Leaderboard
  noLeaderboard: {
    color: COLORS.textMuted, textAlign: 'center',
    fontStyle: 'italic', paddingVertical: SPACING.md, lineHeight: 20,
  },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: SPACING.xs,
  },
  lastRow:       { borderBottomWidth: 0 },
  rankContainer: { width: 36, alignItems: 'center', paddingTop: 2 },
  rankText:      { fontSize: 15, fontWeight: 'bold' },

  earnerInfo:    { flex: 1 },
  earnerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  earnerName:    { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, flex: 1 },

  levelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  levelChipEmoji: { fontSize: 10 },
  levelChipText:  { fontSize: 10, fontWeight: 'bold' },

  xpBarBg: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 4,
  },
  xpBarFill: { height: '100%', borderRadius: 2 },

  earnerMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  xpText:        { fontSize: 11, color: COLORS.textSecondary },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,107,53,0.12)',
    paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: RADIUS.full,
  },
  streakPillText: { fontSize: 10, color: COLORS.orange, fontWeight: 'bold' },

  savingsGoalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
  },
  savingsBarBg:   { height: 4, flex: 1, backgroundColor: 'rgba(0,229,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  savingsBarFill: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 2 },
  savingsPct:     { fontSize: 10, color: COLORS.cyan, fontWeight: 'bold', minWidth: 28, textAlign: 'right' },
  savingsGoalName: { fontSize: 10, color: COLORS.textMuted, maxWidth: 80 },

  earnerRight: { alignItems: 'flex-end', paddingTop: 4 },
  earnerBalance: { fontSize: 16, fontWeight: 'bold', color: COLORS.cyan },
  currencyLabel: { fontSize: 8, color: COLORS.textMuted, fontWeight: 'bold', marginTop: 2 },

  // Form
  formGroup:   { marginBottom: SPACING.md },
  inputLabel:  { color: COLORS.textSecondary, fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: RADIUS.md,
    color: COLORS.textPrimary, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  saveBtn: {
    backgroundColor: COLORS.cyan, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, justifyContent: 'center',
    alignItems: 'center', marginTop: SPACING.sm,
  },
  disabledBtn:  { opacity: 0.5 },
  saveBtnText:  { color: COLORS.bgDeep, fontWeight: 'bold', fontSize: 14 },
});
