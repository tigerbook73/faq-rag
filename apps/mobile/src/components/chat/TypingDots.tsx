import { useEffect, useState } from "react";
import { Animated, View, Easing } from "react-native";

function Dot({ delay }: { delay: number }) {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 300, easing: Easing.ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);

  return <Animated.View style={{ opacity }} className="h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400" />;
}

export function TypingDots() {
  return (
    <View className="flex-row items-center gap-1 py-1">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}
