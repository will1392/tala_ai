import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div role="search">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search knowledge base..."
        startIcon={<Search size={18} aria-hidden="true" />}
        aria-label="Search knowledge base"
        aria-describedby="search-instructions"
        className="w-full"
        type="search"
      />
      <span id="search-instructions" className="sr-only">
        Enter keywords to search through all documents and folders
      </span>
    </div>
  );
}