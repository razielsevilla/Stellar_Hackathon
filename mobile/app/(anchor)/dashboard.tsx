import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  RefreshControl, ScrollView, Dimensions, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { getPublicKey, getTokaBalance } from '../../services/stellar';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import WalletWidget from '../../components/WalletWidget';
import TaskCard from '../../components/TaskCard';
import EmptyState from '../../components/EmptyState';
import { TaskSkeleton } from '../../components/SkeletonLoader';
import TokaBitMascot from '../../components/TokaBitMascot';
import { Target, BarChart2, Award, Zap, CheckCircle, PiggyBank, Flame, TrendingUp, Inbox } from 'lucide-react-native';
import { Task, User } from '../../types';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <View style={[statStyles.card, { borderColor: `${color}30` }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.sm,
    alignItems: 'center',
    flex: 1,
    minWidth: (width - SPACING.lg * 2 - SPACING.sm * 2) / 3 - 1,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  value:    { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  label:    { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '600' },
  sub:      { fontSize: 9, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
});

// ── Mini bar chart (no library needed) ─────────────────────────────────────────
function MiniBarChart({ data }: { data: { name: string; emoji: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={barStyles.container}>
      {data.map((item) => (
        <View key={item.name} style={barStyles.barGroup}>
          <Text style={barStyles.barEmoji}>{item.emoji || '👤'}</Text>
          <View style={barStyles.barBg}>
            <View
              style={[
                barStyles.barFill,
                { width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: item.color },
              ]}
            />
          </View>
          <Text style={barStyles.barValue}>{item.value.toFixed(0)}</Text>
        </View>
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: SPACING.xs },
  barGroup:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  barEmoji:  { fontSize: 16, width: 26, textAlign: 'center' },
  barBg: {
    flex: 1, height: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.sm, overflow: 'hidden',
  },
  barFill:   { height: '100%', borderRadius: RADIUS.sm },
  barValue:  { fontSize: 12, color: COLORS.textSecondary, minWidth: 36, textAlign: 'right', fontWeight: 'bold' },
});

// ── Analytics Panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ analytics }: { analytics: any }) {
  if (!analytics) return null;

  const perEarnerData = (analytics.per_earner || []).map((e: any, i: number) => ({
    name:  e.name,
    emoji: e.emoji || '👤',
    value: e.toka_earned || 0,
    color: i === 0 ? COLORS.cyan : i === 1 ? COLORS.orange : COLORS.success,
  }));

  return (
    <View style={panelStyles.container}>
      <View style={panelStyles.header}>
        <BarChart2 size={20} color={COLORS.cyan} />
        <Text style={panelStyles.title}>Family Analytics</Text>
      </View>

      {/* Stat grid */}
      <View style={panelStyles.statGrid}>
        <StatCard
          label="TOKA Distributed"
          value={`${Number(analytics.total_toka_distributed || 0).toFixed(0)}`}
          sub="total reward payouts"
          color={COLORS.cyan}
          icon={Zap}
        />
        <StatCard
          label="Completion Rate"
          value={`${analytics.completion_rate || 0}%`}
          sub={`${analytics.tasks_approved || 0} / ${analytics.tasks_total || 0} tasks`}
          color={COLORS.success}
          icon={CheckCircle}
        />
        <StatCard
          label="Total XP"
          value={(analytics.total_xp_awarded || 0).toLocaleString()}
          sub="across all earners"
          color={COLORS.orange}
          icon={Award}
        />
      </View>

      <View style={[panelStyles.statGrid, { marginTop: SPACING.xs }]}>
        <StatCard
          label="Family Savings"
          value={`${Number(analytics.total_savings || 0).toFixed(0)}`}
          sub="TOKA in vaults"
          color={COLORS.success}
          icon={PiggyBank}
        />
        <StatCard
          label="Pending Tasks"
          value={analytics.tasks_pending || 0}
          sub="awaiting approval"
          color={COLORS.warning}
          icon={TrendingUp}
        />
        <StatCard
          label="Active Streaks"
          value={`${(analytics.per_earner || []).filter((e: any) => (e.streak || 0) > 0).length}`}
          sub="earners on fire 🔥"
          color={COLORS.orange}
          icon={Flame}
        />
      </View>

      {/* Per-earner TOKA earned bar chart */}
      {perEarnerData.length > 0 && (
        <View style={panelStyles.chartSection}>
          <Text style={panelStyles.chartTitle}>TOKA Earned per Child</Text>
          <MiniBarChart data={perEarnerData} />
        </View>
      )}

      {/* Latest approved task highlight */}
      {analytics.latest_approved && (
        <View style={panelStyles.latestCard}>
          <CheckCircle size={14} color={COLORS.success} />
          <Text style={panelStyles.latestText} numberOfLines={1}>
            Last approved: <Text style={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
              {analytics.latest_approved.title}
            </Text> — {analytics.latest_approved.earner_name}
          </Text>
        </View>
      )}
    </View>
  );
}

const panelStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.1)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  title:  { fontSize: 17, fontFamily: FONTS.headingBold, color: COLORS.textPrimary },
  statGrid: { flexDirection: 'row', gap: SPACING.xs, marginBottom: 0 },
  chartSection: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  chartTitle: { fontSize: 13, fontFamily: FONTS.headingBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  latestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(0,230,118,0.08)',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.15)',
  },
  latestText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
});

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  usePushNotifications();
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [balance,   setBalance]   = useState('0');
  const [profile,   setProfile]   = useState<User | null>(null);
  const [members,   setMembers]   = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mascotStatus, setMascotStatus] = useState<'idle' | 'happy'>('idle');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fetchData = async () => {
    try {
      const [profileRes, membersRes, tasksRes, analyticsRes] = await Promise.allSettled([
        api.get('/users/me'),
        api.get('/family/members'),
        api.get('/tasks/'),
        api.get('/family/analytics'),
      ]);

      if (profileRes.status === 'fulfilled')   setProfile(profileRes.value.data);
      if (membersRes.status === 'fulfilled')   setMembers(membersRes.value.data);
      if (tasksRes.status === 'fulfilled')     setTasks(tasksRes.value.data);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);

      const pubKey = await getPublicKey();
      if (pubKey) {
        const tokaBal = await getTokaBalance(pubKey);
        setBalance(tokaBal);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    const unsubscribe = navigation.addListener('focus', fetchData);
    return () => { clearInterval(interval); unsubscribe(); };
  }, [navigation]);

  useEffect(() => {
    if (!loading && parseFloat(balance) > 0) {
      setMascotStatus('happy');
      setTimeout(() => setMascotStatus('idle'), 2000);
    }
  }, [balance, loading]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const renderHeader = () => (
    <View>
      <WalletWidget
        type="anchor"
        balance={balance}
        userName={profile?.display_name}
        familyName={profile?.family_name}
        relationship={profile?.relationship}
        avatarEmoji={profile?.avatar_emoji}
      />

      {/* ── Analytics Panel ─────────────────────────────────────────── */}
      <AnalyticsPanel analytics={analytics} />

      {/* ── Household Members ────────────────────────────────────────── */}
      <View style={styles.membersContainer}>
        <Text style={styles.membersTitle}>Household Members</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
          {members.map((member) => {
            const isAnchor = member.role === 'anchor';
            const accent   = isAnchor ? COLORS.cyan : COLORS.orange;
            const name     = member.display_name || '?';
            const parts    = name.trim().split(/\s+/);
            const initials = parts.length >= 2
              ? (parts[0][0] + parts[1][0]).toUpperCase()
              : parts[0].substring(0, 2).toUpperCase();

            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={[styles.memberAvatar, { borderColor: accent, backgroundColor: `${accent}15` }]}>
                  <Text style={[styles.memberInitials, { color: accent }]}>{initials}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{member.display_name}</Text>
                <Text style={styles.memberRole}>
                  {isAnchor ? member.relationship || 'Parent' : `Age ${member.age || 12}`}
                </Text>
                {!isAnchor && member.savings_goal && (
                  <View style={styles.goalContainer}>
                    <Target size={10} color={COLORS.orange} style={{ marginRight: 3 }} />
                    <Text style={styles.memberGoal} numberOfLines={1}>{member.savings_goal}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Section Title ────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Family Quests</Text>
          <View style={{ marginLeft: SPACING.sm }}>
            <TokaBitMascot status={mascotStatus} size={28} />
          </View>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{tasks.length} Total</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ScrollView style={{ marginTop: SPACING.lg }} showsVerticalScrollIndicator={false}>
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const member = members.find(m => m.id === item.assigned_to);
            const assigneeName = member ? member.display_name.split(' ')[0] : 'Unknown';
            return <TaskCard task={{ ...item, assignee: assigneeName }} role="anchor" onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })} />;
          }}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
          ListEmptyComponent={<EmptyState icon={Inbox} title="No Active Quests" description="Tap the 'Create Task' tab to assign a new quest to your family members." />}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bgDeep, padding: SPACING.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  membersContainer: { marginBottom: SPACING.xl },
  membersTitle:     { color: COLORS.textPrimary, fontSize: 20, fontFamily: FONTS.headingBold, marginBottom: SPACING.md },
  membersScroll:    { paddingHorizontal: SPACING.xs, gap: SPACING.md },
  memberCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', width: 110,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  memberAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: SPACING.sm,
  },
  memberInitials: { fontSize: 18, fontFamily: FONTS.headingBold },
  memberName:     { color: COLORS.textPrimary, fontSize: 14, fontFamily: FONTS.headingBold, textAlign: 'center' },
  memberRole:     { color: COLORS.textSecondary, fontSize: 11, fontFamily: FONTS.body, marginTop: 2, textAlign: 'center' },
  goalContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,107,53,0.06)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm,
    width: '100%', marginTop: 6,
  },
  memberGoal: { color: COLORS.orange, fontSize: 9, fontFamily: FONTS.headingBold },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md, paddingHorizontal: SPACING.xs,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 20, fontFamily: FONTS.headingBold },
  totalBadge: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
  },
  totalText:  { color: COLORS.cyan, fontSize: 14, fontFamily: FONTS.headingBold },
  emptyText:  { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xl, fontFamily: FONTS.body },
});
