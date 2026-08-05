import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { ChevronRight, Compass, Calendar, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import img1 from '../assets/559119213_122292263138023400_6687862613514902407_n.jpg';
import img2 from '../assets/equipo/628030779_122309755778023400_6384611490953368083_n.jpg';
import img3 from '../assets/597484494_122301404036023400_4555413421550982025_n.jpg';

interface OnboardingProps {
  onComplete: (name: string, action: 'navegar' | 'reservar' | 'pedido') => void;
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
  // 3: Experience selection reception
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

  // Auto-advance carousel only in phase 2 and 3
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
      setPhase(3);
    }
  };

  const handleSelectExperience = (action: 'navegar' | 'reservar' | 'pedido') => {
    if (name.trim()) {
      onComplete(name.trim(), action);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0C0A09] overflow-hidden select-none">
      
      {/* Background Carousel - Only visible in phase 2 and 3 */}
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
              alt="Restaurante-Terraza 53&M"
              className="w-full h-full object-cover object-center filter brightness-40"
            />
            {/* Elegant vignette effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-stone-950/30 mix-blend-multiply" />
          </div>
        ))}
      </div>

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center overflow-y-auto px-4 py-8">
        
        {/* Animated Welcome Texts */}
        {phase < 2 && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-all duration-1000 ease-in-out ${phase >= 2 ? 'opacity-0 pointer-events-none -translate-y-8' : 'opacity-100 translate-y-0'}`}>
            <Logo variant="png" className={`h-24 sm:h-32 drop-shadow-2xl transition-all duration-1500 ${phase >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} />
            
            <h1 className={`mt-6 text-3xl md:text-5xl font-serif text-white tracking-wide transition-all duration-1500 delay-500 ${phase >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {t('Bienvenido a')} <span className="text-gold">Restaurante-Terraza 53&M</span>
            </h1>
            
            <p className={`mt-6 text-stone-300 text-lg md:text-xl font-light italic max-w-md transition-all duration-1500 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              "{t('Exclusivo, diferente y delicioso')}"
            </p>
          </div>
        )}

        {/* Name Request Form */}
        {phase === 2 && (
          <div className="w-full max-w-md text-center space-y-8">
            <div className="mb-8 flex justify-center">
              <Logo variant="png" className="h-20 sm:h-24 drop-shadow-2xl opacity-90" />
            </div>
            
            <form onSubmit={handleSubmit} className="w-full space-y-8">
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
                  autoFocus
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
        )}

        {/* Phase 3: Experience Selection (Reception Screen) */}
        {phase === 3 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-4xl text-center space-y-10 py-6"
          >
            <div className="space-y-3">
              <div className="flex justify-center mb-4">
                <Logo variant="png" className="h-16 md:h-20 drop-shadow-md opacity-90" />
              </div>
              <motion.h2 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-4xl lg:text-5xl font-serif text-white tracking-wide leading-tight"
              >
                {t('¡Hola')}, <span className="text-gold font-bold">{name}</span>!
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-stone-300 font-light text-base md:text-lg italic"
              >
                {t('¿Qué experiencia deseas vivir hoy con nosotros?')}
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-2">
              
              {/* Card 1: Navegar */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                onClick={() => handleSelectExperience('navegar')}
                className="bg-stone-900/60 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col justify-between text-left hover:border-gold hover:bg-stone-900/80 transition-all cursor-pointer group shadow-xl hover:shadow-[0_10px_30px_rgba(234,179,8,0.1)] duration-300 transform hover:-translate-y-2 h-[260px] md:h-[280px]"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold/20 transition-all">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg md:text-xl text-white font-bold uppercase tracking-wider group-hover:text-gold transition-colors">
                      {t('Navegar')}
                    </h3>
                    <p className="text-stone-300/95 text-xs md:text-sm font-light leading-relaxed">
                      {t('Explora nuestro restaurante, conoce nuestra propuesta y descubre nuestros servicios.')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gold font-bold uppercase tracking-widest mt-4">
                  <span>{t('Explorar')}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </motion.div>

              {/* Card 2: Reservar */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                onClick={() => handleSelectExperience('reservar')}
                className="bg-stone-900/60 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col justify-between text-left hover:border-gold hover:bg-stone-900/80 transition-all cursor-pointer group shadow-xl hover:shadow-[0_10px_30px_rgba(234,179,8,0.1)] duration-300 transform hover:-translate-y-2 h-[260px] md:h-[280px]"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold/20 transition-all">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg md:text-xl text-white font-bold uppercase tracking-wider group-hover:text-gold transition-colors">
                      {t('Reservar')}
                    </h3>
                    <p className="text-stone-300/95 text-xs md:text-sm font-light leading-relaxed">
                      {t('Reserva una mesa para visitarnos.')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gold font-bold uppercase tracking-widest mt-4">
                  <span>{t('Reservar')}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </motion.div>

              {/* Card 3: Hacer Pedido */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                onClick={() => handleSelectExperience('pedido')}
                className="bg-stone-900/60 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col justify-between text-left hover:border-gold hover:bg-stone-900/80 transition-all cursor-pointer group shadow-xl hover:shadow-[0_10px_30px_rgba(234,179,8,0.1)] duration-300 transform hover:-translate-y-2 h-[260px] md:h-[280px]"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold/20 transition-all">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg md:text-xl text-white font-bold uppercase tracking-wider group-hover:text-gold transition-colors">
                      {t('Hacer Pedido')}
                    </h3>
                    <p className="text-stone-300/95 text-xs md:text-sm font-light leading-relaxed">
                      {t('Realiza tu pedido desde una mesa del restaurante mediante código de acceso.')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gold font-bold uppercase tracking-widest mt-4">
                  <span>{t('Pedir')}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
