import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { FONTS } from '../constants/theme';

interface TextProps extends RNTextProps {
  variant?: 'heading' | 'headingBold' | 'body' | 'bodyMedium' | 'mono';
}

export default function Text({ style, variant = 'body', ...props }: TextProps) {
  return (
    <RNText
      style={[
        { fontFamily: FONTS[variant] },
        style,
      ]}
      {...props}
    />
  );
}
