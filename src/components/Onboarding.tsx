import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { ChevronRight } from 'lucide-react';

import img1 from '../assets/559119213_122292263138023400_6687862613514902407_n.jpg';
import img2 from '../assets/equipo/628030779_122309755778023400_6384611490953368083_n.jpg';
import img3 from '../assets/597484494_122301404036023400_4555413421550982025_n.jpg';

interface OnboardingProps {
  onComplete: (name: string) => void;
}

const fallbackImages = [
  img2, // Team / Service
  img1, // Ambiance / Restaurant
  img3  // Food / Quality
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState(0); 
  // 0: Initial text fade in
  // 1: Subtitle fade in
  // 2: Carousel starts + name request
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [name, setName] = useState('');

  useEffect(() => {
    // Phase 0 -> 1 (Welcome text -> subtitle)
    const timer1 = setTimeout(() => {
      setPhase(1);
    }, 2500);

    // Phase 1 -> 2 (Subtitle -> Name request & carousel)
    const timer2 = setTimeout(() => {
      setPhase(2);
    }, 5500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Auto-advance carousel only in phase 2
  useEffect(() => {
    if (phase >= 2) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % fallbackImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0C0A09] overflow-hidden select-none">
      
      {/* Background Carousel - Only visible in phase 2 */}
      <div className={`absolute inset-0 transition-opacity duration-2000 ease-in-out ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        {fallbackImages.map((src, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${
              idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={src}
              alt="Terraza 53&M"
              className="w-full h-full object-cover object-center filter brightness-50"
            />
            {/* Elegant vignette effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-stone-950/20 mix-blend-multiply" />
          </div>
        ))}
      </div>

      {/* Content overlay */}
      <div className="relative z-10 w-full max-w-lg px-6 py-12 flex flex-col h-full justify-center items-center text-center">
        
        {/* Animated Welcome Texts */}
        <div className={`transition-all duration-1000 ease-in-out flex flex-col items-center justify-center space-y-6 ${phase >= 2 ? '-translate-y-12 opacity-0 pointer-events-none absolute' : 'translate-y-0 opacity-100'}`}>
          <Logo variant="png" className={`h-24 sm:h-32 drop-shadow-2xl transition-all duration-1500 ${phase >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} />
          
          <h1 className={`text-3xl md:text-5xl font-serif text-white tracking-wide transition-all duration-1500 delay-500 ${phase >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {t('Bienvenido a')} <span className="text-gold">Terraza 53&M</span>
          </h1>
          
          <p className={`text-stone-300 text-lg md:text-xl font-light italic max-w-md transition-all duration-1500 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            "{t('Donde cada momento se convierte en una experiencia')}"
          </p>
        </div>

        {/* Name Request Form */}
        <div className={`w-full transition-all duration-1500 delay-500 ease-out absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 ${phase >= 2 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}`}>
          <div className="mb-12 flex justify-center">
            <Logo variant="png" className="h-20 sm:h-24 drop-shadow-2xl opacity-90" />
          </div>
          
          <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-8">
            <div className="space-y-3">
              <h3 className="text-2xl md:text-3xl font-serif text-white font-light tracking-wide">
                {t('Para ofrecerte una experiencia personalizada...')}
              </h3>
              <p className="text-stone-300/80 text-sm md:text-base font-light">
                {t('¿Cómo podemos llamarte?')}
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder={t('Tu nombre')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-5 bg-stone-900/40 backdrop-blur-md border-b-2 border-white/20 hover:border-white/40 focus:border-gold focus:bg-stone-900/60 outline-none text-white font-medium text-center text-xl placeholder-white/30 transition-all rounded-t-xl"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full flex items-center justify-center gap-3 bg-white text-stone-950 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gold hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                {t('Continuar')}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
