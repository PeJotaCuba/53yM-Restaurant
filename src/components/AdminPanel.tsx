import React, { useState } from 'react';
import { AppData, Reservation, DependentConfig, AdminConfig, ManagerConfig } from '../types';
import { Users, DollarSign, CalendarCheck, Check, X, Download, Plus, Settings, FileText, Send, Shield, Key, User, Phone, Trash2, Utensils, ShieldCheck, Tv, Play, Power, RefreshCw, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import { AdminLandingEditor } from './AdminLandingEditor';
import { AdminMenuEditor } from './AdminMenuEditor';
import { AdminSimulator } from './AdminSimulator';
import { useLanguage } from '../context/LanguageContext';
import { useSafeMutation } from '../hooks/useSafeConvex';
import { api } from '../../convex/_generated/api';

interface AdminPanelProps {
  data: AppData;
  updateData: (data: Partial<AppData>) => void;
  updateStatus: (id: string, status: Reservation['status']) => void;
}

export function AdminPanel({ data, updateData, updateStatus }: AdminPanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'reservations' | 'landing' | 'menu' | 'dependents' | 'managers' | 'exchange' | 'security' | 'simulator'>('reservations');
  
  // Convex mutations for real-time synchronization
  const upsertUserMutation = useSafeMutation(api.users.upsertUser);
  const removeUserByUsernameMutation = useSafeMutation(api.users.removeUserByUsername);
  const setAdminAuthorizedIdsMutation = useSafeMutation(api.users.setAdminAuthorizedIds);
  const resetWorkdayMutation = useSafeMutation((api as any).admin.resetWorkday);
  
  // Exchange Rate state
  const [usdRate, setUsdRate] = useState<number>(data.exchangeRate?.usdCUP || 320);
  const [eurRate, setEurRate] = useState<number>(data.exchangeRate?.eurCUP || 350);
  const [exchangeSavedMessage, setExchangeSavedMessage] = useState('');

  // State for adding a dependiente
  const [newDep, setNewDep] = useState({
    deviceId: '',
    tableNumber: '',
    name: '',
    phone: '',
    username: '',
    password: ''
  });

  // State for adding a Manager (Jefe de Restaurante)
  const [newManager, setNewManager] = useState({
    name: '',
    username: '',
    password: '',
    phone: '',
    deviceId: ''
  });

  // State for editing admin credentials
  const [adminCredentials, setAdminCredentials] = useState<AdminConfig>(data.adminConfig || {
    username: 'gestion53ym',
    password: 'adminrestaurant.53yM',
    phone: '54413935'
  });
  const [adminSavedMessage, setAdminSavedMessage] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const reservations = data.reservations;
  
  const todayReservations = reservations.filter(r => r.date === today && r.status !== 'cancelled');
  const todayGuests = todayReservations.reduce((sum, r) => sum + r.guests, 0);

  const handleConfirmReservation = (res: Reservation) => {
    updateStatus(res.id, 'confirmed');
    
    // Open WhatsApp to notify the user
    const text = `Hola ${res.name},\n\nNos complace informarte que tu reserva en *53&M* ha sido confirmada.\n\n📅 Fecha: ${res.date}\n⏰ Hora: ${res.time}\n\n¡Te esperamos!`;
    const link = document.createElement('a');
    link.href = `https://wa.me/${res.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'excelencia.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDep.username || !newDep.password || !newDep.tableNumber) {
      alert('Por favor complete al menos Usuario, Contraseña y Mesa Asignada.');
      return;
    }

    const generatedDeviceId = newDep.deviceId.trim() 
      ? newDep.deviceId.trim().toUpperCase() 
      : `DVC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const createdDependent: DependentConfig = {
      id: `DEP-${Date.now()}`,
      deviceId: generatedDeviceId,
      tableNumber: newDep.tableNumber,
      name: newDep.name || `Dependiente ${newDep.tableNumber}`,
      phone: newDep.phone || '',
      username: newDep.username.trim(),
      password: newDep.password.trim(),
      isActive: true
    };

    try {
      await upsertUserMutation({
        username: createdDependent.username,
        name: createdDependent.name,
        role: 'dependent',
        deviceId: createdDependent.deviceId,
        isActive: true,
        password: createdDependent.password,
        phone: createdDependent.phone,
        tableNumber: createdDependent.tableNumber,
      });
    } catch (err) {
      console.error('Error syncing dependent to Convex:', err);
    }

    updateData({ dependents: [...data.dependents, createdDependent] });
    setNewDep({
      deviceId: '',
      tableNumber: '',
      name: '',
      phone: '',
      username: '',
      password: ''
    });
  };

  const handleRemoveDependent = async (idOrDeviceId: string) => {
    const dep = data.dependents.find(d => d.id === idOrDeviceId || d.deviceId === idOrDeviceId);
    if (dep) {
      try {
        await removeUserByUsernameMutation({
          username: dep.username,
          role: 'dependent',
        });
      } catch (err) {
        console.error('Error removing dependent from Convex:', err);
      }
    }
    updateData({
      dependents: data.dependents.filter(d => d.id !== idOrDeviceId && d.deviceId !== idOrDeviceId)
    });
  };

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManager.username || !newManager.password || !newManager.name) {
      alert('Por favor complete Nombre, Nombre de Usuario y Contraseña para el Jefe de Restaurante');
      return;
    }

    const managerObj: ManagerConfig = {
      id: `MGR-${Date.now()}`,
      name: newManager.name,
      username: newManager.username.trim(),
      password: newManager.password.trim(),
      phone: newManager.phone || data.adminConfig?.phone || '54413935',
      deviceId: newManager.deviceId.trim().toUpperCase() || undefined,
      isActive: true
    };

    try {
      await upsertUserMutation({
        username: managerObj.username,
        name: managerObj.name,
        role: 'manager',
        deviceId: managerObj.deviceId || '',
        isActive: true,
        password: managerObj.password,
        phone: managerObj.phone,
      });
    } catch (err) {
      console.error('Error syncing manager to Convex:', err);
    }

    updateData({
      managers: [...(data.managers || []), managerObj]
    });

    setNewManager({
      name: '',
      username: '',
      password: '',
      phone: '',
      deviceId: ''
    });

    alert('¡Cuenta de Jefe de Restaurante creada exitosamente!');
  };

  const handleRemoveManager = async (idOrUsername: string) => {
    if (confirm('¿Desea eliminar este Jefe de Restaurante?')) {
      const mgr = (data.managers || []).find(m => m.id === idOrUsername || m.username === idOrUsername);
      if (mgr) {
        try {
          await removeUserByUsernameMutation({
            username: mgr.username,
            role: 'manager',
          });
        } catch (err) {
          console.error('Error removing manager from Convex:', err);
        }
      }
      updateData({
        managers: (data.managers || []).filter(m => m.id !== idOrUsername && m.username !== idOrUsername)
      });
    }
  };

  const handleToggleDependent = async (idOrDeviceId: string, active: boolean) => {
    const dep = data.dependents.find(d => d.id === idOrDeviceId || d.deviceId === idOrDeviceId);
    if (dep) {
      try {
        await upsertUserMutation({
          username: dep.username,
          name: dep.name,
          role: 'dependent',
          deviceId: dep.deviceId,
          isActive: active,
          password: dep.password || '',
          phone: dep.phone || '',
          tableNumber: dep.tableNumber || '',
        });
      } catch (err) {
        console.error('Error toggling dependent on Convex:', err);
      }
    }
    const updated = data.dependents.map(d => 
      (d.id === idOrDeviceId || d.deviceId === idOrDeviceId) ? { ...d, isActive: active } : d
    );
    updateData({ dependents: updated });
  };

  const handleSaveExchangeRate = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const usd = Number(usdRate);
    const eur = Number(eurRate);

    if (isNaN(usd) || usd <= 0 || isNaN(eur) || eur <= 0) {
      alert('Por favor ingrese tasas de cambio válidas mayores a 0.');
      return;
    }

    updateData({
      exchangeRate: {
        usdCUP: usd,
        eurCUP: eur,
        updatedAt: now
      },
      auditLogs: [
        {
          id: `LOG-${now}`,
          timestamp: now,
          timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date().toLocaleDateString('es-ES'),
          role: 'Administrador',
          userOrDevice: 'admin',
          action: 'Tasa de Cambio Configurada',
          details: `1 USD = ${usd} CUP | 1 EUR = ${eur} CUP (Vigencia 24h).`
        },
        ...(data.auditLogs || [])
      ]
    });

    setExchangeSavedMessage('¡Tasa de cambio guardada correctamente! Vigente por 24 horas.');
    setTimeout(() => setExchangeSavedMessage(''), 4000);
  };

  const handleDownloadAuditLog = () => {
    const doc = new jsPDF();
    
    doc.setFillColor(27, 67, 50);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('RESTAURANTE TERRAZA 53&M', 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Bitácora de Control de Jornada', 14, 26);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 45);

    let y = 60;
    const logs = data.auditLogs || [];
    
    logs.forEach((log) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`[${log.timeStr}] ${log.role} - ${log.action}`, 14, y);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Usuario: ${log.userOrDevice} | Detalles: ${log.details}`, 14, y + 5);
      y += 12;
    });

    const now = new Date();
    doc.save(`Bitacora_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}.pdf`);
    
    updateData({
      downloadsState: { ...(data.downloadsState || { managerZip: false }), adminAuditLog: true }
    });
  };

  const handleSaveAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCredentials.username || !adminCredentials.password || !adminCredentials.phone) {
      alert('Por favor complete todos los campos de credenciales.');
      return;
    }

    updateData({ adminConfig: adminCredentials });
    setAdminSavedMessage('Credenciales de Administrador actualizadas correctamente.');
    setTimeout(() => setAdminSavedMessage(''), 4000);
  };

  const isShiftActive = data.isShiftActive !== false;

  return (
    <div className="pt-28 pb-20 px-4 max-w-7xl mx-auto min-h-screen bg-stone-50">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-serif text-dark-green mb-2">Panel Administrativo</h2>
          <p className="text-stone-500">Visión general del negocio y configuración</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportJson} className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm">
            <Download size={16} /> Exportar excelencia.json
          </button>
          <label className="flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors shadow-sm cursor-pointer border border-stone-200">
            <RefreshCw size={16} /> Restaurar excelencia.json
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const json = JSON.parse(event.target?.result as string);
                    if (confirm('¿Está seguro de que desea restaurar la base de datos desde este archivo? Se sobrescribirán todos los datos actuales.')) {
                      updateData(json);
                      alert('¡Base de datos restaurada con éxito!');
                    }
                  } catch (err) {
                    alert('Error al leer el archivo JSON.');
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </div>

      {/* Control de Jornada Banner */}
      <div className={`p-6 rounded-3xl mb-8 border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isShiftActive ? 'bg-emerald-950 text-white border-emerald-800' : 'bg-red-950 text-white border-red-800'}`}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isShiftActive ? 'bg-emerald-500 text-stone-950' : 'bg-red-500 text-white'}`}>
              {isShiftActive ? '🟢 Jornada Operativa Activa' : '🔴 Jornada Inactiva (Detenida)'}
            </span>
          </div>
          <h3 className="text-2xl font-serif font-bold">
            {isShiftActive ? 'Sistema de Atención y Comandas en Marcha' : 'Jornada Detenida por Administrador'}
          </h3>
          <p className="text-xs md:text-sm text-stone-300 mt-1 max-w-xl">
            {isShiftActive 
              ? 'Los dependientes y clientes pueden registrar comandas y pedidos. Si finaliza la jornada, el sistema no aceptará nuevas comisiones.'
              : 'El sistema requiere que active la jornada para que los dependientes y clientes puedan operar.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadAuditLog}
            className="relative bg-blue-900 hover:bg-blue-800 text-white border border-blue-700 px-4 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
          >
            <Download size={16} /> Descargar Bitácora
            {data.downloadsState?.adminAuditLog && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!data.downloadsState?.adminAuditLog) {
                alert('⚠️ ACCIÓN DENEGADA: Debe descargar la bitácora operativa antes de reiniciar la jornada.');
                return;
              }
              const confirmed = window.confirm('⚠️ ADVERTENCIA CRÍTICA: ¿Está seguro de reiniciar la jornada?\n\nEsto eliminará los datos operativos de la jornada actual (dependientes, gerentes, cocina y comandas antiguas).\n\nSe CONSERVARÁN los comprobantes de pago y recibos de caja.\n\nEsta acción no se puede deshacer.');
              if (confirmed) {
                resetWorkdayMutation({}).then(() => {
                  alert('¡Jornada reiniciada exitosamente!');
                  updateData({
                    downloadsState: { adminAuditLog: false, managerZip: false }
                  });
                }).catch((err: any) => {
                  alert('Error al reiniciar jornada: ' + (err.message || err));
                });
              }
            }}
            className="bg-amber-800 hover:bg-amber-700 text-white border border-amber-600 px-4 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={16} /> Reiniciar jornada
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <button 
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'reservations' ? 'bg-dark-green text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
        >
          <CalendarCheck size={18} /> Reservas
        </button>
        <button 
          onClick={() => setActiveTab('landing')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'landing' ? 'bg-dark-green text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
        >
          <FileText size={18} /> Landing Page
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'menu' ? 'bg-dark-green text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
        >
          <Utensils size={18} /> Menú
        </button>
        <button 
          onClick={() => setActiveTab('dependents')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'dependents' ? 'bg-dark-green text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
        >
          <Users size={18} /> Dependientes
        </button>
        <button 
          onClick={() => setActiveTab('managers')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'managers' ? 'bg-dark-green text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
        >
          <ShieldCheck size={18} /> Gerentes de Restaurante
        </button>
        <button 
          onClick={() => setActiveTab('exchange')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'exchange' ? 'bg-dark-green text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
        >
          <DollarSign size={18} /> Tasa de Cambio (24h)
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'security' ? 'bg-dark-green text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
        >
          <Shield size={18} /> Cuenta Admin
        </button>
        <button 
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${activeTab === 'simulator' ? 'bg-amber-600 text-white ring-2 ring-amber-500 ring-offset-2' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'}`}
        >
          <Tv size={18} /> {t('Simulador Interconectado (Dev)')}
        </button>
      </div>

      {activeTab === 'simulator' && (
        <AdminSimulator data={data} updateData={updateData} updateStatus={updateStatus} />
      )}

      {activeTab === 'landing' && (
        <AdminLandingEditor config={data.landingConfig} onSave={(newConfig) => updateData({ landingConfig: newConfig })} />
      )}

      {activeTab === 'menu' && (
        <AdminMenuEditor menuItems={data.menuItems} onSave={(newItems) => updateData({ menuItems: newItems })} />
      )}

      {activeTab === 'exchange' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 md:p-8 max-w-2xl mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-stone-900">Configuración de Tasa de Cambio Diaria (CUP / USD / EUR)</h3>
              <p className="text-xs text-stone-500">Establece la conversión oficial del día. Tiene una vigencia estricta de 24 horas.</p>
            </div>
          </div>

          {/* Status Indicator */}
          {(() => {
            const isRateExpired = !data.exchangeRate || (Date.now() - data.exchangeRate.updatedAt > 24 * 60 * 60 * 1000);
            return isRateExpired ? (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 mb-6 flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0 text-red-600" />
                <div>
                  <span className="font-bold block text-sm">⚠️ Tasa de cambio vencida o no configurada</span>
                  Ha transcurrido más de 24h desde la última actualización. El Gerente del Restaurante no podrá iniciar la jornada hasta que se configure la nueva tasa de cambio.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-4 mb-6 flex items-center gap-3">
                <Check size={20} className="shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold block text-sm">🟢 Tasa de cambio vigente (Vigencia 24h)</span>
                  Última actualización: {new Date(data.exchangeRate!.updatedAt).toLocaleString('es-ES')}
                </div>
              </div>
            );
          })()}

          {exchangeSavedMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 mb-6 font-bold">
              {exchangeSavedMessage}
            </div>
          )}

          <form onSubmit={handleSaveExchangeRate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  1 USD (Dólar) en CUP ($) *
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={usdRate}
                    onChange={e => setUsdRate(Number(e.target.value))}
                    className="w-full border-stone-200 rounded-xl py-2.5 pl-4 pr-12 text-sm font-mono font-bold focus:border-dark-green outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">CUP</span>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">Ejemplo: 320 CUP</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  1 EUR (Euro) en CUP ($) *
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={eurRate}
                    onChange={e => setEurRate(Number(e.target.value))}
                    className="w-full border-stone-200 rounded-xl py-2.5 pl-4 pr-12 text-sm font-mono font-bold focus:border-dark-green outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">CUP</span>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">Ejemplo: 350 CUP</span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-stone-600 text-xs space-y-1">
              <span className="font-bold text-stone-800 block">Vista previa de conversión de precios:</span>
              <p>• Plato de $2,500 CUP ➔ <strong className="text-dark-green">${(2500 / (usdRate || 1)).toFixed(2)} USD</strong> | <strong className="text-dark-green">€{(2500 / (eurRate || 1)).toFixed(2)} EUR</strong></p>
              <p>• Plato de $4,500 CUP ➔ <strong className="text-dark-green">${(4500 / (usdRate || 1)).toFixed(2)} USD</strong> | <strong className="text-dark-green">€{(4500 / (eurRate || 1)).toFixed(2)} EUR</strong></p>
            </div>

            <button type="submit" className="w-full bg-dark-green text-white py-3.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-md flex items-center justify-center gap-2">
              <Check size={18} /> Guardar y Activar Tasa de Cambio Diaria
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 md:p-8 max-w-2xl mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-dark-green/10 text-dark-green rounded-xl">
              <Key size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-stone-900">Credenciales de Administrador</h3>
              <p className="text-xs text-stone-500">Modifica tus datos de acceso a la cuenta principal</p>
            </div>
          </div>

          {adminSavedMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 mb-6">
              {adminSavedMessage}
            </div>
          )}

          <form onSubmit={handleSaveAdminCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-1">Nombre de Usuario</label>
              <input 
                type="text"
                value={adminCredentials.username}
                onChange={e => setAdminCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="w-full border-stone-200 rounded-xl py-2.5 px-4 text-sm focus:border-dark-green focus:ring-dark-green outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-1">Teléfono Móvil (Soporta Login)</label>
              <input 
                type="text"
                value={adminCredentials.phone}
                onChange={e => setAdminCredentials(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border-stone-200 rounded-xl py-2.5 px-4 text-sm focus:border-dark-green focus:ring-dark-green outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-1">Contraseña</label>
              <input 
                type="text"
                value={adminCredentials.password}
                onChange={e => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border-stone-200 rounded-xl py-2.5 px-4 text-sm focus:border-dark-green focus:ring-dark-green outline-none font-mono"
              />
            </div>

            <button type="submit" className="bg-dark-green text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-sm mt-4">
              Guardar Credenciales
            </button>
          </form>

          <hr className="my-8 border-stone-100" />

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-stone-900">Dispositivos Autorizados de Administrador</h3>
              <p className="text-xs text-stone-500">Puedes autorizar hasta 3 ID de dispositivos totales para abrir tu cuenta de Administrador.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-2">IDs de Dispositivos Autorizados (Máx 3)</label>
              <div className="space-y-2 mb-4">
                {((data.adminConfig as any).authorizedAdminIds || ['DVC-39D3R']).map((id: string, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl py-2 px-4 text-sm font-mono text-stone-700">
                    <span>{id}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const currentIds = (data.adminConfig as any).authorizedAdminIds || ['DVC-39D3R'];
                        if (currentIds.length <= 1) {
                          alert('Debe quedar al menos un dispositivo autorizado.');
                          return;
                        }
                        const updatedIds = currentIds.filter((cid: string) => cid !== id);
                        try {
                          await setAdminAuthorizedIdsMutation({ authorizedAdminIds: updatedIds });
                          alert('Dispositivo eliminado exitosamente.');
                        } catch (err) {
                          console.error('Error removing admin device ID:', err);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 font-bold text-xs"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              {((data.adminConfig as any).authorizedAdminIds || ['DVC-39D3R']).length < 3 && (
                <div className="flex gap-4 items-center">
                  <input
                    type="text"
                    id="new-admin-id"
                    placeholder="Ej. DVC-39D3R"
                    className="w-full border border-stone-200 rounded-xl py-2.5 px-4 text-sm font-mono text-stone-700 outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const input = document.getElementById('new-admin-id') as HTMLInputElement;
                      const val = input ? input.value.trim().toUpperCase() : '';
                      if (!val) {
                        alert('Por favor ingrese un ID de dispositivo válido.');
                        return;
                      }
                      if (!val.startsWith('DVC-')) {
                        alert('El ID debe comenzar con "DVC-"');
                        return;
                      }
                      const currentIds = (data.adminConfig as any).authorizedAdminIds || ['DVC-39D3R'];
                      if (currentIds.includes(val)) {
                        alert('Este dispositivo ya está autorizado.');
                        return;
                      }
                      if (currentIds.length >= 3) {
                        alert('Solo puedes autorizar hasta 3 dispositivos en total.');
                        return;
                      }
                      const updatedIds = [...currentIds, val];
                      try {
                        await setAdminAuthorizedIdsMutation({ authorizedAdminIds: updatedIds });
                        if (input) input.value = '';
                        alert('Dispositivo autorizado exitosamente.');
                      } catch (err) {
                        console.error('Error adding admin device ID:', err);
                      }
                    }}
                    className="whitespace-nowrap bg-stone-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-sm"
                  >
                    Autorizar ID
                  </button>
                </div>
              )}
            </div>

            <hr className="my-6 border-stone-100" />

            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ID de este dispositivo actual</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="text"
                  readOnly
                  value={localStorage.getItem('deviceId') || ''}
                  className="w-full border-stone-200 bg-stone-50 rounded-xl py-2.5 px-4 text-sm font-mono text-stone-600 outline-none"
                />
                <button 
                  type="button"
                  onClick={() => {
                    const newId = prompt('Ingrese el ID de administrador para restaurar en este dispositivo (ej: DVC-39D3R):');
                    if (newId && newId.trim()) {
                      localStorage.setItem('deviceId', newId.trim().toUpperCase());
                      window.location.reload();
                    }
                  }}
                  className="whitespace-nowrap bg-stone-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-sm"
                >
                  Restaurar ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dependents' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 md:p-8 mb-12">
          <h3 className="font-serif text-xl text-stone-900 mb-2">Crear y Gestionar Dependientes</h3>
          <p className="text-xs text-stone-500 mb-6">
            El Administrador asigna ID de dispositivo, mesa, usuario, teléfono y contraseña para cada dependiente. La sesión del dependiente expira automáticamente a las 24 horas.
          </p>

          {/* Form Create Dependent */}
          <form onSubmit={handleAddDependent} className="bg-stone-50 p-6 rounded-2xl border border-stone-200/60 mb-8 space-y-4">
            <h4 className="font-bold text-sm text-stone-800">Registrar Nuevo Dependiente</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ID Dispositivo (Opcional, Ej: DVC-DEP01)</label>
                <input 
                  type="text" 
                  placeholder="Ej. DVC-MESA1" 
                  value={newDep.deviceId}
                  onChange={e => setNewDep(prev => ({ ...prev, deviceId: e.target.value.toUpperCase() }))}
                  className="w-full border-stone-200 rounded-xl text-sm uppercase px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Mesa Asignada *</label>
                <input 
                  type="text" 
                  placeholder="Ej. Mesa 1" 
                  value={newDep.tableNumber}
                  onChange={e => setNewDep(prev => ({ ...prev, tableNumber: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  placeholder="Ej. Carlos Martínez" 
                  value={newDep.name}
                  onChange={e => setNewDep(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Teléfono Móvil</label>
                <input 
                  type="text" 
                  placeholder="Ej. 53512345" 
                  value={newDep.phone}
                  onChange={e => setNewDep(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Usuario de Acceso *</label>
                <input 
                  type="text" 
                  placeholder="Ej. dep_mesa1" 
                  value={newDep.username}
                  onChange={e => setNewDep(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Contraseña *</label>
                <input 
                  type="text" 
                  placeholder="Ej. pass123" 
                  value={newDep.password}
                  onChange={e => setNewDep(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2 font-mono"
                  required
                />
              </div>
            </div>

            <button type="submit" className="bg-dark-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors flex items-center gap-2">
              <Plus size={16} /> Agregar Dependiente
            </button>
          </form>

          {/* List Dependents */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-stone-800 mb-2">Dependientes Registrados ({data.dependents.length})</h4>
            {data.dependents.map(dep => (
              <div key={dep.id || dep.deviceId} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-stone-200 rounded-xl bg-white gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">{dep.deviceId}</span>
                    <span className="font-bold text-sm text-dark-green">{dep.tableNumber}</span>
                    {dep.name && <span className="text-sm font-medium text-stone-700">— {dep.name}</span>}
                  </div>
                  <div className="text-xs text-stone-500 flex flex-wrap gap-4 font-mono">
                    <span>Usuario: <strong>{dep.username || 'N/A'}</strong></span>
                    <span>Clave: <strong>{dep.password || 'N/A'}</strong></span>
                    {dep.phone && <span>Móvil: <strong>{dep.phone}</strong></span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleDependent(dep.id || dep.deviceId, !dep.isActive)} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${dep.isActive !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'}`}
                  >
                    {dep.isActive !== false ? 'Activo (Desactivar)' : 'Inactivo (Activar)'}
                  </button>
                  <button 
                    onClick={() => handleRemoveDependent(dep.id || dep.deviceId)} 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
            {data.dependents.length === 0 && (
              <p className="text-stone-500 text-sm text-center py-6 border border-dashed border-stone-200 rounded-xl">No hay dependientes registrados actualmente.</p>
            )}
          </div>
        </div>
      )}

      {/* MANAGERS TAB */}
      {activeTab === 'managers' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-100 shadow-sm space-y-8">
          <div>
            <h3 className="font-serif text-xl text-stone-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="text-dark-green" size={20} /> Gestión de Gerentes de Restaurante
            </h3>
            <p className="text-xs text-stone-500">
              Crea cuentas de Gerente de Restaurante. Ellos recibirán los informes de comandas enviadas por los dependientes, realizarán comparativas con Cocina y ejecutarán el Cierre de Caja.
            </p>
          </div>

          <form onSubmit={handleAddManager} className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4">
            <h4 className="font-bold text-sm text-stone-800">Agregar Nuevo Gerente de Restaurante</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  placeholder="Ej. Roberto Fernández" 
                  value={newManager.name}
                  onChange={e => setNewManager(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Teléfono Móvil (WhatsApp)</label>
                <input 
                  type="text" 
                  placeholder="Ej. 53512345" 
                  value={newManager.phone}
                  onChange={e => setNewManager(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Usuario de Acceso *</label>
                <input 
                  type="text" 
                  placeholder="Ej. gerente_restaurante" 
                  value={newManager.username}
                  onChange={e => setNewManager(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Contraseña *</label>
                <input 
                  type="text" 
                  placeholder="Ej. gerente53ym" 
                  value={newManager.password}
                  onChange={e => setNewManager(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2 font-mono"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  ID de Dispositivo Autorizado (Opcional - Restringe el acceso a este dispositivo)
                </label>
                <input 
                  type="text" 
                  placeholder="Ej. DVC-U30C5 o dejar en blanco" 
                  value={newManager.deviceId}
                  onChange={e => setNewManager(prev => ({ ...prev, deviceId: e.target.value }))}
                  className="w-full border-stone-200 rounded-xl text-sm px-3 py-2 font-mono uppercase"
                />
              </div>
            </div>

            <button type="submit" className="bg-dark-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors flex items-center gap-2">
              <Plus size={16} /> Crear Gerente de Restaurante
            </button>
          </form>

          {/* List Managers */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-stone-800 mb-2">
              Gerentes de Restaurante Creados ({(data.managers || []).length})
            </h4>
            {(data.managers || []).map(mgr => (
              <div key={mgr.id || mgr.username} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-stone-200 rounded-xl bg-white gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-dark-green">{mgr.name}</span>
                    <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Gerente</span>
                    {mgr.deviceId && (
                      <span className="text-[11px] bg-stone-100 text-stone-700 font-mono font-bold px-2 py-0.5 rounded-md border border-stone-200">
                        ID: {mgr.deviceId}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 flex flex-wrap gap-4 font-mono">
                    <span>Usuario: <strong>{mgr.username}</strong></span>
                    <span>Contraseña: <strong>{mgr.password}</strong></span>
                    {mgr.phone && <span>Teléfono: <strong>{mgr.phone}</strong></span>}
                    {mgr.deviceId && <span>Dispositivo: <strong>{mgr.deviceId}</strong></span>}
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveManager(mgr.id || mgr.username)} 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            ))}
            {(!data.managers || data.managers.length === 0) && (
              <p className="text-stone-500 text-sm text-center py-6 border border-dashed border-stone-200 rounded-xl">
                No hay Jefes de Restaurante registrados. Agrega uno arriba para recibir informes de los dependientes.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm flex items-center">
          <div className="bg-dark-green/10 p-4 rounded-xl mr-4 text-dark-green"><CalendarCheck size={24} /></div>
          <div>
            <div className="text-sm text-stone-500 font-medium">Reservas Hoy</div>
            <div className="text-2xl font-serif text-stone-900">{todayReservations.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm flex items-center">
          <div className="bg-gold/20 p-4 rounded-xl mr-4 text-gold"><Users size={24} /></div>
          <div>
            <div className="text-sm text-stone-500 font-medium">Comensales Hoy</div>
            <div className="text-2xl font-serif text-stone-900">{todayGuests}</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-serif text-xl text-stone-900">Todas las Reservas</h3>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Detalles</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {reservations.sort((a,b) => b.createdAt - a.createdAt).map((res, idx) => (
                <tr key={res.id || `res-${idx}`} className="hover:bg-stone-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-stone-900">{res.date}</div>
                    <div className="text-sm text-stone-500">{res.time}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-stone-900">{res.name}</div>
                    <div className="text-sm text-stone-500">{res.phone}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-stone-900">{res.guests} pax</div>
                    <div className="text-xs text-stone-500">{res.occasion}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      res.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      (res.status === 'paid' || res.status === 'confirmed') ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {(res.status === 'paid' || res.status === 'confirmed') ? 'Confirmada' : res.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {res.status === 'pending' && (
                      <button onClick={() => handleConfirmReservation(res)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Confirmar Reserva y Notificar">
                        <Send size={18} />
                      </button>
                    )}
                    {res.status !== 'cancelled' && (
                      <button onClick={() => updateStatus(res.id, 'cancelled')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar">
                        <X size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {reservations.sort((a,b) => b.createdAt - a.createdAt).map((res, idx) => (
            <div key={res.id || `res-mob-${idx}`} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-medium text-stone-900 text-lg">{res.date} a las {res.time}</div>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                  res.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  (res.status === 'paid' || res.status === 'confirmed') ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {(res.status === 'paid' || res.status === 'confirmed') ? 'Confirmada' : res.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                </span>
              </div>
              <div className="mb-4 text-sm text-stone-600">
                <span className="font-medium text-stone-900">{res.name}</span> • {res.guests} pax • {res.occasion}
              </div>
              <div className="flex gap-2">
                {res.status === 'pending' && (
                  <button onClick={() => handleConfirmReservation(res)} className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center">
                    <Send size={16} className="mr-1" /> Confirmar
                  </button>
                )}
                {res.status !== 'cancelled' && (
                  <button onClick={() => updateStatus(res.id, 'cancelled')} className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-red-50">
                    <X size={16} className="mr-1" /> Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

