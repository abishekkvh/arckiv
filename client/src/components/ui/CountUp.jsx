import { useEffect, useState, useRef } from 'react';

export default function CountUp({ to = 0, duration = 1.0, decimals = 0, prefix = '', suffix = '', className = '' }) {
  const target = typeof to === 'number' ? to : parseFloat(to) || 0;
  const [value, setValue] = useState(target);
  const prevTargetRef = useRef(target);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const startVal = prevTargetRef.current;
    const endVal = target;
    prevTargetRef.current = target;

    if (startVal === endVal) {
      setValue(endVal);
      return;
    }

    const startTime = performance.now();
    const durationMs = duration * 1000;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = startVal + (endVal - startVal) * easeOut;

      setValue(currentVal);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(update);
      } else {
        setValue(endVal);
      }
    }

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [target, duration]);

  return (
    <span className={className}>
      {prefix}{decimals > 0 ? value.toFixed(decimals) : Math.round(value)}{suffix}
    </span>
  );
}
