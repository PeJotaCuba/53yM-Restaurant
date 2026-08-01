import React, { useState } from 'react';
import { Logo } from './Logo';
import { LandingConfig } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onReserve: () => void;
  onMenu: () => void;
  config?: LandingConfig;
  showQuestionnaire?: boolean;
  onCompleteQuestionnaire?: (name: string, goToMenu: boolean) => void;
}

export function Hero({ onReserve, onMenu, config, showQuestionnaire, onCompleteQuestionnaire }: HeroProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');

  const defaultBg = "https://z-cdn-media.chatglm.cn/files/8040c33e-80d6-4d6b-a432-40b2d97abdbc.jpg?auth_key=1885072204-5c2e4753cf824b03b28516ea2ab7779e-0-b0687f954c886420df99687d3ae0380a";
  const bgImage = config?.heroBgImage || defaultBg;
  
  const rawSlogan = config?.heroSlogan;
  const slogan = (rawSlogan && !rawSlogan.toLowerCase().includes("sabores que cuentan historias")) 
    ? rawSlogan 
    : "Exclusivo, diferente y delicioso";

  const rawSubtitle = config?.heroSubtitle;
  const subtitle = (rawSubtitle && 
    !rawSubtitle.includes("Descubre la auténtica") && 
    !rawSubtitle.includes("corazón de Bayamo"))
    ? rawSubtitle 
    : "Donde la excelencia y el sabor confluyen";

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) setStep(2);
  };

  return (
    <div className="relative h-screen min-h-[600px] flex items-center justify-center text-center overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src={bgImage} 
          alt="Fondo Restaurante 53&M" 
          className="w-full h-full object-cover object-center filter brightness-95 transition-all duration-700" 
        />
        <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 mt-8 md:mt-16 flex flex-col items-center w-full">
        <div className="mb-4 md:mb-6 animate-fade-in-up">
          {config?.heroBannerImage ? (
            <img 
              src={config.heroBannerImage} 
              alt="Banner" 
              className="h-28 sm:h-36 md:h-52 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] filter brightness-110" 
            />
          ) : (
            <Logo variant="png" className="h-28 sm:h-36 md:h-52 drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] filter brightness-110" />
          )}
        </div>

        {showQuestionnaire ? (
          <div className="w-full max-w-md mx-auto bg-stone-950/40 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl animate-fade-in-up">
            {step === 1 && (
              <form onSubmit={handleNameSubmit} className="space-y-6">
                <h3 className="text-2xl font-serif text-white">¡Bienvenido a 53&M!</h3>
                <p className="text-stone-300 text-sm">¿Cómo te llamas?</p>
                <input
                  type="text"
                  placeholder="Tu nombre (ej. Carlos Pérez)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-gold outline-none text-white font-medium text-center text-lg placeholder-white/40"
                />
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full bg-gold text-stone-900 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gold-light transition-colors shadow-md disabled:opacity-50"
                >
                  Continuar
                </button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-serif text-white">Hola, {name.trim()}</h3>
                <p className="text-stone-300 text-sm">¿Estás actualmente en el restaurante?</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gold text-stone-900 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gold-light transition-colors shadow-md"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => onCompleteQuestionnaire?.(name.trim(), false)}
                    className="flex-1 border border-white/30 text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-white/10 transition-colors shadow-md"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-serif text-white">¡Excelente!</h3>
                <p className="text-stone-300 text-sm">¿Deseas pasar directamente al menú para realizar tu pedido?</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => onCompleteQuestionnaire?.(name.trim(), true)}
                    className="flex-1 bg-gold text-stone-900 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gold-light transition-colors shadow-md"
                  >
                    Sí, ver menú
                  </button>
                  <button
                    onClick={() => onCompleteQuestionnaire?.(name.trim(), false)}
                    className="flex-1 border border-white/30 text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-white/10 transition-colors shadow-md"
                  >
                    No, gracias
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-xl md:text-3xl text-gold font-serif italic mb-4 md:mb-6 animate-fade-in-up px-4" style={{ animationDelay: '100ms' }}>
              {t(slogan)}
            </div>
            <p className="text-stone-200 text-base md:text-xl mb-10 max-w-2xl mx-auto font-light tracking-wide animate-fade-in-up px-4" style={{ animationDelay: '200ms' }}>
              {t(subtitle)}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-6 sm:px-0 justify-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <button onClick={onReserve} className="w-full sm:w-auto bg-gold hover:bg-gold-light text-stone-900 px-8 py-4 rounded-full uppercase text-sm font-bold tracking-wider transition-all transform hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/20">
                {t('RESERVAR MESA')}
              </button>
              <button onClick={onMenu} className="w-full sm:w-auto border-2 border-white hover:bg-white text-white hover:text-stone-900 px-8 py-4 rounded-full uppercase text-sm font-bold tracking-wider transition-all">
                {t('VER MENÚ')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

