import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  Animated
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { useStellarBalance } from '../../hooks/useStellarBalance';
import { burnToka } from '../../services/stellar';
import SecureStore from '../../utils/storage';
import TokaBitMascot from '../../components/TokaBitMascot';
import { Sparkles, Gift, Flame, TrendingUp, Coins, Gavel, Clock, Trophy } from 'lucide-react-native';
import Toast from 'react-native-toast-message';


export default function ShopScreen() {
  const { balance, refetch } = useStellarBalance();
  const [settings, setSettings] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bidInputs, setBidInputs] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mascotStatus, setMascotStatus] = useState<'idle' | 'happy' | 'thinking'>('idle');

  // Cashout Form
  const [cashoutAmount, setCashoutAmount] = useState('');
  
  // Loot Box Modal
  const [lootModalVisible, setLootModalVisible] = useState(false);
  const [lootRolling, setLootRolling] = useState(false);
  const [wonItem, setWonItem] = useState<string | null>(null);
  const rollAnim = useState(new Animated.Value(0))[0];

  const fetchShopData = async () => {
    try {
      const [settingsRes, rewardsRes, historyRes, auctionsRes, meRes] = await Promise.all([
        api.get('/marketplace/settings'),
        api.get('/marketplace/rewards'),
        api.get('/marketplace/cashouts'),
        api.get('/marketplace/auctions'),
        api.get('/users/me')
      ]);
      setSettings(settingsRes.data);
      setRewards(rewardsRes.data);
      setHistory(historyRes.data);
      setAuctions(auctionsRes.data);
      setCurrentUser(meRes.data);
    } catch (err) {
      console.error('Failed to fetch shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  // Calculate fiat PHP dynamically based on Delayed Gratification Multiplier
  const calculatePhp = (toka: number) => {
    if (!settings || isNaN(toka) || toka <= 0) return 0;
    const baseExchangeRate = settings.toka_exchange_rate || 10;
    let rate = baseExchangeRate;
    
    if (toka >= 1000) {
      rate = baseExchangeRate * 0.6; // better rate (60%)
    } else if (toka >= 500) {
      rate = baseExchangeRate * 0.8; // better rate (80%)
    }

    return Math.round((toka / rate) * 100) / 100;
  };

  const handleCashout = async () => {
    const toka = parseFloat(cashoutAmount);
    if (isNaN(toka) || toka <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid TOKA amount.' });
      return;
    }

    if (toka > parseFloat(balance)) {
      Toast.show({ type: 'error', text1: 'Insufficient Funds', text2: 'You do not have enough TOKA.' });
      return;
    }

    setSubmitting(true);
    setMascotStatus('thinking');

    try {
      const secret = await SecureStore.getItemAsync('stellar_secret');
      if (!secret) throw new Error('Secret key not found in storage');

      // Burn TOKA (Transfer back to Vault)
      let txHash = null;
      if (settings?.vault_address) {
        try {
          txHash = await burnToka(secret!, settings.vault_address, toka.toString());
        } catch (err: any) {
          console.warn('Stellar transfer failed, proceeding with demo simulation:', err.message);
        }
      }

      // Backend verify & register
      const res = await api.post('/marketplace/cashout', {
        tx_hash: txHash,
        toka_amount: toka,
      });

      Toast.show({
        type: 'success',
        text1: 'Cashout Request Submitted!',
        text2: `Requested ₱${res.data.fiat_amount}. Ask your parent for physical fulfillment!`,
        position: 'bottom'
      });

      setCashoutAmount('');
      setMascotStatus('happy');
      setTimeout(() => setMascotStatus('idle'), 3000);
      refetch();
      fetchShopData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Request Failed', text2: err.response?.data?.error || err.message });
      setMascotStatus('idle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyReward = async (reward: any) => {
    if (reward.toka_cost > parseFloat(balance)) {
      Toast.show({ type: 'error', text1: 'Insufficient TOKA', text2: `This item costs ${reward.toka_cost} TOKA.` });
      return;
    }

    Alert.alert(
      'Redeem Reward',
      `Are you sure you want to redeem "${reward.title}" for ${reward.toka_cost} TOKA?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setSubmitting(true);
            setMascotStatus('thinking');
            try {
              const secret = await SecureStore.getItemAsync('stellar_secret');
              if (!secret) throw new Error('Secret key not found');

              let txHash = null;
              if (settings?.vault_address) {
                try {
                  txHash = await burnToka(secret!, settings.vault_address, reward.toka_cost.toString());
                } catch (err) {
                  console.warn('Stellar mock transfer');
                }
              }

              await api.post('/marketplace/cashout', {
                tx_hash: txHash,
                toka_amount: reward.toka_cost,
                reward_id: reward.id
              });

              Toast.show({
                type: 'success',
                text1: 'Reward Redeemed!',
                text2: `"${reward.title}" is now pending parent approval.`,
                position: 'bottom'
              });

              setMascotStatus('happy');
              setTimeout(() => setMascotStatus('idle'), 3000);
              refetch();
              fetchShopData();
            } catch (err: any) {
              console.error(err);
              Toast.show({ type: 'error', text1: 'Purchase Failed', text2: err.response?.data?.error || err.message });
              setMascotStatus('idle');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handlePlaceBid = async (auctionId: string) => {
    const inputVal = bidInputs[auctionId] || '';
    const tokaAmount = parseFloat(inputVal);
    if (isNaN(tokaAmount) || tokaAmount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Bid', text2: 'Please enter a valid bid amount.' });
      return;
    }

    if (tokaAmount > parseFloat(balance)) {
      Toast.show({ type: 'error', text1: 'Insufficient Funds', text2: 'You do not have enough TOKA in your wallet.' });
      return;
    }

    setSubmitting(true);
    setMascotStatus('thinking');
    try {
      const res = await api.post(`/marketplace/auctions/${auctionId}/bid`, { amount: tokaAmount });
      Toast.show({
        type: 'success',
        text1: 'Bid Placed!',
        text2: res.data.message || `You placed a bid of ${tokaAmount} TOKA.`,
        position: 'bottom'
      });
      setBidInputs(prev => ({ ...prev, [auctionId]: '' }));
      setMascotStatus('happy');
      setTimeout(() => setMascotStatus('idle'), 3000);
      refetch();
      fetchShopData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Bid Failed', text2: err.response?.data?.error || err.message });
      setMascotStatus('idle');
    } finally {
      setSubmitting(false);
    }
  };

  const rollLootBox = () => {
    if (parseFloat(balance) < 50) {
      Toast.show({ type: 'error', text1: 'Insufficient TOKA', text2: 'Mystery Loot Box costs 50 TOKA.' });
      return;
    }

    setLootModalVisible(true);
    setLootRolling(true);
    setWonItem(null);
    rollAnim.setValue(0);

    // Spin animation
    Animated.timing(rollAnim, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: true
    }).start(async () => {
      // Choose random item
      const items = [
        '2 Hours of Video Game Time',
        'A Giant Scoop of Ice Cream',
        '100 Bonus TOKA!',
        'Get Out of 1 Chore Free Pass',
        'King Size Chocolate Bar'
      ];
      const win = items[Math.floor(Math.random() * items.length)];
      setWonItem(win);
      setLootRolling(false);

      // Record on backend
      try {
        const secret = await SecureStore.getItemAsync('stellar_secret');
        let txHash = null;
        if (settings?.vault_address) {
          try {
            txHash = await burnToka(secret!, settings.vault_address, '50');
          } catch (e) {}
        }
        
        await api.post('/marketplace/cashout', {
          tx_hash: txHash,
          toka_amount: 50,
          reward_id: null
        });

        // Update description or create custom entry
        // For prototype simplicity, the transaction is logged as cashing out 50 TOKA.

        refetch();
        fetchShopData();
      } catch (err) {
        console.error('Failed to log loot box purchase:', err);
      }
    });
  };

  const spinRotation = rollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1440deg']
  });

  const parsedToka = parseFloat(cashoutAmount) || 0;
  const expectedPhp = calculatePhp(parsedToka);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Wallet balance display */}
      <View style={styles.balanceHeader}>
        <View>
          <Text style={styles.balanceLabel}>My Balance</Text>
          <Text style={styles.balanceValue}>{parseFloat(balance).toLocaleString()} TOKA</Text>
        </View>
        <TokaBitMascot status={mascotStatus} size={48} />
      </View>

      {/* Gamified Delayed Gratification Multiplier Cards */}
      <View style={styles.multiplierCard}>
        <View style={styles.multiplierHeader}>
          <TrendingUp color={COLORS.orange} size={20} />
          <Text style={styles.multiplierTitle}>Saving Multiplier Bonus</Text>
        </View>
        <Text style={styles.multiplierDesc}>
          Hold onto your TOKA! You get more Peso value per TOKA when cashing out larger sums.
        </Text>
        <View style={styles.tiersContainer}>
          <View style={styles.tierRow}>
            <Text style={styles.tierText}>Under 500 TOKA</Text>
            <Text style={styles.tierValue}>Base Rate ({settings?.toka_exchange_rate || 10}:1)</Text>
          </View>
          <View style={[styles.tierRow, styles.activeTier]}>
            <View style={styles.badgeRow}>
              <Flame color={COLORS.orange} size={14} />
              <Text style={[styles.tierText, { fontWeight: 'bold', color: COLORS.textPrimary }]}>500+ TOKA</Text>
            </View>
            <Text style={[styles.tierValue, { color: COLORS.orange }]}>20% More Value (8:1)</Text>
          </View>
          <View style={[styles.tierRow, styles.superTier]}>
            <View style={styles.badgeRow}>
              <Sparkles color={COLORS.cyan} size={14} />
              <Text style={[styles.tierText, { fontWeight: 'bold', color: COLORS.textPrimary }]}>1000+ TOKA</Text>
            </View>
            <Text style={[styles.tierValue, { color: COLORS.cyan }]}>40% More Value (6:1)</Text>
          </View>
        </View>
      </View>

      {/* Cashout Section */}
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Coins color={COLORS.orange} size={20} />
          <Text style={styles.sectionTitle}>Cash Out to Pesos</Text>
        </View>
        <Text style={styles.helperText}>Convert TOKA tokens to actual physical cash from your parent.</Text>
        
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            placeholder="Amount of TOKA"
            placeholderTextColor={COLORS.textMuted}
            value={cashoutAmount}
            onChangeText={setCashoutAmount}
          />
          <View style={styles.arrowLabel}>
            <Text style={styles.arrowText}>→</Text>
          </View>
          <View style={styles.phpBox}>
            <Text style={styles.phpText}>₱ {expectedPhp.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, submitting && styles.disabledBtn]} 
          onPress={handleCashout}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionBtnText}>Submit Cashout Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Loot box banner */}
      <TouchableOpacity style={styles.lootboxCard} onPress={rollLootBox}>
        <Gift color="#fff" size={32} />
        <View style={styles.lootboxTextContainer}>
          <Text style={styles.lootboxTitle}>Mystery Family Loot Box</Text>
          <Text style={styles.lootboxDesc}>Spend 50 TOKA for a random cool reward drop!</Text>
        </View>
        <Text style={styles.lootboxCost}>50 TOKA</Text>
      </TouchableOpacity>

      {/* Active Auctions Section */}
      <Text style={styles.subtitle}>Active Household Auctions</Text>
      {auctions.filter(a => a.status === 'active').length === 0 ? (
        <Text style={styles.emptyText}>No active auctions right now. Check back later!</Text>
      ) : (
        <View style={styles.auctionsContainer}>
          {auctions.filter(a => a.status === 'active').map((auction) => {
            const isWinning = auction.highest_bidder_id === currentUser?.id;
            const hasBids = auction.highest_bid > 0;
            const currentBidLabel = hasBids ? `${auction.highest_bid} TOKA` : `Min: ${auction.min_bid} TOKA`;
            
            const endsDate = new Date(auction.ends_at);
            const isExpired = endsDate <= new Date();
            const timeStr = isExpired 
              ? 'Ended' 
              : endsDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            return (
              <View key={auction.id} style={styles.auctionCard}>
                <View style={styles.auctionHeader}>
                  <View style={styles.auctionTitleRow}>
                    <Gavel color={COLORS.orange} size={18} />
                    <Text style={styles.auctionTitle}>{auction.title}</Text>
                  </View>
                  {hasBids && (
                    <View style={[styles.winningBadge, isWinning ? styles.winningBg : styles.outbidBg]}>
                      <Text style={[styles.winningText, { color: isWinning ? COLORS.orange : COLORS.textSecondary }]}>
                        {isWinning ? 'Winning' : 'Outbid'}
                      </Text>
                    </View>
                  )}
                </View>
                {auction.description ? (
                  <Text style={styles.auctionDesc}>{auction.description}</Text>
                ) : null}

                <View style={styles.auctionMeta}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Highest Bid</Text>
                    <Text style={styles.metaValue}>{currentBidLabel}</Text>
                    {hasBids && (
                      <Text style={styles.metaSub}>
                        By {isWinning ? 'You' : (auction.highest_bidder_name || 'Sibling')}
                      </Text>
                    )}
                  </View>
                  
                  <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.metaLabel}>Ends At</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock color={COLORS.textSecondary} size={14} />
                      <Text style={styles.metaValueSmall}>{timeStr}</Text>
                    </View>
                  </View>
                </View>

                {!isExpired && (
                  <View style={styles.bidInputRow}>
                    <TextInput
                      style={styles.bidInput}
                      keyboardType="numeric"
                      placeholder={`Enter > ${hasBids ? auction.highest_bid : auction.min_bid}`}
                      placeholderTextColor={COLORS.textMuted}
                      value={bidInputs[auction.id] || ''}
                      onChangeText={(val) => setBidInputs(prev => ({ ...prev, [auction.id]: val }))}
                    />
                    <TouchableOpacity
                      style={styles.bidBtn}
                      onPress={() => handlePlaceBid(auction.id)}
                    >
                      <Text style={styles.bidBtnText}>Bid</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Custom rewards list */}
      <Text style={styles.subtitle}>Family Reward Store</Text>
      {rewards.length === 0 ? (
        <Text style={styles.emptyText}>No special rewards added by anchors yet.</Text>
      ) : (
        <View style={styles.rewardsGrid}>
          {rewards.map((reward) => (
            <TouchableOpacity 
              key={reward.id} 
              style={styles.rewardCard}
              onPress={() => handleBuyReward(reward)}
            >
              <View style={styles.rewardEmojiBg}>
                <Trophy size={24} color={COLORS.cyan} />
              </View>
              <Text style={styles.rewardName} numberOfLines={2}>{reward.title}</Text>
              <Text style={styles.rewardPrice}>{reward.toka_cost} TOKA</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Cashout History */}
      <Text style={styles.subtitle}>Redemption History</Text>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No cashouts or reward redemptions yet.</Text>
      ) : (
        <View style={styles.historyList}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>
                  {item.reward_title ? `Purchased: ${item.reward_title}` : 'Peso Cash Out'}
                </Text>
                <Text style={[
                  styles.statusBadge, 
                  item.status === 'fulfilled' ? styles.statusPaid : styles.statusPending
                ]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.historyMeta}>
                <Text style={styles.historyCost}>{item.toka_amount} TOKA Spent</Text>
                {item.fiat_amount > 0 && (
                  <Text style={styles.historyValue}>Received: ₱ {item.fiat_amount}</Text>
                )}
                <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Loot box modal */}
      <Modal visible={lootModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Gift color={COLORS.orange} size={24} />
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Mystery Loot Box</Text>
            </View>
            
            {lootRolling ? (
              <View style={styles.spinnerContainer}>
                <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
                  <Gift color={COLORS.orange} size={80} />
                </Animated.View>
                <Text style={styles.spinnerText}>Cracking it open...</Text>
              </View>
            ) : (
              <View style={styles.winnerContainer}>
                <Sparkles color={COLORS.cyan} size={48} />
                <Text style={styles.winnerText}>You Won!</Text>
                <View style={styles.prizeCard}>
                  <Text style={styles.prizeText}>{wonItem}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.actionBtn, { width: 160 }]} 
                  onPress={() => setLootModalVisible(false)}
                >
                  <Text style={styles.actionBtnText}>Awesome!</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceHeader: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceValue: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '900',
  },
  multiplierCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  multiplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 8,
  },
  multiplierTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  multiplierDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  tiersContainer: {
    gap: 8,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgDeep,
    alignItems: 'center',
  },
  activeTier: {
    borderColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 107, 53, 0.04)',
  },
  superTier: {
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderWidth: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.04)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tierValue: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: COLORS.textPrimary,
    padding: SPACING.md,
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrowLabel: {
    paddingHorizontal: 4,
  },
  arrowText: {
    color: COLORS.textSecondary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  phpBox: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.orange,
    padding: SPACING.md,
    alignItems: 'center',
  },
  phpText: {
    color: COLORS.orange,
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledBtn: {
    backgroundColor: 'rgba(255, 107, 53, 0.5)',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  lootboxCard: {
    backgroundColor: '#FF6B35',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  lootboxTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  lootboxTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lootboxDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  lootboxCost: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  subtitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  rewardCard: {
    width: (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.md,
    alignItems: 'center',
  },
  rewardEmojiBg: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  rewardName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    height: 38,
  },
  rewardPrice: {
    color: COLORS.cyan,
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 4,
  },
  historyList: {
    gap: SPACING.sm,
  },
  historyItem: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    color: COLORS.orange,
  },
  statusPaid: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    color: COLORS.cyan,
  },
  historyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCost: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  historyValue: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  historyDate: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    width: Dimensions.get('window').width * 0.8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.xl,
  },
  spinnerContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  spinnerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: SPACING.lg,
  },
  winnerContainer: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  winnerText: {
    color: COLORS.orange,
    fontSize: 22,
    fontWeight: 'bold',
  },
  prizeCard: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  prizeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  auctionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  auctionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.lg,
  },
  auctionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  auctionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  auctionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  winningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  winningBg: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  outbidBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  winningText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  auctionDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  auctionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  metaCol: {
    flexDirection: 'column',
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  metaValueSmall: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  metaSub: {
    color: COLORS.orange,
    fontSize: 11,
    marginTop: 2,
  },
  bidInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bidInput: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
    height: 40,
    fontSize: 13,
  },
  bidBtn: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  bidBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  }
});
