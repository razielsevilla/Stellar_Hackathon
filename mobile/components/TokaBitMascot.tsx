import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, Platform } from 'react-native';

interface TokaBitMascotProps {
  status?: 'idle' | 'happy' | 'thinking';
  size?: number;
}

export default function TokaBitMascot({ status = 'idle', size = 64 }: TokaBitMascotProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'happy') {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -15, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
          Animated.spring(bounceAnim, { toValue: 0, friction: 3, tension: 40, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.sequence([
          Animated.timing(rotateAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(rotateAnim, { toValue: -1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(rotateAnim, { toValue: 0, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
        ])
      ]).start();
    }
  }, [status, bounceAnim, scaleAnim, rotateAnim]);

  const getEmoji = () => {
    switch (status) {
      case 'happy': return '🤩';
      case 'thinking': return '🤔';
      case 'idle':
      default: return '🤖';
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg']
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: bounceAnim }, { scale: scaleAnim }, { rotate: spin }] }]}>
      <Text style={{ fontSize: size }}>{getEmoji()}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
