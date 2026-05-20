import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import api from '../../services/api';
import { Sparkles, Trash2, Settings, Plus, DollarSign, Gift, Check, Gavel, Clock } from 'lucide-react-native';
import Toast from 'react-native-toast-message';


export default function MarketplaceScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [cashouts, setCashouts] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingReward, setAddingReward] = useState(false);
  const [creatingAuction, setCreatingAuction] = useState(false);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

  // Form states
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardCost, setRewardCost] = useState('');
  const [rewardStreak, setRewardStreak] = useState('');
  const [newAuctionTitle, setNewAuctionTitle] = useState('');
  const [newAuctionDesc, setNewAuctionDesc] = useState('');
  const [newAuctionMinBid, setNewAuctionMinBid] = useState('');
  const [newAuctionDays, setNewAuctionDays] = useState('7');

  const fetchMarketplaceData = async () => {
    try {
      const [settingsRes, rewardsRes, cashoutsRes, auctionsRes] = await Promise.all([
        api.get('/marketplace/settings'),
        api.get('/marketplace/rewards'),
        api.get('/marketplace/cashouts'),
        api.get('/marketplace/auctions')
      ]);
      setSettings(settingsRes.data);
      setRewards(rewardsRes.data);
      setCashouts(cashoutsRes.data);
      setAuctions(auctionsRes.data);
      setExchangeRateInput(String(settingsRes.data.toka_exchange_rate));
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const handleUpdateExchangeRate = async () => {
    const rate = parseInt(exchangeRateInput, 10);
    if (isNaN(rate) || rate <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Rate', text2: 'Please enter a positive number.' });
      return;
    }

    setSavingSettings(true);
    try {
      await api.post('/marketplace/settings', { toka_exchange_rate: rate });
      Toast.show({ type: 'success', text1: 'Exchange Rate Updated!', text2: `1 PHP is now worth ${rate} TOKA.` });
      fetchMarketplaceData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Update Failed', text2: err.response?.data?.error || err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddReward = async () => {
    const cost = parseInt(rewardCost, 10);
    if (!rewardTitle.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Title', text2: 'Please enter a reward name.' });
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Cost', text2: 'Please enter a positive TOKA cost.' });
      return;
    }

    setAddingReward(true);
    try {
      await api.post('/marketplace/rewards', {
        title: rewardTitle.trim(),
        toka_cost: cost,
        required_streak: rewardStreak ? parseInt(rewardStreak, 10) : 0
      });
      Toast.show({ type: 'success', text1: 'Reward Added!', text2: `"${rewardTitle}" is now in the shop.` });
      setRewardTitle('');
      setRewardCost('');
      setRewardStreak('');
      fetchMarketplaceData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Failed to Add', text2: err.response?.data?.error || err.message });
    } finally {
      setAddingReward(false);
    }
  };

  const handleDeleteReward = async (id: string) => {
    Alert.alert(
      'Delete Reward',
      'Are you sure you want to remove this reward from the store?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/marketplace/rewards/${id}`);
              Toast.show({ type: 'success', text1: 'Reward Deleted' });
              fetchMarketplaceData();
            } catch (err: any) {
              Toast.show({ type: 'error', text1: 'Failed to Delete', text2: err.message });
            }
          }
        }
      ]
    );
  };

  const handleFulfillCashout = async (id: string, amount: number, title: string | null) => {
    setFulfillingId(id);
    try {
      await api.post(`/marketplace/cashouts/${id}/fulfill`);
      Toast.show({
        type: 'success',
        text1: 'Fulfillment Completed! 🌟',
        text2: title ? `Delivered "${title}" to child.` : `Handed over PHP ${amount} cash.`,
        position: 'bottom'
      });
      fetchMarketplaceData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Fulfillment Failed', text2: err.response?.data?.error || err.message });
    } finally {
      setFulfillingId(null);
    }
  };

  const handleCreateAuction = async () => {
    const minBid = parseFloat(newAuctionMinBid);
    const durationDays = parseInt(newAuctionDays, 10);

    if (!newAuctionTitle.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Title', text2: 'Please enter an item name.' });
      return;
    }
    if (isNaN(minBid) || minBid <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Bid', text2: 'Please enter a positive minimum bid.' });
      return;
    }
    if (isNaN(durationDays) || durationDays <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Duration', text2: 'Please enter a positive number of days.' });
      return;
    }

    setCreatingAuction(true);
    try {
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + durationDays);

      await api.post('/marketplace/auctions', {
        title: newAuctionTitle.trim(),
        description: newAuctionDesc.trim() || null,
        min_bid: minBid,
        ends_at: endsAt.toISOString()
      });

      Toast.show({ type: 'success', text1: 'Auction Initiated! 🔨', text2: `"${newAuctionTitle}" is now live.` });
      setNewAuctionTitle('');
      setNewAuctionDesc('');
      setNewAuctionMinBid('');
      setNewAuctionDays('7');
      fetchMarketplaceData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Failed to Create', text2: err.response?.data?.error || err.message });
    } finally {
      setCreatingAuction(false);
    }
  };

  const handleFinalizeAuction = async (id: string, title: string) => {
    Alert.alert(
      'Finalise Auction',
      `Are you sure you want to finalize "${title}" immediately and accept the winning bid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalise',
          onPress: async () => {
            setFinalizingId(id);
            try {
              const res = await api.post(`/marketplace/auctions/${id}/finalize`);
              Toast.show({
                type: 'success',
                text1: 'Auction Finalised! 🔨',
                text2: res.data.message || 'Winner processed and funds transferred.',
                position: 'bottom'
              });
              fetchMarketplaceData();
            } catch (err: any) {
              console.error(err);
              Toast.show({ type: 'error', text1: 'Finalisation Failed', text2: err.response?.data?.error || err.message });
            } finally {
              setFinalizingId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  const pendingRequests = cashouts.filter(c => c.status === 'pending');
  const completedRequests = cashouts.filter(c => c.status === 'fulfilled');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Exchange Rate configuration */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Settings color={COLORS.cyan} size={20} />
          <Text style={styles.sectionTitle}>Exchange Rate Configuration</Text>
        </View>
        <Text style={styles.helperText}>
          Define the Peso value of TOKA for cash outs. 
          Dynamic multipliers (20% and 40% discount) apply automatically when children save larger balances.
        </Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.rateLabel}>₱ 1.00 = </Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            placeholder="e.g. 10"
            value={exchangeRateInput}
            onChangeText={setExchangeRateInput}
          />
          <Text style={styles.rateLabel}> TOKA</Text>
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, savingSettings && styles.disabledBtn]} 
          onPress={handleUpdateExchangeRate}
          disabled={savingSettings}
        >
          {savingSettings ? (
            <ActivityIndicator size="small" color={COLORS.bgDeep} />
          ) : (
            <Text style={styles.actionBtnText}>Save Configuration</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Pending Fulfillments */}
      <Text style={styles.subtitle}>Pending Fulfillments ({pendingRequests.length})</Text>
      {pendingRequests.length === 0 ? (
        <Text style={styles.emptyText}>No cashout or reward claims waiting.</Text>
      ) : (
        <View style={styles.historyList}>
          {pendingRequests.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <View style={styles.userInfo}>
                  <View style={[styles.avatarBg, { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)' }]}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.cyan }}>
                      {item.display_name ? item.display_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{item.display_name}</Text>
                </View>
                <Text style={styles.tokaSpent}>-{item.toka_amount} TOKA</Text>
              </View>

              <View style={styles.rewardDetailRow}>
                {item.reward_title ? (
                  <View style={styles.payoutRow}>
                    <Gift color={COLORS.cyan} size={16} />
                    <Text style={styles.rewardDetailText}>Claimed Reward: {item.reward_title}</Text>
                  </View>
                ) : (
                  <View style={styles.payoutRow}>
                    <DollarSign color={COLORS.orange} size={16} />
                    <Text style={[styles.rewardDetailText, { color: COLORS.orange, fontWeight: 'bold' }]}>
                      Payout Cash: ₱ {item.fiat_amount}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={[styles.fulfillBtn, fulfillingId === item.id && styles.disabledBtn]}
                  disabled={fulfillingId === item.id}
                  onPress={() => handleFulfillCashout(item.id, item.fiat_amount, item.reward_title)}
                >
                  {fulfillingId === item.id ? (
                    <ActivityIndicator size="small" color="#0A0F2C" />
                  ) : (
                    <>
                      <Check color="#0A0F2C" size={16} />
                      <Text style={styles.fulfillBtnText}>Mark Fulfilled</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Create custom rewards form */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Plus color={COLORS.cyan} size={20} />
          <Text style={styles.sectionTitle}>Add Shop Reward</Text>
        </View>
        <Text style={styles.helperText}>Add custom rewards (like gaming hours, treats, etc.) to the child shop.</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Reward Name</Text>
          <TextInput
            style={styles.textInputFull}
            placeholder="e.g. 1 Hour Screen Time"
            placeholderTextColor={COLORS.textMuted}
            value={rewardTitle}
            onChangeText={setRewardTitle}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>TOKA Cost</Text>
            <TextInput
              style={styles.textInputFull}
              placeholder="e.g. 100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={rewardCost}
              onChangeText={setRewardCost}
            />
          </View>
          
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Streak Unlock (Days)</Text>
            <TextInput
              style={styles.textInputFull}
              placeholder="0 (Optional)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={rewardStreak}
              onChangeText={setRewardStreak}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, addingReward && styles.disabledBtn]} 
          onPress={handleAddReward}
          disabled={addingReward}
        >
          {addingReward ? (
            <ActivityIndicator size="small" color={COLORS.bgDeep} />
          ) : (
            <Text style={styles.actionBtnText}>Add Reward to Shop</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Rewards management list */}
      <Text style={styles.subtitle}>Active Shop Rewards</Text>
      {rewards.length === 0 ? (
        <Text style={styles.emptyText}>No rewards added to the shop yet.</Text>
      ) : (
        <View style={styles.rewardsList}>
          {rewards.map((reward) => (
            <View key={reward.id} style={styles.rewardItem}>
              <View style={styles.rewardLeft}>
                <Gift color={COLORS.cyan} size={20} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.rewardItemTitle}>{reward.title}</Text>
                  <Text style={styles.rewardItemCost}>
                    {reward.toka_cost} TOKA {reward.required_streak > 0 ? `• Req: ${reward.required_streak}d streak` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDeleteReward(reward.id)}>
                <Trash2 color={COLORS.error} size={20} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Create Auction Form */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Gavel color={COLORS.cyan} size={20} />
          <Text style={styles.sectionTitle}>Initiate Sibling Auction</Text>
        </View>
        <Text style={styles.helperText}>Initiate a monthly auction for special items. Sibling earners can place bids using their TOKA.</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Auction Item Title</Text>
          <TextInput
            style={styles.textInputFull}
            placeholder="e.g. Backstage Pass to Theme Park"
            placeholderTextColor={COLORS.textMuted}
            value={newAuctionTitle}
            onChangeText={setNewAuctionTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Item Description</Text>
          <TextInput
            style={styles.textInputFull}
            placeholder="Describe the benefits or details..."
            placeholderTextColor={COLORS.textMuted}
            value={newAuctionDesc}
            onChangeText={setNewAuctionDesc}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Min Bid (TOKA)</Text>
            <TextInput
              style={styles.textInputFull}
              placeholder="e.g. 50"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={newAuctionMinBid}
              onChangeText={setNewAuctionMinBid}
            />
          </View>
          
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Duration (Days)</Text>
            <TextInput
              style={styles.textInputFull}
              placeholder="e.g. 7"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={newAuctionDays}
              onChangeText={setNewAuctionDays}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, creatingAuction && styles.disabledBtn]} 
          onPress={handleCreateAuction}
          disabled={creatingAuction}
        >
          {creatingAuction ? (
            <ActivityIndicator size="small" color={COLORS.bgDeep} />
          ) : (
            <Text style={styles.actionBtnText}>Start Auction</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Auctions List */}
      <Text style={styles.subtitle}>Active Sibling Auctions</Text>
      {auctions.filter(a => a.status === 'active').length === 0 ? (
        <Text style={styles.emptyText}>No active auctions running.</Text>
      ) : (
        <View style={styles.historyList}>
          {auctions.filter(a => a.status === 'active').map((auction) => {
            const hasBids = auction.highest_bid > 0;
            const currentBidLabel = hasBids ? `${auction.highest_bid} TOKA` : `Min: ${auction.min_bid} TOKA`;
            
            const endsDate = new Date(auction.ends_at);
            const isExpired = endsDate <= new Date();
            const timeStr = isExpired 
              ? 'Expired' 
              : endsDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            return (
              <View key={auction.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <View style={styles.userInfo}>
                    <Gavel color={COLORS.cyan} size={16} />
                    <Text style={styles.userName}>{auction.title}</Text>
                  </View>
                  <Text style={styles.tokaSpent}>{currentBidLabel}</Text>
                </View>
                
                <Text style={styles.helperText} numberOfLines={2}>
                  {auction.description || 'No description provided.'}
                </Text>

                <View style={styles.rewardDetailRow}>
                  <View style={styles.payoutRow}>
                    <Clock color={COLORS.textSecondary} size={14} />
                    <Text style={styles.rewardDetailText}>
                      Ends: {timeStr} {hasBids ? `• Lead: ${auction.highest_bidder_name || 'Sibling'}` : '• No bids yet'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.fulfillBtn, finalizingId === auction.id && styles.disabledBtn]}
                    disabled={finalizingId === auction.id}
                    onPress={() => handleFinalizeAuction(auction.id, auction.title)}
                  >
                    {finalizingId === auction.id ? (
                      <ActivityIndicator size="small" color="#0A0F2C" />
                    ) : (
                      <>
                        <Check color="#0A0F2C" size={14} />
                        <Text style={styles.fulfillBtnText}>Finalise Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Completed Auctions List */}
      <Text style={styles.subtitle}>Completed Auctions</Text>
      {auctions.filter(a => a.status === 'completed').length === 0 ? (
        <Text style={styles.emptyText}>No completed auctions yet.</Text>
      ) : (
        <View style={styles.historyList}>
          {auctions.filter(a => a.status === 'completed').map((auction) => {
            const hasWinner = auction.highest_bidder_id !== null;
            return (
              <View key={auction.id} style={styles.completedItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.completedTitle}>Auction item: {auction.title}</Text>
                  <Text style={styles.completedUser}>
                    {hasWinner ? `Winner: ${auction.highest_bidder_name}` : 'No Bidders'}
                  </Text>
                </View>
                <Text style={styles.completedSub}>
                  {hasWinner ? `Winning Bid: ${auction.highest_bid} TOKA` : `Reserve Price: ${auction.min_bid} TOKA`} • Concluded
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* History */}
      <Text style={styles.subtitle}>Completed Fulfillments</Text>
      {completedRequests.length === 0 ? (
        <Text style={styles.emptyText}>No history of fulfilled requests.</Text>
      ) : (
        <View style={styles.historyList}>
          {completedRequests.map((item) => (
            <View key={item.id} style={styles.completedItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.completedTitle}>
                  {item.reward_title ? `Redeemed: ${item.reward_title}` : `PHP Cash Out (₱ ${item.fiat_amount})`}
                </Text>
                <Text style={styles.completedUser}>{item.display_name}</Text>
              </View>
              <Text style={styles.completedSub}>Spent: {item.toka_amount} TOKA • Fulfilled</Text>
            </View>
          ))}
        </View>
      )}

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
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  rateLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: COLORS.cyan,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.4)',
  },
  actionBtnText: {
    color: COLORS.bgDeep,
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  historyList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  tokaSpent: {
    color: COLORS.orange,
    fontWeight: 'bold',
    fontSize: 14,
  },
  rewardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rewardDetailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  fulfillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  fulfillBtnText: {
    color: '#0A0F2C',
    fontWeight: 'bold',
    fontSize: 12,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  textInputFull: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: COLORS.textPrimary,
    padding: SPACING.md,
    fontSize: 15,
  },
  rewardsList: {
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  rewardItem: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardItemTitle: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  rewardItemCost: {
    color: COLORS.cyan,
    fontSize: 12,
    marginTop: 2,
  },
  completedItem: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  completedTitle: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  completedUser: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  completedSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  }
});
