import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, LANGUAGE_OPTIONS, Language } from '../context/LanguageContext';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGE_OPTIONS.find(opt => opt.code === language) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-stone-800/90 hover:bg-stone-700 text-gold border border-gold/30 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        aria-label="Seleccionar Idioma"
      >
        <Globe size={14} className="text-gold" />
        <span className="text-sm leading-none">{currentOption.flag}</span>
        <span className="uppercase text-xs text-stone-200">{currentOption.label}</span>
        <ChevronDown size={12} className={`text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1 border-b border-stone-800 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Idioma / Language
          </div>
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLanguage(opt.code as Language);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                language === opt.code 
                  ? 'bg-gold/15 text-gold font-bold' 
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{opt.flag}</span>
                <span>{opt.name}</span>
              </div>
              {language === opt.code && <Check size={14} className="text-gold" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
