import React, { useState } from 'react';
import { Calendar, Sparkles, Utensils, X, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingReservationProps {
  currentView: string;
  onReserve?: () => void;
  onOrder?: () => void;
}

export function FloatingWhatsApp({ currentView, onReserve, onOrder }: FloatingReservationProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  if (currentView === 'reservation' || currentView === 'menu' || currentView === 'dashboard') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-stone-900 border border-stone-700 p-2 rounded-3xl shadow-2xl flex flex-col gap-2 min-w-[200px]"
          >
            <button
              onClick={() => {
                setIsOpen(false);
                if (onReserve) onReserve();
              }}
              className="w-full bg-stone-800 hover:bg-stone-700 text-white px-4 py-3 rounded-2xl flex items-center justify-between transition-colors font-bold text-sm"
            >
              <span className="flex items-center gap-2"><Calendar size={16} className="text-gold" /> {t('Hacer Reserva')}</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOrder) onOrder();
              }}
              className="w-full bg-stone-800 hover:bg-stone-700 text-white px-4 py-3 rounded-2xl flex items-center justify-between transition-colors font-bold text-sm"
            >
              <span className="flex items-center gap-2"><Utensils size={16} className="text-emerald-400" /> {t('Hacer Pedido')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-gold via-amber-400 to-gold text-stone-900 px-5 py-3.5 rounded-full flex items-center gap-3 shadow-2xl shadow-gold/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-amber-300/80 font-bold text-sm tracking-wide group"
        aria-label="Gestionar Mesa"
      >
        <div className="bg-stone-900 text-gold p-2 rounded-full transition-transform shadow-inner flex items-center justify-center">
          {isOpen ? <X size={18} /> : <ChevronUp size={18} className="group-hover:-translate-y-1 transition-transform" />}
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-[10px] text-stone-900 uppercase tracking-widest font-black leading-none">53&M</span>
          <span className="font-serif uppercase tracking-wider text-xs sm:text-sm font-black text-stone-950 flex items-center gap-1">
            {t('Gestionar Mesa')} <Sparkles size={12} className="text-stone-900 fill-stone-900" />
          </span>
        </div>
      </button>
    </div>
  );
}


