import React from 'react';
import { CardTitle } from '~/shared/components/ui';
import { StatusBadge } from './StatusBadge';

interface SectionTitleProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ icon, title, count }) => {
  return (
    <div className="flex justify-between items-center gap-4 min-w-0">
      <CardTitle className="text-base md:text-lg flex items-center gap-2 text-foreground min-w-0">
        {icon}
        <span className="font-bold truncate">{title}</span>
      </CardTitle>
      {count !== undefined && (
        <div className="flex-shrink-0">
          <StatusBadge color="blue">
            {count} total
          </StatusBadge>
        </div>
      )}
    </div>
  );
};