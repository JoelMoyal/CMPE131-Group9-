import { useRef } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import type { RestaurantOption } from '../../session/types';
import { THEME } from '../../../lib/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const CUISINE_COLORS: Record<string, string> = {
  sushi: '#e8c9a0',
  italian: '#f4c6a0',
  burgers: '#f0b89a',
  mexican: '#f5d08a',
  chinese: '#f9c7a0',
  healthy: '#c8e6c9',
};

function cuisineBg(cuisine: string | null): string {
  if (!cuisine) return '#e0d6cc';
  const key = cuisine.toLowerCase();
  return CUISINE_COLORS[key] ?? '#e0d6cc';
}

type Props = {
  option: RestaurantOption;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  style?: object;
};

export function SwipeCard({ option, onSwipeLeft, onSwipeRight, style }: Props) {
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const yesOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const noOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const flyOut = (direction: 'left' | 'right', dy: number) => {
    const x = direction === 'right' ? SCREEN_WIDTH + 100 : -(SCREEN_WIDTH + 100);
    Haptics.impactAsync(
      direction === 'right'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
    Animated.spring(position, {
      toValue: { x, y: dy },
      useNativeDriver: false,
      speed: 20,
    }).start(() => {
      if (direction === 'right') onSwipeRight?.();
      else onSwipeLeft?.();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          flyOut('right', gesture.dy);
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          flyOut('left', gesture.dy);
        } else {
          resetPosition();
        }
      },
    }),
  ).current;

  const priceLabel = option.priceLevel ? '$'.repeat(option.priceLevel) : '';
  const distLabel = option.distanceMiles ? `${option.distanceMiles} mi` : '';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        style,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        },
      ]}
    >
      {option.imageUrl ? (
        <ImageBackground
          source={{ uri: option.imageUrl }}
          style={styles.cardImage}
          imageStyle={styles.cardImageStyle}
        >
          <CardContent
            option={option}
            priceLabel={priceLabel}
            distLabel={distLabel}
            yesOpacity={yesOpacity}
            noOpacity={noOpacity}
          />
        </ImageBackground>
      ) : (
        <View style={[styles.cardImage, { backgroundColor: cuisineBg(option.cuisine) }]}>
          <CardContent
            option={option}
            priceLabel={priceLabel}
            distLabel={distLabel}
            yesOpacity={yesOpacity}
            noOpacity={noOpacity}
          />
        </View>
      )}
    </Animated.View>
  );
}

type ContentProps = {
  option: RestaurantOption;
  priceLabel: string;
  distLabel: string;
  yesOpacity: Animated.AnimatedInterpolation<string | number>;
  noOpacity: Animated.AnimatedInterpolation<string | number>;
};

function CardContent({ option, priceLabel, distLabel, yesOpacity, noOpacity }: ContentProps) {
  return (
    <>
      {/* YES label */}
      <Animated.View style={[styles.yesLabel, { opacity: yesOpacity }]}>
        <Text style={styles.yesText}>YES</Text>
      </Animated.View>

      {/* NO label */}
      <Animated.View style={[styles.noLabel, { opacity: noOpacity }]}>
        <Text style={styles.noText}>NOPE</Text>
      </Animated.View>

      {/* Gradient + info */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.gradient}
      >
        <Text style={styles.restaurantName}>{option.name}</Text>
        <Text style={styles.restaurantMeta}>
          {[option.cuisine, priceLabel, distLabel].filter(Boolean).join('  ·  ')}
        </Text>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 40,
    height: (SCREEN_WIDTH - 40) * 1.35,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardImageStyle: {
    borderRadius: 20,
  },
  gradient: {
    padding: 20,
    paddingTop: 60,
  },
  restaurantName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  restaurantMeta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  yesLabel: {
    position: 'absolute',
    top: 28,
    left: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#4CAF50',
    zIndex: 10,
  },
  yesText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 2,
  },
  noLabel: {
    position: 'absolute',
    top: 28,
    right: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#f44336',
    zIndex: 10,
  },
  noText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f44336',
    letterSpacing: 2,
  },
});
