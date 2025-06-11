import { Search, X } from 'lucide-react';
import { Input } from '~/shared/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

// Search Input component
export const SearchInput = ({ value, onChange, placeholder }: SearchInputProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder || "Search..."}
        className="pl-9 bg-card border-border text-foreground w-full"
      />
      {value && (
        <button
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          onClick={() => onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
