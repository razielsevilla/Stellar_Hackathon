import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import api from '../services/api';
import {
  CheckCircle, XCircle, Clock, Coins, PiggyBank,
  ArrowUpRight, ArrowDownLeft, Gavel, Gift, ArrowLeftRight, Zap,
} from 'lucide-react-native';

// ── Event config ───────────────────────────────────────────────────────────────
interface EventConfig {
  icon:  React.ComponentType<any>;
  color: string;
  label: string;
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  task_pending:        { icon: Clock,          color: COLORS.warning,   label: 'Task Assigned' },
  task_submitted:      { icon: ArrowUpRight,   color: COLORS.cyan,      label: 'Proof Submitted' },
  task_approved:       { icon: CheckCircle,    color: COLORS.success,   label: 'Task Approved' },
  task_rejected:       { icon: XCircle,        color: COLORS.error,     label: 'Task Rejected' },
  tx_reward:           { icon: Zap,            color: COLORS.orange,    label: 'TOKA Reward' },
  tx_tax:              { icon: Coins,          color: COLORS.warning,   label: 'Tax Collected' },
  tx_interest:         { icon: PiggyBank,      color: COLORS.success,   label: 'Interest Earned' },
  tx_deposit:          { icon: ArrowUpRight,   color: COLORS.cyan,      label: 'Savings Deposit' },
  tx_withdraw:         { icon: ArrowDownLeft,  color: COLORS.orange,    label: 'Savings Withdrawal' },
  tx_transfer_send:    { icon: ArrowLeftRight, color: COLORS.orange,    label: 'Sent TOKA' },
  tx_transfer_receive: { icon: ArrowLeftRight, color: COLORS.success,   label: 'Received TOKA' },
  tx_cashout:          { icon: Gift,           color: COLORS.warning,   label: 'Cash Out' },
  reward_redeemed:     { icon: Gift,           color: COLORS.cyan,      label: 'Reward Redeemed' },
  cashout_requested:   { icon: Coins,          color: COLORS.orange,    label: 'Cashout Requested' },
  auction_bid:         { icon: Gavel,          color: COLORS.cyan,      label: 'Auction Bid' },
};

function getConfig(type: string): EventConfig {
  return EVENT_CONFIG[type] ?? { icon: Clock, color: COLORS.textMuted, label: type };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ActivityFeed() {
  const [events,    setEvents]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/family/activity');
      setEvents(res.data);
    } catch (err) {
      console.error('Activity feed error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const cfg = getConfig(item.type);
    const IconComp = cfg.icon;
    const isLast = index === events.length - 1;

    return (
      <View style={styles.eventRow}>
        {/* Timeline spine */}
        <View style={styles.spine}>
          <View style={[styles.spineIcon, { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}50` }]}>
            <IconComp size={14} color={cfg.color} />
          </View>
          {!isLast && <View style={styles.spineLine} />}
        </View>

        {/* Content */}
        <View style={[styles.eventCard, isLast && { marginBottom: SPACING.xxl }]}>
          <View style={styles.eventHeader}>
            <View style={[styles.typePill, { backgroundColor: `${cfg.color}18` }]}>
              <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
          </View>

          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.eventMeta}>
            {item.actor_emoji ? (
              <Text style={styles.actorEmoji}>{item.actor_emoji}</Text>
            ) : null}
            <Text style={styles.actorName}>{item.actor_name}</Text>
            {item.detail != null && (
              <Text style={styles.eventDetail}>
                {['tx_reward', 'tx_tax', 'tx_deposit', 'tx_withdraw',
                  'tx_interest', 'tx_transfer_send', 'tx_transfer_receive',
                  'cashout_requested', 'reward_redeemed', 'auction_bid',
                ].includes(item.type)
                  ? ` · ${Number(item.detail).toFixed(0)} TOKA`
                  : ` · ${item.detail} TOKA reward`
                }
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={events}
      keyExtractor={(item, i) => `${item.id}-${i}`}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
      ListHeaderComponent={
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Family Activity</Text>
          <Text style={styles.feedSub}>All household events, newest first</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No events yet.</Text>
          <Text style={styles.emptySub}>Complete a task to see your first event here!</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bgDeep },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDeep },

  feedHeader: { marginBottom: SPACING.lg },
  feedTitle:  { fontSize: 22, fontFamily: FONTS.headingBold, color: COLORS.textPrimary },
  feedSub:    { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.body },

  // Timeline row
  eventRow: { flexDirection: 'row', marginBottom: 0 },

  spine: { width: 36, alignItems: 'center', paddingTop: 2 },
  spineIcon: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, zIndex: 1,
  },
  spineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: 2,
    minHeight: 24,
  },

  eventCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  eventHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  typePill:     { paddingVertical: 2, paddingHorizontal: 8, borderRadius: RADIUS.full },
  typeLabel:    { fontSize: 10, fontFamily: FONTS.headingBold },
  timeAgo:      { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  eventTitle:   { fontSize: 14, fontFamily: FONTS.headingBold, color: COLORS.textPrimary, marginBottom: 4, lineHeight: 18 },
  eventMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actorEmoji:   { fontSize: 12 },
  actorName:    { fontSize: 12, color: COLORS.textSecondary },
  eventDetail:  { fontSize: 12, color: COLORS.textMuted },

  // Empty state
  empty:      { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText:  { fontSize: 18, fontFamily: FONTS.headingBold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptySub:   { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', fontFamily: FONTS.body },
});
