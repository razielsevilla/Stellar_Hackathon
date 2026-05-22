import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { getLevelInfo, getStreakLabel, LEVELS } from '../../constants/levels';
import api from '../../services/api';
import { getPublicKey, TOKA_ASSET } from '../../services/stellar';
import UserAvatar from '../../components/UserAvatar';
import { Award, Flame, Target, User, Save, ChevronRight, Zap } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export default function EarnerProfile() {
  const [profile, setProfile]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [barAnim]                   = useState(new Animated.Value(0));

  // Edit fields
  const [displayName, setDisplayName]         = useState('');
  const [age, setAge]                         = useState('');
  const [savingsGoal, setSavingsGoal]         = useState('');
  const [savingsGoalAmount, setSavingsGoalAmount] = useState('');

  const navigation = useNavigation<any>();

  const fetchData = async () => {
    try {
      const meRes = await api.get('/users/me');
      const data  = meRes.data;
      setProfile(data);
      setDisplayName(data.display_name || '');
      setAge(data.age ? String(data.age) : '');
      setSavingsGoal(data.savings_goal || '');
      setSavingsGoalAmount(data.savings_goal_amount ? String(data.savings_goal_amount) : '');
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation]);

  // Animate the XP progress bar when profile loads
  useEffect(() => {
    if (!profile) return;
    const { progressPercent } = getLevelInfo(profile.xp || 0);
    Animated.timing(barAnim, {
      toValue: progressPercent / 100,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [profile?.xp]);

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Toast.show({ type: 'error', text1: 'Invalid Name', text2: 'Display name cannot be empty.', position: 'bottom' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/profile/update', {
        display_name:        displayName.trim(),
        age:                 age ? Number(age) : null,
        savings_goal:        savingsGoal.trim(),
        savings_goal_amount: savingsGoalAmount ? Number(savingsGoalAmount) : 0,
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
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  const xp       = profile?.xp || 0;
  const streak   = profile?.task_streak || 0;
  const levelInfo = getLevelInfo(xp);
  const isMaxLevel = levelInfo.xpToNextLevel === null;

  const savingsBalance  = parseFloat(profile?.savings_balance) || 0;
  const savingsGoalAmt  = parseFloat(profile?.savings_goal_amount) || 0;
  const savingsPercent  = savingsGoalAmt > 0
    ? Math.min(100, Math.round((savingsBalance / savingsGoalAmt) * 100))
    : 0;

  const userInitials = profile?.display_name
    ? profile.display_name.split(' ').map((n: any) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatarGlow, { backgroundColor: `${levelInfo.color}20` }]}>
          <UserAvatar iconString={profile?.avatar_emoji || 'User|#000000'} size={80} style={{ borderColor: levelInfo.color, borderWidth: 2 }} />
        </View>

        <Text style={styles.userName}>{profile?.display_name}</Text>
        <Text style={styles.userSub}>EARNER · AGE {profile?.age || '—'}</Text>

        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: `${levelInfo.color}20`, borderColor: `${levelInfo.color}50` }]}>
          <Text style={styles.levelBadgeEmoji}>{levelInfo.emoji}</Text>
          <Text style={[styles.levelBadgeText, { color: levelInfo.color }]}>
            {levelInfo.title}
          </Text>
        </View>
      </View>

      {/* ── XP & Level Progress ─────────────────────────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Zap size={18} color={levelInfo.color} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Level Progress</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.levelNum, { color: levelInfo.color }]}>
            Level {levelInfo.level}
          </Text>
        </View>

        {/* XP bar */}
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: levelInfo.color,
              },
            ]}
          />
        </View>

        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>{xp.toLocaleString()} XP total</Text>
          {!isMaxLevel && (
            <Text style={styles.xpNextLabel}>
              {levelInfo.xpToNextLevel} XP → {LEVELS[levelInfo.level]?.title || 'MAX'}
            </Text>
          )}
          {isMaxLevel && <Text style={[styles.xpNextLabel, { color: levelInfo.color }]}>MAX LEVEL 👑</Text>}
        </View>

        {/* Level road */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelRoad}>
          {LEVELS.map((l) => {
            const isUnlocked = xp >= l.minXP;
            const isCurrent  = l.level === levelInfo.level;
            return (
              <View key={l.level} style={styles.levelPip}>
                <View style={[
                  styles.pipDot,
                  { backgroundColor: isUnlocked ? l.color : 'rgba(255,255,255,0.1)' },
                  isCurrent && styles.pipDotActive,
                ]}>
                  <Text style={styles.pipEmoji}>{l.emoji}</Text>
                </View>
                <Text style={[styles.pipLabel, isCurrent && { color: l.color, fontWeight: 'bold' }]}>
                  Lv{l.level}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Streak Counter ──────────────────────────────────────────────── */}
      <View style={[styles.sectionCard, styles.streakCard]}>
        <View style={styles.sectionHeader}>
          <Flame size={18} color={streak > 0 ? COLORS.orange : COLORS.textMuted} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Task Streak</Text>
        </View>

        <View style={styles.streakContent}>
          <Text style={[styles.streakNumber, { color: streak > 0 ? COLORS.orange : COLORS.textMuted }]}>
            {streak}
          </Text>
          <View style={styles.streakMeta}>
            <Text style={styles.streakLabel}>{getStreakLabel(streak)}</Text>
            <Text style={styles.streakSub}>
              {streak === 0
                ? 'Complete and get a task approved to start your streak!'
                : 'Keep completing tasks to maintain your streak and unlock streak rewards!'}
            </Text>
          </View>
        </View>

        {/* Streak milestone bar */}
        <View style={styles.streakMilestones}>
          {[1, 3, 5, 10].map((milestone) => {
            const reached = streak >= milestone;
            return (
              <View key={milestone} style={styles.milestoneItem}>
                <View style={[
                  styles.milestoneDot,
                  reached && { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
                ]}>
                  <Text style={styles.milestoneEmoji}>{reached ? '🔥' : '○'}</Text>
                </View>
                <Text style={[styles.milestoneLabel, reached && { color: COLORS.orange }]}>
                  {milestone}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Savings Goal Tracker ────────────────────────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Target size={18} color={COLORS.cyan} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Savings Goal</Text>
          <View style={{ flex: 1 }} />
          {savingsGoalAmt > 0 && (
            <Text style={styles.savingsPercent}>{savingsPercent}%</Text>
          )}
        </View>

        {savingsGoalAmt > 0 ? (
          <>
            <Text style={styles.savingsGoalLabel}>
              🎯 {profile?.savings_goal || 'My Goal'}
            </Text>

            <View style={styles.savingsBarBg}>
              <View
                style={[
                  styles.savingsBarFill,
                  { width: `${savingsPercent}%` },
                  savingsPercent >= 100 && { backgroundColor: COLORS.success },
                ]}
              />
            </View>

            <View style={styles.savingsRow}>
              <Text style={styles.savingsCurrent}>
                {savingsBalance.toLocaleString()} TOKA saved
              </Text>
              <Text style={styles.savingsTarget}>
                Goal: {savingsGoalAmt.toLocaleString()} TOKA
              </Text>
            </View>

            {savingsPercent >= 100 && (
              <View style={styles.goalReachedBanner}>
                <Text style={styles.goalReachedText}>🎉 Goal Reached! Ask your parent to redeem!</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noGoalText}>
            Set a savings goal below to start tracking your progress.
          </Text>
        )}
      </View>

      {/* ── Edit Profile ────────────────────────────────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <User size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Edit Profile</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor={COLORS.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 14"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            maxLength={2}
            value={age}
            onChangeText={setAge}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>What are you saving for?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. New school bag, Laptop fund..."
            placeholderTextColor={COLORS.textMuted}
            value={savingsGoal}
            onChangeText={setSavingsGoal}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Savings Goal Target (in TOKA)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={savingsGoalAmount}
            onChangeText={setSavingsGoalAmount}
          />
          <Text style={styles.inputHelper}>
            Set a TOKA target so you can track your progress above.
          </Text>
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
  avatarGlow:    { borderRadius: 60, padding: 8, marginBottom: SPACING.xs },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarEmoji:   { fontSize: 36 },
  userName:      { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  userSub:       { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1, marginBottom: SPACING.sm },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingHorizontal: 14,
    borderRadius: RADIUS.full, borderWidth: 1,
    gap: 6,
  },
  levelBadgeEmoji: { fontSize: 16 },
  levelBadgeText:  { fontSize: 13, fontWeight: 'bold' },

  // Shared card
  sectionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle:   { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  levelNum:       { fontSize: 14, fontWeight: 'bold' },

  // XP bar
  progressBarBg: {
    height: 10, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5, overflow: 'hidden', marginBottom: SPACING.xs,
  },
  progressBarFill: { height: '100%', borderRadius: 5 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  xpLabel:     { fontSize: 12, color: COLORS.textSecondary },
  xpNextLabel: { fontSize: 12, color: COLORS.textMuted },

  // Level road
  levelRoad: { marginTop: SPACING.xs },
  levelPip:  { alignItems: 'center', marginRight: SPACING.sm, width: 42 },
  pipDot: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  pipDotActive: { shadowOpacity: 0.5, shadowRadius: 6, elevation: 4, transform: [{ scale: 1.15 }] },
  pipEmoji:  { fontSize: 14 },
  pipLabel:  { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },

  // Streak
  streakCard:    {},
  streakContent: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, gap: SPACING.md },
  streakNumber:  { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  streakMeta:    { flex: 1 },
  streakLabel:   { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  streakSub:     { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  streakMilestones: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: SPACING.sm, marginTop: SPACING.xs,
  },
  milestoneItem:  { alignItems: 'center', flex: 1 },
  milestoneDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  milestoneEmoji: { fontSize: 12 },
  milestoneLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: 'bold' },

  // Savings goal
  savingsPercent:    { fontSize: 16, fontWeight: 'bold', color: COLORS.cyan },
  savingsGoalLabel:  { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  savingsBarBg: {
    height: 14, backgroundColor: 'rgba(0,229,255,0.1)',
    borderRadius: 7, overflow: 'hidden', marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  savingsBarFill: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 7 },
  savingsRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  savingsCurrent: { fontSize: 12, color: COLORS.cyan, fontWeight: 'bold' },
  savingsTarget:  { fontSize: 12, color: COLORS.textMuted },
  goalReachedBanner: {
    marginTop: SPACING.sm, backgroundColor: 'rgba(0,230,118,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.success,
    alignItems: 'center',
  },
  goalReachedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 13 },
  noGoalText:      { color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.sm },

  // Form
  formGroup:   { marginBottom: SPACING.md },
  inputLabel:  { color: COLORS.textSecondary, fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  inputHelper: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: RADIUS.md,
    color: COLORS.textPrimary, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  saveBtn: {
    backgroundColor: COLORS.orange, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, justifyContent: 'center',
    alignItems: 'center', marginTop: SPACING.sm,
  },
  disabledBtn:  { opacity: 0.5 },
  saveBtnText:  { color: COLORS.bgDeep, fontWeight: 'bold', fontSize: 14 },
});
