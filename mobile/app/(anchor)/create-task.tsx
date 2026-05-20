import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import SecureStore from '../../utils/storage';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useStellarBalance } from '../../hooks/useStellarBalance';
import Toast from 'react-native-toast-message';
import { User } from 'lucide-react-native';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKS_OF_MONTH = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

export default function CreateTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  
  // Earner selection
  const [earners, setEarners] = useState<any[]>([]);
  const [selectedEarnerKey, setSelectedEarnerKey] = useState('');
  const [isCollaborative, setIsCollaborative] = useState(false);
  
  // Recurrence (Occurrence)
  const [recurrence, setRecurrence] = useState<'none'|'regular'|'daily'|'weekly'|'monthly'>('none');
  const RECURRENCE_OPTIONS = [
    { value: 'none', label: 'Once' },
    { value: 'regular', label: 'Regularly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  // Dynamic Scheduling State
  const [timeValue, setTimeValue] = useState('17:00'); // Default 5:00 PM
  const [timesPerDay, setTimesPerDay] = useState('2');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedWeek, setSelectedWeek] = useState('Week 1');
  
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { balance } = useStellarBalance();

  useEffect(() => {
    fetchEarners();
  }, []);

  const fetchEarners = async () => {
    try {
      const res = await api.get('/family/members');
      const filtered = res.data.filter((m: any) => m.role === 'earner');
      setEarners(filtered);
      if (filtered.length > 0) {
        setSelectedEarnerKey(filtered[0].stellar_public_key);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async () => {
    if (!title || !rewardAmount || (!selectedEarnerKey && !isCollaborative)) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill in all required fields.', position: 'bottom' });
      return;
    }

    if (Number(rewardAmount) <= 0 || isNaN(Number(rewardAmount))) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Reward must be greater than 0.', position: 'bottom' });
      return;
    }

    if (Number(rewardAmount) > Number(balance)) {
      Toast.show({ type: 'error', text1: 'Insufficient Balance', text2: `You only have ${balance} TOKA, but tried to reward ${rewardAmount} TOKA.`, position: 'bottom' });
      return;
    }

    // Build the recurrence config payload based on the selected mode
    const recurrenceConfig = {
      type: recurrence,
      time: recurrence !== 'monthly' ? timeValue : null,
      timesPerDay: recurrence === 'regular' ? timesPerDay : null,
      dayOfWeek: recurrence === 'weekly' ? selectedDay : null,
      weekOfMonth: recurrence === 'monthly' ? selectedWeek : null,
    };

    setLoading(true);
    try {
      const secret = await SecureStore.getItemAsync('stellar_secret');
      
      await api.post('/tasks/', {
        title,
        description,
        reward_amount: rewardAmount,
        assigned_to: isCollaborative ? null : selectedEarnerKey,
        anchor_secret: secret,
        earner_public_key: isCollaborative ? null : selectedEarnerKey,
        is_collaborative: isCollaborative ? 1 : 0,
        // Send as stringified JSON to the backend's recurrence column
        recurrence: JSON.stringify(recurrenceConfig),
        deadline: new Date().toISOString() // Fallback base timestamp
      });
      
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task created successfully!', position: 'bottom' });
      navigation.goBack();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.error || 'Failed to create task', position: 'bottom' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Create a New Task</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Task Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Wash the dishes"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Detailed instructions..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.formGroup}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
          <Text style={styles.label}>Collaborative Quest (Co-op chore)</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, isCollaborative && styles.toggleBtnActive]}
            onPress={() => {
              setIsCollaborative(!isCollaborative);
              if (!isCollaborative) {
                setSelectedEarnerKey('');
              } else if (earners.length > 0) {
                setSelectedEarnerKey(earners[0].stellar_public_key);
              }
            }}
          >
            <Text style={[styles.toggleBtnText, isCollaborative && styles.toggleBtnTextActive]}>
              {isCollaborative ? 'ENABLED' : 'DISABLED'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isCollaborative && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Assign to (Earner) *</Text>
          {earners.length === 0 ? (
            <Text style={styles.noEarnersText}>No earners found in your family.</Text>
          ) : (
            <View style={styles.chipRow}>
              {earners.map((earner) => (
                <TouchableOpacity
                  key={earner.id}
                  style={[
                    styles.chip,
                    selectedEarnerKey === earner.stellar_public_key && styles.chipSelected
                  ]}
                  onPress={() => setSelectedEarnerKey(earner.stellar_public_key)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <User size={13} color={selectedEarnerKey === earner.stellar_public_key ? COLORS.bgDeep : COLORS.cyan} style={{ marginRight: 6 }} />
                    <Text style={[styles.chipText, { color: selectedEarnerKey === earner.stellar_public_key ? COLORS.bgDeep : COLORS.cyan }]}>
                      {earner.display_name.split(' ')[0]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Reward Amount (TOKA) *</Text>
        <TextInput
          style={styles.input}
          placeholder="10"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={rewardAmount}
          onChangeText={setRewardAmount}
        />
        <Text style={styles.balanceText}>Available Balance: {balance} TOKA</Text>
      </View>

      {/* 1. OCCURRENCE SELECTION FIRST */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Occurrence *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recurrenceScroll}>
          <View style={styles.chipRow}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  recurrence === opt.value && styles.chipSelected
                ]}
                onPress={() => setRecurrence(opt.value as any)}
              >
                <Text style={styles.chipText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 2. DYNAMIC DEADLINE BASED ON OCCURRENCE */}
      <View style={styles.dynamicSection}>
        <Text style={styles.sectionTitle}>Schedule Details</Text>

        {recurrence === 'none' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Today At (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 17:00 or 5:00 PM"
              placeholderTextColor={COLORS.textMuted}
              value={timeValue}
              onChangeText={setTimeValue}
            />
          </View>
        )}

        {recurrence === 'regular' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>How many times a day?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={timesPerDay}
                onChangeText={setTimesPerDay}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>At what hour(s)? (e.g. 08:00, 14:00, 20:00)</Text>
              <TextInput
                style={styles.input}
                placeholder="Comma separated hours"
                placeholderTextColor={COLORS.textMuted}
                value={timeValue}
                onChangeText={setTimeValue}
              />
            </View>
          </>
        )}

        {recurrence === 'daily' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Complete Every Day At (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 17:00"
              placeholderTextColor={COLORS.textMuted}
              value={timeValue}
              onChangeText={setTimeValue}
            />
          </View>
        )}

        {recurrence === 'weekly' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>What Day?</Text>
              <View style={styles.chipRow}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.smallChip, selectedDay === day && styles.chipSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={styles.chipText}>{day.substring(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>At what time? (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 17:00"
                placeholderTextColor={COLORS.textMuted}
                value={timeValue}
                onChangeText={setTimeValue}
              />
            </View>
          </>
        )}

        {recurrence === 'monthly' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Which Week?</Text>
            <View style={styles.chipRow}>
              {WEEKS_OF_MONTH.map((week) => (
                <TouchableOpacity
                  key={week}
                  style={[styles.chip, selectedWeek === week && styles.chipSelected]}
                  onPress={() => setSelectedWeek(week)}
                >
                  <Text style={styles.chipText}>{week}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleCreateTask} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.bgDeep} />
        ) : (
          <Text style={styles.buttonText}>Create Task</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
  },
  header: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontSize: 14,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    padding: SPACING.md,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  balanceText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  noEarnersText: {
    color: COLORS.orange,
    fontSize: 14,
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  smallChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderColor: COLORS.cyan,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  recurrenceScroll: {
    flexGrow: 0,
  },
  dynamicSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  button: {
    backgroundColor: COLORS.cyan,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  buttonText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderColor: COLORS.cyan,
  },
  toggleBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: COLORS.cyan,
  },
});
