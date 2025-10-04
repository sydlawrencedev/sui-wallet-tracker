'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  decimalPlaces?: number;
  showDirectionColor?: boolean;
  currency?: string;
  reverse?: boolean;
}

export const AnimatedNumber = (props: AnimatedNumberProps) => {
  const {
    value,
    duration = 30000,
    className = '',
    decimalPlaces = 2,
    currency,
    reverse = false
  } = props;

  const [displayValue, setDisplayValue] = useState(0);
  const startValue = useRef(0);
  const startTime = useRef(0);
  const animationFrame = useRef<number>(0);
  const actualDurationRef = useRef(duration);
  const prevValue = useRef(value);
  const isMounted = useRef(true);

  const formatNumber = (num: number) => {
    const minFractionDigits = Math.min(2, decimalPlaces);
    const maxFractionDigits = decimalPlaces;
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits
    };

    const formatted = num.toLocaleString('en-US', options);
    return currency === 'USD' ? `$${formatted}` : formatted;
  };

  useEffect(() => {
    // Cleanup function to cancel any pending animation frame
    return () => {
      isMounted.current = false;
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    // If value changes, start a new animation
    if (value !== prevValue.current) {
      const currentDisplayValue = displayValue;

      if (reverse) {
        // For reverse animation, start from a higher value
        startValue.current = value * 1.0005;
        setDisplayValue(startValue.current);
        actualDurationRef.current = value > startValue.current ? 1000 : duration;
      } else if (currentDisplayValue === 0 && value > 0) {
        // If current display is 0 and we're animating to a positive number
        startValue.current = value * 0.999999;
        setDisplayValue(startValue.current);
        actualDurationRef.current = value < startValue.current ? 1000 : duration;
      } else {
        startValue.current = currentDisplayValue;
        actualDurationRef.current = value < startValue.current ? 1000 : duration;
      }

      prevValue.current = value;
      startTime.current = performance.now();

      const animate = (currentTime: number) => {
        if (!isMounted.current) return;

        const elapsed = currentTime - startTime.current;
        const progress = Math.min(elapsed / actualDurationRef.current, 1);

        // Easing function for smoother animation (easeOutQuad)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue.current + (value - startValue.current) * easeProgress;

        setDisplayValue(currentValue);

        if (progress < 1) {
          animationFrame.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };

      animationFrame.current = requestAnimationFrame(animate);
    }
  }, [value, displayValue, reverse, duration]);

  // Ensure we don't show negative values
  const finalValue = Math.max(0, displayValue);

  return <span className={className}>{formatNumber(finalValue)}</span>;
};
