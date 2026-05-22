import React from 'react';
import { View, StyleSheet } from 'react-native';
import { User, Star, Zap, Award, Shield, Heart, Crown, Flame, Rocket, Settings } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

export type IconName = 'User' | 'Star' | 'Zap' | 'Award' | 'Shield' | 'Heart' | 'Crown' | 'Flame' | 'Rocket' | 'Settings';

export const ICONS: Record<IconName, any> = {
  User, Star, Zap, Award, Shield, Heart, Crown, Flame, Rocket, Settings
};

export const AVATAR_COLORS = [
  COLORS.cyan,
  COLORS.orange,
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
];

interface UserAvatarProps {
  iconString?: string; // Format: "IconName|Color" e.g., "Star|#FF6B35"
  size?: number;
  style?: any;
}

export default function UserAvatar({ iconString, size = 48, style }: UserAvatarProps) {
  let iconName: IconName = 'User';
  let color = COLORS.cyan;

  if (iconString && iconString.includes('|')) {
    const [name, col] = iconString.split('|');
    if (ICONS[name as IconName]) iconName = name as IconName;
    if (col) color = col;
  }

  const IconComponent = ICONS[iconName];

  return (
    <View style={[
      styles.container, 
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2, 
        backgroundColor: `${color}20` 
      }, 
      style
    ]}>
      <IconComponent color={color} size={size * 0.55} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  }
});
