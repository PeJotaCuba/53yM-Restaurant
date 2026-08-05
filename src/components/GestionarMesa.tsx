import React, { useState } from 'react';
import { Sparkles, ChevronUp, Calendar, Utensils, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FloatingReservationProps {
  currentView: string;
  onReserve: () => void;
  onOrder: () => void;
}

export function GestionarMesa({ currentView, onReserve, onOrder }: FloatingReservationProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Hidden inside Mi Perfil (dashboard), reservation, menu, or order_workspace
  if (
    currentView === 'reservation' || 
    currentView === 'menu' || 
    currentView === 'dashboard' || 
    currentView === 'order_workspace'
  ) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-gold via-amber-400 to-gold text-stone-900 px-5 py-3.5 rounded-full flex items-center gap-3 shadow-2xl shadow-gold/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-amber-300/80 font-bold text-sm tracking-wide group"
          aria-label="Gestionar Mesa"
        >
          <div className="bg-stone-900 text-gold p-2 rounded-full transition-transform shadow-inner flex items-center justify-center">
            <ChevronUp size={18} className="group-hover:-translate-y-1 transition-transform" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] text-stone-900 uppercase tracking-widest font-black leading-none">53&M</span>
            <span className="font-serif uppercase tracking-wider text-xs sm:text-sm font-black text-stone-950 flex items-center gap-1">
              {t('Gestionar Mesa')} <Sparkles size={12} className="text-stone-900 fill-stone-900" />
            </span>
          </div>
        </button>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-stone-200 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 p-2 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full inline-block mb-2">
                Restaurante Terraza 53&M
              </span>
              <h3 className="text-2xl font-serif text-dark-green font-bold">
                {t('¿Qué deseas hacer?')}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {t('Selecciona una opción para continuar con tu experiencia')}
              </p>
            </div>

            <div className="space-y-4">
              {/* Option 1: Reservar */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onReserve();
                }}
                className="w-full bg-stone-50 hover:bg-amber-50/60 border-2 border-stone-200 hover:border-amber-400 p-5 rounded-2xl text-left transition-all flex items-center gap-4 group shadow-xs active:scale-98"
              >
                <div className="p-3.5 bg-amber-100 text-amber-900 rounded-xl group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors shrink-0">
                  <Calendar size={26} />
                </div>
                <div className="flex-1">
                  <h4 className="font-serif font-bold text-stone-900 text-lg group-hover:text-amber-950">
                    {t('Reservar')}
                  </h4>
                  <p className="text-xs text-stone-500 group-hover:text-stone-700 leading-snug mt-0.5">
                    Reserva una mesa para una fecha y hora determinada.
                  </p>
                </div>
              </button>

              {/* Option 2: Hacer Pedido */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOrder();
                }}
                className="w-full bg-stone-50 hover:bg-dark-green/5 border-2 border-stone-200 hover:border-dark-green p-5 rounded-2xl text-left transition-all flex items-center gap-4 group shadow-xs active:scale-98"
              >
                <div className="p-3.5 bg-emerald-100 text-emerald-900 rounded-xl group-hover:bg-dark-green group-hover:text-white transition-colors shrink-0">
                  <Utensils size={26} />
                </div>
                <div className="flex-1">
                  <h4 className="font-serif font-bold text-stone-900 text-lg group-hover:text-dark-green">
                    {t('Hacer Pedido')}
                  </h4>
                  <p className="text-xs text-stone-500 group-hover:text-stone-700 leading-snug mt-0.5">
                    Realiza un pedido desde tu mesa o mediante el acceso autorizado.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
