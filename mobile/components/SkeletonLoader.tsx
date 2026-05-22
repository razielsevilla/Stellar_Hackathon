import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface SkeletonProps {
  width?: any;
  height?: any;
  style?: ViewStyle;
  borderRadius?: number;
}

export default function Skeleton({ width = '100%', height = 20, style, borderRadius = RADIUS.sm }: SkeletonProps) {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius,
          opacity: fadeAnim,
        },
        style,
      ]}
    />
  );
}

export function TaskSkeleton() {
  return (
    <View style={styles.taskCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Skeleton width="60%" height={24} />
        <Skeleton width="20%" height={24} borderRadius={12} />
      </View>
      <Skeleton width="40%" height={16} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width="30%" height={20} borderRadius={10} />
        <Skeleton width="25%" height={20} borderRadius={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
