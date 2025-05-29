import { ReactNode } from 'react';
import { Card, CardContent } from '~/shared/components/ui/Card';

interface StylesType {
  card: string;
  iconContainer: string;
}

// Common styles
const styles: StylesType = {
  card: "bg-card border-border",
  iconContainer: "p-2 rounded-full"
};

interface StatusCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  iconBg?: string;
  valueColor?: string;
}

// Status Card component
export const StatusCard = ({ title, value, icon, iconBg, valueColor = 'text-foreground' }: StatusCardProps) => {
  return (
    <Card className={styles.card}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className={`${valueColor} text-2xl font-bold`}>{value}</p>
        </div>
        <div className={`${iconBg || 'bg-card'} ${styles.iconContainer}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};
