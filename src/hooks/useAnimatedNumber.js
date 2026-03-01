import { useEffect, useRef, useState } from "react";

export const useAnimatedNumber = (value, duration = 500) => {
  const [animatedValue, setAnimatedValue] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const startValue = previous.current;
    const endValue = value;
    const startTime = performance.now();
    let frameId = 0;

    const animate = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const nextValue = Math.round(startValue + (endValue - startValue) * progress);
      setAnimatedValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    previous.current = value;

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [duration, value]);

  return animatedValue;
};
