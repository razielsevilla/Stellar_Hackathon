import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Clipboard, Alert } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { getTokaBalance, getXlmBalance } from '../../services/stellar';
import { Coins, Shield, History, Plus, Layers, ArrowUpRight, Copy, Landmark, Settings, Percent } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const TAX_PRESETS = [
  { label: 'Electricity Share', name: 'Electricity Share', amount: '15' },
  { label: 'Internet Access', name: 'Internet Subscription', amount: '10' },
  { label: 'Water Share', name: 'Water Service Share', amount: '5' },
  { label: 'Room Rent', name: 'Room Rent Contribution', amount: '25' },
  { label: 'Streaming share', name: 'Streaming Services Share', amount: '8' },
  { label: 'Snacks Fund', name: 'Shared Snacks & Treats', amount: '12' }
];

export default function AnchorWallet() {
  const [profile, setProfile] = useState<any>(null);
  
  // Balances
  const [parentToka, setParentToka] = useState('0');
  const [parentXlm, setParentXlm] = useState('0');
  const [vaultToka, setVaultToka] = useState('0');
  const [vaultXlm, setVaultXlm] = useState('0');

  const [history, setHistory] = useState<any[]>([]);
  
  // Loadings
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  // Tax States
  const [taxFlat, setTaxFlat] = useState('');
  const [taxFreq, setTaxFreq] = useState<'daily'|'weekly'|'none'>('none');
  const [taxDescription, setTaxDescription] = useState('Household Tax');
  const [updatingTaxes, setUpdatingTaxes] = useState(false);
  const [sweepingTaxes, setSweepingTaxes] = useState(false);

  // Interest States
  const [interestRate, setInterestRate] = useState('');
  const [updatingInterest, setUpdatingInterest] = useState(false);

  const fetchData = async () => {
    try {
      const profileRes = await api.get('/users/me');
      setProfile(profileRes.data);

      // Seed states
      setTaxFlat(String(profileRes.data.tax_flat_amount || 0));
      setTaxFreq(profileRes.data.tax_frequency || 'none');
      setTaxDescription(profileRes.data.tax_description || 'Household Tax');
      setInterestRate(String((profileRes.data.interest_rate || 0.02) * 100));

      const pubKey = profileRes.data.stellar_public_key;
      const vaultKey = profileRes.data.vault_address;

      if (pubKey) {
        const pt = await getTokaBalance(pubKey);
        const px = await getXlmBalance(pubKey);
        setParentToka(pt);
        setParentXlm(px);
      }

      if (vaultKey) {
        const vt = await getTokaBalance(vaultKey);
        const vx = await getXlmBalance(vaultKey);
        setVaultToka(vt);
        setVaultXlm(vx);
      }
      setLoadingBalances(false);

      const historyRes = await api.get('/wallet/history');
      setHistory(historyRes.data);
      setLoadingHistory(false);
    } catch (err) {
      console.error('Error fetching anchor wallet data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    Clipboard.setString(text);
    Toast.show({
      type: 'success',
      text1: 'Address Copied! 📋',
      text2: `${label} public key copied to clipboard.`,
      position: 'bottom'
    });
  };

  const handleTopUp = async () => {
    if (!topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a valid top up amount.',
        position: 'bottom'
      });
      return;
    }

    setTopUpLoading(true);
    try {
      await api.post('/wallet/topup', { amount: Number(topUpAmount) });
      Toast.show({
        type: 'success',
        text1: 'Top Up Initiated! 💳',
        text2: `Topped up ${topUpAmount} TOKA into your parent wallet.`,
        position: 'bottom'
      });
      setTopUpAmount('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Top Up Failed',
        text2: err.response?.data?.error || 'Failed to request top-up on-chain.',
        position: 'bottom'
      });
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleUpdateTaxes = async () => {
    if (isNaN(Number(taxFlat)) || Number(taxFlat) < 0) {
      Toast.show({ type: 'error', text1: 'Invalid Tax', text2: 'Flat tax must be a positive number.', position: 'bottom' });
      return;
    }

    setUpdatingTaxes(true);
    try {
      await api.post('/wallet/taxes/configure', {
        tax_flat_amount: Number(taxFlat),
        tax_percentage: 0.0,
        tax_frequency: taxFreq,
        tax_description: taxDescription
      });
      Toast.show({ type: 'success', text1: 'Taxes Updated 💼', text2: 'Household tax rules successfully configured.', position: 'bottom' });
      fetchData();
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Configuration Failed', text2: 'Failed to update household tax settings.', position: 'bottom' });
    } finally {
      setUpdatingTaxes(false);
    }
  };

  const handleUpdateInterest = async () => {
    if (isNaN(Number(interestRate)) || Number(interestRate) < 0 || Number(interestRate) > 100) {
      Toast.show({ type: 'error', text1: 'Invalid Interest', text2: 'Interest rate must be between 0% and 100%.', position: 'bottom' });
      return;
    }

    setUpdatingInterest(true);
    try {
      await api.post('/wallet/savings/interest/configure', {
        interest_rate: Number(interestRate) / 100
      });
      Toast.show({ type: 'success', text1: 'Interest Rate Set 📈', text2: `Compound interest configured to ${interestRate}%.`, position: 'bottom' });
      fetchData();
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Configuration Failed', text2: 'Failed to update interest rate.', position: 'bottom' });
    } finally {
      setUpdatingInterest(false);
    }
  };

  const handleManualTaxSweep = async () => {
    Alert.alert(
      'Trigger Tax Assessment',
      'This will instantly deduct the configured flat tax from all earners in the household. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assess',
          style: 'destructive',
          onPress: async () => {
            setSweepingTaxes(true);
            try {
              const res = await api.post('/wallet/taxes/collect');
              Toast.show({ type: 'success', text1: 'Tax Collected 🏦', text2: res.data.message || 'Taxes assessed successfully.', position: 'bottom' });
              fetchData();
            } catch (err: any) {
              console.error(err);
              Toast.show({ type: 'error', text1: 'Collection Failed', text2: err.response?.data?.error || 'Failed to complete tax assessment.', position: 'bottom' });
            } finally {
              setSweepingTaxes(false);
            }
          }
        }
      ]
    );
  };

  const renderTx = ({ item }: { item: any }) => {
    const isGain = item.type === 'tax' || (item.type === 'deposit' && item.user_id === profile?.id);
    const displayType = item.type === 'deposit' && item.user_id === profile?.id ? 'TOP UP' : item.type.replace('_', ' ').toUpperCase();
    
    return (
      <View style={styles.txCard}>
        <View style={[styles.txIconBox, { backgroundColor: isGain ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)' }]}>
          <Text style={[styles.txIcon, { color: isGain ? COLORS.cyan : COLORS.textSecondary }]}>
            {isGain ? '↙' : '↗'}
          </Text>
        </View>
        <View style={styles.txDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.txType}>{displayType}</Text>
            {item.user_name && (
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeText}>{item.user_name.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
          <Text style={styles.txDate}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <Text style={[styles.txAmount, { color: isGain ? COLORS.success : COLORS.orange }]}>
          {isGain ? '+' : '-'}{item.amount} TOKA
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderTx}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        ListHeaderComponent={
          <>
            {/* Balances Section */}
            <View style={styles.balanceGrid}>
              
              {/* Parent Spendable Balance */}
              <View style={[styles.balanceCard, { borderColor: 'rgba(0, 229, 255, 0.3)' }]}>
                <View style={styles.cardHeader}>
                  <Shield size={18} color={COLORS.cyan} />
                  <Text style={styles.balanceLabel}>Parent Spendable</Text>
                </View>
                {loadingBalances ? (
                  <ActivityIndicator color={COLORS.cyan} size="small" style={{ marginVertical: SPACING.md }} />
                ) : (
                  <>
                    <Text style={styles.balanceValue}>{parentToka} TOKA</Text>
                    <Text style={styles.subBalance}>{parentXlm} XLM (Testnet Gas)</Text>
                  </>
                )}
                <TouchableOpacity 
                  style={styles.copyBtn} 
                  onPress={() => copyToClipboard(profile?.stellar_public_key, 'Parent')}
                >
                  <Copy size={12} color={COLORS.textMuted} />
                  <Text style={styles.copyText} numberOfLines={1} ellipsizeMode="middle">
                    {profile?.stellar_public_key || 'Loading address...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Family Vault Balance */}
              <View style={[styles.balanceCard, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <View style={styles.cardHeader}>
                  <Layers size={18} color={COLORS.orange} />
                  <Text style={styles.balanceLabel}>Family Vault</Text>
                </View>
                {loadingBalances ? (
                  <ActivityIndicator color={COLORS.orange} size="small" style={{ marginVertical: SPACING.md }} />
                ) : (
                  <>
                    <Text style={[styles.balanceValue, { color: COLORS.orange }]}>{vaultToka} TOKA</Text>
                    <Text style={styles.subBalance}>{vaultXlm} XLM (Locked)</Text>
                  </>
                )}
                <TouchableOpacity 
                  style={styles.copyBtn} 
                  onPress={() => copyToClipboard(profile?.vault_address, 'Vault')}
                >
                  <Copy size={12} color={COLORS.textMuted} />
                  <Text style={styles.copyText} numberOfLines={1} ellipsizeMode="middle">
                    {profile?.vault_address || 'Loading address...'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* Top Up Section */}
            <View style={styles.sectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Coins color={COLORS.cyan} size={20} />
                <Text style={styles.sectionTitle}>Top Up Parent Wallet</Text>
              </View>
              <Text style={styles.helperText}>Mint testnet TOKA to your parent address to fund household chore rewards.</Text>
              
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Amount of TOKA"
                  placeholderTextColor={COLORS.textMuted}
                  value={topUpAmount}
                  onChangeText={setTopUpAmount}
                />
                <TouchableOpacity 
                  style={[styles.actionBtn, topUpLoading && styles.disabledBtn]} 
                  onPress={handleTopUp}
                  disabled={topUpLoading}
                >
                  {topUpLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>Request TOKA</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* [MOVED] Interest Rate Settings */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Landmark size={20} color={COLORS.cyan} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Vault Interest Settings</Text>
              </View>
              <Text style={styles.helperText}>Configure compound growth interest rate paid on children's savings vault balances.</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="2.0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={interestRate}
                    onChangeText={setInterestRate}
                  />
                  <Percent size={14} color={COLORS.textSecondary} style={styles.inputIcon} />
                </View>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: COLORS.cyan }, updatingInterest && styles.disabledBtn]} 
                  onPress={handleUpdateInterest}
                  disabled={updatingInterest}
                >
                  {updatingInterest ? <ActivityIndicator size="small" color={COLORS.bgDeep} /> : <Text style={styles.actionBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>

            {/* [MOVED] Household Tax Policy Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Settings size={20} color={COLORS.cyan} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Tax Settings & Sweeper</Text>
              </View>
              <Text style={styles.helperText}>Collect standard flat household dues to cover cooperative family utilities.</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Preset Deductions (Autofills name & cost)</Text>
                <View style={styles.presetsContainer}>
                  {TAX_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.name}
                      style={[
                        styles.presetChip,
                        taxFlat === preset.amount && taxDescription === preset.name && styles.presetChipActive
                      ]}
                      onPress={() => {
                        setTaxFlat(preset.amount);
                        setTaxDescription(preset.name);
                      }}
                    >
                      <Text style={[
                        styles.presetChipText,
                        taxFlat === preset.amount && taxDescription === preset.name && styles.presetChipTextActive
                      ]}>
                        {preset.label} ({preset.amount} TOKA)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Deduction Name / Description</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Electricity Share"
                  placeholderTextColor={COLORS.textMuted}
                  value={taxDescription}
                  onChangeText={setTaxDescription}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Flat Tax Amount (TOKA)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 5"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={taxFlat}
                  onChangeText={setTaxFlat}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Collection Cycle Frequency</Text>
                <View style={styles.freqRow}>
                  {(['none', 'daily', 'weekly'] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[styles.freqChip, taxFreq === freq && styles.freqChipActive]}
                      onPress={() => setTaxFreq(freq)}
                    >
                      <Text style={[styles.freqChipText, taxFreq === freq && styles.freqChipTextActive]}>
                        {freq.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity 
                  style={[styles.configureBtn, { borderColor: COLORS.cyan, borderWidth: 1 }]} 
                  onPress={handleUpdateTaxes}
                  disabled={updatingTaxes}
                >
                  {updatingTaxes ? <ActivityIndicator size="small" color={COLORS.cyan} /> : <Text style={[styles.btnText, { color: COLORS.cyan }]}>Save Policy</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.collectBtn, { backgroundColor: COLORS.cyan }]} 
                  onPress={handleManualTaxSweep}
                  disabled={sweepingTaxes}
                >
                  {sweepingTaxes ? <ActivityIndicator size="small" color={COLORS.bgDeep} /> : <Text style={styles.collectBtnText}>Collect Sweep</Text>}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.timelineTitle}>Household Activity Ledger</Text>
          </>
        }
        ListEmptyComponent={
          loadingHistory ? (
            <ActivityIndicator size="large" color={COLORS.cyan} style={{ marginTop: SPACING.xl }} />
          ) : (
            <Text style={styles.emptyText}>No household activity logged yet.</Text>
          )
        }
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  balanceValue: {
    color: COLORS.cyan,
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  subBalance: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: SPACING.sm,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  copyText: {
    color: COLORS.textMuted,
    fontSize: 9,
    flex: 1,
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
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    right: SPACING.md,
    color: COLORS.textSecondary,
  },
  textInput: {
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
    backgroundColor: COLORS.cyan,
    paddingHorizontal: SPACING.lg,
    height: 40,
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
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  freqRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  freqChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  freqChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: COLORS.cyan,
  },
  freqChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  freqChipTextActive: {
    color: COLORS.cyan,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginVertical: 4,
  },
  presetChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  presetChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderColor: COLORS.cyan,
  },
  presetChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: COLORS.cyan,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  configureBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  collectBtnText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 14,
  },
  timelineTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  txIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  txDetails: {
    flex: 1,
  },
  txType: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  txDesc: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 2,
  },
  txDate: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  userBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  userBadgeText: {
    color: COLORS.cyan,
    fontSize: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  }
});
