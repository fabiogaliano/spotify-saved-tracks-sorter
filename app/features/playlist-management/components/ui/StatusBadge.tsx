import React, { ReactNode } from 'react';

interface StatusBadgeProps {
  children: ReactNode;
  color?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ children, color = 'blue' }) => {
  return (
    <div className={`text-xs bg-${color}-500/20 px-2 py-1 rounded-md text-${color}-400 font-medium`}>
      {children}
    </div>
  );
};