import React from 'react';

interface IconContainerProps {
  icon: React.ElementType;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export const IconContainer: React.FC<IconContainerProps> = ({ icon: Icon, color, size = 'md' }) => {
  const sizeClasses = {
    sm: 'p-0.5',
    md: 'p-1.5',
    lg: 'p-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={`bg-${color}-500/20 ${sizeClasses[size]} rounded-md`}>
      <Icon className={`${iconSizes[size]} text-${color}-400`} />
    </div>
  );
};