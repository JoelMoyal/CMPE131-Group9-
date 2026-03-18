import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COUNT = 28;
const COLORS = ['#c96e4b', '#6e7c63', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9c74f', '#90be6d'];

type Particle = {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  color: string;
  size: number;
  delay: number;
};

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: new Animated.Value(Math.random() * SCREEN_WIDTH),
    y: new Animated.Value(-20 - Math.random() * 60),
    rotation: new Animated.Value(0),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 7 + Math.random() * 9,
    delay: Math.random() * 1200,
  }));
}

export function ConfettiOverlay({ active }: { active: boolean }) {
  const particles = useRef<Particle[]>(makeParticles()).current;

  useEffect(() => {
    if (!active) return;

    const anims = particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: SCREEN_HEIGHT + 30,
          duration: 2200 + Math.random() * 1800,
          delay: p.delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotation, {
          toValue: 360 * (2 + Math.floor(Math.random() * 3)),
          duration: 2200 + Math.random() * 1800,
          delay: p.delay,
          useNativeDriver: true,
        }),
      ]),
    );

    const master = Animated.stagger(40, anims);
    master.start();
    return () => master.stop();
  }, [active, particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.size / 4,
            transform: [
              { translateY: p.y },
              {
                rotate: p.rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
