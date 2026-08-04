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
  AlertTriangle,
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
  const [reservationFilter, setReservationFilter] = useState<'Pendientes' | 'Confirmadas' | 'Canceladas' | 'Consolidadas'>('Pendientes');
  const [resToCancel, setResToCancel] = useState<Reservation | null>(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [showModuleOverlay, setShowModuleOverlay] = useState(false);
  const [overlayTab, setOverlayTab] = useState<typeof activeTab | null>(null);

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
  const createSnapshotMutation = useMutation(api.admin.createSnapshot);
  const deleteReservationMutation = useMutation(api.reservations.deleteReservation);
  const addLogMutation = useMutation(api.bitacora.addLog);
  const restoreDatabaseMutation = useMutation(api.admin.restoreDatabase);
  const initializeDatabaseMutation = useMutation(api.admin.initializeDatabase);
  
  // Initialization modal state
  const [showInitModal, setShowInitModal] = useState(false);
  const [initConfirmChecked, setInitConfirmChecked] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormType, setUserFormType] = useState<'dependent' | 'manager' | 'kitchen'>('dependent');
  const [userForm, setUserForm] = useState({
    username: '',
    name: '',
    password: '',
    phone: '',
    deviceId: '',
    tableNumber: '',
    isActive: true
  });

  // Admin IDs state
  const [adminDeviceIds, setAdminDeviceIds] = useState<string[]>(
    Array.isArray((data.adminConfig as any)?.deviceIds) 
      ? (data.adminConfig as any).deviceIds 
      : (data.adminConfig?.username ? [data.adminConfig.username] : [])
  );
  const [newAdminId, setNewAdminId] = useState('');

  // Reservation Menu state
  const [resMenuId, setResMenuId] = useState<string | null>(null);
  
  // Exchange Rate state
  const [usdRate, setUsdRate] = useState<number>(data.exchangeRate?.usdCUP || 320);
  const [eurRate, setEurRate] = useState<number>(data.exchangeRate?.eurCUP || 350);
  const [exchangeSavedMessage, setExchangeSavedMessage] = useState('');

  // Close Workday Modal state
  const [showCloseWorkdayModal, setShowCloseWorkdayModal] = useState(false);
  const [closeWorkdayPhase, setCloseWorkdayPhase] = useState<1 | 2 | 3>(1);
  const [bitacoraDownloaded, setBitacoraDownloaded] = useState(false);
  const [excelenciaDownloaded, setExcelenciaDownloaded] = useState(false);
  const [managerConfirmationChecked, setManagerConfirmationChecked] = useState(false);

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
  
  const todayReservations = reservations
    .filter(r => r.date === today && r.status !== 'cancelled')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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

  const handleExportJson = async () => {
    try {
      // 1. Persist to Convex (Server-side snapshot)
      await createSnapshotMutation({
        data: data as any,
        createdBy: data.adminConfig?.username || 'Administrador',
        label: `Respaldo Excelencia ${new Date().toLocaleString('es-ES')}`
      });

      // 2. Local Download
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excelencia_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert('¡Respaldo Excelencia completado y persistido correctamente!');
    } catch (err) {
      console.error('Error during Excellence backup:', err);
      alert('Error al realizar el respaldo en el servidor, pero el archivo local podría haberse generado.');
    }
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDep.username || !newDep.password || !newDep.tableNumber) {
      alert('Por favor complete al menos Usuario, Contraseña y Mesa Asignada.');
      return;
    }

    const generatedDeviceId = newDep.deviceId.trim() 
      ? (newDep.deviceId.trim().toUpperCase().startsWith('DVC-') ? newDep.deviceId.trim().toUpperCase() : `DVC-${newDep.deviceId.trim().toUpperCase()}`)
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
      deviceId: newManager.deviceId.trim() 
        ? (newManager.deviceId.trim().toUpperCase().startsWith('DVC-') ? newManager.deviceId.trim().toUpperCase() : `DVC-${newManager.deviceId.trim().toUpperCase()}`)
        : undefined,
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

  const handleToggleUser = async (user: any, role: string, active: boolean) => {
    try {
      await upsertUserMutation({
        username: user.username,
        name: user.name,
        role: role as any,
        deviceId: user.deviceId,
        isActive: active,
        password: user.password || '',
        phone: user.phone || '',
        tableNumber: user.tableNumber || '',
      });
    } catch (err) {
      console.error('Error toggling user on Convex:', err);
    }
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

  const startCloseWorkday = () => {
    if (!data.isShiftActive) {
      alert('La jornada ya está inactiva.');
      return;
    }
    setCloseWorkdayPhase(1);
    setBitacoraDownloaded(false);
    setExcelenciaDownloaded(false);
    setManagerConfirmationChecked(false);
    setShowCloseWorkdayModal(true);
  };

  const handleContinuePhase1 = async () => {
    if (!data.gerenteCierreCompleto) {
      setManagerConfirmationChecked(true);
      try {
        await addLogMutation({
          action: 'CIERRE DE JORNADA INICIADO: Administrador decidió continuar sin confirmación del Gerente de Restaurante.',
          userRole: 'admin',
          username: data.adminConfig?.username || 'Administrador',
        });
      } catch (err) {
        console.warn('Convex addLog error:', err);
      }
    } else {
      setManagerConfirmationChecked(true);
    }
    setCloseWorkdayPhase(2);
  };

  const finalizeCloseWorkday = async () => {
    if (!bitacoraDownloaded || !excelenciaDownloaded) {
      alert('Debe descargar ambos archivos (Bitácora y Excelencia.json) antes de finalizar el cierre.');
      return;
    }

    // Build complete history snapshot for safe archiving (Bitácora Protection)
    const now = Date.now();
    const dateObj = new Date(now);
    const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
    const jornadaId = `JORNADA-${now}`;

    const historyRecord = {
      jornadaId,
      dateStr,
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1,
      day: dateObj.getDate(),
      orders: [...(data.orders || [])],
      comandas: [...(data.comandas || [])],
      reservations: [...(data.reservations || [])], // Snapshot saved in history
      orderReports: [...(data.orderReports || [])],
      kitchenReports: [...(data.kitchenReports || [])],
      cashRegisterCloses: [...(data.cashRegisterCloses || [])],
      bitacora: [...(data.auditLogs || [])],
      timestamp: now,
    };

    try {
      await closeWorkdayAndArchiveMutation({
        requesterRole: 'admin',
        username: data.adminConfig?.username || 'Administrador',
      });
    } catch (err) {
      console.warn('Convex mutation notice (local state fallback applied):', err);
    }

    // Update local state: move data to history, reset active operational logs, but PRESERVE RESERVATIONS!
    const updatedHistory = [historyRecord, ...(data.history || [])];
    updateData({
      orders: [],
      comandas: [],
      orderReports: [],
      kitchenReports: [],
      cashRegisterCloses: [],
      gerenteCierreCompleto: false,
      isShiftActive: false,
      downloadsState: { adminAuditLog: false, managerZip: false },
      history: updatedHistory,
      // RESERVATIONS REMAIN VISIBLE
      reservations: data.reservations || [],
      auditLogs: [
        {
          id: `LOG-${Date.now()}`,
          timestamp: Date.now(),
          timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date().toLocaleDateString('es-ES'),
          role: 'Administrador' as const,
          userOrDevice: data.adminConfig?.username || 'Administrador',
          action: 'Cierre y Archivo de Jornada',
          details: `Jornada archivada exitosamente por el Administrador. ${data.gerenteCierreCompleto ? 'Cierre de gerencia verificado.' : 'Realizado bajo responsabilidad administrativa sin cierre previo de gerencia.'}`
        }
      ]
    });

    setShowCloseWorkdayModal(false);
    alert('✅ ¡Jornada cerrada y archivada exitosamente! Los datos han sido respaldados en el Historial.');
  };

  const handleOpenInitModal = () => {
    if (data.isShiftActive) {
      alert('❌ OPERACIÓN BLOQUEADA: No es posible realizar la inicialización mientras exista una jornada activa. Primero debe cerrar y archivar la jornada.');
      return;
    }
    setInitConfirmChecked(false);
    setShowInitModal(true);
  };

  const handleExecuteInitialization = async () => {
    if (data.isShiftActive) {
      alert('❌ OPERACIÓN BLOQUEADA: No es posible realizar la inicialización mientras exista una jornada activa. Primero debe cerrar y archivar la jornada.');
      setShowInitModal(false);
      return;
    }

    if (!initConfirmChecked) {
      alert('Debe marcar la casilla de confirmación para proceder con la inicialización.');
      return;
    }

    setIsInitializing(true);

    try {
      await initializeDatabaseMutation({
        requesterRole: 'admin',
        username: data.adminConfig?.username || 'Administrador',
      });

      // Clear local storage cache and reset local app data state
      localStorage.removeItem('appData');
      updateData({
        orders: [],
        comandas: [],
        reservations: [],
        orderReports: [],
        kitchenReports: [],
        cashRegisterCloses: [],
        history: [],
        auditLogs: [],
        dependents: [],
        managers: [],
        gerenteCierreCompleto: false,
        isShiftActive: false,
      });

      setShowInitModal(false);
      alert('✅ INICIALIZACIÓN COMPLETADA.\n\nEl sistema ha sido preparado para comenzar desde cero.\nLa jornada permanece cerrada.\nLos datos históricos y operativos anteriores fueron eliminados de la base de datos.');
    } catch (err: any) {
      console.error('Error durante la inicialización:', err);
      alert(`❌ Error al inicializar la base de datos: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCredentials.username || !adminCredentials.password || !adminCredentials.phone) {
      alert('Por favor complete todos los campos de credenciales.');
      return;
    }

    updateData({ 
      adminConfig: { 
        ...adminCredentials, 
        deviceIds: adminDeviceIds 
      } as any 
    });
    setAdminSavedMessage('Credenciales y IDs de Administrador actualizadas correctamente.');
    setTimeout(() => setAdminSavedMessage(''), 4000);
  };

  const handleAddAdminId = () => {
    if (!newAdminId.trim() || newAdminId === 'DVC-') return;
    const cleanId = newAdminId.trim().toUpperCase().startsWith('DVC-') 
      ? newAdminId.trim().toUpperCase() 
      : `DVC-${newAdminId.trim().toUpperCase()}`;
      
    if (adminDeviceIds.length >= 3) {
      alert('Máximo de 3 IDs de Administrador permitido.');
      return;
    }
    if (adminDeviceIds.includes(cleanId)) {
      alert('Este ID ya está registrado.');
      return;
    }
    
    const updatedIds = [...adminDeviceIds, cleanId];
    setAdminDeviceIds(updatedIds);
    setNewAdminId('');
    
    // Auto-save to Convex
    updateData({ 
      adminConfig: { 
        ...data.adminConfig,
        username: data.adminConfig?.username || 'gestion53ym',
        password: data.adminConfig?.password || 'adminrestaurant.53yM',
        phone: data.adminConfig?.phone || '54413935',
        deviceIds: updatedIds 
      } as any 
    });
  };

  const handleRemoveAdminId = (id: string) => {
    if (adminDeviceIds.length <= 1) {
      alert('Debe haber al menos un ID de Administrador.');
      return;
    }
    const updatedIds = adminDeviceIds.filter(i => i !== id);
    setAdminDeviceIds(updatedIds);
    
    // Auto-save to Convex
    updateData({ 
      adminConfig: { 
        ...data.adminConfig,
        username: data.adminConfig?.username || 'gestion53ym',
        password: data.adminConfig?.password || 'adminrestaurant.53yM',
        phone: data.adminConfig?.phone || '54413935',
        deviceIds: updatedIds 
      } as any 
    });
  };

  const openUserModal = (type: 'dependent' | 'manager' | 'kitchen', user?: any) => {
    setUserFormType(type);
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username || '',
        name: user.name || '',
        password: user.password || '',
        phone: user.phone || '',
        deviceId: user.deviceId || '',
        tableNumber: user.tableNumber || '',
        isActive: user.isActive !== false
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        name: '',
        password: '',
        phone: '',
        deviceId: '',
        tableNumber: '',
        isActive: true
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password || !userForm.name || !userForm.deviceId) {
      alert('Por favor complete todos los campos requeridos, incluyendo el ID.');
      return;
    }

    try {
      let finalDeviceId = userForm.deviceId.trim().toUpperCase();
      if (finalDeviceId && !finalDeviceId.startsWith('DVC-')) {
        finalDeviceId = `DVC-${finalDeviceId}`;
      }

      if (userFormType === 'kitchen') {
        await upsertKitchenUserMutation({
          username: userForm.username,
          name: userForm.name,
          password: userForm.password,
          phone: userForm.phone,
          deviceId: finalDeviceId,
          isActive: userForm.isActive
        });
      } else {
        await upsertUserMutation({
          username: userForm.username,
          name: userForm.name,
          role: userFormType,
          deviceId: finalDeviceId,
          isActive: userForm.isActive,
          password: userForm.password,
          phone: userForm.phone,
          tableNumber: userFormType === 'dependent' ? userForm.tableNumber : undefined
        });
      }

      // Update local data for immediate feedback if needed, 
      // but Convex will likely trigger a re-render via App.tsx
      setShowUserModal(false);
      alert('Usuario guardado correctamente.');
    } catch (err: any) {
      alert(err.message || 'Error al guardar el usuario.');
    }
  };

  const handleDeleteUser = async (username: string, role: string) => {
    if (!confirm(`¿Está seguro de eliminar permanentemente al usuario ${username}?`)) return;
    try {
      await removeUserByUsernameMutation({ username, role: role as any });
      alert('Usuario eliminado.');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el usuario.');
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm('¿Desea eliminar permanentemente esta reservación cancelada?')) return;
    try {
      await deleteReservationMutation({
        id: id as any,
        username: data.adminConfig?.username || 'admin',
        userRole: 'admin'
      });
      setResMenuId(null);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la reservación.');
    }
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

  const filteredReservations = reservations
    .filter(r => {
      if (reservationFilter === 'Canceladas') return r.status === 'cancelled';
      if (reservationFilter === 'Confirmadas') return r.status === 'confirmed';
      if (reservationFilter === 'Consolidadas') return r.status === 'consolidated';
      return r.status === 'pending' || r.status === 'cancellation_pending';
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="min-h-screen bg-[#F6F2E7] font-[Inter,system-ui,sans-serif] text-[#1A2E26] selection:bg-[#1A3D32] selection:text-white flex flex-col lg:flex-row relative">
      
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 p-4 md:p-8 space-y-8 pt-24 lg:pt-32 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
          
          {/* Header Title & Global Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A2E26]">Panel Administrativo</h1>
              <p className="text-[#6B7280] mt-1 text-sm md:text-base">Visión general del negocio y configuración</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportJson} 
                className="flex items-center gap-2 bg-[#0F2E26] text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-[#1A3D32] transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95"
                title="Realizar copia de seguridad completa y persistir en el servidor"
              >
                <Database size={14} /> Excelencia
              </button>
              <label className="flex items-center gap-2 bg-white border border-[#E8E0D0] text-[#1A2E26] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#F9F5EB] transition-all shadow-sm cursor-pointer">
                <RefreshCw size={14} /> Restaurar
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    if (data.isShiftActive) {
                      alert('❌ ERROR: No se puede restaurar una copia de seguridad mientras la jornada esté activa. Por favor, cierre la jornada primero para evitar sobrescribir datos operativos en curso.');
                      e.target.value = '';
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const json = JSON.parse(event.target?.result as string);
                        
                        if (!json.history && !json.reservations) {
                           alert('El archivo JSON no parece ser un respaldo válido de Excelencia. Falta información histórica.');
                           return;
                        }

                        if (confirm('⚠️ ATENCIÓN: ¿Restaurar base de datos desde este archivo?\n\nEsta acción reconstruirá el historial de jornadas y reservas pasadas desde el respaldo.')) {
                          try {
                            await restoreDatabaseMutation({
                               history: json.history || [],
                               reservations: json.reservations || [],
                               requesterRole: 'admin',
                               username: data.adminConfig?.username || 'Administrador',
                            });
                            alert('✅ Respaldo restaurado con éxito. El historial y las reservas han sido recuperadas.');
                            // The real-time Convex subscriptions will automatically update the UI
                          } catch (err: any) {
                             alert(`Error al restaurar en base de datos: ${err.message || 'Error desconocido'}`);
                          }
                        }
                      } catch (err) {
                        alert('Error al leer el archivo JSON.');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <button 
                onClick={handleOpenInitModal} 
                className="flex items-center gap-2 bg-[#8B1E1E] text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-[#721818] transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                title="Inicialización total del sistema (Restringido a Administrador cuando la jornada esté cerrada)"
              >
                <Trash2 size={14} /> Inicialización
              </button>
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
                    onClick={startCloseWorkday}
                    className="w-full md:w-auto bg-[#C93A3A] hover:bg-[#B82E2E] text-white font-bold rounded-full px-8 py-3.5 flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(201,58,58,0.2)] cursor-pointer"
                  >
                    <Archive size={20} />
                    CERRAR Y ARCHIVAR JORNADA
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. RESERVAS DEL DÍA */}
          <div id="reservations-section" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1A2E26]">Reservas</h2>
                <p className="text-sm text-[#6B7280]">Gestión de solicitudes y confirmaciones</p>
              </div>
              <div className="flex bg-white rounded-full p-1 border border-[#E8E0D0] w-fit shadow-sm overflow-x-auto max-w-full">
                {['Pendientes', 'Confirmadas', 'Consolidadas', 'Canceladas'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setReservationFilter(filter as any)}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold text-[#1A2E26]">Reservas de Hoy</h3>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
                       <Calendar size={14} /> {todayReservations.length} reservas
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
                       <Users size={14} /> {todayGuests} comensales
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {todayReservations.length === 0 ? (
                  <div className="bg-white/50 rounded-2xl border border-dashed border-[#E8E0D0] p-8 text-center">
                    <p className="text-[#6B7280] text-sm">No hay reservas programadas para hoy.</p>
                  </div>
                ) : (
                  todayReservations.map(res => (
                    <div key={res.id} className="bg-white rounded-2xl p-5 border border-[#E8E0D0] shadow-sm space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#0F2E26] text-white flex items-center justify-center text-xl font-bold">
                            {res.time}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#1A2E26]">{res.name}</h4>
                            <p className="text-xs text-[#6B7280]">{res.guests} personas • {res.occasion}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {res.dishes && res.dishes.length > 0 && (
                            <button 
                              onClick={() => setResMenuId(resMenuId === res.id ? null : res.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-[#F6F2E7] text-[#1A2E26] rounded-xl text-xs font-bold hover:bg-[#E8E0D0] transition-colors"
                            >
                              <Utensils size={14} /> Ver Pre-Pedido
                            </button>
                          )}
                          {res.status === 'cancellation_pending' && (
                            <button 
                              onClick={() => setResToCancel(res)}
                              className="bg-[#C93A3A] text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#B82E2E] transition-colors flex items-center gap-1.5 shadow-sm"
                              title="Confirmar cancelación"
                            >
                              <Check size={14} /> Confirmar cancelación
                            </button>
                          )}
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            res.status === 'confirmed' ? 'bg-[#B8E6C8] text-[#0F4D2A]' : 
                            res.status === 'consolidated' ? 'bg-[#0F4D2A] text-white' : 
                            res.status === 'cancellation_pending' ? 'bg-[#FDE8E8] text-[#C93A3A]' : 
                            'bg-[#FEF3D6] text-[#7A5A10]'
                          }`}>
                            {res.status === 'confirmed' ? 'Confirmada' : res.status === 'consolidated' ? 'Consolidada' : res.status === 'cancellation_pending' ? 'Cancelación Pendiente' : 'Pendiente'}
                          </div>
                        </div>
                      </div>

                      {resMenuId === res.id && res.dishes && (
                        <div className="bg-[#F9F5EB] rounded-xl p-4 border border-[#E8E0D0] animate-in slide-in-from-top-2 duration-200">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-[#9A958A] mb-3">Pre-Pedido del Cliente</h5>
                          <div className="space-y-2">
                            {res.dishes.map((dish, i) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-[#1A2E26]">{dish.name}</span>
                                <span className="text-[#6B7280]">x{dish.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lista de Reservas por Filtro */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-[#1A2E26] px-1">Listado de {reservationFilter}</h3>
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
                            res.status === 'consolidated' ? 'bg-[#0F4D2A] text-white border-[#0F4D2A]' :
                            res.status === 'cancelled' ? 'bg-[#FDE8E8] text-[#C93A3A] border-[#FDE8E8]' :
                            res.status === 'cancellation_pending' ? 'bg-[#FDE8E8] text-[#C93A3A] border-[#FDE8E8]' :
                            'bg-[#FEF3D6] text-[#7A5A10] border-[#FEF3D6]'
                          }`}>
                            {res.status === 'confirmed' ? 'Confirmada' : 
                             res.status === 'consolidated' ? 'Consolidada' :
                             res.status === 'cancelled' ? 'Cancelada' : 
                             res.status === 'cancellation_pending' ? 'Cancelación Pendiente' : 'Pendiente'}
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
                        {res.status === 'cancellation_pending' && (
                          <button 
                            onClick={() => setResToCancel(res)}
                            className="bg-[#C93A3A] text-white px-3.5 py-2 rounded-full text-xs font-bold hover:bg-[#B82E2E] transition-colors flex items-center gap-1.5 shadow-sm"
                            title="Confirmar cancelación"
                          >
                            <Check size={14} />
                            <span>Confirmar cancelación</span>
                          </button>
                        )}
                        {res.status !== 'cancelled' && res.status !== 'cancellation_pending' && (
                          <button 
                            onClick={() => setResToCancel(res)}
                            className="bg-white border border-[#E8E0D0] text-[#C93A3A] p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        )}
                        {res.status !== 'cancelled' && (
                          <div className="relative">
                            <button 
                              onClick={() => setResMenuId(resMenuId === res.id ? null : res.id)}
                              className="text-[#6B7280] hover:text-[#1A2E26] p-2 rounded-full transition-colors"
                            >
                              <MoreVertical size={20} />
                            </button>
                            {resMenuId === res.id && (
                              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-[#E8E0D0] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                                <div className="px-4 py-3 text-xs text-[#9A958A] italic">
                                  No hay acciones adicionales
                                </div>
                              </div>
                            )}
                          </div>
                        )}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {controlPanelCategories.flatMap(cat => cat.items).map((item) => {
                const Icon = item.icon;
                const isActive = (showModuleOverlay ? overlayTab : activeTab) === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'reservations') {
                        document.getElementById('reservations-section')?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        setOverlayTab(item.id as any);
                        setShowModuleOverlay(true);
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

          </div>
        </div>

      {/* 4. ACTIVE MODULE CONTENT (HIDDEN - NOW IN OVERLAYS) */}
      <div className="hidden">
          <div id="active-module-content" className="pt-8 border-t border-[#E8E0D0] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Keeping the elements here for id references but hidden */}
          </div>
      </div>

      {/* 5. LIVE OPERATION LOG SIDEBAR (Desktop) */}
      <aside className={`hidden lg:flex flex-col w-[320px] bg-[#0F2E26] border-l border-[#1A3D32] sticky top-0 h-screen overflow-hidden z-30 transition-all duration-300 ${!isLogExpanded ? 'w-0 border-none' : ''}`}>
        <div className="p-6 pt-24 flex-1 flex flex-col min-h-0">
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
          className="hidden lg:flex fixed top-1/2 -translate-y-1/2 right-0 z-40 bg-[#0F2E26] text-white p-4 rounded-l-2xl shadow-2xl hover:pr-6 transition-all border-y border-l border-white/10 group"
          title="Abrir Bitácora"
        >
          <div className="flex flex-col items-center gap-2">
            <Terminal size={20} className="group-hover:scale-110 transition-transform" />
            <span className="[writing-mode:vertical-lr] text-[10px] font-black tracking-widest uppercase opacity-60">Bitácora</span>
          </div>
        </button>
      )}

      {/* 6. MOBILE BITACORA FLOATING BUTTON */}
      <button 
        onClick={() => setIsLogDrawerOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-[#0F2E26] text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
        title="Abrir Bitácora"
      >
        <Terminal size={24} />
      </button>

      {/* 7. MOBILE BITACORA DRAWER */}
      {isLogDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsLogDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-[#0F2E26] rounded-t-3xl h-[80vh] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                Bitácora en Vivo
                <span className="w-2 h-2 rounded-full bg-[#B8E6C8] animate-pulse" />
              </h3>
              <button onClick={() => setIsLogDrawerOpen(false)} className="text-white/40 p-2">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
              {liveLogs?.map((log: any) => (
                <div key={log._id} className="space-y-1.5 border-l-2 border-white/10 pl-4 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-white/40">{new Date(log.timestamp).toLocaleTimeString('es-ES')}</span>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-sm uppercase bg-white/10 text-white/60">
                      {log.userRole}
                    </span>
                  </div>
                  <p className="text-sm text-white/90 leading-snug">{log.action}</p>
                </div>
              ))}
            </div>

            <button onClick={handleDownloadAuditLog} className="mt-6 w-full bg-white/10 text-white text-xs font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              <Download size={18} /> Descargar Bitácora PDF
            </button>
          </div>
        </div>
      )}

      {/* 8. MODULE OVERLAY */}
      {showModuleOverlay && overlayTab && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModuleOverlay(false)} />
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-[#E8E0D0]">
            <div className="p-6 bg-[#0F2E26] text-white flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    {(() => {
                      const item = controlPanelCategories.flatMap(c => c.items).find(i => i.id === overlayTab);
                      const Icon = item?.icon || Settings;
                      return <Icon size={20} />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {controlPanelCategories.flatMap(c => c.items).find(i => i.id === overlayTab)?.title || 'Módulo'}
                    </h2>
                    <p className="text-xs text-white/60">Configuración y gestión avanzada</p>
                  </div>
               </div>
               <button onClick={() => setShowModuleOverlay(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide bg-white">
              {overlayTab === 'simulator' && (
                <AdminSimulator data={data} updateData={updateData} updateStatus={updateStatus} />
              )}

              {overlayTab === 'history' && (
                <HistoryViewer data={data} userRole="admin" />
              )}

              {overlayTab === 'landing' && (
                <AdminLandingEditor config={data.landingConfig} onSave={(newConfig) => updateData({ landingConfig: newConfig })} />
              )}

              {overlayTab === 'menu' && (
                <AdminMenuEditor menuItems={data.menuItems} onSave={(newItems) => updateData({ menuItems: newItems })} />
              )}

              {overlayTab === 'exchange' && (
                <div className="max-w-2xl">
                  {/* ... same exchange content ... */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-[#1A2E26]">Tasa de Cambio Diaria</h3>
                      <p className="text-xs text-[#6B7280]">Establece la conversión oficial del día (24h vigencia).</p>
                    </div>
                  </div>

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
                            className="w-full bg-white border border-[#E8E0D0] rounded-xl py-3 px-4 text-sm font-bold focus:border-[#0F2E26] outline-none"
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
                            className="w-full bg-white border border-[#E8E0D0] rounded-xl py-3 px-4 text-sm font-bold focus:border-[#0F2E26] outline-none"
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

              {overlayTab === 'security' && (
                 <div className="max-w-2xl space-y-12">
                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white border border-[#E8E0D0] text-[#0F2E26] rounded-xl shadow-sm">
                          <Shield size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-[#1A2E26]">Credenciales Principales</h3>
                          <p className="text-xs text-[#6B7280]">Modifica el acceso raíz del administrador</p>
                        </div>
                      </div>
                      {adminSavedMessage && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 font-bold">{adminSavedMessage}</div>}
                      <form onSubmit={handleSaveAdminCredentials} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Usuario</label>
                              <input type="text" value={adminCredentials.username} onChange={e => setAdminCredentials(p => ({...p, username: e.target.value}))} className="w-full bg-white border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Teléfono</label>
                              <input type="text" value={adminCredentials.phone} onChange={e => setAdminCredentials(p => ({...p, phone: e.target.value}))} className="w-full bg-white border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Nueva Contraseña</label>
                           <input type="text" value={adminCredentials.password} onChange={e => setAdminCredentials(p => ({...p, password: e.target.value}))} className="w-full bg-white border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:border-[#0F2E26] outline-none font-mono" />
                        </div>
                        <button type="submit" className="bg-[#0F2E26] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#1A3D32] transition-all">Guardar Cambios</button>
                      </form>
                    </div>

                    <div className="space-y-8 pt-8 border-t border-[#E8E0D0]">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white border border-[#E8E0D0] text-[#0F2E26] rounded-xl shadow-sm">
                          <Smartphone size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-[#1A2E26]">IDs de Dispositivo (Máx 3)</h3>
                          <p className="text-xs text-[#6B7280]">IDs autorizados para entrar sin credenciales (Auto-Login)</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A958A]" size={16} />
                            <input 
                              type="text" 
                              placeholder="DVC-XXXXX" 
                              value={newAdminId || 'DVC-'}
                              onChange={e => {
                                let val = e.target.value.toUpperCase();
                                if (!val.startsWith('DVC-')) val = 'DVC-' + val.replace(/^DVC-?/, '');
                                setNewAdminId(val);
                              }}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E0D0] rounded-xl text-sm font-mono font-bold focus:border-[#0F2E26] outline-none"
                            />
                          </div>
                          <button 
                            onClick={handleAddAdminId}
                            disabled={adminDeviceIds.length >= 3}
                            className="bg-[#0F2E26] text-white px-6 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                          >
                            Agregar
                          </button>
                        </div>

                        <div className="space-y-2">
                          {adminDeviceIds.map(id => (
                            <div key={id} className="flex items-center justify-between p-3 bg-white border border-[#E8E0D0] rounded-xl">
                              <span className="font-mono text-sm font-bold">{id}</span>
                              <button onClick={() => handleRemoveAdminId(id)} className="text-[#C93A3A] hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>
              )}

              {overlayTab === 'dependents' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <p className="text-sm text-[#6B7280]">Gestión de personal de sala y mesas asignadas.</p>
                     <button onClick={() => openUserModal('dependent')} className="bg-[#0F2E26] text-white px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-2">
                        <Plus size={16} /> Nuevo Dependiente
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.dependents.map(dep => (
                      <div key={dep.username || dep.id} className="p-4 border border-[#E8E0D0] bg-white rounded-2xl flex items-center justify-between group hover:border-[#0F2E26] transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#F6F2E7] flex items-center justify-center font-bold text-[#0F2E26]">{dep.tableNumber || '?'}</div>
                            <div className="cursor-pointer" onClick={() => openUserModal('dependent', dep)}>
                               <p className="font-bold text-sm flex items-center gap-2">
                                 {dep.name}
                                 <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                               </p>
                               <p className="text-[10px] text-[#6B7280] font-mono">@{dep.username} • ID: {dep.deviceId}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleUser(dep, 'dependent', !dep.isActive)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${dep.isActive !== false ? 'bg-[#B8E6C8] text-[#0F4D2A]' : 'bg-stone-100 text-[#6B7280]'}`} title={dep.isActive !== false ? 'Desactivar' : 'Activar'}>
                               <Power size={14} />
                            </button>
                            <button onClick={() => handleDeleteUser(dep.username, 'dependent')} className="w-8 h-8 rounded-full bg-red-50 text-[#C93A3A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                               <Trash2 size={14} />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {overlayTab === 'managers' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <p className="text-sm text-[#6B7280]">Gestión de Gerentes de Restaurante.</p>
                     <button onClick={() => openUserModal('manager')} className="bg-[#0F2E26] text-white px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-2">
                        <Plus size={16} /> Nuevo Gerente
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(data.managers || []).map(m => (
                      <div key={m.username || m.id} className="p-4 border border-[#E8E0D0] bg-white rounded-2xl flex items-center justify-between group hover:border-[#0F2E26] transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#F6F2E7] flex items-center justify-center text-[#0F2E26]">
                               <ShieldCheck size={20} />
                            </div>
                            <div className="cursor-pointer" onClick={() => openUserModal('manager', m)}>
                               <p className="font-bold text-sm flex items-center gap-2">
                                 {m.name}
                                 <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                               </p>
                               <p className="text-[10px] text-[#6B7280] font-mono">@{m.username} • ID: {m.deviceId || 'N/A'}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleUser(m, 'manager', !m.isActive)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${m.isActive !== false ? 'bg-[#B8E6C8] text-[#0F4D2A]' : 'bg-stone-100 text-[#6B7280]'}`} title={m.isActive !== false ? 'Desactivar' : 'Activar'}>
                               <Power size={14} />
                            </button>
                            <button onClick={() => handleDeleteUser(m.username, 'manager')} className="w-8 h-8 rounded-full bg-red-50 text-[#C93A3A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                               <Trash2 size={14} />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {overlayTab === 'kitchen' && (
                <div className="max-w-2xl space-y-8">
                   <div className="flex items-center gap-3">
                      <div className="p-3 bg-white border border-[#E8E0D0] text-[#0F2E26] rounded-xl shadow-sm">
                        <ChefHat size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-[#1A2E26]">Personal de Cocina</h3>
                        <p className="text-xs text-[#6B7280]">Acceso directo a la gestión de staff de cocina</p>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#0F2E26]">
                              <ChefHat size={24} />
                           </div>
                           <div>
                              <p className="font-bold text-dark-green">{activeKitchenUser?.name || 'No configurado'}</p>
                              <p className="text-xs text-[#6B7280]">ID: {activeKitchenUser?.deviceId || 'Sin ID'}</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => openUserModal('kitchen', activeKitchenUser)}
                          className="bg-white text-[#0F2E26] px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200 shadow-sm hover:shadow-md transition-all"
                        >
                          Configurar Staff
                        </button>
                      </div>
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Workday Modal */}
      {showCloseWorkdayModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col">
              <div className="p-8 bg-[#0F2E26] text-white flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <Archive size={32} className="text-[#B8E6C8]" />
                    <div>
                       <h2 className="text-2xl font-black tracking-tight">Cierre de Jornada</h2>
                       <p className="text-[#B8E6C8]/80 text-sm">Proceso de archivo seguro (Paso {closeWorkdayPhase} de 3)</p>
                    </div>
                 </div>
                 <button onClick={() => setShowCloseWorkdayModal(false)} className="text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                    <X size={24} />
                 </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto">
                 {/* Progress Indicator */}
                 <div className="flex items-center gap-4 mb-8">
                    {[1, 2, 3].map((step) => (
                       <div key={step} className="flex-1">
                          <div className={`h-2 rounded-full ${closeWorkdayPhase >= step ? 'bg-[#0F2E26]' : 'bg-gray-200'}`} />
                          <div className={`text-[10px] uppercase font-bold mt-2 text-center ${closeWorkdayPhase >= step ? 'text-[#0F2E26]' : 'text-gray-400'}`}>
                             {step === 1 ? 'Confirmación' : step === 2 ? 'Bitácora' : 'Respaldo'}
                          </div>
                       </div>
                    ))}
                 </div>

                 {closeWorkdayPhase === 1 && (
                    <div className="space-y-6">
                       <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                             <AlertCircle size={20} className="text-amber-600" />
                             Fase 1: Confirmación del Gerente
                          </h3>
                          <p className="text-amber-800 text-sm mb-4 leading-relaxed">
                             La jornada operativa está a punto de ser cerrada y archivada en el Historial de forma inmutable.
                          </p>
                          {data.gerenteCierreCompleto ? (
                             <div className="bg-white/60 p-4 rounded-xl border border-amber-200/50 flex items-center gap-3">
                                <Check size={20} className="text-green-600" />
                                <span className="text-sm font-semibold text-green-800">El Gerente de Restaurante ha completado y verificado el cierre.</span>
                             </div>
                          ) : (
                             <div className="bg-white/60 p-4 rounded-xl border border-amber-200/50">
                                <p className="text-sm font-semibold text-red-700 mb-1">El Gerente de Restaurante AÚN NO ha completado el cierre.</p>
                                <p className="text-xs text-amber-700">Puede continuar bajo su responsabilidad. Esta acción quedará registrada en la Bitácora de Auditoría de forma automática.</p>
                             </div>
                          )}
                       </div>
                       <button onClick={handleContinuePhase1} className="w-full bg-[#0F2E26] hover:bg-[#1A3D32] text-white py-4 rounded-xl font-bold transition-all shadow-lg">
                          Continuar a Descargas
                       </button>
                    </div>
                 )}

                 {closeWorkdayPhase === 2 && (
                    <div className="space-y-6">
                       <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                             <Terminal size={20} className="text-blue-600" />
                             Fase 2: Descarga Obligatoria de Bitácora
                          </h3>
                          <p className="text-blue-800 text-sm mb-4 leading-relaxed">
                             Antes de cerrar la jornada, es obligatorio descargar el registro de acciones (Bitácora) en formato PDF para garantizar el cumplimiento de auditoría.
                          </p>
                          <button 
                             onClick={() => {
                               handleDownloadAuditLog();
                               setBitacoraDownloaded(true);
                             }} 
                             className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                             <Download size={20} />
                             {bitacoraDownloaded ? 'Bitácora Descargada - Descargar de Nuevo' : 'Descargar Bitácora en PDF'}
                          </button>
                       </div>
                       
                       <button 
                          onClick={() => setCloseWorkdayPhase(3)} 
                          disabled={!bitacoraDownloaded}
                          className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${bitacoraDownloaded ? 'bg-[#0F2E26] hover:bg-[#1A3D32] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                       >
                          Continuar
                       </button>
                    </div>
                 )}

                 {closeWorkdayPhase === 3 && (
                    <div className="space-y-6">
                       <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
                          <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                             <Database size={20} className="text-purple-600" />
                             Fase 3: Descarga Obligatoria de Respaldo Integral
                          </h3>
                          <p className="text-purple-800 text-sm mb-4 leading-relaxed">
                             Descargue el archivo <strong>Excelencia.json</strong>. Este archivo constituye el respaldo integral de la jornada y contiene datos históricos para una posible recuperación frente a desastres.
                          </p>
                          <button 
                             onClick={() => {
                               handleExportJson();
                               setExcelenciaDownloaded(true);
                             }} 
                             className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                             <Download size={20} />
                             {excelenciaDownloaded ? 'Respaldo Descargado - Descargar de Nuevo' : 'Descargar Excelencia.json'}
                          </button>
                       </div>

                       <div className="pt-4 border-t border-gray-200">
                          <button 
                             onClick={finalizeCloseWorkday}
                             disabled={!excelenciaDownloaded}
                             className={`w-full py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-all shadow-lg ${excelenciaDownloaded ? 'bg-[#C93A3A] hover:bg-[#B82E2E] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                          >
                             <Archive size={20} />
                             CONFIRMAR CIERRE DEFINITIVO
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#E8E0D0] animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-[#0F2E26] text-white flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <User size={24} className="text-[#B8E6C8]" />
                    <h3 className="font-serif text-xl font-bold">
                       {editingUser ? 'Editar' : 'Nuevo'} {userFormType === 'dependent' ? 'Dependiente' : userFormType === 'manager' ? 'Gerente' : 'Staff Cocina'}
                    </h3>
                 </div>
                 <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                 </button>
              </div>
              <form onSubmit={handleSaveUser} className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Usuario *</label>
                       <input 
                         type="text" required 
                         value={userForm.username} 
                         disabled={!!editingUser}
                         onChange={e => setUserForm(p => ({...p, username: e.target.value}))} 
                         className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:border-[#0F2E26] outline-none disabled:opacity-50" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">ID Dispositivo *</label>
                       <div className="relative">
                        <input 
                          type="text" required 
                          value={userForm.deviceId || 'DVC-'} 
                          onChange={e => {
                            let val = e.target.value.toUpperCase();
                            if (!val.startsWith('DVC-')) val = 'DVC-' + val.replace(/^DVC-?/, '');
                            setUserForm(p => ({...p, deviceId: val}));
                          }} 
                          className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm font-mono font-bold focus:border-[#0F2E26] outline-none" 
                        />
                       </div>
                    </div>
                 </div>
                 
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Nombre Completo *</label>
                    <input 
                      type="text" required 
                      value={userForm.name} 
                      onChange={e => setUserForm(p => ({...p, name: e.target.value}))} 
                      className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:border-[#0F2E26] outline-none" 
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Contraseña *</label>
                       <input 
                         type="text" required 
                         value={userForm.password} 
                         onChange={e => setUserForm(p => ({...p, password: e.target.value}))} 
                         className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:border-[#0F2E26] outline-none font-mono" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Teléfono</label>
                       <input 
                         type="text" 
                         value={userForm.phone} 
                         onChange={e => setUserForm(p => ({...p, phone: e.target.value}))} 
                         className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:border-[#0F2E26] outline-none" 
                       />
                    </div>
                 </div>

                 {userFormType === 'dependent' && (
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black tracking-widest uppercase text-[#6B7280]">Mesa Asignada *</label>
                       <input 
                         type="text" required 
                         value={userForm.tableNumber} 
                         onChange={e => setUserForm(p => ({...p, tableNumber: e.target.value}))} 
                         className="w-full bg-[#F6F2E7] border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:border-[#0F2E26] outline-none" 
                       />
                    </div>
                 )}

                 <div className="flex items-center gap-3 pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={userForm.isActive}
                        onChange={e => setUserForm(p => ({...p, isActive: e.target.checked}))}
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F2E26]"></div>
                      <span className="ml-3 text-sm font-medium text-[#1A2E26]">Usuario Activo</span>
                    </label>
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="flex-1 px-6 py-4 border border-[#E8E0D0] text-[#6B7280] font-bold rounded-2xl hover:bg-stone-50 transition-all"
                    >
                       Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 bg-[#0F2E26] text-white font-bold rounded-2xl hover:bg-[#1A3D32] transition-all shadow-lg"
                    >
                       {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal de Confirmación de Cancelación para el Administrador */}
      {resToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-[#E8E0D0] animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#C93A3A] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-xl font-bold text-[#1A2E26] text-center mb-2 font-serif">
              ¿Está seguro de que desea cancelar esta reserva?
            </h3>

            <p className="text-sm text-[#6B7280] text-center mb-6 leading-relaxed">
              Esta acción cancelará la reserva del cliente.
            </p>

            {/* Summary details of the reservation to be cancelled */}
            <div className="bg-[#F9F5EB] rounded-2xl p-4 border border-[#E8E0D0] mb-6 space-y-2 text-xs text-[#1A2E26]">
              <div className="flex justify-between font-bold">
                <span>Cliente:</span>
                <span>{resToCancel.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha y Hora:</span>
                <span>{resToCancel.date} • {resToCancel.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Comensales:</span>
                <span>{resToCancel.guests} personas</span>
              </div>
              {resToCancel.phone && (
                <div className="flex justify-between">
                  <span>Teléfono:</span>
                  <span>{resToCancel.phone}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setResToCancel(null)}
                className="flex-1 px-5 py-3 rounded-xl border border-[#E8E0D0] text-[#1A2E26] font-bold text-xs hover:bg-[#F9F5EB] transition-colors"
              >
                Cancelar / Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  updateStatus(resToCancel.id, 'cancelled');
                  setResToCancel(null);
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-[#C93A3A] hover:bg-[#B82E2E] text-white font-bold text-xs shadow-md transition-colors"
              >
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inicialización Total del Sistema */}
      {showInitModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-[#E8E0D0] my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-[#8B1E1E] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={26} className="text-red-200 animate-pulse" />
                <div>
                  <h3 className="font-serif text-xl font-bold">INICIALIZACIÓN TOTAL DEL SISTEMA</h3>
                  <p className="text-xs text-red-100 font-medium">Restauración a estado de instalación limpia</p>
                </div>
              </div>
              <button 
                onClick={() => !isInitializing && setShowInitModal(false)} 
                disabled={isInitializing}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Shift status verification badge */}
              <div className="flex items-center justify-between bg-stone-100 p-4 rounded-2xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700">Estado de la Jornada Operativa:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  data.isShiftActive 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${data.isShiftActive ? 'bg-red-600' : 'bg-emerald-600'}`} />
                  {data.isShiftActive ? 'JORNADA ACTIVA (BLOQUEADO)' : 'JORNADA CERRADA (PERMITIDO)'}
                </span>
              </div>

              {data.isShiftActive ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 text-red-900 space-y-2">
                  <h4 className="font-bold text-sm flex items-center gap-2 text-red-800">
                    <AlertCircle size={18} /> OPERACIÓN BLOQUEADA
                  </h4>
                  <p className="text-xs leading-relaxed">
                    No es posible realizar la inicialización mientras exista una jornada activa. Por favor, primero realice el <strong>Cierre y Archivo de Jornada</strong> para asegurar los datos actuales.
                  </p>
                </div>
              ) : (
                <>
                  {/* Danger Notice */}
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                      <AlertTriangle size={18} className="text-amber-600" />
                      ALTO RIESGO: Eliminación Permanente de Datos
                    </h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Esta operación eliminará de forma irreversible todos los datos operativos e históricos del restaurante para comenzar desde cero. Se eliminarán:
                    </p>
                    <ul className="text-xs text-amber-950 space-y-1.5 font-medium pl-1">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">✕</span>
                        <span>Todas las jornadas pasadas y sus históricos de reportes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">✕</span>
                        <span>Todas las reservaciones de clientes (pendientes, confirmadas y canceladas)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">✕</span>
                        <span>Todas las comandas, órdenes y cierres financieros de caja</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">✕</span>
                        <span>La bitácora completa de eventos de auditoría</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">✕</span>
                        <span>Cuentas de personal operativo (dependientes, gerentes y cocina)</span>
                      </li>
                    </ul>
                  </div>

                  {/* Backup Advice Box */}
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-purple-900 text-xs flex items-center gap-2">
                        <Database size={16} className="text-purple-600" />
                        RESPALDO PREVIO RECOMENDADO
                      </h4>
                      <button 
                        type="button"
                        onClick={handleExportJson}
                        className="text-[11px] font-bold bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Download size={13} /> Descargar Excelencia.json
                      </button>
                    </div>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Antes de inicializar, asegúrese de haber descargado y conservado el archivo <strong>Excelencia.json</strong> y la <strong>Bitácora</strong> si desea conservar un respaldo para el futuro.
                    </p>
                  </div>

                  {/* Explicit Checkbox Confirmation */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={initConfirmChecked}
                        onChange={e => setInitConfirmChecked(e.target.checked)}
                        disabled={isInitializing}
                        className="mt-1 w-4 h-4 text-[#8B1E1E] rounded border-stone-300 focus:ring-[#8B1E1E]"
                      />
                      <span className="text-xs font-bold text-[#1A2E26] leading-snug">
                        Sí, entiendo que esta operación eliminará todos los datos operativos e históricos y deseo continuar con la inicialización total.
                      </span>
                    </label>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInitModal(false)}
                  disabled={isInitializing}
                  className="flex-1 px-5 py-3.5 border border-[#E8E0D0] text-[#6B7280] font-bold rounded-xl text-xs hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  Cancelar / Volver
                </button>
                {!data.isShiftActive && (
                  <button
                    type="button"
                    onClick={handleExecuteInitialization}
                    disabled={!initConfirmChecked || isInitializing}
                    className={`flex-1 px-5 py-3.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                      initConfirmChecked && !isInitializing
                        ? 'bg-[#8B1E1E] hover:bg-[#721818] cursor-pointer'
                        : 'bg-stone-300 cursor-not-allowed text-stone-500 shadow-none'
                    }`}
                  >
                    <Trash2 size={16} />
                    {isInitializing ? 'INICIALIZANDO...' : 'CONFIRMAR INICIALIZACIÓN TOTAL'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

