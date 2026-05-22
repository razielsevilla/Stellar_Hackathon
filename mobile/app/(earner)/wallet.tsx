import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useStellarBalance } from '../../hooks/useStellarBalance';
import { usePINAuth } from '../../hooks/usePINAuth';
import { sendTokaPayment } from '../../services/stellar';
import api from '../../services/api';
import SecureStore from '../../utils/storage';
import { PiggyBank, ArrowLeftRight, History, Coins, Target, Award, Save, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import TokaBitMascot from '../../components/TokaBitMascot';
import PINModal from '../../components/PINModal';

export default function Wallet() {
  const { balance, loading: loadingBalance, refetch: refetchBalance } = useStellarBalance();
  const pin = usePINAuth();
  const [profile, setProfile] = useState<any>(null);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingsActionLoading, setSavingsActionLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);

  // Savings form states
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // P2P transfer states
  const [transferAmount, setTransferAmount] = useState('');
  const [selectedSiblingId, setSelectedSiblingId] = useState('');

  // Savings goal states
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');

  const [mascotStatus, setMascotStatus] = useState<'idle' | 'happy'>('idle');

  const fetchData = async () => {
    try {
      const meRes = await api.get('/users/me');
      setProfile(meRes.data);

      // Initialize savings goal inputs from DB format "Name | Amount"
      if (meRes.data.savings_goal && meRes.data.savings_goal.includes('|')) {
        const [gName, gAmt] = meRes.data.savings_goal.split('|').map((s: string) => s.trim());
        setNewGoalName(gName);
        setNewGoalAmount(gAmt);
      } else {
        setNewGoalName(meRes.data.savings_goal || '');
        setNewGoalAmount('');
      }

      const famRes = await api.get('/family/members');
      const filteredSiblings = famRes.data.filter((m: any) => m.role === 'earner' && m.id !== meRes.data.id);
      setSiblings(filteredSiblings);
      if (filteredSiblings.length > 0 && !selectedSiblingId) {
        setSelectedSiblingId(filteredSiblings[0].id);
      }

      const historyRes = await api.get('/wallet/history');
      setHistory(historyRes.data);
    } catch (err) {
      console.error('Error fetching earner wallet data:', err);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loadingBalance && parseFloat(balance) > 0) {
      setMascotStatus('happy');
      const timer = setTimeout(() => setMascotStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [balance, loadingBalance]);

  const onRefresh = () => {
    setRefreshing(true);
    refetchBalance();
    fetchData();
  };

  // Savings Vault actions
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid deposit amount.', position: 'bottom' });
      return;
    }
    setSavingsActionLoading(true);
    try {
      const secret = await pin.requestSecret();
      if (!secret) throw new Error('Secret key not found. Please log in again.');
      
      const vaultPublicKey = profile?.vault_address;
      if (!vaultPublicKey) throw new Error('Vault address not found.');
      
      const txHash = await sendTokaPayment(secret, vaultPublicKey, depositAmount);
      
      await api.post('/wallet/savings/deposit', {
        amount: Number(depositAmount),
        tx_hash: txHash
      });
      Toast.show({ type: 'success', text1: 'Savings Locked! 🔐', text2: `Deposited ${depositAmount} TOKA into interest savings.`, position: 'bottom' });
      setDepositAmount('');
      refetchBalance();
      fetchData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Deposit Failed', text2: err.response?.data?.error || 'Make sure you have enough wallet balance.', position: 'bottom' });
    } finally {
      setSavingsActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid withdrawal amount.', position: 'bottom' });
      return;
    }
    setSavingsActionLoading(true);
    try {
      // Withdrawal requests only create a cashout record on the backend; no on-chain transaction yet.
      // Thus, no need to sign anything on the earner side here.
      await api.post('/wallet/savings/withdraw', {
        amount: Number(withdrawAmount)
      });
      Toast.show({ type: 'success', text1: 'Savings Withdrawn 🔓', text2: `Withdrew ${withdrawAmount} TOKA.`, position: 'bottom' });
      setWithdrawAmount('');
      refetchBalance();
      fetchData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Withdrawal Failed', text2: err.response?.data?.error || 'Failed to complete savings withdrawal.', position: 'bottom' });
    } finally {
      setSavingsActionLoading(false);
    }
  };

  // Sibling transfers
  const handleTransfer = async () => {
    if (!selectedSiblingId || !transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Transfer', text2: 'Please specify recipient sibling and amount.', position: 'bottom' });
      return;
    }
    setTransferLoading(true);
    try {
      const secret = await pin.requestSecret();
      if (!secret) throw new Error('Secret key not found. Please log in again.');

      const recipient = siblings.find(s => s.id === selectedSiblingId);
      if (!recipient || !recipient.stellar_public_key) throw new Error('Recipient public key not found.');

      const txHash = await sendTokaPayment(secret, recipient.stellar_public_key, transferAmount);

      await api.post('/wallet/transfer', {
        recipient_id: selectedSiblingId,
        amount: Number(transferAmount),
        tx_hash: txHash
      });
      Toast.show({ type: 'success', text1: 'Transfer Complete! 💸', text2: `Sent ${transferAmount} TOKA to sibling.`, position: 'bottom' });
      setTransferAmount('');
      refetchBalance();
      fetchData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Transfer Failed', text2: err.response?.data?.error || 'On-chain transfer failed.', position: 'bottom' });
    } finally {
      setTransferLoading(false);
    }
  };

  // Savings Goal
  const handleSaveGoal = async () => {
    if (!newGoalName.trim() || !newGoalAmount || isNaN(Number(newGoalAmount)) || Number(newGoalAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Goal', text2: 'Please enter goal name and target amount.', position: 'bottom' });
      return;
    }
    setGoalSaving(true);
    try {
      const combinedGoal = `${newGoalName.trim()} | ${Number(newGoalAmount)}`;
      await api.post('/users/profile/update', { savings_goal: combinedGoal });
      Toast.show({ type: 'success', text1: 'Goal Saved! 🎯', text2: 'Your savings goal has been updated.', position: 'bottom' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Save Failed', text2: 'Failed to update savings goal.', position: 'bottom' });
    } finally {
      setGoalSaving(false);
    }
  };

  if (loadingData || loadingBalance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  // Savings goal progress calculation
  const targetGoalAmt = parseFloat(newGoalAmount) || 0;
  const totalCombinedToka = parseFloat(balance) + parseFloat(profile?.savings_balance || '0');
  const goalProgressPercent = targetGoalAmt > 0 ? Math.min(100, Math.round((totalCombinedToka / targetGoalAmt) * 100)) : 0;

  return (
    <>
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
    >
      {/* 1. Spendable Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Spendable Balance</Text>
          <Text style={styles.balanceValue}>{balance} TOKA</Text>
        </View>
        <TokaBitMascot status={mascotStatus} size={70} />
      </View>

      {/* 2. Savings Goal Tracker Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Target size={20} color={COLORS.orange} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Savings Goal Tracker</Text>
        </View>
        
        {targetGoalAmt > 0 && (
          <View style={styles.goalProgressContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.goalProgressLabel} numberOfLines={1}>{newGoalName}</Text>
              <Text style={styles.goalProgressValue}>{goalProgressPercent}% ({totalCombinedToka.toFixed(0)} / {targetGoalAmt} TOKA)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${goalProgressPercent}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.goalForm}>
          <TextInput
            style={styles.input}
            placeholder="Target Goal (e.g. Nintendo Switch)"
            placeholderTextColor={COLORS.textMuted}
            value={newGoalName}
            onChangeText={setNewGoalName}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Target TOKA Amount"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={newGoalAmount}
              onChangeText={setNewGoalAmount}
            />
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: COLORS.orange }, goalSaving && styles.disabledBtn]} 
              onPress={handleSaveGoal}
              disabled={goalSaving}
            >
              {goalSaving ? <ActivityIndicator size="small" color={COLORS.bgDeep} /> : <Save size={18} color={COLORS.bgDeep} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. Compound Savings Vault */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <PiggyBank size={20} color={COLORS.orange} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Compound Interest Savings Vault</Text>
        </View>
        <Text style={styles.savingsBalance}>{profile?.savings_balance || '0.00'} TOKA</Text>
        <Text style={styles.savingsSubtext}>
          Growth Rate: <Text style={{ color: COLORS.success, fontWeight: 'bold' }}>+{(profile?.interest_rate * 100).toFixed(1)}%</Text> compounding daily.
        </Text>

        <View style={styles.savingsForm}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Amount to Lock"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
            />
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: COLORS.orange }, savingsActionLoading && styles.disabledBtn]} 
              onPress={handleDeposit}
              disabled={savingsActionLoading}
            >
              <Text style={styles.actionBtnText}>Deposit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Amount to Withdraw"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }, savingsActionLoading && styles.disabledBtn]} 
              onPress={handleWithdraw}
              disabled={savingsActionLoading}
            >
              <Text style={[styles.actionBtnText, { color: COLORS.textPrimary }]}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 4. Sibling P2P Fund Transfer */}
      {siblings.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ArrowLeftRight size={20} color={COLORS.orange} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Sibling P2P Transfer</Text>
          </View>
          
          <Text style={styles.label}>Select Sibling Recipient</Text>
          <View style={styles.siblingsRow}>
            {siblings.map((sib) => (
              <TouchableOpacity
                key={sib.id}
                style={[styles.siblingChip, selectedSiblingId === sib.id && styles.siblingChipActive]}
                onPress={() => setSelectedSiblingId(sib.id)}
              >
                <Text style={[styles.siblingChipText, selectedSiblingId === sib.id && styles.siblingChipTextActive]}>
                  {sib.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Amount of TOKA"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
            />
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: COLORS.orange }, transferLoading && styles.disabledBtn]} 
              onPress={handleTransfer}
              disabled={transferLoading}
            >
              {transferLoading ? <ActivityIndicator size="small" color={COLORS.bgDeep} /> : <Text style={styles.actionBtnText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5. Transaction Ledger Timeline */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <History size={20} color={COLORS.orange} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Transaction History Ledger</Text>
        </View>
        
        {history.length === 0 ? (
          <Text style={styles.noTxText}>No transaction ledger entries logged.</Text>
        ) : (
          history.map((tx) => {
            const isGain = ['reward', 'transfer_receive', 'withdraw', 'interest'].includes(tx.type);
            const displayType = tx.type.replace('_', ' ').toUpperCase();
            
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txMeta}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.txType}>{displayType}</Text>
                    {tx.type === 'interest' && (
                      <View style={styles.vaultBadge}>
                        <Text style={styles.vaultBadgeText}>VAULT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                </View>
                <View style={styles.txAmountContainer}>
                  <Text style={[styles.txAmount, { color: isGain ? COLORS.success : COLORS.orange }]}>
                    {isGain ? '+' : '-'}{tx.amount}
                  </Text>
                  <Text style={styles.txCurrency}>TOKA</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

    </ScrollView>

      {/* PIN Auth Modal */}
      <PINModal
        visible={pin.pinModalVisible}
        mode={pin.pinMode}
        onSuccess={pin.handlePINSuccess}
        onCancel={pin.handlePINCancel}
        pendingPin={pin.pendingPin}
        onPendingPin={pin.handlePendingPin}
        errorMessage={pin.pinError}
      />
    </>
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
  balanceCard: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  balanceValue: {
    color: COLORS.orange,
    fontSize: 32,
    fontWeight: 'bold',
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
  goalProgressContainer: {
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  goalProgressLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
    marginRight: SPACING.sm,
  },
  goalProgressValue: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.orange,
    borderRadius: 4,
  },
  goalForm: {
    gap: SPACING.sm,
  },
  savingsBalance: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.orange,
    marginBottom: 4,
  },
  savingsSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  savingsForm: {
    gap: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionBtn: {
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  siblingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  siblingChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  siblingChipActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: COLORS.orange,
  },
  siblingChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  siblingChipTextActive: {
    color: COLORS.orange,
    fontWeight: 'bold',
  },
  noTxText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: SPACING.md,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  txMeta: {
    flex: 1,
    marginRight: SPACING.md,
  },
  txType: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  txDesc: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  txDate: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  txCurrency: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  vaultBadge: {
    backgroundColor: 'rgba(76, 201, 240, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  vaultBadgeText: {
    color: COLORS.success,
    fontSize: 8,
    fontWeight: 'bold',
  }
});
