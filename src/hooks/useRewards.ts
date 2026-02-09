import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerReward {
  id: string;
  customer_id: string | null;
  phone: string;
  points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface RewardHistory {
  id: string;
  customer_id: string | null;
  phone: string;
  order_id: string | null;
  points_change: number;
  transaction_type: 'earned' | 'redeemed';
  description: string | null;
  created_at: string;
}

// Constants for the rewards system
export const POINTS_PER_DOLLAR = 0.5; // 1 point per $2 = 0.5 points per $1
export const MIN_POINTS_TO_REDEEM = 200; // 200 points = $20
export const MAX_POINTS_TO_REDEEM = 350; // 350 points = $35
export const POINTS_TO_DOLLAR_RATIO = 10; // 10 points = $1
export const MIN_REDEEM_DOLLAR = 20; // minimum $20 redemption
export const MAX_REDEEM_DOLLAR = 35; // maximum $35 per redemption

/**
 * Calculate how many points will be earned from a purchase
 */
export const calculatePointsFromPurchase = (totalAmount: number): number => {
  return Math.floor(totalAmount * POINTS_PER_DOLLAR);
};

/**
 * Calculate the dollar value of points
 */
export const calculateRewardDollarValue = (points: number): number => {
  const redeemableSets = Math.floor(points / MIN_POINTS_TO_REDEEM);
  return redeemableSets * 20; // Each 200 points = $20
};

/**
 * Check if user can redeem rewards
 */
export const canRedeemRewards = (points: number): boolean => {
  return points >= MIN_POINTS_TO_REDEEM;
};

/**
 * Hook to fetch rewards by phone number.
 * Uses edge function proxy (no Supabase Auth needed for web customers).
 */
export const useRewardsByPhone = (phone: string | undefined) => {
  return useQuery({
    queryKey: ['rewards', phone],
    queryFn: async (): Promise<CustomerReward | null> => {
      if (!phone) return null;

      const { data, error } = await supabase.functions.invoke('customer-rewards', {
        body: { phone },
      });

      if (error) throw error;
      return data?.rewards || null;
    },
    enabled: !!phone,
  });
};

/**
 * Hook to fetch rewards by customer ID.
 * Uses edge function proxy.
 */
export const useRewardsByCustomerId = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['rewards', 'customer', customerId],
    queryFn: async (): Promise<CustomerReward | null> => {
      if (!customerId) return null;

      const { data, error } = await supabase.functions.invoke('customer-rewards', {
        body: { customerId },
      });

      if (error) throw error;
      return data?.rewards || null;
    },
    enabled: !!customerId,
  });
};

/**
 * Hook to fetch rewards history.
 * Uses edge function proxy.
 */
export const useRewardsHistory = (phone: string | undefined) => {
  return useQuery({
    queryKey: ['rewards-history', phone],
    queryFn: async (): Promise<RewardHistory[]> => {
      if (!phone) return [];

      const { data, error } = await supabase.functions.invoke('customer-rewards', {
        body: { phone, includeHistory: true },
      });

      if (error) throw error;
      return (data?.history || []) as RewardHistory[];
    },
    enabled: !!phone,
  });
};

/**
 * Hook to add points to a customer's rewards
 * (Used from POS - staff are Supabase Auth users, direct DB access works)
 */
export const useAddRewardPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phone,
      customerId,
      orderId,
      points,
      description,
    }: {
      phone: string;
      customerId?: string;
      orderId?: string;
      points: number;
      description?: string;
    }) => {
      // First, try to get existing reward record
      const { data: existing } = await supabase
        .from('customer_rewards')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        // Update existing record — customer already has a rewards account
        const { error: updateError } = await supabase
          .from('customer_rewards')
          .update({
            points: existing.points + points,
            lifetime_points: existing.lifetime_points + points,
            customer_id: customerId || existing.customer_id,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Walk-in customer — create a phone-only rewards record
        const { error: insertError } = await supabase
          .from('customer_rewards')
          .insert({
            phone,
            customer_id: customerId || null,
            points,
            lifetime_points: points,
          });

        if (insertError) throw insertError;
      }

      // Record the transaction in history
      const { error: historyError } = await supabase
        .from('rewards_history')
        .insert({
          phone,
          customer_id: customerId || null,
          order_id: orderId || null,
          points_change: points,
          transaction_type: 'earned',
          description: description || `Earned ${points} points`,
        });

      if (historyError) throw historyError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rewards', variables.phone] });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['rewards-history', variables.phone] });
    },
  });
};

/**
 * Hook to redeem reward points
 * (Used from POS - staff are Supabase Auth users, direct DB access works)
 */
export const useRedeemRewardPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phone,
      customerId,
      orderId,
      pointsToRedeem,
      dollarValue,
    }: {
      phone: string;
      customerId?: string;
      orderId?: string;
      pointsToRedeem: number;
      dollarValue: number;
    }) => {
      // Get current points
      const { data: existing } = await supabase
        .from('customer_rewards')
        .select('*')
        .eq('phone', phone)
        .single();

      if (!existing || existing.points < pointsToRedeem) {
        throw new Error('Insufficient reward points');
      }

      // Deduct points
      const { error: updateError } = await supabase
        .from('customer_rewards')
        .update({
          points: existing.points - pointsToRedeem,
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      // Record the redemption in history
      const { error: historyError } = await supabase
        .from('rewards_history')
        .insert({
          phone,
          customer_id: customerId || null,
          order_id: orderId || null,
          points_change: -pointsToRedeem,
          transaction_type: 'redeemed',
          description: `Redeemed ${pointsToRedeem} points for $${dollarValue.toFixed(2)} discount`,
        });

      if (historyError) throw historyError;

      return { newPoints: existing.points - pointsToRedeem };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rewards', variables.phone] });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['rewards-history', variables.phone] });
    },
  });
};

/**
 * Hook to link phone rewards to a customer account
 * (Used from POS - staff are Supabase Auth users, direct DB access works)
 */
export const useLinkRewardsToCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phone,
      customerId,
    }: {
      phone: string;
      customerId: string;
    }) => {
      const { error } = await supabase
        .from('customer_rewards')
        .update({ customer_id: customerId })
        .eq('phone', phone);

      if (error) throw error;

      // Also update history records
      await supabase
        .from('rewards_history')
        .update({ customer_id: customerId })
        .eq('phone', phone);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rewards', variables.phone] });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'customer', variables.customerId] });
    },
  });
};
