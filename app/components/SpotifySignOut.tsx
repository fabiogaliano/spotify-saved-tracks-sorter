import { Form } from "react-router";

type SpotifySignOutProps = React.HTMLAttributes<HTMLDivElement>;

export function SpotifySignOut({ className, ...props }: SpotifySignOutProps) {
  return (
    <div className={`flex items-center justify-between ${className || ''}`} {...props}>
      <a
        href="/auth/logout"
        className="px-4 py-2 rounded-full font-medium text-sm bg-muted text-muted-foreground/50 flex items-center justify-center hover:bg-muted hover:text-muted-foreground/70 transition-all duration-200 active:scale-95"
      >
        Sign Out
      </a>
    </div>
  );
}