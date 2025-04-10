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
