import { Search, X } from "lucide-react";
import { IconButton } from "./IconButton";

export function SearchInput({ value, onChange, placeholder = "Search", className = "" }) {
  return (
    <label className={`search-input ${className}`}>
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && (
        <IconButton title="Clear search" onClick={() => onChange("")}>
          <X size={15} />
        </IconButton>
      )}
    </label>
  );
}
