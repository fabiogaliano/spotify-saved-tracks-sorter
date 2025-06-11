import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Button } from './button';
import { cn } from '~/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';

const themedButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // New theme-aware gradient variants
        gradient: 'bg-gradient-brand text-foreground border-none',
        'gradient-primary': 'bg-card-primary text-foreground border border-primary/20 hover:border-primary/40',
        'gradient-secondary': 'bg-card-secondary text-foreground border border-secondary/20 hover:border-secondary/40',
        'gradient-accent': 'bg-card-accent text-foreground border border-accent/20 hover:border-accent/40',
        spotify: 'bg-spotify text-foreground hover:bg-spotify-hover',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ThemedButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof themedButtonVariants> {}

const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <Button
        className={cn(themedButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

ThemedButton.displayName = 'ThemedButton';

export { ThemedButton, themedButtonVariants };
