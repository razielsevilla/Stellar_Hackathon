import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EarnerDashboard'>;

export default function Dashboard() {
  usePushNotifications(); // Register and update push token
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
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
      const filtered = res.data.filter((t: any) => t.is_collaborative === 1 || (myId && t.assigned_to === myId));
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
    const interval = setInterval(fetchTasks, 5000);

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
    setRefreshing(true);
    fetchTasks();
    refetch();
  };

  return (
    <View style={styles.container}>
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
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard 
              task={item} 
              role="earner" 
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })} 
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No tasks assigned yet.</Text>}
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
    fontWeight: 'bold',
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  totalText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  }
});
