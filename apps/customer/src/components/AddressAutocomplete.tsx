'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Map, Loader2 } from 'lucide-react';
import { Input, Button } from '@/components/ui/core';

interface AddressAutocompleteProps {
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  onOpenMap: () => void;
  initialValue?: string;
}

export default function AddressAutocomplete({ onAddressSelect, onOpenMap, initialValue = '' }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (text: string) => {
    if (!text || text.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=vn&limit=5`, {
        headers: { 'Accept-Language': 'vi' }
      });
      const data = await res.json();
      setResults(data || []);
      setIsOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (val.length >= 3) {
      timeoutRef.current = setTimeout(() => {
        searchAddress(val);
      }, 500);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (item: any) => {
    setQuery(item.display_name);
    setIsOpen(false);
    onAddressSelect(item.display_name, parseFloat(item.lat), parseFloat(item.lon));
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input 
            value={query}
            onChange={handleInputChange}
            placeholder="Nhập địa chỉ giao hàng..."
            className="pl-9 pr-4 py-2 w-full"
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          {isLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
        </div>
        <Button type="button" variant="outline" onClick={onOpenMap} className="shrink-0 gap-2 px-3">
          <Map className="w-4 h-4" /> Bản đồ
        </Button>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
          {results.map((item) => (
            <div 
              key={item.place_id} 
              className="p-3 hover:bg-muted cursor-pointer flex gap-3 items-start border-b border-border/50 last:border-0"
              onClick={() => handleSelect(item)}
            >
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm line-clamp-2">{item.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
