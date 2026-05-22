import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Coins, Hourglass, Eye, CheckCircle2, XCircle, User, Calendar } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface TaskCardProps {
  task: any;
  role: 'anchor' | 'earner';
  onPress: () => void;
}

export default function TaskCard({ task, role, onPress }: TaskCardProps) {
  const isAnchor = role === 'anchor';
  const accent = isAnchor ? COLORS.cyan : COLORS.orange;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': 
        return { color: COLORS.pending, label: 'Pending', Icon: Hourglass };
      case 'submitted': 
        return { color: COLORS.cyan, label: 'Review', Icon: Eye };
      case 'approved': 
        return { color: COLORS.success, label: 'Paid', Icon: CheckCircle2 };
      case 'rejected': 
        return { color: COLORS.error, label: 'Retry', Icon: XCircle };
      default: 
        return { color: COLORS.textMuted, label: status, Icon: Hourglass };
    }
  };

  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.Icon;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
        <View style={[
          styles.statusBadge, 
          { 
            backgroundColor: `${statusConfig.color}15`, 
            borderColor: `${statusConfig.color}40`,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4
          }
        ]}>
          <StatusIcon size={11} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.metaRow}>
          {task.is_collaborative === 1 ? (
            <>
              <User size={14} color={COLORS.cyan} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: COLORS.cyan, fontWeight: 'bold' }]}>Co-op Quest</Text>
            </>
          ) : isAnchor ? (
            <>
              <User size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{task.assignee || 'Unknown'}</Text>
            </>
          ) : (
            <>
              <Calendar size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{task.deadline || 'No date'}</Text>
            </>
          )}
        </View>
        
        <View style={styles.rewardContainer}>
          <Coins size={18} color={accent} style={{ marginRight: 6 }} />
          <Text style={[styles.rewardAmount, { color: accent }]}>{task.reward_amount}</Text>
          <Text style={styles.rewardCurrency}>TOKA</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 22, 64, 0.6)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONTS.headingBold,
    color: 'rgba(255, 255, 255, 0.9)',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.headingBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardAmount: {
    fontSize: 18,
    fontFamily: FONTS.headingBold,
  },
  rewardCurrency: {
    fontSize: 12,
    fontFamily: FONTS.headingBold,
    color: COLORS.textSecondary,
    marginLeft: 4,
  }
});
