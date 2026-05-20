import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Target, Users } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface WalletWidgetProps {
  type: 'anchor' | 'earner';
  balance: string;
  userName?: string;
  familyName?: string;
  relationship?: string;
  savingsGoal?: string;
  avatarEmoji?: string;
  inviteCode?: string;
}

export default function WalletWidget({ 
  type, 
  balance,
  userName,
  familyName,
  relationship,
  savingsGoal,
  avatarEmoji,
  inviteCode
}: WalletWidgetProps) {
  const isAnchor = type === 'anchor';
  const accent = isAnchor ? COLORS.cyan : COLORS.orange;

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(17, 25, 69, 0.6)', 'rgba(8, 12, 33, 0.8)']}
        style={styles.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* PREMIUM PERSONALIZED PROFILE HEADER */}
        {userName && (
          <View style={styles.profileHeader}>
            <View style={styles.profileLeft}>
              <View style={[styles.avatarCircle, { borderColor: accent, backgroundColor: `${accent}15` }]}>
                <Text style={[styles.avatarInitials, { color: accent }]}>{getInitials(userName)}</Text>
              </View>
              <View style={styles.profileTextContainer}>
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.profileSubtitle}>
                  {isAnchor ? relationship || 'Parent / Admin' : `Age ${relationship || '12'}`}
                </Text>
              </View>
            </View>
            
            <View style={styles.profileRight}>
              <View style={styles.familyBadge}>
                <Users size={12} color={accent} style={{ marginRight: 4 }} />
                <Text style={[styles.familyName, { color: accent }]}>{familyName || 'My Family'}</Text>
              </View>
              {!isAnchor && inviteCode && (
                <Text style={styles.inviteText}>Invite: {inviteCode}</Text>
              )}
            </View>
          </View>
        )}

        {/* SAVINGS GOAL BADGE (Earner Only) */}
        {!isAnchor && savingsGoal && (
          <View style={styles.goalCard}>
            <Target size={14} color={COLORS.orange} style={{ marginRight: 6 }} />
            <Text style={styles.goalText}>Target: {savingsGoal}</Text>
          </View>
        )}

        <Text style={[styles.label, userName && { marginTop: SPACING.md }]}>
          {isAnchor ? 'FAMILY VAULT BALANCE' : 'MY TOKA WALLET'}
        </Text>
        
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>{balance}</Text>
          <Text style={[styles.currencyText, { color: accent }]}>TOKA</Text>
        </View>

        <Text style={styles.fiatEstimate}>≈ ₱{(parseFloat(balance || '0') * 1).toFixed(2)} PHP</Text>

        <View style={styles.divider} />

        <View style={styles.addressContainer}>
          <View style={styles.networkInfo}>
            <Sparkles size={12} color={accent} style={{ marginRight: 6 }} />
            <Text style={styles.addressText}>XLM: {isAnchor ? '9.4201' : '1.5000'}</Text>
          </View>
          <Text style={styles.addressText}>
            {isAnchor ? 'GDQP...HG4W' : 'GBBM...PWFM'}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(0,0,0,0.2)', // Base background for the blur
  },
  gradientBg: {
    padding: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileTextContainer: {
    marginLeft: SPACING.sm,
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  profileRight: {
    alignItems: 'flex-end',
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  familyName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  inviteLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  inviteValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  inviteText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: 'bold',
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: SPACING.md,
  },
  goalText: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: 'bold',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.xs,
  },
  balanceText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    marginRight: SPACING.sm,
  },
  currencyText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fiatEstimate: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: SPACING.md,
  },
  addressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  }
});
