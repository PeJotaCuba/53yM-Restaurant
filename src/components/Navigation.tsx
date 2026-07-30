import React, { useState, useEffect } from 'react';
import { Menu, X, Calendar, User, UserCog, UserCheck, LogOut, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { AppData } from '../types';
import { isDeviceRegistered } from '../utils/deviceUtils';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface NavigationProps {
  currentView: string;
  setView: (view: string) => void;
  userRole: 'admin' | 'manager' | 'dependent' | 'none';
  onOpenLogin: () => void;
  onLogout: () => void;
  onSyncExcelencia?: () => Promise<boolean>;
  deviceId?: string;
  data?: AppData;
}

export function Navigation({ 
  currentView, 
  setView, 
  userRole, 
  onOpenLogin, 
  onLogout, 
  onSyncExcelencia,
  deviceId = '',
  data
}: NavigationProps) {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const deviceRegistered = isDeviceRegistered(deviceId, data);

  const handleLoginClick = () => {
    if (!deviceRegistered) {
      alert(`Acceso Denegado\n\nEl ID de este dispositivo (${deviceId || 'Desconocido'}) no está registrado por el administrador ni en el código.`);
      return;
    }
    setIsMobileMenuOpen(false);
    onOpenLogin();
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSyncClick = async () => {
    if (!onSyncExcelencia) return;
    setIsSyncing(true);
    const success = await onSyncExcelencia();
    setIsSyncing(false);
    if (success) {
      alert('¡Datos de excelencia.json actualizados correctamente!');
    } else {
      alert('Ocurrió un error al cargar excelencia.json. Verifica la conexión.');
    }
  };

  const navClasses = `fixed w-full z-50 transition-all duration-300 ${
    isScrolled || currentView !== 'home' ? 'bg-dark-green/95 backdrop-blur-md py-4 shadow-lg' : 'bg-transparent py-6'
  }`;

  const handleNavClick = (view: string, hash?: string) => {
    setView(view);
    setIsMobileMenuOpen(false);
    
    if (view === 'home' && hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  };

  const renderAccountButton = (isMobile = false) => {
    if (userRole === 'admin') {
      return (
        <button
          onClick={() => handleNavClick('admin')}
          className={`text-gold hover:text-white flex items-center gap-2 uppercase text-xs font-bold transition-colors ${
            !isMobile ? 'border-l border-white/20 pl-6' : 'w-full text-left py-2 border-b border-white/10'
          }`}
        >
          <UserCog size={16} /> {t('Gestión Admin')}
        </button>
      );
    }

    if (userRole === 'manager') {
      return (
        <button
          onClick={() => handleNavClick('manager')}
          className={`text-gold hover:text-white flex items-center gap-2 uppercase text-xs font-bold transition-colors ${
            !isMobile ? 'border-l border-white/20 pl-6' : 'w-full text-left py-2 border-b border-white/10'
          }`}
        >
          <ShieldCheck size={16} /> {t('Jefe Restaurante')}
        </button>
      );
    }

    if (userRole === 'dependent') {
      return (
        <button
          onClick={() => handleNavClick('dependent')}
          className={`text-gold hover:text-white flex items-center gap-2 uppercase text-xs font-bold transition-colors ${
            !isMobile ? 'border-l border-white/20 pl-6' : 'w-full text-left py-2 border-b border-white/10'
          }`}
        >
          <UserCheck size={16} /> {t('Mi cuenta')}
        </button>
      );
    }

    return (
      <button
        onClick={() => handleNavClick('dashboard')}
        className={`text-white hover:text-gold flex items-center gap-2 uppercase text-xs font-bold transition-colors ${
          !isMobile ? 'border-l border-white/20 pl-6' : 'w-full text-left py-2 border-b border-white/10'
        }`}
      >
        <User size={16} /> {t('Mis Reservas')}
      </button>
    );
  };

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <button onClick={() => handleNavClick('home')} className="text-white hover:text-gold transition-colors flex items-center">
          <Logo variant="svg" className="h-8 md:h-10 drop-shadow-sm" />
        </button>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center space-x-5">
          <button onClick={() => handleNavClick('home')} className="text-white hover:text-gold uppercase text-xs font-bold transition-colors">{t('Inicio')}</button>
          <button onClick={() => handleNavClick('home', 'about')} className="text-white hover:text-gold uppercase text-xs font-bold transition-colors">{t('Nosotros')}</button>
          <button onClick={() => handleNavClick('home', 'services')} className="text-white hover:text-gold uppercase text-xs font-bold transition-colors">{t('Servicios')}</button>
          <button onClick={() => handleNavClick('home', 'gallery')} className="text-white hover:text-gold uppercase text-xs font-bold transition-colors">{t('Galería')}</button>
          <button onClick={() => handleNavClick('home', 'menu')} className="text-white hover:text-gold uppercase text-xs font-bold transition-colors">{t('Menú')}</button>
          <button onClick={() => handleNavClick('home', 'promos')} className="text-white hover:text-gold uppercase text-xs font-bold transition-colors">{t('Promociones')}</button>
          
          {renderAccountButton(false)}

          <button 
            onClick={handleSyncClick} 
            disabled={isSyncing}
            className="bg-stone-800/80 hover:bg-stone-700 text-gold border border-gold/30 px-3 py-1.5 rounded-full uppercase text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Actualizar datos desde excelencia.json"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? t('Cargando...') : t('Actualizar')}
          </button>

          {/* Language Selector Dropdown */}
          <LanguageSelector />

          {userRole === 'none' ? (
            <>
              <button onClick={() => handleNavClick('reservation')} className="bg-gold hover:bg-gold-light text-stone-900 px-5 py-2 rounded-full uppercase text-xs font-bold tracking-wider transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/30">
                {t('Reservar')}
              </button>
              <button 
                onClick={handleLoginClick} 
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                  deviceRegistered 
                    ? 'text-stone-300 hover:text-white' 
                    : 'text-stone-500 opacity-60'
                }`}
                title={deviceRegistered ? t("Acceso Personal") : `Dispositivo no registrado (${deviceId})`}
              >
                <Lock size={14} className={deviceRegistered ? 'text-gold' : 'text-stone-500'} />
              </button>
            </>
          ) : (
            <button onClick={onLogout} className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-full uppercase text-xs font-bold transition-colors flex items-center gap-1">
              <LogOut size={14} /> {t('Salir')}
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="lg:hidden flex items-center gap-2 sm:gap-3">
          <LanguageSelector />

          <button 
            onClick={handleSyncClick} 
            disabled={isSyncing}
            className="bg-stone-800/80 text-gold p-2 rounded-lg border border-gold/30 text-xs font-bold flex items-center gap-1"
            title="Actualizar datos desde excelencia.json"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>

          {userRole === 'admin' && (
            <button onClick={() => handleNavClick('admin')} className="text-gold font-bold text-xs flex items-center gap-1">
              <UserCog size={20} />
            </button>
          )}
          {userRole === 'manager' && (
            <button onClick={() => handleNavClick('manager')} className="text-gold font-bold text-xs flex items-center gap-1">
              <ShieldCheck size={20} />
            </button>
          )}
          {userRole === 'dependent' && (
            <button onClick={() => handleNavClick('dependent')} className="text-gold font-bold text-xs flex items-center gap-1">
              <UserCheck size={20} />
            </button>
          )}
          {userRole === 'none' && (
            <button onClick={() => handleNavClick('dashboard')} className="text-white hover:text-gold transition-colors">
              <User size={22} />
            </button>
          )}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-dark-green border-t border-stone-800 shadow-xl max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col px-4 py-6 space-y-4">
            <button onClick={() => handleNavClick('home')} className="text-white text-left uppercase font-bold py-2 border-b border-white/10">{t('Inicio')}</button>
            <button onClick={() => handleNavClick('home', 'about')} className="text-white text-left uppercase font-bold py-2 border-b border-white/10">{t('Nosotros')}</button>
            <button onClick={() => handleNavClick('home', 'services')} className="text-white text-left uppercase font-bold py-2 border-b border-white/10">{t('Servicios')}</button>
            <button onClick={() => handleNavClick('home', 'gallery')} className="text-white text-left uppercase font-bold py-2 border-b border-white/10">{t('Galería')}</button>
            <button onClick={() => handleNavClick('home', 'menu')} className="text-white text-left uppercase font-bold py-2 border-b border-white/10">{t('Menú')}</button>
            <button onClick={() => handleNavClick('home', 'promos')} className="text-white text-left uppercase font-bold py-2 border-b border-white/10">{t('Promociones')}</button>
            
            {renderAccountButton(true)}
            
            {userRole === 'none' ? (
              <>
                <button onClick={() => handleNavClick('reservation')} className="bg-gold text-stone-900 text-center rounded-lg uppercase font-bold py-4 mt-4 text-sm">
                  {t('Reservar Mesa')}
                </button>
                <button 
                  onClick={handleLoginClick} 
                  className={`text-center py-2.5 text-xs uppercase tracking-wider font-bold transition-colors border rounded-xl flex items-center justify-center gap-2 ${
                    deviceRegistered 
                      ? 'text-stone-200 border-white/20 hover:bg-white/10' 
                      : 'text-stone-500 border-white/5 bg-stone-900/40 opacity-60'
                  }`}
                >
                  <Lock size={14} className={deviceRegistered ? 'text-gold' : 'text-stone-500'} />
                  {t('Acceso Personal')} {deviceRegistered ? '' : '(Dispositivo no registrado)'}
                </button>
              </>
            ) : (
              <button onClick={() => { setIsMobileMenuOpen(false); onLogout(); }} className="bg-red-500/20 text-red-200 text-center rounded-lg uppercase font-bold py-3 mt-4 text-sm">
                {t('Cerrar Sesión')}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
