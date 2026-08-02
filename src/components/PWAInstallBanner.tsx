import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, WifiOff, Share, PlusSquare, Sparkles } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { useLanguage } from '../context/LanguageContext';

export function PWAInstallBanner() {
  const { t } = useLanguage();
  const { isInstallable, isStandalone, isOffline, isIOS, installedSuccess, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // If dismissed or already installed and running standalone, don't show prompt banner
  if (dismissed) {
    return (
      <>
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs py-1 px-4 text-center font-medium shadow-md flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t('Modo Sin Conexión: Estás usando la versión en caché de 53&M')}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs py-1.5 px-4 text-center font-medium shadow-md flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>{t('Modo Sin Conexión Activado: Puedes seguir consultando el menú y tus reservas.')}</span>
        </div>
      )}

      {/* Standalone Native Mode Badge Indicator (when running as installed PWA app) */}
      {/* App Nativa badge removed as per request */}

      {/* Installed Success Toast */}
      {installedSuccess && !isStandalone && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-dark-green text-white px-6 py-3 rounded-2xl shadow-2xl border border-gold/50 flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-6 h-6 text-gold" />
          <div>
            <p className="font-serif font-bold text-sm text-gold">{t('¡Aplicación Instalada!')}</p>
            <p className="text-xs text-stone-200">{t('Ya tienes 53&M en la pantalla de inicio de tu móvil.')}</p>
          </div>
          <button onClick={() => setDismissed(true)} className="ml-2 text-stone-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating PWA Installation Banner for Android/Desktop */}
      {!isStandalone && isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-dark-green/95 backdrop-blur-md text-white p-4 rounded-2xl border border-gold/40 shadow-2xl animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold to-amber-600 p-0.5 shadow-md flex-shrink-0">
              <img src="/53M_app_icon_SQUARE.svg" alt="53&M App" className="w-full h-full object-cover rounded-[10px]" />
            </div>

            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs uppercase font-mono tracking-wider text-gold font-bold">{t('Instala la App')}</span>
                <span className="bg-gold/20 text-gold text-[10px] px-1.5 py-0.5 rounded font-sans">{t('PWA')}</span>
              </div>
              <h4 className="font-serif text-sm font-bold text-stone-100 truncate">{t('Instalar Terraza 53&M')}</h4>
              <p className="text-xs text-stone-300 mt-0.5 leading-snug">
                {t('Acceso rápido desde tu móvil, menú sin internet y experiencia nativa.')}
              </p>
            </div>

            <button 
              onClick={() => setDismissed(true)}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 text-xs text-stone-300 hover:text-white transition-colors"
            >
              {t('Ahora no')}
            </button>
            <button
              onClick={promptInstall}
              className="px-4 py-1.5 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-400 hover:to-gold text-dark-green font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 transform active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Instalar en Móvil')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Installation Suggestion for iOS (Safari) */}
      {!isStandalone && !isInstallable && isIOS && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-dark-green/95 backdrop-blur-md text-white p-4 rounded-2xl border border-gold/40 shadow-2xl animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="w-11 h-11 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center flex-shrink-0 text-gold">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="flex-grow min-w-0">
              <h4 className="font-serif text-sm font-bold text-gold">{t('Instalar 53&M en iPhone')}</h4>
              <p className="text-xs text-stone-300 mt-0.5 leading-snug">
                {t('Instala nuestra app en iOS para disfrutar de una experiencia a pantalla completa.')}
              </p>
            </div>

            <button 
              onClick={() => setDismissed(true)}
              className="text-stone-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
            <button
              onClick={() => setShowIosGuide(true)}
              className="px-4 py-1.5 bg-gold text-dark-green font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Share className="w-3.5 h-3.5" />
              <span>{t('¿Cómo Instalar?')}</span>
            </button>
          </div>
        </div>
      )}

      {/* iOS Modal Installation Steps */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-dark-green border border-gold/40 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl relative">
            <button 
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-600 p-0.5 mx-auto mb-3 shadow-lg">
                <img src="/53M_app_icon_SQUARE.svg" alt="53&M Logo" className="w-full h-full object-cover rounded-2xl" />
              </div>
              <h3 className="font-serif text-lg font-bold text-gold">{t('Instalar 53&M en tu iPhone/iPad')}</h3>
              <p className="text-xs text-stone-300 mt-1">{t('Sigue estos dos sencillos pasos en Safari:')}</p>
            </div>

            <div className="space-y-4 text-sm text-stone-200 mb-6">
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-full bg-gold text-dark-green font-bold flex items-center justify-center flex-shrink-0 text-xs">1</div>
                <div>
                  <p className="font-semibold text-white flex items-center gap-1">
                    {t('Toca el botón Compartir')} <Share className="w-4 h-4 text-gold inline" />
                  </p>
                  <p className="text-xs text-stone-400">{t('Ubicado en la barra inferior de tu navegador Safari.')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-full bg-gold text-dark-green font-bold flex items-center justify-center flex-shrink-0 text-xs">2</div>
                <div>
                  <p className="font-semibold text-white flex items-center gap-1">
                    {t('Selecciona "Añadir a pantalla de inicio"')} <PlusSquare className="w-4 h-4 text-gold inline" />
                  </p>
                  <p className="text-xs text-stone-400">{t('Desplázate hacia abajo en el menú y confirma.')}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-gradient-to-r from-gold to-amber-500 text-dark-green font-serif font-bold text-sm rounded-xl shadow-lg"
            >
              {t('Entendido')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
