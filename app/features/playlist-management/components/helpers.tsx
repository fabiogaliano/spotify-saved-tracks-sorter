import { CheckCircle2, Info } from "lucide-react";
import { ReactNode } from "react";
import { CardTitle } from "~/shared/components/ui";

// Color mapping helper function
export const getColorClasses = (colorName: string) => {
  const colorMap: Record<string, { bg: string; inner: string; icon: string; text: string }> = {
    blue: {
      bg: 'bg-blue-500/30',
      inner: 'bg-blue-500',
      icon: 'bg-blue-500/20',
      text: 'text-blue-400'
    },
    green: {
      bg: 'bg-green-500/30',
      inner: 'bg-green-500',
      icon: 'bg-green-500/20',
      text: 'text-green-400'
    },
    purple: {
      bg: 'bg-purple-500/30',
      inner: 'bg-purple-500',
      icon: 'bg-purple-500/20',
      text: 'text-purple-400'
    },
    pink: {
      bg: 'bg-pink-500/30',
      inner: 'bg-pink-500',
      icon: 'bg-pink-500/20',
      text: 'text-pink-400'
    },
    yellow: {
      bg: 'bg-yellow-500/30',
      inner: 'bg-yellow-500',
      icon: 'bg-yellow-500/20',
      text: 'text-yellow-400'
    }
  };

  return colorMap[colorName] || colorMap.blue;
};

// Reusable UI components
export const IconContainer = ({ icon: Icon, color, size = 'md' }: { icon: React.ElementType, color: string, size?: 'sm' | 'md' | 'lg' }) => {
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

export const SectionTitle = ({ icon, title, count }: { icon: React.ReactNode, title: string, count?: number }) => {
  return (
    <div className="flex justify-between items-center">
      <CardTitle className="text-lg flex items-center gap-2 text-white">
        {icon}
        <span className="font-bold">{title}</span>
      </CardTitle>
      {count !== undefined && (
        <div className="text-xs bg-blue-500/20 px-2 py-1 rounded-md text-blue-400 font-medium">
          {count} total
        </div>
      )}
    </div>
  );
};

export const Badge = ({ children, color = 'blue' }: { children: ReactNode, color?: string }) => {
  return (
    <div className={`text-xs bg-${color}-500/20 px-2 py-1 rounded-md text-${color}-400 font-medium`}>
      {children}
    </div>
  );
};

export const NotificationMessage = ({ type, message }: { type: 'success' | 'info', message: string }) => {
  return (
    <div className={`p-4 rounded-md border ${type === 'success'
      ? 'bg-green-900/20 border-green-800 text-green-400'
      : 'bg-blue-900/20 border-blue-800 text-blue-400'}`}>
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Info className="h-4 w-4" />
        )}
        {message}
      </div>
    </div>
  );
};

export const ColoredBox = ({ color, size = 'md' }: { color: string, size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = {
    sm: { outer: 'w-6 h-6', inner: 'w-4 h-4' },
    md: { outer: 'w-10 h-10', inner: 'w-7 h-7' },
    lg: { outer: 'w-32 h-32', inner: 'w-24 h-24' }
  };

  const { outer, inner } = sizes[size];
  const colors = getColorClasses(color);

  return (
    <div className={`${outer} ${colors.bg} rounded-md flex items-center justify-center`}>
      <div className={`${inner} ${colors.inner} rounded-sm`}></div>
    </div>
  );
};