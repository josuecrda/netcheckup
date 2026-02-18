import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-card border border-white/5 ${padding ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
