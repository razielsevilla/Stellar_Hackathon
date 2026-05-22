import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { useStellarBalance } from '../../hooks/useStellarBalance';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import type { RootStackParamList } from '../../App';
import TokaBitMascot from '../../components/TokaBitMascot';
import WalletWidget from '../../components/WalletWidget';
import TaskCard from '../../components/TaskCard';
import EmptyState from '../../components/EmptyState';
import { TaskSkeleton } from '../../components/SkeletonLoader';
import { Target, Inbox, Flame, Award, PiggyBank } from 'lucide-react-native';
import { Task, User } from '../../types';
import * as Haptics from 'expo-haptics';

function StatCard({ label, value, color, icon: Icon }: any) {
  return (
    <View style={[statStyles.card, { borderColor: `${color}30` }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  iconWrap: {
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: 20,
    fontFamily: FONTS.headingBold,
    marginBottom: 2,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.body,
  },
});

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EarnerDashboard'>;

export default function Dashboard() {
  usePushNotifications(); // Register and update push token
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const { balance, loading: loadingBalance, refetch } = useStellarBalance();
  const [mascotStatus, setMascotStatus] = useState<'idle' | 'happy'>('idle');

  const fetchTasks = async () => {
    try {
      let myId = null;
      try {
        const profileRes = await api.get('/users/me');
        setProfile(profileRes.data);
        myId = profileRes.data.id;
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        if (profile) {
          myId = profile.id;
        }
      }

      const res = await api.get('/tasks/');
      const filtered = res.data.filter((t: Task) => t.is_collaborative || (myId && t.assigned_to === myId));
      setTasks(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchTasks();
      refetch();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    // Make mascot happy when balance is fetched and > 0
    if (!loadingBalance && parseFloat(balance) > 0) {
      setMascotStatus('happy');
      setTimeout(() => setMascotStatus('idle'), 2000);
    }
  }, [balance, loadingBalance]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchTasks();
    refetch();
  };

  const renderHeader = () => (
    <View style={{ marginBottom: SPACING.lg }}>
      <WalletWidget 
        type="earner" 
        balance={balance || '0'} 
        userName={profile?.display_name}
        familyName={profile?.family_name}
        relationship={profile?.age ? String(profile.age) : undefined}
        savingsGoal={profile?.savings_goal}
        avatarEmoji={profile?.avatar_emoji}
        inviteCode={profile?.invite_code}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.xs, marginTop: SPACING.md }}>
        <StatCard label="Task Streak" value={profile?.task_streak || '0'} color={COLORS.orange} icon={Flame} />
        <StatCard label="Total XP" value={profile?.xp || '0'} color={COLORS.cyan} icon={Award} />
        <StatCard label="Savings" value={`${profile?.savings_balance || '0'} T`} color={COLORS.success} icon={PiggyBank} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.sectionTitle}>My Tasks</Text>
          <View style={styles.mascotBadge}>
            <TokaBitMascot status={mascotStatus} size={28} />
          </View>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: 'rgba(255, 107, 53, 0.1)' }]}>
          <Text style={[styles.totalText, { color: COLORS.orange }]}>{tasks.filter(t => t.status === 'pending').length} Needs Action</Text>
        </View>
      </View>
      
      {loadingTasks ? (
        <ScrollView style={{ marginTop: SPACING.lg }} showsVerticalScrollIndicator={false}>
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <TaskCard 
              task={item} 
              role="earner" 
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })} 
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
          ListEmptyComponent={<EmptyState icon={Inbox} title="No Tasks Yet" description="Check back later or ask your parent to assign some chores." />}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mascotBadge: {
    marginLeft: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.headingBold,
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  totalText: {
    fontSize: 14,
    fontFamily: FONTS.headingBold,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
    fontFamily: FONTS.body,
  }
});
