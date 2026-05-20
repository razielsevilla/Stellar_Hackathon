import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { Award, User, Save } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export default function EarnerProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [relationship, setRelationship] = useState('');

  const navigation = useNavigation<any>();

  const fetchData = async () => {
    try {
      const meRes = await api.get('/users/me');
      setProfile(meRes.data);
      setDisplayName(meRes.data.display_name || '');
      setAge(meRes.data.age ? String(meRes.data.age) : '');
      setRelationship(meRes.data.relationship || '');
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Toast.show({ type: 'error', text1: 'Invalid Name', text2: 'Display name cannot be empty.', position: 'bottom' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/profile/update', {
        display_name: displayName.trim(),
        age: age ? Number(age) : null,
        relationship: relationship.trim()
      });
      Toast.show({ type: 'success', text1: 'Profile Updated! 👤', text2: 'Your profile changes have been saved.', position: 'bottom' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Failed to update profile info.', position: 'bottom' });
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

  // XP/Level calculation
  const getLevelInfo = (xp: number) => {
    const level = Math.floor((xp || 0) / 100) + 1;
    const progress = (xp || 0) % 100;
    return { level, progress };
  };

  const { level, progress } = getLevelInfo(profile?.xp);

  const userInitials = profile?.display_name
    ? profile.display_name.split(' ').map((n: any) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* 1. Header Profile Avatar */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </View>
        <Text style={styles.userName}>{profile?.display_name}</Text>
        <Text style={styles.userSub}>{profile?.role.toUpperCase()} • AGE {profile?.age || 'N/A'}</Text>
        
        {/* XP & Level Badge */}
        <View style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Award size={18} color={COLORS.orange} style={{ marginRight: 6 }} />
              <Text style={styles.levelText}>Level {level}</Text>
            </View>
            <Text style={styles.xpProgressText}>{profile?.xp || 0} XP Total</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.xpSubtext}>{100 - progress} XP left to next Level</Text>
        </View>
      </View>

      {/* 2. Profile Details Update */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <User size={20} color={COLORS.orange} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Edit Profile Info</Text>
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
            placeholder="Your Age"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Relationship / Role in Household</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Eldest Son, Sister, Sibling"
            placeholderTextColor={COLORS.textMuted}
            value={relationship}
            onChangeText={setRelationship}
          />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.orange,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.orange,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  xpCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  levelText: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  xpProgressText: {
    color: COLORS.orange,
    fontWeight: 'bold',
    fontSize: 14,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.orange,
    borderRadius: 5,
  },
  xpSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  saveBtn: {
    backgroundColor: COLORS.orange,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 14,
  }
});
