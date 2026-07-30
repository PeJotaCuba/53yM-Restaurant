import React from 'react';
import { Logo } from './Logo';
import { LandingConfig } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onReserve: () => void;
  onMenu: () => void;
  config?: LandingConfig;
}

export function Hero({ onReserve, onMenu, config }: HeroProps) {
  const { t } = useLanguage();
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

  return (
    <div className="relative h-screen min-h-[600px] flex items-center justify-center text-center overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src={bgImage} 
          alt="Fondo Restaurante 53&M" 
          className="w-full h-full object-cover object-center filter brightness-95 transition-all duration-700" 
        />
        <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 mt-8 md:mt-16 flex flex-col items-center">
        {/* Logo / Banner Image */}
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

        {/* Eslogan */}
        <div className="text-xl md:text-3xl text-gold font-serif italic mb-4 md:mb-6 animate-fade-in-up px-4" style={{ animationDelay: '100ms' }}>
          {t(slogan)}
        </div>

        {/* Frase de abajo (Subtítulo) */}
        <p className="text-stone-200 text-base md:text-xl mb-10 max-w-2xl mx-auto font-light tracking-wide animate-fade-in-up px-4" style={{ animationDelay: '200ms' }}>
          {t(subtitle)}
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-6 sm:px-0 justify-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button onClick={onReserve} className="w-full sm:w-auto bg-gold hover:bg-gold-light text-stone-900 px-8 py-4 rounded-full uppercase text-sm font-bold tracking-wider transition-all transform hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/20">
            {t('RESERVAR MESA')}
          </button>
          <button onClick={onMenu} className="w-full sm:w-auto border-2 border-white hover:bg-white text-white hover:text-stone-900 px-8 py-4 rounded-full uppercase text-sm font-bold tracking-wider transition-all">
            {t('VER MENÚ')}
          </button>
        </div>
      </div>
    </div>
  );
}

