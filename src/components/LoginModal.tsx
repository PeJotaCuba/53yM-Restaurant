import React, { useState } from 'react';
import { AppData, DependentConfig, ManagerConfig } from '../types';
import { X, Lock, User, Phone, ShieldCheck, UserCheck, Smartphone } from 'lucide-react';
import { Logo } from './Logo';
import { ADMIN_DEVICE_IDS } from '../utils/deviceUtils';
import { useLanguage } from '../context/LanguageContext';

interface LoginModalProps {
  data: AppData;
  isOpen: boolean;
  onClose: () => void;
  onAdminLogin: () => void;
  onDependentLogin: (dependent: DependentConfig) => void;
  onManagerLogin: (manager: ManagerConfig) => void;
  deviceId?: string;
}

export function LoginModal({ data, isOpen, onClose, onAdminLogin, onDependentLogin, onManagerLogin, deviceId = '' }: LoginModalProps) {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentDeviceIdClean = deviceId.trim().toUpperCase();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password;

    if (!cleanIdentifier || !cleanPassword) {
      setError('Por favor complete todos los campos.');
      return;
    }

    // 1. Check Admin credentials
    const admin = data.adminConfig;
    const cleanPhone = admin.phone?.replace(/\D/g, '') || '';
    const inputPhone = cleanIdentifier.replace(/\D/g, '');

    const isAdminUsernameMatch = admin.username && admin.username.toLowerCase() === cleanIdentifier.toLowerCase();
    const isAdminPhoneMatch = cleanPhone && inputPhone && cleanPhone === inputPhone;
    const isAdminPasswordMatch = admin.password === cleanPassword;

    if ((isAdminUsernameMatch || isAdminPhoneMatch) && isAdminPasswordMatch) {
      // Check if current deviceId is authorized for Admin
      const authorizedAdminIds = (admin as any).authorizedAdminIds || ['DVC-39D3R'];
      const isAdminDeviceValid = ADMIN_DEVICE_IDS.includes(currentDeviceIdClean) || 
        authorizedAdminIds.some((id: string) => id.trim().toUpperCase() === currentDeviceIdClean);

      if (!isAdminDeviceValid) {
        setError(`Acceso denegado: La cuenta de Administrador solo puede abrirse en los dispositivos autorizados (${authorizedAdminIds.join(', ')}). Tu ID de dispositivo actual es: ${deviceId || 'Desconocido'}.`);
        return;
      }

      localStorage.setItem('adminSession', JSON.stringify({ loggedIn: true, time: Date.now() }));
      localStorage.removeItem('dependentSession');
      localStorage.removeItem('managerSession');
      onAdminLogin();
      onClose();
      return;
    }

    // 2. Check Manager (Jefe de Restaurante) credentials
    const matchedManager = (data.managers || []).find(mgr => {
      const mgrUserMatch = mgr.username && mgr.username.toLowerCase() === cleanIdentifier.toLowerCase();
      const mgrPhoneClean = mgr.phone ? mgr.phone.replace(/\D/g, '') : '';
      const mgrPhoneMatch = mgrPhoneClean && inputPhone && mgrPhoneClean === inputPhone;
      const mgrPassMatch = mgr.password === cleanPassword;

      return (mgrUserMatch || mgrPhoneMatch) && mgrPassMatch;
    });

    if (matchedManager) {
      if (matchedManager.isActive === false) {
        setError('Esta cuenta de Jefe de Restaurante ha sido desactivada.');
        return;
      }

      // Check if current deviceId matches the Manager's authorized device ID
      const mgrAllowedDeviceId = matchedManager.deviceId ? matchedManager.deviceId.trim().toUpperCase() : '';
      const isMgrDeviceValid = mgrAllowedDeviceId ? (currentDeviceIdClean === mgrAllowedDeviceId) : ADMIN_DEVICE_IDS.includes(currentDeviceIdClean);

      if (!isMgrDeviceValid) {
        setError(`Acceso denegado: La cuenta de Jefe de Restaurante '${matchedManager.name}' solo puede abrirse en su dispositivo asignado (${mgrAllowedDeviceId || 'IDs de Admin'}). Tu ID de dispositivo actual es: ${deviceId || 'Desconocido'}.`);
        return;
      }

      const session = {
        id: matchedManager.id,
        username: matchedManager.username,
        name: matchedManager.name,
        loginTime: Date.now()
      };
      localStorage.setItem('managerSession', JSON.stringify(session));
      localStorage.removeItem('adminSession');
      localStorage.removeItem('dependentSession');
      onManagerLogin(matchedManager);
      onClose();
      return;
    }

    // 3. Check Dependiente credentials
    const matchedDependent = data.dependents.find(dep => {
      const depUserMatch = dep.username && dep.username.toLowerCase() === cleanIdentifier.toLowerCase();
      const depPhoneClean = dep.phone ? dep.phone.replace(/\D/g, '') : '';
      const depPhoneMatch = depPhoneClean && inputPhone && depPhoneClean === inputPhone;
      const depPassMatch = dep.password === cleanPassword;

      return (depUserMatch || depPhoneMatch) && depPassMatch;
    });

    if (matchedDependent) {
      if (matchedDependent.isActive === false) {
        setError('Esta cuenta de dependiente ha sido desactivada por el administrador.');
        return;
      }

      // Check if current deviceId matches the Dependent's authorized device ID
      const depAllowedDeviceId = matchedDependent.deviceId ? matchedDependent.deviceId.trim().toUpperCase() : '';
      if (currentDeviceIdClean !== depAllowedDeviceId) {
        setError(`Acceso denegado: La cuenta del dependiente '${matchedDependent.name}' solo se puede abrir en su dispositivo asignado (${depAllowedDeviceId}). Tu ID de dispositivo actual es: ${deviceId || 'Desconocido'}.`);
        return;
      }

      const session = {
        id: matchedDependent.id,
        deviceId: matchedDependent.deviceId,
        username: matchedDependent.username,
        tableNumber: matchedDependent.tableNumber,
        loginTime: Date.now()
      };
      localStorage.setItem('dependentSession', JSON.stringify(session));
      localStorage.removeItem('adminSession');
      localStorage.removeItem('managerSession');
      onDependentLogin(matchedDependent);
      onClose();
      return;
    }

    setError('Credenciales incorrectas. Verifique su usuario o móvil y contraseña.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-100 max-w-md w-full p-6 md:p-8 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 transition-colors p-1"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="mb-4">
            <Logo variant="png" className="h-14 mx-auto drop-shadow-sm" />
          </div>
          <h3 className="text-2xl font-serif text-dark-green mb-1">{t('Acceso de Personal')}</h3>
          <p className="text-xs text-stone-500">{t('Administrador, Jefe de Restaurante o Dependiente')}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-6">
            {t(error)}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              {t('Usuario o Teléfono Móvil')}
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                placeholder="Ej. gestion53ym, jefe_restaurante o 54413935"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full border-stone-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-dark-green focus:ring-1 focus:ring-dark-green outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              {t('Contraseña')}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-stone-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-dark-green focus:ring-1 focus:ring-dark-green outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-dark-green hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-md mt-6"
          >
            {t('Ingresar al Sistema')}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col items-center gap-1.5 text-center text-xs text-stone-400">
          <div className="flex items-center gap-1 text-stone-500 font-mono bg-stone-100 px-3 py-1 rounded-full text-[11px]">
            <Smartphone size={13} className="text-gold" />
            <span>{t('ID de este dispositivo:')} <strong className="text-stone-800">{deviceId || 'DVC-00000'}</strong></span>
          </div>
          <p>{t('* Las sesiones de personal caducan automáticamente a las 24 horas.')}</p>
        </div>
      </div>
    </div>
  );
}
