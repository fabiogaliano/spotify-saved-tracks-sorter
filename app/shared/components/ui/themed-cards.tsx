import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card';
import { cn } from '~/lib/utils';

type ThemedCardProps = {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'default';
};

export function ThemedCard({ children, className, variant = 'default' }: ThemedCardProps) {
  const gradientClass = 
    variant === 'primary' ? 'bg-card-primary border-primary/20 hover:border-primary/40' :
    variant === 'secondary' ? 'bg-card-secondary border-secondary/20 hover:border-secondary/40' :
    variant === 'accent' ? 'bg-card-accent border-accent/20 hover:border-accent/40' :
    'bg-card border-border hover:border-border/80';

  return (
    <Card className={cn(gradientClass, 'transition-colors', className)}>
      {children}
    </Card>
  );
}

type ThemedCardContentProps = {
  children: ReactNode;
  className?: string;
};

export function ThemedCardContent({ children, className }: ThemedCardContentProps) {
  return <CardContent className={cn('p-5', className)}>{children}</CardContent>;
}

type ThemedCardHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function ThemedCardHeader({ title, description, className, action }: ThemedCardHeaderProps) {
  return (
    <CardHeader className={cn('flex flex-row items-center justify-between', className)}>
      <div>
        {title && <CardTitle>{title}</CardTitle>}
        {description && <CardDescription>{description}</CardDescription>}
      </div>
      {action && <div>{action}</div>}
    </CardHeader>
  );
}

type ThemedCardFooterProps = {
  children: ReactNode;
  className?: string;
};

export function ThemedCardFooter({ children, className }: ThemedCardFooterProps) {
  return <CardFooter className={cn('flex justify-between', className)}>{children}</CardFooter>;
}
