import React, { useState, useEffect } from 'react';
import { AppData, Reservation, DependentConfig, AdminConfig, ManagerConfig } from '../types';
import { 
  Users, 
  DollarSign, 
  CalendarCheck, 
  Check, 
  X, 
  Download, 
  Plus, 
  Settings, 
  FileText, 
  Send, 
  Shield, 
  Key, 
  User, 
  Phone, 
  Trash2, 
  Utensils, 
  ShieldCheck, 
  Tv, 
  Play, 
  Power, 
  RefreshCw, 
  AlertCircle, 
  ChefHat, 
  Database,
  Archive,
  ArrowUpRight,
  Calendar,
  History,
  FlaskConical,
  Smartphone,
  LayoutTemplate,
  MoreVertical,
  Gift,
  Terminal,
  Eye,
  Search
} from 'lucide-react';
import jsPDF from 'jspdf';
import { AdminLandingEditor } from './AdminLandingEditor';
import { AdminMenuEditor } from './AdminMenuEditor';
import { AdminSimulator } from './AdminSimulator';
import { HistoryViewer } from './HistoryViewer';
import { useLanguage } from '../context/LanguageContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface AdminPanelProps {
  data: AppData;
  updateData: (data: Partial<AppData>) => void;
  updateStatus: (id: string, status: Reservation['status']) => void;
  userRole?: string;
}

export function AdminPanel({ data, updateData, updateStatus, userRole }: AdminPanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'reservations' | 'landing' | 'menu' | 'dependents' | 'managers' | 'kitchen' | 'exchange' | 'security' | 'simulator' | 'history'>('reservations');
  const [isLogExpanded, setIsLogExpanded] = useState(true);
  const [reservationFilter, setReservationFilter] = useState<'Todas' | 'Hoy' | 'Canceladas'>('Todas');
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  // Real-time reactive Convex query streaming audit logs
  const liveLogs = useQuery(
    api.bitacora.getLiveLogs,
    (userRole === 'admin' || userRole === 'manager') ? { limit: 50, requesterRole: userRole } : "skip"
  );
  
  // Convex mutations & queries for real-time synchronization
  const upsertUserMutation = useMutation(api.users.upsertUser);
  const upsertKitchenUserMutation = useMutation(api.users.upsertKitchenUser);
  const activeKitchenUser = useQuery(api.users.getActiveKitchenUser);
  const removeUserByUsernameMutation = useMutation(api.users.removeUserByUsername);
  const closeWorkdayAndArchiveMutation = useMutation(api.admin.closeWorkdayAndArchive);
  
  // Exchange Rate state
  const [usdRate, setUsdRate] = useState<number>(data.exchangeRate?.usdCUP || 320);
  const [eurRate, setEurRate] = useState<number>(data.exchangeRate?.eurCUP || 350);
  const [exchangeSavedMessage, setExchangeSavedMessage] = useState('');

  // Kitchen form state
  const [kitchenForm, setKitchenForm] = useState({
    name: '',
    username: 'cocina_53m',
    password: 'cocina53ym',
    phone: '54413935',
    deviceId: 'DVC-KITCHEN-01',
  });

  useEffect(() => {
    if (activeKitchenUser) {
      setKitchenForm({
        name: activeKitchenUser.name || '',
        username: activeKitchenUser.username || 'cocina_53m',
        password: activeKitchenUser.password || 'cocina53ym',
        phone: activeKitchenUser.phone || '54413935',
        deviceId: activeKitchenUser.deviceId || 'DVC-KITCHEN-01',
      });
    }
  }, [activeKitchenUser]);

  useEffect(() => {
    if (data.exchangeRate) {
      if (data.exchangeRate.usdCUP) setUsdRate(data.exchangeRate.usdCUP);
      if (data.exchangeRate.eurCUP) setEurRate(data.exchangeRate.eurCUP);
    }
  }, [data.exchangeRate?.usdCUP, data.exchangeRate?.eurCUP]);

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

  const controlPanelCategories = [
    {
      label: 'OPERACIÓN',
      items: [
        { id: 'reservations', title: 'Reservas', sub: 'Gestión diaria', icon: Calendar },
        { id: 'menu', title: 'Menú', sub: 'Carta y precios', icon: Utensils },
      ]
    },
    {
      label: 'CONTENIDO',
      items: [
        { id: 'landing', title: 'Landing Page', sub: 'Sitio público', icon: LayoutTemplate },
      ]
    },
    {
      label: 'PERSONAL',
      items: [
        { id: 'dependents', title: 'Dependientes', sub: 'Equipo de sala', icon: Users },
        { id: 'managers', title: 'Gerentes de Restaurante', sub: 'Administración', icon: ShieldCheck },
        { id: 'kitchen', title: 'Gestión de Cocina', sub: 'Staff & comandas', icon: ChefHat },
      ]
    },
    {
      label: 'SISTEMA',
      items: [
        { id: 'exchange', title: 'Tasa de Cambio (24h)', sub: '24h actualización', icon: DollarSign },
        { id: 'security', title: 'Cuenta Admin', sub: 'Perfil y seguridad', icon: Shield },
        { id: 'history', title: 'Historial', sub: 'Jornadas pasadas', icon: Database },
        { id: 'simulator', title: 'Simulador Interconectado', sub: 'Pruebas operativas', icon: Tv },
      ]
    }
  ];

  const filteredReservations = reservations.filter(r => {
    if (reservationFilter === 'Canceladas') return r.status === 'cancelled';
    if (reservationFilter === 'Hoy') return r.date === today && r.status !== 'cancelled';
    return true; // 'Todas'
  });

  return (
    <div className="min-h-screen bg-[#F6F2E7] font-[Inter,system-ui,sans-serif] text-[#1A2E26] selection:bg-[#1A3D32] selection:text-white flex flex-col lg:flex-row relative">
      
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 p-4 md:p-8 space-y-8 pt-24 lg:pt-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
          
          {/* Header Title & Global Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A2E26]">Panel Administrativo</h1>
              <p className="text-[#6B7280] mt-1 text-sm md:text-base">Visión general del negocio y configuración</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExportJson} className="flex items-center gap-2 bg-white border border-[#E8E0D0] text-[#1A2E26] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#F9F5EB] transition-all shadow-sm">
                <FileText size={14} /> excelencia.json
              </button>
              <label className="flex items-center gap-2 bg-white border border-[#E8E0D0] text-[#1A2E26] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#F9F5EB] transition-all shadow-sm cursor-pointer">
                <RefreshCw size={14} /> Restaurar
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
                        if (confirm('¿Restaurar base de datos desde este archivo? Se sobrescribirán todos los datos.')) {
                          updateData(json);
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

          {/* 1. OPERATIONAL SESSION CARD */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8E0D0] shadow-[0_2px_20px_rgba(26,46,38,0.04)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 bg-[#B8E6C8] text-[#0F4D2A] text-[10px] font-bold tracking-[0.08em] uppercase rounded-full px-3 py-1">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isShiftActive ? 'bg-[#0F4D2A]' : 'bg-[#C93A3A]'}`} />
                  {isShiftActive ? 'JORNADA OPERATIVA ACTIVA' : 'JORNADA INACTIVA'}
                </span>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">
                  {isShiftActive ? 'Sistema de Atención y Comandas en Marcha' : 'Jornada Detenida por Administrador'}
                </h3>
                <p className="text-sm text-[#6B7280]">
                  {isShiftActive 
                    ? 'Los dependientes y clientes pueden registrar comandas. Al cerrar, se archivará todo el histórico del día para reportes.'
                    : 'El sistema requiere que active la jornada para que los dependientes y clientes puedan operar.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isShiftActive ? (
                  <button 
                    onClick={() => updateData({ isShiftActive: true })}
                    className="w-full md:w-auto bg-[#0F2E26] hover:bg-[#1A3D32] text-white font-bold rounded-full px-8 py-3.5 flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Power size={20} />
                    ABRIR JORNADA
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (!data.downloadsState?.adminAuditLog) {
                        alert('⚠️ ACCIÓN DENEGADA: Debe descargar la bitácora operativa antes de cerrar y archivar la jornada.');
                        return;
                      }
                      if (confirm('⚠️ ADVERTENCIA: ¿Está seguro de cerrar y archivar la jornada actual?')) {
                        closeWorkdayAndArchiveMutation({
                          requesterRole: "admin",
                          username: data.adminConfig?.username || "Administrador",
                        }).then(() => {
                          alert('¡Jornada cerrada y archivada!');
                          updateData({ downloadsState: { adminAuditLog: false, managerZip: false } });
                        });
                      }
                    }}
                    className="w-full md:w-auto bg-[#C93A3A] hover:bg-[#B82E2E] text-white font-bold rounded-full px-8 py-3.5 flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(201,58,58,0.2)]"
                  >
                    <Archive size={20} />
                    CERRAR Y ARCHIVAR JORNADA
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. RESERVAS DEL DÍA */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1A2E26]">Reservas del Día</h2>
                <p className="text-sm text-[#6B7280]">Vista rápida de la operación de hoy</p>
              </div>
              <div className="flex bg-white rounded-full p-1 border border-[#E8E0D0] w-fit shadow-sm">
                {['Todas', 'Hoy', 'Canceladas'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setReservationFilter(filter as any)}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      reservationFilter === filter 
                        ? 'bg-[#0F2E26] text-white shadow-sm' 
                        : 'text-[#6B7280] hover:text-[#1A2E26]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-[#E8E0D0] flex items-center gap-4 shadow-[0_2px_12px_rgba(26,46,38,0.03)]">
                <div className="w-12 h-12 rounded-2xl bg-[#F6F2E7] flex items-center justify-center text-[#1A2E26]">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Reservas Hoy</p>
                  <p className="text-3xl font-bold text-[#1A2E26]">{todayReservations.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-[#E8E0D0] flex items-center gap-4 shadow-[0_2px_12px_rgba(26,46,38,0.03)]">
                <div className="w-12 h-12 rounded-2xl bg-[#F6F2E7] flex items-center justify-center text-[#1A2E26]">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Comensales Hoy</p>
                  <p className="text-3xl font-bold text-[#1A2E26]">{todayGuests}</p>
                </div>
              </div>
            </div>

            {/* Todas las Reservas List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1A2E26] px-1">Todas las Reservas</h3>
              <div className="space-y-3">
                {filteredReservations.length === 0 ? (
                  <div className="bg-white/50 rounded-2xl border border-dashed border-[#E8E0D0] p-12 text-center">
                    <p className="text-[#6B7280] text-sm">No se encontraron reservas con este filtro.</p>
                  </div>
                ) : (
                  filteredReservations.map((res) => (
                    <div key={res.id} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-[#1A3D32] transition-colors shadow-sm group">
                      <div className="flex items-center gap-4 md:w-1/4">
                        <div className="w-10 h-10 rounded-full bg-[#0F2E26] text-white flex items-center justify-center font-bold text-sm">
                          {res.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#1A2E26]">{res.name}</p>
                          <p className="text-[10px] text-[#6B7280] font-mono">{res.date} • {res.time}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 flex-1 gap-4 items-center">
                        <div className="flex items-center gap-2 text-sm text-[#1A2E26]">
                          <Users size={16} className="text-[#6B7280]" />
                          <span className="font-medium">{res.guests} pax</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                          <Gift size={16} />
                          <span className="truncate max-w-[120px]">{res.occasion}</span>
                        </div>
                        <div className="flex justify-start md:justify-center">
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                            res.status === 'confirmed' ? 'bg-[#B8E6C8] text-[#0F4D2A] border-[#B8E6C8]' :
                            res.status === 'cancelled' ? 'bg-[#FDE8E8] text-[#C93A3A] border-[#FDE8E8]' :
                            'bg-[#FEF3D6] text-[#7A5A10] border-[#FEF3D6]'
                          }`}>
                            {res.status === 'confirmed' ? 'Confirmada' : res.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        {res.status === 'pending' && (
                          <button 
                            onClick={() => handleConfirmReservation(res)}
                            className="bg-[#0F2E26] text-white p-2 rounded-full hover:bg-[#1A3D32] transition-colors"
                            title="Confirmar"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {res.status !== 'cancelled' && (
                          <button 
                            onClick={() => updateStatus(res.id, 'cancelled')}
                            className="bg-white border border-[#E8E0D0] text-[#C93A3A] p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <button className="text-[#6B7280] hover:text-[#1A2E26] p-2 rounded-full">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


          {/* 3. CONTROL PANEL */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1A2E26]">Panel de Control</h2>
              <p className="text-sm text-[#6B7280]">Todas tus funciones a un vistazo, sin scroll lateral</p>
            </div>

            <div className="space-y-8">
              {controlPanelCategories.map((cat) => (
                <div key={cat.label} className="space-y-4">
                  <h3 className="text-[10px] font-black tracking-[0.12em] text-[#9A958A] uppercase border-b border-[#E8E0D0] pb-2">{cat.label}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id as any);
                            if (window.innerWidth < 1024) {
                              window.scrollTo({ top: document.getElementById('active-module-content')?.offsetTop || 0, behavior: 'smooth' });
                            }
                          }}
                          className={`flex flex-col h-[130px] p-[18px] rounded-2xl border transition-all relative group text-left ${
                            isActive 
                              ? 'bg-[#F9F5EB] border-[#0F2E26] border-[2px] shadow-sm' 
                              : 'bg-white border-[#E8E0D0] hover:border-[#0F2E26] hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="w-11 h-11 rounded-2xl bg-[#F6F2E7] flex items-center justify-center text-[#1A2E26] mb-auto group-hover:scale-105 transition-transform">
                            <Icon size={22} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-[13px] text-[#1A2E26] line-clamp-1">{item.title}</p>
                            <p className="text-[10px] text-[#6B7280] line-clamp-1">{item.sub}</p>
                          </div>
                          <div className="absolute top-4 right-4">
                            {isActive ? (
                              <div className="w-4 h-4 rounded-full bg-[#0F2E26] flex items-center justify-center">
                                <Check size={10} className="text-white" />
                              </div>
                            ) : (
                              <ArrowUpRight size={14} className="text-[#E8E0D0] group-hover:text-[#0F2E26] transition-colors" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. ACTIVE MODULE CONTENT */}
          {activeTab !== 'reservations' && (
            <div id="active-module-content" className="pt-8 border-t border-[#E8E0D0] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-[#0F2E26] text-white flex items-center justify-center shadow-lg">
                  {(() => {
                    const item = controlPanelCategories.flatMap(c => c.items).find(i => i.id === activeTab);
                    const Icon = item?.icon || Settings;
                    return <Icon size={20} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2E26] capitalize">{activeTab.replace('_', ' ')}</h2>
                  <p className="text-sm text-[#6B7280]">Configuración y gestión del módulo</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#E8E0D0] p-6 md:p-8 shadow-[0_4px_24px_rgba(26,46,38,0.04)] min-h-[400px]">
                {activeTab === 'simulator' && (
                  <AdminSimulator data={data} updateData={updateData} updateStatus={updateStatus} />
                )}

                {activeTab === 'history' && (
                  <HistoryViewer data={data} userRole="admin" />
                )}

                {activeTab === 'landing' && (
                  <AdminLandingEditor config={data.landingConfig} onSave={(newConfig) => updateData({ landingConfig: newConfig })} />
                )}

                {activeTab === 'menu' && (
                  <AdminMenuEditor menuItems={data.menuItems} onSave={(newItems) => updateData({ menuItems: newItems })} />
                )}

                {activeTab === 'exchange' && (
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
                        <DollarSign size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-[#1A2E26]">Tasa de Cambio Diaria</h3>
                        <p className="text-xs text-[#6B7280]">Establece la conversión oficial del día (24h vigencia).</p>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    {(() => {
                      const isRateExpired = !data.exchangeRate || (Date.now() - data.exchangeRate.updatedAt > 24 * 60 * 60 * 1000);
                      return isRateExpired ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 mb-6 flex items-center gap-3">
                          <AlertCircle size={20} className="shrink-0 text-red-600" />
                          <div>
                            <span className="font-bold block text-sm">⚠️ Tasa de cambio vencida</span>
                            Debe configurar la nueva tasa para que los gerentes puedan operar.
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-4 mb-6 flex items-center gap-3">
                          <Check size={20} className="shrink-0 text-emerald-600" />
                          <div>
                            <span className="font-bold block text-sm">🟢 Tasa de cambio vigente</span>
                            Actualización: {new Date(data.exchangeRate!.updatedAt).toLocaleString('es-ES')}
                          </div>
                        </div>
                      );
                    })()}

                    {exchangeSavedMessage && (
                      <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 mb-6 font-bold">
                        {exchangeSavedMessage}
                      </div>
                    )}

                    <form onSubmit={handleSaveExchangeRate} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black tracking-widest uppercase text-[#6B7280] mb-2">1 USD EN CUP</label>
                          <div className="relative">
                            <input 
                              type="number" min="1" step="0.01" required value={usdRate}
                              onChange={e => setUsdRate(Number(e.target.value))}
                              className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl py-3 px-4 text-sm font-bold focus:border-[#0F2E26] outline-none"
                            />
                            <span className="absolute right-4 top-3 text-xs text-[#6B7280] font-bold">CUP</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black tracking-widest uppercase text-[#6B7280] mb-2">1 EUR EN CUP</label>
                          <div className="relative">
                            <input 
                              type="number" min="1" step="0.01" required value={eurRate}
                              onChange={e => setEurRate(Number(e.target.value))}
                              className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl py-3 px-4 text-sm font-bold focus:border-[#0F2E26] outline-none"
                            />
                            <span className="absolute right-4 top-3 text-xs text-[#6B7280] font-bold">CUP</span>
                          </div>
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-[#0F2E26] text-white py-4 rounded-full font-bold text-sm hover:bg-[#1A3D32] transition-all shadow-md flex items-center justify-center gap-2">
                        <Check size={18} /> Guardar y Activar Tasa
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'security' && (
                   <div className="max-w-2xl space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#F6F2E7] text-[#0F2E26] rounded-xl">
                          <Shield size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-[#1A2E26]">Cuenta Administrador</h3>
                          <p className="text-xs text-[#6B7280]">Modifica credenciales y seguridad</p>
                        </div>
                      </div>
                      {adminSavedMessage && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 font-bold">{adminSavedMessage}</div>}
                      <form onSubmit={handleSaveAdminCredentials} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Usuario</label>
                              <input type="text" value={adminCredentials.username} onChange={e => setAdminCredentials(p => ({...p, username: e.target.value}))} className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Teléfono</label>
                              <input type="text" value={adminCredentials.phone} onChange={e => setAdminCredentials(p => ({...p, phone: e.target.value}))} className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Nueva Contraseña</label>
                           <input type="text" value={adminCredentials.password} onChange={e => setAdminCredentials(p => ({...p, password: e.target.value}))} className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none font-mono" />
                        </div>
                        <button type="submit" className="bg-[#0F2E26] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#1A3D32] transition-all">Guardar Credenciales</button>
                      </form>
                   </div>
                )}

                {activeTab === 'dependents' && (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <p className="text-sm text-[#6B7280]">Gestión de personal de sala y mesas asignadas.</p>
                       <button onClick={() => updateData({ dependents: [...data.dependents] })} className="bg-[#0F2E26] text-white px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-2">
                          <Plus size={16} /> Nuevo Dependiente
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.dependents.map(dep => (
                        <div key={dep.id} className="p-4 border border-[#E8E0D0] rounded-2xl flex items-center justify-between group hover:border-[#0F2E26] transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#F6F2E7] flex items-center justify-center font-bold text-[#0F2E26]">{dep.tableNumber}</div>
                              <div>
                                 <p className="font-bold text-sm">{dep.name}</p>
                                 <p className="text-[10px] text-[#6B7280] font-mono">@{dep.username} • {dep.deviceId}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <button onClick={() => handleToggleDependent(dep.id || dep.deviceId, !dep.isActive)} className={`w-8 h-8 rounded-full flex items-center justify-center ${dep.isActive !== false ? 'bg-[#B8E6C8] text-[#0F4D2A]' : 'bg-stone-100 text-[#6B7280]'}`}>
                                 <Power size={14} />
                              </button>
                              <button onClick={() => handleRemoveDependent(dep.id || dep.deviceId)} className="w-8 h-8 rounded-full bg-red-50 text-[#C93A3A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'managers' && (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <p className="text-sm text-[#6B7280]">Gestión de Gerentes de Restaurante.</p>
                       <button onClick={() => updateData({ managers: [...(data.managers || [])] })} className="bg-[#0F2E26] text-white px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-2">
                          <Plus size={16} /> Nuevo Gerente
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(data.managers || []).map(m => (
                        <div key={m.id} className="p-4 border border-[#E8E0D0] rounded-2xl flex items-center justify-between group hover:border-[#0F2E26] transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#F6F2E7] flex items-center justify-center text-[#0F2E26]">
                                 <ShieldCheck size={20} />
                              </div>
                              <div>
                                 <p className="font-bold text-sm">{m.name}</p>
                                 <p className="text-[10px] text-[#6B7280] font-mono">@{m.username}</p>
                              </div>
                           </div>
                           <button onClick={() => handleRemoveManager(m.id)} className="w-8 h-8 rounded-full bg-red-50 text-[#C93A3A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                           </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'kitchen' && (
                  <div className="max-w-2xl space-y-8">
                     <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#F6F2E7] text-[#0F2E26] rounded-xl">
                          <ChefHat size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-[#1A2E26]">Personal de Cocina</h3>
                          <p className="text-xs text-[#6B7280]">Credenciales de acceso para el módulo de cocina</p>
                        </div>
                      </div>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await upsertKitchenUserMutation(kitchenForm);
                          alert('¡Credenciales de cocina actualizadas!');
                        } catch (err) { alert('Error al guardar.'); }
                      }} className="space-y-5">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Nombre</label>
                               <input type="text" value={kitchenForm.name} onChange={e => setKitchenForm(p => ({...p, name: e.target.value}))} className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Usuario</label>
                               <input type="text" value={kitchenForm.username} onChange={e => setKitchenForm(p => ({...p, username: e.target.value}))} className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none" />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Contraseña</label>
                            <input type="text" value={kitchenForm.password} onChange={e => setKitchenForm(p => ({...p, password: e.target.value}))} className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none font-mono" />
                         </div>
                         <button type="submit" className="bg-[#0F2E26] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#1A3D32] transition-all">Guardar Configuración Cocina</button>
                      </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. LIVE OPERATION LOG SIDEBAR (Desktop) */}
      <aside className={`hidden lg:flex flex-col w-[320px] bg-[#0F2E26] border-l border-[#1A3D32] sticky top-0 h-screen overflow-hidden z-30 transition-all duration-300 ${!isLogExpanded ? 'w-0 border-none' : ''}`}>
        <div className="p-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1.5">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                Bitácora en Vivo
                <span className="w-2 h-2 rounded-full bg-[#B8E6C8] animate-pulse shadow-[0_0_8px_#B8E6C8]" />
              </h3>
              <span className="inline-flex items-center bg-white/10 text-[#B8E6C8] text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                {liveLogs?.length || 0} REGISTROS LIVE
              </span>
            </div>
            <button onClick={() => setIsLogExpanded(false)} className="text-white/40 hover:text-white transition-colors">
               <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-5 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {liveLogs?.map((log: any) => (
              <div key={log._id} className="space-y-1.5 border-l-2 border-white/10 pl-4 py-0.5 group hover:border-[#B8E6C8] transition-all">
                <div className="flex items-center gap-2">
                   <span className="font-mono text-[10px] text-white/40 group-hover:text-white/60">{new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                   <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-sm uppercase ${
                      log.userRole === 'admin' ? 'bg-blue-500/20 text-blue-300' :
                      log.userRole === 'dependent' ? 'bg-[#F6F2E7]/20 text-[#F6F2E7]' :
                      'bg-emerald-500/20 text-emerald-300'
                   }`}>
                      {log.userRole?.substring(0, 7) || 'SYSTEM'}
                   </span>
                </div>
                <p className="text-[12px] text-white/80 leading-snug line-clamp-2 group-hover:text-white transition-colors">{log.action}</p>
              </div>
            ))}
            {(!liveLogs || liveLogs.length === 0) && (
              <p className="text-white/20 text-center py-10 text-xs italic">No hay registros recientes...</p>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10">
             <button onClick={handleDownloadAuditLog} className="w-full bg-white/10 hover:bg-white/15 text-white text-[11px] font-black tracking-widest uppercase py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all group">
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" /> 
                Descargar Bitácora
             </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle for Desktop (when collapsed) */}
      {!isLogExpanded && (
        <button 
          onClick={() => setIsLogExpanded(true)}
          className="hidden lg:flex fixed top-24 right-0 z-40 bg-[#0F2E26] text-white p-3 rounded-l-2xl shadow-xl hover:pr-4 transition-all"
        >
          <Terminal size={20} />
        </button>
      )}

      {/* 6. MOBILE LOG DRAWER */}
      <div className="lg:hidden">
        {!isLogDrawerOpen ? (
          <button 
            onClick={() => setIsLogDrawerOpen(true)}
            className="fixed bottom-[84px] right-4 z-40 bg-[#0F2E26] text-white p-4 rounded-full shadow-2xl flex items-center gap-2 animate-bounce"
          >
            <Terminal size={24} />
            <span className="text-xs font-bold">Bitácora</span>
          </button>
        ) : (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-[#0F2E26]/60 backdrop-blur-sm" onClick={() => setIsLogDrawerOpen(false)} />
            <div className="relative bg-[#0F2E26] rounded-t-[32px] max-h-[80vh] flex flex-col border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
              <div className="h-1.5 w-12 bg-white/20 rounded-full mx-auto mt-4 mb-2" />
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-white font-bold text-xl">Bitácora en Vivo</h3>
                   <span className="bg-[#B8E6C8] text-[#0F4D2A] text-[10px] font-bold px-3 py-1 rounded-full uppercase">LIVE</span>
                </div>
                <div className="space-y-5">
                   {liveLogs?.slice(0, 20).map((log: any) => (
                      <div key={log._id} className="flex gap-4 items-start">
                         <span className="font-mono text-[10px] text-white/40 mt-1">{new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                         <div className="flex-1 space-y-1">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              log.userRole === 'admin' ? 'bg-blue-500/20 text-blue-300' :
                              log.userRole === 'dependent' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-emerald-500/20 text-emerald-300'
                            }`}>{log.userRole}</span>
                            <p className="text-white/90 text-sm leading-relaxed">{log.action}</p>
                         </div>
                      </div>
                   ))}
                </div>
                <button onClick={() => setIsLogDrawerOpen(false)} className="w-full bg-white text-[#0F2E26] font-bold py-4 rounded-2xl mt-4 transition-transform active:scale-95">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. FLOATING NATIVE APP BUTTON */}
      <button className="fixed bottom-6 right-6 z-30 bg-[#0F2E26] hover:bg-[#1A3D32] text-white rounded-full pl-3 pr-5 py-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(15,46,38,0.25)] transition-all hover:scale-105 active:scale-95">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Smartphone size={18} />
        </div>
        <span className="text-xs font-bold tracking-wide uppercase">App Nativa S3&M</span>
      </button>

      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

