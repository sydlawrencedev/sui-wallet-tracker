'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

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
  let { value, duration = 30000, className = '', showDirectionColor = false } = props;
  const [displayValue, setDisplayValue] = useState(0);
  const startValue = useRef(0);
  const startTime = useRef(0);
  const animationFrame = useRef<number>(0);
  const prevValue = useRef(0);

  useEffect(() => {
    // If value changes, start a new animation
    if (value !== prevValue.current) {
      if (props.reverse) {
        // For reverse animation, start from a higher value
        startValue.current = value * 1.0005; // Start 5% above the target value
        setDisplayValue(startValue.current);
        if (value > startValue.current) {
          duration = 1000;
        }
      } else if (displayValue === 0 && value > 0) {
        // If current display is 0 and we're animating to a positive number
        // Start from 95% of the target value for a quick but smooth animation
        startValue.current = value * 0.999999;
        setDisplayValue(startValue.current);
        if (value < startValue.current) {
          duration = 1000;
        }
      } else {
        startValue.current = displayValue;
        if (value < startValue.current) {
          duration = 1000;
        }
      }

      prevValue.current = value;
      startTime.current = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smoother animation (easeOutQuad)
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const currentValue = startValue.current + (value - startValue.current) * easeProgress;
        setDisplayValue(currentValue);

        if (progress < 1) {
          const frame = requestAnimationFrame(animate);
          animationFrame.current = frame;
        } else {
          setDisplayValue(value);
        }
      };

      animationFrame.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = 0;
      }
    };
  }, [value, duration]);

  // Format the number with commas and specified decimal places
  const formatNumber = (num: number) => {
    const minFractionDigits = Math.min(2, props.decimalPlaces ?? 0);
    const maxFractionDigits = props.decimalPlaces ?? 8;
    if (props.currency || props.currency === "USD") {
      return "$" + num.toLocaleString('en-US', {
        minimumFractionDigits: minFractionDigits,
        maximumFractionDigits: maxFractionDigits
      });
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits
    });
  };


  // Ensure we don't show negative values
  const finalValue = Math.max(0, displayValue);

  return (
    <span className={className}>
      {formatNumber(finalValue)}
    </span>
  );
};
