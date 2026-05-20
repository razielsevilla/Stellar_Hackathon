import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import SecureStore from '../../utils/storage';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

import { Platform } from 'react-native';

const buildIpfsUrl = (cid: string, index: number) => {
  if (Platform.OS === 'web') {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/ipfs/${cid}`;
  }
  return `${IPFS_GATEWAYS[index]}${cid}`;
};

import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

export default function Approvals() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [contributionsByTask, setContributionsByTask] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [gatewayIndexByTask, setGatewayIndexByTask] = useState<Record<string, number>>({});
  const [imageFailedByTask, setImageFailedByTask] = useState<Record<string, boolean>>({});
  const navigation = useNavigation();

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/');
      const submittedTasks = res.data.filter((t: any) => t.status === 'submitted');
      setTasks(submittedTasks);
      
      const contribs: Record<string, any[]> = {};
      for (const t of submittedTasks) {
        if (t.is_collaborative === 1) {
          try {
            const contrRes = await api.get(`/tasks/${t.id}/contributions`);
            contribs[t.id] = contrRes.data;
          } catch (e) {
            console.error('Failed to fetch contributions for task ' + t.id, e);
          }
        }
      }
      setContributionsByTask(contribs);

      setGatewayIndexByTask({});
      setImageFailedByTask({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchTasks();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleApprove = async (taskId: string) => {
    setProcessingId(taskId);
    try {
      const secret = await SecureStore.getItemAsync('stellar_secret');
      await api.post(`/tasks/${taskId}/approve`, { anchor_secret: secret });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task approved and reward sent!', position: 'bottom' });
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.error || 'Failed to approve task', position: 'bottom' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (taskId: string) => {
    setProcessingId(taskId);
    try {
      await api.post(`/tasks/${taskId}/reject`);
      Toast.show({ type: 'success', text1: 'Rejected', text2: 'Task was rejected.', position: 'bottom' });
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.error || 'Failed to reject task', position: 'bottom' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleImageError = (taskId: string) => {
    const current = gatewayIndexByTask[taskId] ?? 0;
    if (current < IPFS_GATEWAYS.length - 1) {
      setGatewayIndexByTask((prev) => ({ ...prev, [taskId]: current + 1 }));
      return;
    }
    setImageFailedByTask((prev) => ({ ...prev, [taskId]: true }));
  };

  const renderTask = ({ item }: { item: any }) => {
    const gatewayIndex = gatewayIndexByTask[item.id] ?? 0;
    const isCollab = item.is_collaborative === 1;
    const taskContribs = contributionsByTask[item.id] || [];

    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs }}>
          <Text style={styles.title}>{item.title}</Text>
          {isCollab && (
            <View style={styles.collabBadge}>
              <Text style={styles.collabBadgeText}>CO-OP</Text>
            </View>
          )}
        </View>
        <Text style={styles.desc}>{item.description}</Text>
        
        {isCollab ? (
          <View style={styles.collabSubmissions}>
            <Text style={styles.sectionLabel}>Sibling Proofs:</Text>
            {taskContribs.length === 0 ? (
              <Text style={styles.noProofText}>No sibling contributions yet.</Text>
            ) : (
              taskContribs.map((c: any) => {
                const cProofUri = c.proof_ipfs_cid ? buildIpfsUrl(c.proof_ipfs_cid, gatewayIndex) : null;
                return (
                  <View key={c.id} style={styles.contribBlock}>
                    <Text style={styles.contribName}>{c.display_name}:</Text>
                    {cProofUri ? (
                      <Image 
                        source={{ uri: cProofUri }} 
                        style={styles.proofImageSmall}
                        resizeMode="cover"
                        onError={() => handleImageError(item.id)}
                      />
                    ) : (
                      <View style={styles.noProofSmall}>
                        <Text style={styles.noProofText}>No photo submitted</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <>
            {item.proof_ipfs_cid ? (
              <Image 
                source={{ uri: buildIpfsUrl(item.proof_ipfs_cid, gatewayIndex) }} 
                style={styles.proofImage}
                resizeMode="cover"
                onError={() => handleImageError(item.id)}
              />
            ) : (
              <View style={styles.noProof}>
                <Text style={styles.noProofText}>No proof submitted</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.button, styles.rejectBtn]} 
            onPress={() => handleReject(item.id)}
            disabled={processingId !== null}
          >
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.approveBtn]} 
            onPress={() => handleApprove(item.id)}
            disabled={processingId !== null}
          >
            {processingId === item.id ? (
              <ActivityIndicator color={COLORS.bgDeep} size="small" />
            ) : (
              <Text style={[styles.btnText, { color: COLORS.bgDeep }]}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Approvals</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.cyan} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending approvals right now.</Text>}
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
  header: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noProof: {
    width: '100%',
    height: 100,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noProofText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  approveBtn: {
    backgroundColor: COLORS.cyan,
  },
  btnText: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  collabBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  collabBadgeText: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: 'bold',
  },
  collabSubmissions: {
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  contribBlock: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  contribName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  proofImageSmall: {
    width: '100%',
    height: 120,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: SPACING.xs,
  },
  noProofSmall: {
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
    marginTop: SPACING.xs,
  },
});
