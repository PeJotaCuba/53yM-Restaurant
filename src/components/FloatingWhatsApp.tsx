import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FloatingReservationProps {
  currentView: string;
  onReserve?: () => void;
}

export function FloatingWhatsApp({ currentView, onReserve }: FloatingReservationProps) {
  const { t } = useLanguage();
  if (currentView === 'reservation' || currentView === 'menu') return null;

  return (
    <button
      onClick={() => {
        if (onReserve) {
          onReserve();
        }
      }}
      className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-gold via-amber-400 to-gold text-stone-900 px-5 py-3.5 rounded-full flex items-center gap-3 shadow-2xl shadow-gold/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-amber-300/80 font-bold text-sm tracking-wide group"
      aria-label={t('Reservar Mesa Ahora')}
    >
      <div className="bg-stone-900 text-gold p-2 rounded-full group-hover:rotate-12 transition-transform shadow-inner">
        <Calendar size={18} />
      </div>
      <div className="flex flex-col items-start text-left">
        <span className="text-[10px] text-stone-900 uppercase tracking-widest font-black leading-none">53&M</span>
        <span className="font-serif uppercase tracking-wider text-xs sm:text-sm font-black text-stone-950 flex items-center gap-1">
          {t('Reservar Mesa')} <Sparkles size={12} className="text-stone-900 fill-stone-900" />
        </span>
      </div>
    </button>
  );
}


