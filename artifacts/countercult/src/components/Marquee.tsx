import React from 'react';
import { motion } from 'framer-motion';

interface MarqueeProps {
  text: string;
  speed?: number;
  direction?: 'left' | 'right';
  className?: string;
}

export function Marquee({ text, speed = 20, direction = 'left', className = '' }: MarqueeProps) {
  return (
    <div className={`overflow-hidden whitespace-nowrap flex border-y border-foreground py-2 ${className}`}>
      <motion.div
        className="flex gap-8 px-4 font-bold tracking-widest uppercase"
        animate={{
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: speed,
        }}
      >
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </motion.div>
    </div>
  );
}
