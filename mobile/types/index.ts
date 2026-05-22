export interface User {
  id: string;
  family_id: string;
  stellar_public_key: string;
  role: 'anchor' | 'earner';
  display_name: string;
  avatar_emoji: string;
  relationship?: string;
  age?: number;
  savings_goal?: string;
  savings_goal_amount?: number;
  xp: number;
  savings_balance: number;
  task_streak: number;
  family_name?: string;
  invite_code?: string;
}

export interface Family {
  id: string;
  vault_address: string;
  family_name: string;
  invite_code: string;
  toka_exchange_rate: number;
  tax_flat_amount: number;
  tax_percentage: number;
  tax_frequency: string;
  tax_description: string;
  interest_rate: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  reward_asset: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid';
  assigned_to: string;
  created_by: string;
  proof_ipfs_cid?: string;
  deadline?: string;
  recurrence?: string;
  is_collaborative: boolean;
  assigned_name?: string;
  assigned_emoji?: string;
  earner_public_key?: string;
}

export interface ShopReward {
  id: string;
  title: string;
  toka_cost: number;
  image_url?: string;
  required_streak: number;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  min_bid: number;
  highest_bid: number;
  highest_bidder_id?: string;
  status: 'active' | 'completed' | 'cancelled';
  ends_at: string;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  display_name?: string;
  avatar_emoji?: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  tx_hash?: string;
  counterparty?: string;
  sender_name?: string;
  recipient_name?: string;
}

export interface Approval {
  task_id: string;
  anchor_id: string;
}
