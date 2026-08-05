import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { ChevronRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: (name: string) => void;
}

const images = [
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop", // Team / Service
  "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop", // Ambiance / Restaurant
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2080&auto=format&fit=crop"  // Food / Quality
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [name, setName] = useState('');

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950 overflow-hidden">
      {/* Background Carousel */}
      {images.map((src, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={src}
            alt="Onboarding"
            className="w-full h-full object-cover object-center filter brightness-50"
          />
        </div>
      ))}

      {/* Content overlay */}
      <div className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col h-full justify-between items-center text-center animate-fade-in-up">
        {/* Top: Logo */}
        <div className="pt-8 w-full flex justify-center">
           <Logo variant="png" className="h-24 sm:h-32 drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] filter brightness-110" />
        </div>

        {/* Center: Welcome Message */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-4 w-full">
          <h1 className="text-3xl md:text-4xl font-serif text-white tracking-wide">
            {t('Bienvenido a Terraza 53&M')}
          </h1>
          <p className="text-stone-300 text-lg font-light max-w-sm">
            {t('Nos alegra recibirte. Tu experiencia está a punto de comenzar.')}
          </p>
        </div>

        {/* Bottom: Form */}
        <div className="w-full pb-8">
          <form onSubmit={handleSubmit} className="space-y-5 bg-stone-950/40 p-6 sm:p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
            <h3 className="text-xl font-serif text-white">{t('¿Cómo podemos llamarte?')}</h3>
            <input
              type="text"
              placeholder={t('Tu nombre')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-gold outline-none text-white font-medium text-center text-lg placeholder-white/40 transition-colors"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gold text-stone-900 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gold-light transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {t('Continuar')}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
