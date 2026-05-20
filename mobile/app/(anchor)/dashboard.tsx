import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { getPublicKey, getTokaBalance } from '../../services/stellar';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import WalletWidget from '../../components/WalletWidget';
import TaskCard from '../../components/TaskCard';
import TokaBitMascot from '../../components/TokaBitMascot';
import { Target } from 'lucide-react-native';

export default function Dashboard() {
  usePushNotifications(); // Register and update push token
  const [tasks, setTasks] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>('0');
  const [profile, setProfile] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mascotStatus, setMascotStatus] = useState<'idle' | 'happy'>('idle');
  const navigation = useNavigation();

  const fetchData = async () => {
    try {
      // Fetch user profile
      try {
        const profileRes = await api.get('/users/me');
        setProfile(profileRes.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }

      // Fetch household members
      try {
        const membersRes = await api.get('/family/members');
        setMembers(membersRes.data);
      } catch (err) {
        console.error('Failed to fetch household members:', err);
      }

      const pubKey = await getPublicKey();
      if (pubKey) {
        const tokaBal = await getTokaBalance(pubKey);
        setBalance(tokaBal);
      }

      const res = await api.get('/tasks/');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (!loading && parseFloat(balance) > 0) {
      setMascotStatus('happy');
      setTimeout(() => setMascotStatus('idle'), 2000);
    }
  }, [balance, loading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderHeader = () => (
    <View>
      {/* Wallet Balance widget */}
      <WalletWidget 
        type="anchor" 
        balance={balance} 
        userName={profile?.display_name}
        familyName={profile?.family_name}
        relationship={profile?.relationship}
        avatarEmoji={profile?.avatar_emoji}
      />

      {/* Household Members Section */}
      <View style={styles.membersContainer}>
        <Text style={styles.membersTitle}>Household Members</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.membersScroll}
        >
          {members.map((member) => {
            const isAnchorRole = member.role === 'anchor';
            const accent = isAnchorRole ? COLORS.cyan : COLORS.orange;
            
            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={[styles.memberAvatar, { borderColor: accent, backgroundColor: `${accent}15` }]}>
                  <Text style={[styles.memberInitials, { color: accent }]}>
                    {(() => {
                      const name = member.display_name || '?';
                      const parts = name.trim().split(/\s+/);
                      return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
                    })()}
                  </Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.display_name}
                </Text>
                <Text style={styles.memberRole}>
                  {isAnchorRole ? member.relationship || 'Parent' : `Age ${member.age || 12}`}
                </Text>
                {!isAnchorRole && member.savings_goal && (
                  <View style={styles.goalContainer}>
                    <Target size={10} color={COLORS.orange} style={{ marginRight: 3 }} />
                    <Text style={styles.memberGoal} numberOfLines={1}>
                      {member.savings_goal}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Title for Quests */}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.cyan} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const member = members.find(m => m.id === item.assigned_to);
            const assigneeName = member ? member.display_name.split(' ')[0] : 'Unknown';
            return <TaskCard task={{ ...item, assignee: assigneeName }} role="anchor" onPress={() => {}} />;
          }}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No tasks found.</Text>}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersContainer: {
    marginBottom: SPACING.xl,
  },
  membersTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  membersScroll: {
    paddingHorizontal: SPACING.xs,
    gap: SPACING.md,
  },
  memberCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    width: 110,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  memberInitials: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  memberRole: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    width: '100%',
    marginTop: 6,
  },
  memberGoal: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  totalText: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  }
});
