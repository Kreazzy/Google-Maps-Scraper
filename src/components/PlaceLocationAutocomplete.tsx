/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, X } from 'lucide-react';

interface PlaceLocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationResolved: (location: {
    name: string;
    center: { lat: number; lng: number };
  }) => void;
}

export const PlaceLocationAutocomplete: React.FC<PlaceLocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationResolved,
}) => {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!placesLib || !isOpen) return;

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const timer = setTimeout(() => {
      if (!AutocompleteSuggestion?.fetchAutocompleteSuggestions) return;
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken: sessionTokenRef.current || undefined,
      })
        .then((res) => {
          setSuggestions(res.suggestions || []);
          setHighlightedIndex(-1);
        })
        .catch(() => {
          setSuggestions([]);
          setHighlightedIndex(-1);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [placesLib, value, isOpen]);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    const labelText = suggestion.placePrediction.text?.text || value;
    onChange(labelText);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      sessionTokenRef.current = null;

      if (place.location) {
        const lat =
          typeof place.location.lat === 'function'
            ? place.location.lat()
            : (place.location as unknown as google.maps.LatLngLiteral).lat;
        const lng =
          typeof place.location.lng === 'function'
            ? place.location.lng()
            : (place.location as unknown as google.maps.LatLngLiteral).lng;

        onLocationResolved({
          name: labelText,
          center: { lat, lng },
        });
      }
    } catch (err) {
      console.error('Failed to resolve autocomplete place details:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const chosen = suggestions[highlightedIndex];
      if (chosen) {
        void handleSelectSuggestion(chosen);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[200px]">
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder="City, neighborhood, or ZIP (e.g., Austin, TX)"
          className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setHighlightedIndex(-1);
            }}
            aria-label="Clear location"
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-40 max-h-60 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((s, idx) => {
            const text = s.placePrediction?.text?.text || '';
            const isHighlighted = idx === highlightedIndex;
            return (
              <li key={idx}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur before click registers
                    e.preventDefault();
                    void handleSelectSuggestion(s);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                    isHighlighted
                      ? 'bg-blue-50 text-blue-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isHighlighted ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
