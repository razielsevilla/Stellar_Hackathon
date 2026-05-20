import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Image, Alert, ScrollView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import type { RootStackParamList } from '../../App';
import SecureStore from '../../utils/storage';
import Toast from 'react-native-toast-message';

type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

const buildIpfsUrl = (cid: string, index: number) => {
  if (Platform.OS === 'web') {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/ipfs/${cid}`;
  }
  return `${IPFS_GATEWAYS[index]}${cid}`;
};

export default function TaskDetail() {
  const route = useRoute<TaskDetailRouteProp>();
  const navigation = useNavigation();
  const { taskId } = route.params;

  const [task, setTask] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [proofCid, setProofCid] = useState<string | null>(null);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const fetchTask = async () => {
    try {
      const res = await api.get('/tasks/');
      const currentTask = res.data.find((t: any) => t.id === taskId);
      setTask(currentTask);
      
      let me = profile;
      if (!me) {
        const meRes = await api.get('/users/me');
        me = meRes.data;
        setProfile(me);
      }

      if (currentTask?.is_collaborative === 1) {
        const contrRes = await api.get(`/tasks/${taskId}/contributions`);
        setContributions(contrRes.data);
        // Find my contribution to pre-fill photo if exists
        const myContr = contrRes.data.find((c: any) => c.earner_id === me.id);
        if (myContr?.proof_ipfs_cid) {
          setProofCid(myContr.proof_ipfs_cid);
          setGatewayIndex(0);
          setImageError(false);
        } else {
          setProofCid(null);
        }
      } else {
        if (currentTask?.proof_ipfs_cid) {
          setProofCid(currentTask.proof_ipfs_cid);
          setGatewayIndex(0);
          setImageError(false);
        } else {
          setProofCid(null);
        }
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load task details', position: 'bottom' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    const interval = setInterval(fetchTask, 5000);
    return () => clearInterval(interval);
  }, [taskId]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Toast.show({ type: 'error', text1: 'Permission Required', text2: 'You need to grant camera roll permissions to upload proof.', position: 'bottom' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      const picked = result.assets[0];
      const normalized = await ImageManipulator.manipulateAsync(
        picked.uri,
        [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setProofCid(null);
      setGatewayIndex(0);
      setImageError(false);
      setProofImageUri(normalized.uri);
    }
  };

  const handleImageError = () => {
    if (!proofCid) {
      setImageError(true);
      return;
    }

    setGatewayIndex((prev) => {
      if (prev < IPFS_GATEWAYS.length - 1) {
        return prev + 1;
      }
      setImageError(true);
      return prev;
    });
  };

  const handleSubmitProof = async () => {
    if (!proofImageUri) return;

    setUploading(true);
    try {
      const formData = new FormData();
      const filename = proofImageUri.split('/').pop() || 'proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      if (Platform.OS === 'web') {
        const response = await fetch(proofImageUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } else {
        formData.append('file', {
          uri: proofImageUri,
          name: filename,
          type,
        } as any);
      }

      // 1. Upload to IPFS via backend
      const uploadRes = await api.post('/ipfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const cid = uploadRes.data.cid;

      // 2. Submit task via backend (and optionally Soroban if wired)
      const secret = await SecureStore.getItemAsync('stellar_secret');
      await api.post(`/tasks/${taskId}/submit`, {
        proof_ipfs_cid: cid,
        earner_secret: secret, // Simplified Soroban calling if implemented on backend
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Proof submitted successfully!', position: 'bottom' });
      fetchTask(); // Refresh task state
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.error || 'Failed to submit proof', position: 'bottom' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  // For collaborative tasks, check individual contribution status
  const myContribution = task.is_collaborative === 1
    ? contributions.find((c: any) => c.earner_id === profile?.id)
    : null;
  
  const hasContributed = !!myContribution;
  const contributionStatus = myContribution?.status;

  const canSubmit = task.is_collaborative === 1
    ? (!hasContributed || contributionStatus === 'rejected')
    : (task.status === 'pending' || task.status === 'rejected');

  const isSubmitted = task.is_collaborative === 1
    ? (contributionStatus === 'submitted')
    : (task.status === 'submitted');

  const remoteUri = proofCid ? buildIpfsUrl(proofCid, gatewayIndex) : null;
  const displayUri = remoteUri || proofImageUri;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(task.status) }]}>
            <Text style={styles.badgeText}>{task.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.reward}>{task.reward_amount} TOKA</Text>
        {task.deadline && (
          <Text style={styles.deadline}>Deadline: {task.deadline}</Text>
        )}
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.desc}>{task.description || 'No description provided.'}</Text>
      </View>

      <View style={styles.proofSection}>
        <Text style={styles.sectionTitle}>Proof of Completion</Text>
        
        {displayUri ? (
          <Image
            source={{ uri: displayUri }}
            style={styles.imagePreview}
            resizeMode="cover"
            onError={handleImageError}
            onLoad={() => setImageError(false)}
          />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}

        {imageError && (
          <Text style={[styles.statusInfoText, { color: COLORS.error, marginTop: 0 }]}>Unable to load proof image.</Text>
        )}

        {task.status === 'rejected' && (
          <Text style={[styles.statusInfoText, { color: COLORS.error, marginBottom: SPACING.md }]}>
            Your previous proof was rejected. Please upload a new photo.
          </Text>
        )}

        {canSubmit && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage} disabled={uploading}>
            <Text style={styles.secondaryButtonText}>Choose Photo</Text>
          </TouchableOpacity>
        )}

        {canSubmit && proofImageUri && (
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleSubmitProof}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={COLORS.bgDeep} />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Proof</Text>
            )}
          </TouchableOpacity>
        )}

        {isSubmitted && (
          <Text style={styles.statusInfoText}>Waiting for Anchor to review your proof.</Text>
        )}

        {task.is_collaborative === 1 && contributions.length > 0 && (
          <View style={styles.collaboratorsContainer}>
            <Text style={styles.collaboratorsTitle}>Household Submissions</Text>
            {contributions.map((c: any) => (
              <View key={c.id} style={styles.collaboratorRow}>
                <Text style={styles.collaboratorName}>{c.display_name}</Text>
                <View style={[
                  styles.statusLabel,
                  { backgroundColor: c.status === 'approved' ? `${COLORS.success}20` : c.status === 'submitted' ? `${COLORS.cyan}20` : `${COLORS.error}20` }
                ]}>
                  <Text style={[
                    styles.statusLabelText,
                    { color: c.status === 'approved' ? COLORS.success : c.status === 'submitted' ? COLORS.cyan : COLORS.error }
                  ]}>
                    {c.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return COLORS.statusPending;
    case 'submitted': return COLORS.statusSubmitted;
    case 'approved': return COLORS.statusApproved;
    case 'rejected': return COLORS.statusRejected;
    default: return COLORS.textMuted;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  reward: {
    color: COLORS.orange,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  deadline: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  proofSection: {
    padding: SPACING.lg,
  },
  placeholderBox: {
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.orange,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.orange,
    fontWeight: 'bold',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.orange,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 18,
  },
  statusInfoText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: SPACING.md,
  },
  collaboratorsContainer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  collaboratorsTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  collaboratorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  collaboratorName: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  statusLabel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
  }
});
