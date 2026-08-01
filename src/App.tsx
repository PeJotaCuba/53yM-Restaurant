import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import { ConvexErrorBoundary } from './components/ConvexErrorBoundary';
import { sanitizeString, sanitizeObjectKeys } from './utils/sanitizer';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { MenuViewer } from './components/MenuViewer';
import { FullMenu } from './components/FullMenu';
import { ReservationWizard } from './components/ReservationWizard';
import { UserDashboard } from "./components/UserDashboard";
import { ClientOrderWorkspace } from './components/ClientOrderWorkspace';
import { AdminPanel } from './components/AdminPanel';
import { DependentPanel } from './components/DependentPanel';
import { ManagerPanel } from './components/ManagerPanel';
import { KitchenPanel } from './components/KitchenPanel';
import { BitacoraStream } from './components/BitacoraStream';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Services } from './components/Services';
import { Gallery } from './components/Gallery';
import { Promotions } from './components/Promotions';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { Contact } from './components/Contact';
import { Logo } from './components/Logo';
import { LoginModal } from './components/LoginModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useDeviceId } from './hooks/useDeviceId';
import { DependentConfig, ManagerConfig, Reservation, AppData } from './types';
import { ADMIN_DEVICE_IDS } from './utils/deviceUtils';
import { useLanguage } from './context/LanguageContext';
import { MENU_ITEMS } from './data';
import { cleanLandingConfig } from './constants';

export default function App() {
  console.log('[App] Rendering...');
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState('home');
  const [selectedDishForReservation, setSelectedDishForReservation] = useState<string | undefined>(undefined);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [firstTimeName, setFirstTimeName] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('clientUserName');
    if (!savedName) {
      setShowFirstTimeModal(true);
    }
  }, []);

  const handleSaveFirstTimeName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = firstTimeName.trim();
    if (trimmed) {
      localStorage.setItem('clientUserName', trimmed);
      setShowFirstTimeModal(false);
    } else {
      alert('Por favor ingresa tu nombre.');
    }
  };

  const deviceId = useDeviceId();

  // Active Sessions state (Declared early for query security)
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [activeDependent, setActiveDependent] = useState<DependentConfig | null>(null);
  const [activeManager, setActiveManager] = useState<ManagerConfig | null>(null);
  const [activeKitchen, setActiveKitchen] = useState<any>(null);

  const requesterRole = adminLoggedIn ? 'admin' : (activeManager ? 'manager' : (activeDependent ? 'dependent' : (activeKitchen ? 'kitchen' : 'none')));

  // Convex Reactive Queries & Mutations (Safe Mode)
  const liveUser = useQuery(api.users.getLiveUserByDeviceId, { deviceId });
  const liveOrders = useQuery(api.orders.getLiveOrders);
  const liveReservations = useQuery(api.reservations.getLiveReservations);
  const liveLogs = useQuery(
    api.bitacora.getLiveLogs,
    requesterRole === 'admin' || requesterRole === 'manager'
      ? { limit: 100, requesterRole }
      : 'skip'
  );
  const liveExchangeRate = useQuery(api.admin.getSetting, { key: "exchangeRate" });
  const liveLandingConfig = useQuery(api.admin.getSetting, { key: "landingConfig" });
  const liveAdminConfig = useQuery(api.admin.getSetting, { key: "adminConfig" });
  const liveComandas = useQuery(api.admin.getSetting, { key: "comandas" });
  const liveOrderReports = useQuery(api.admin.getSetting, { key: "orderReports" });
  const liveKitchenReports = useQuery(api.admin.getSetting, { key: "kitchenReports" });
  const liveCashRegisterCloses = useQuery(api.admin.getSetting, { key: "cashRegisterCloses" });
  const liveIsShiftActive = useQuery(api.admin.getSetting, { key: "isShiftActive" });
  const liveHistory = useQuery(
    api.admin.getHistory,
    requesterRole === 'admin' || requesterRole === 'manager'
      ? { requesterRole }
      : 'skip'
  );

  const liveMenuItems = useQuery(api.menuItems.getLiveMenuItems);
  const convexUsers = useQuery(api.users.getAllUsers) || [];

  const mappedReservations = useMemo(() => {
    return (liveReservations || []).map((lr: any) => ({
      id: lr._id || lr.id,
      name: lr.customerName || lr.name || 'Cliente',
      date: lr.date,
      time: lr.timeSlot || lr.time || '12:00',
      guests: lr.guests || 2,
      occasion: lr.occasion || lr.area || 'Cena casual',
      phone: lr.phone || '',
      email: lr.email || '',
      dishReference: lr.dishReference || '',
      dishes: lr.dishes || [],
      status: lr.status || 'pending',
      createdAt: lr.createdAt || Date.now(),
    }));
  }, [liveReservations]);

  const mappedOrders = useMemo(() => {
    return (liveOrders || []).map((lo: any) => {
      const itemsList = lo.items ? lo.items.map((i: any) => typeof i === 'string' ? i : `${i.quantity}x ${i.name}`) : [];
      return {
        id: lo._id || lo.id,
        tableNumber: lo.tableNumber || 'Mesa',
        items: itemsList,
        orderItems: (lo.items || []).map((item: any) => ({
          id: item.id || 'item-' + Math.random(),
          name: item.name,
          quantity: item.quantity,
          priceCUP: item.priceCUP || 0,
          priceUSD: item.priceUSD || 0,
          notes: item.notes || '',
        })),
        totalCUP: lo.totalCUP || 0,
        totalUSD: lo.totalUSD || 0,
        status: lo.status || 'pending_dependent',
        timestamp: lo.timestamp || Date.now(),
        assignedDependentId: lo.assignedDependentId || 'no_assigned',
        reservationId: lo.reservationId,
      };
    });
  }, [liveOrders]);

  // Single Source of Truth: appData constructed purely from Convex queries
  const appData: AppData = useMemo(() => {
    const dbManagers = (convexUsers || [])
      .filter((u: any) => u.role === 'manager')
      .map((u: any) => ({
        id: u._id,
        name: u.name,
        username: u.username,
        password: u.password || '',
        phone: u.phone || '',
        deviceId: u.deviceId || '',
        isActive: u.isActive !== false
      }));

    const dbDependents = (convexUsers || [])
      .filter((u: any) => u.role === 'dependent')
      .map((u: any) => ({
        id: u._id,
        deviceId: u.deviceId || '',
        tableNumber: u.tableNumber || '',
        name: u.name,
        phone: u.phone || '',
        username: u.username,
        password: u.password || '',
        isActive: u.isActive !== false
      }));

    const mappedAuditLogs = (liveLogs || []).map((log: any) => ({
      id: log._id,
      timestamp: log.timestamp,
      timeStr: new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date(log.timestamp).toLocaleDateString('es-ES'),
      role: log.userRole || 'SISTEMA',
      userOrDevice: log.username || 'usuario',
      action: log.action || '',
      details: log.action || ''
    }));

    const mappedMenuItems = (liveMenuItems || []).map((item: any) => ({
      id: item._id || item.id,
      name: item.name || '',
      category: item.category || 'Otros',
      priceCUP: item.priceCUP || 0,
      priceUSD: item.priceUSD || 0,
      isAvailable: item.isAvailable !== false,
      shortDescription: item.description || item.shortDescription || '',
      sensoryDescription: item.sensoryDescription || item.description || '',
      story: item.story || '',
      ingredients: item.ingredients || [],
      imageUrl: item.image || item.imageUrl || '',
      image: item.image || item.imageUrl || ''
    }));

    return {
      exchangeRate: liveExchangeRate || { usdCUP: 320, eurCUP: 350, updatedAt: Date.now() },
      landingConfig: cleanLandingConfig(liveLandingConfig),
      menuItems: mappedMenuItems,
      reservations: mappedReservations,
      orders: mappedOrders,
      managers: dbManagers,
      dependents: dbDependents,
      users: convexUsers || [],
      auditLogs: mappedAuditLogs,
      adminConfig: liveAdminConfig || { username: 'gestion53ym', password: 'adminrestaurant.53yM', phone: '54413935' },
      comandas: liveComandas || [],
      isShiftActive: liveIsShiftActive !== false,
      orderReports: liveOrderReports || [],
      kitchenReports: liveKitchenReports || [],
      cashRegisterCloses: liveCashRegisterCloses || [],
      history: liveHistory || [],
      downloadsState: { adminAuditLog: false, managerZip: false }
    };
  }, [
    liveExchangeRate,
    liveLandingConfig,
    liveMenuItems,
    mappedReservations,
    mappedOrders,
    convexUsers,
    liveLogs,
    liveAdminConfig,
    liveComandas,
    liveIsShiftActive,
    liveOrderReports,
    liveKitchenReports,
    liveCashRegisterCloses,
    liveHistory
  ]);

  const authorizeUserMutation = useMutation(api.users.authorizeUser);
  const deactivateUserMutation = useMutation(api.users.deactivateUser);
  const createReservationMutation = useMutation(api.reservations.createReservation);
  const createReservationAndOrderMutation = useMutation(api.reservations.createReservationAndOrder);
  const updateReservationMutation = useMutation(api.reservations.updateReservation);
  const updateReservationStatusMutation = useMutation(api.reservations.updateReservationStatus);
  const addLogMutation = useMutation(api.bitacora.addLog);
  const syncOrUpdateOrderMutation = useMutation(api.orders.syncOrUpdateOrder);
  const updateSettingMutation = useMutation(api.admin.updateSetting);
  const syncMenuItemsMutation = useMutation(api.menuItems.syncMenuItems);

  const hasSeededMenuRef = useRef(false);

  // Auto-seed initial menu items to Convex if Convex menuItems is empty
  useEffect(() => {
    if (!hasSeededMenuRef.current && liveMenuItems !== undefined && liveMenuItems.length === 0 && MENU_ITEMS && MENU_ITEMS.length > 0) {
      hasSeededMenuRef.current = true;
      syncMenuItemsMutation({
        items: MENU_ITEMS.map((item: any) => ({
          name: item.name || '',
          category: item.category || 'Otros',
          priceCUP: item.priceCUP || 0,
          priceUSD: item.priceUSD || 0,
          isAvailable: item.isAvailable !== false,
          image: item.imageUrl || item.image || '',
        })),
        username: 'Sistema'
      }).catch(err => {
        hasSeededMenuRef.current = false;
        console.warn('Convex seed menu error:', err);
      });
    }
  }, [liveMenuItems]);

  // Direct Convex Mutation Trigger
  const updateData = (newData: Partial<AppData>) => {
    if (newData.exchangeRate) {
      updateSettingMutation({ key: "exchangeRate", value: newData.exchangeRate }).catch(console.warn);
    }
    if (newData.landingConfig) {
      updateSettingMutation({ key: "landingConfig", value: newData.landingConfig }).catch(console.warn);
    }
    if (newData.adminConfig) {
      updateSettingMutation({ key: "adminConfig", value: newData.adminConfig }).catch(console.warn);
    }
    if (newData.comandas) {
      updateSettingMutation({ key: "comandas", value: newData.comandas }).catch(console.warn);
    }
    if (newData.orderReports) {
      updateSettingMutation({ key: "orderReports", value: newData.orderReports }).catch(console.warn);
    }
    if (newData.kitchenReports) {
      updateSettingMutation({ key: "kitchenReports", value: newData.kitchenReports }).catch(console.warn);
    }
    if (newData.cashRegisterCloses) {
      updateSettingMutation({ key: "cashRegisterCloses", value: newData.cashRegisterCloses }).catch(console.warn);
    }
    if (newData.isShiftActive !== undefined) {
      updateSettingMutation({ key: "isShiftActive", value: newData.isShiftActive }).catch(console.warn);
    }
    if (newData.menuItems) {
      syncMenuItemsMutation({ 
        items: newData.menuItems.map((item: any) => ({
          name: item.name || '',
          category: item.category || 'Otros',
          priceCUP: item.priceCUP || 0,
          priceUSD: item.priceUSD || 0,
          isAvailable: item.isAvailable !== false,
          image: item.image || item.imageUrl || '',
        })),
        username: 'Administrador'
      }).catch(console.warn);
    }
    if (newData.auditLogs && newData.auditLogs.length > 0) {
      const latestLog = newData.auditLogs[0];
      if (latestLog) {
        const actionUpper = (latestLog.action || latestLog.details || '').toUpperCase();
        const isAutoLogged = 
          actionUpper.includes("PEDIDO") || 
          actionUpper.includes("RESERVA") || 
          actionUpper.includes("JORNADA") || 
          actionUpper.includes("INFORME ENVIADO") || 
          actionUpper.includes("PERFIL DE COCINA") ||
          actionUpper.includes("COCINA:") ||
          actionUpper.includes("APROBACIÓN") ||
          actionUpper.includes("SESIÓN AUTORIZADA") ||
          actionUpper.includes("CIERRE DE SESIÓN") ||
          actionUpper.includes("USUARIO '") ||
          actionUpper.includes("PLATO '") ||
          actionUpper.includes("MENÚ ACTUALIZADO");

        if (!isAutoLogged) {
          const getConvexRole = (spanishRole: string): string => {
            switch (spanishRole) {
              case 'Administrador': return 'admin';
              case 'Gerente': return 'manager';
              case 'Dependiente': return 'dependent';
              case 'Cocina': return 'kitchen';
              case 'Cliente': return 'client';
              case 'Sistema': return 'system';
              default: return spanishRole?.toLowerCase() || 'client';
            }
          };

          addLogMutation({
            action: latestLog.action || latestLog.details || '',
            userRole: getConvexRole(latestLog.role),
            username: latestLog.userOrDevice || 'Cliente',
          }).catch(err => console.warn('Convex addLog error:', err));
        }
      }
    }
    if (newData.orders && newData.orders.length > 0) {
      newData.orders.forEach((newOrder: any) => {
        // Optimization: dirty check to only mutate orders that actually changed
        const existingOrder = appData.orders.find((o: any) => o.id === newOrder.id);
        if (existingOrder) {
          const isSameStatus = existingOrder.status === newOrder.status;
          const isSameTable = existingOrder.tableNumber === newOrder.tableNumber;
          const isSameAssigned = existingOrder.assignedDependentId === newOrder.assignedDependentId;
          const isSameItemsLength = (existingOrder.orderItems?.length || 0) === (newOrder.orderItems?.length || 0);

          if (isSameStatus && isSameTable && isSameAssigned && isSameItemsLength) {
            let itemsChanged = false;
            for (let i = 0; i < (existingOrder.orderItems?.length || 0); i++) {
              const oldIt = existingOrder.orderItems[i];
              const newIt = newOrder.orderItems[i];
              if (oldIt.name !== newIt?.name || oldIt.quantity !== newIt?.quantity || oldIt.priceCUP !== newIt?.priceCUP) {
                itemsChanged = true;
                break;
              }
            }
            if (!itemsChanged) {
              return; // Skip sync for unchanged order
            }
          }
        }

        const formattedItems = (newOrder.orderItems || []).map((item: any, idx: number) => ({
          id: item.id || `item-${idx}`,
          name: item.name || '',
          quantity: Number(item.quantity) || 1,
          priceCUP: Number(item.priceCUP || item.price || 0),
          priceUSD: Number(item.priceUSD || 0),
          notes: item.notes || '',
        }));

        if (formattedItems.length === 0 && newOrder.items && newOrder.items.length > 0) {
          newOrder.items.forEach((itemText: string, idx: number) => {
            formattedItems.push({
              id: `item-${idx}`,
              name: itemText,
              quantity: 1,
              priceCUP: 0,
              priceUSD: 0,
              notes: '',
            });
          });
        }

        const totalCUP = formattedItems.reduce((acc: number, item: any) => acc + (item.priceCUP * item.quantity), 0);
        const totalUSD = totalCUP / (liveExchangeRate?.usdCUP || 320);

        let currentUsername = undefined;
        let currentUserRole = undefined;
        if (adminLoggedIn) {
          currentUsername = "Administrador";
          currentUserRole = "admin";
        } else if (activeManager) {
          currentUsername = activeManager.name || activeManager.username || "Gerente";
          currentUserRole = "manager";
        } else if (activeDependent) {
          currentUsername = activeDependent.name || activeDependent.username || "Dependiente";
          currentUserRole = "dependent";
        } else if (activeKitchen) {
          currentUsername = activeKitchen.name || activeKitchen.username || "Cocina";
          currentUserRole = "kitchen";
        }

        syncOrUpdateOrderMutation({
          id: newOrder.id,
          tableNumber: newOrder.tableNumber || 'Mesa 1',
          items: formattedItems,
          totalCUP: totalCUP || newOrder.totalAmountCUP || 0,
          totalUSD: totalUSD || newOrder.totalAmountUSD || 0,
          status: newOrder.status || 'pending_dependent',
          timestamp: newOrder.timestamp || Date.now(),
          assignedDependentId: newOrder.assignedDependentId || 'no_assigned',
          reservationId: newOrder.reservationId || undefined,
          username: currentUsername,
          userRole: currentUserRole,
        }).catch(err => console.warn('Convex syncOrder error:', err));
      });
    }
  };

  // Real-Time Session Verification via Convex
  useEffect(() => {
    const checkSessions = () => {
      const currentDeviceIdClean = deviceId.trim().toUpperCase();
      const isAdminDevice = ADMIN_DEVICE_IDS.includes(currentDeviceIdClean); 

      if (liveUser && liveUser.isActive) {
        if (liveUser.role === 'admin') {
          setAdminLoggedIn(true);
          setActiveManager(null);
          setActiveDependent(null);
          setActiveKitchen(null);
          return;
        }
        if (liveUser.role === 'manager') {
          const mgrMatch = (appData.managers || []).find(m => m.username === liveUser.username || m.deviceId === deviceId);
          setActiveManager(mgrMatch || {
            id: 'MGR-LIVE',
            name: liveUser.name,
            username: liveUser.username,
            phone: '',
            password: '',
            deviceId: liveUser.deviceId,
            isActive: true
          });
          setAdminLoggedIn(false);
          setActiveDependent(null);
          setActiveKitchen(null);
          return;
        }
        if (liveUser.role === 'dependent') {
          const depMatch = (appData.dependents || []).find(d => d.username === liveUser.username || d.deviceId === deviceId);
          setActiveDependent(depMatch || {
            id: 'DEP-LIVE',
            name: liveUser.name,
            username: liveUser.username,
            phone: '',
            password: '',
            deviceId: liveUser.deviceId,
            tableNumber: 'Mesa Live',
            isActive: true
          });
          setAdminLoggedIn(false);
          setActiveManager(null);
          setActiveKitchen(null);
          return;
        }
        if (liveUser.role === 'kitchen') {
          setActiveKitchen({
            id: 'KITCHEN-LIVE',
            name: liveUser.name,
            username: liveUser.username,
            phone: liveUser.phone || '',
            password: '',
            deviceId: liveUser.deviceId,
            isActive: true
          });
          setAdminLoggedIn(false);
          setActiveManager(null);
          setActiveDependent(null);
          return;
        }
      }

      // Local session checks
      const savedAdmin = localStorage.getItem('adminSession');
      setAdminLoggedIn(isAdminDevice && !!savedAdmin);

      const savedManager = localStorage.getItem('managerSession');
      if (savedManager) {
        try {
          const parsed = JSON.parse(savedManager);
          const mgrMatch = (appData.managers || []).find(m => m.id === parsed.id || m.username === parsed.username);
          if (mgrMatch && mgrMatch.isActive !== false) {
            setActiveManager(mgrMatch);
          }
        } catch (e) {
          localStorage.removeItem('managerSession');
        }
      }

      const savedDep = localStorage.getItem('dependentSession');
      if (savedDep) {
        try {
          const parsed = JSON.parse(savedDep);
          const depMatch = appData.dependents.find(d => d.id === parsed.id || d.username === parsed.username || d.deviceId === parsed.deviceId);
          if (depMatch && depMatch.isActive !== false) {
            setActiveDependent(depMatch);
          }
        } catch (e) {
          localStorage.removeItem('dependentSession');
        }
      }

      const savedKitchen = localStorage.getItem('kitchenSession');
      if (savedKitchen) {
        try {
          const parsed = JSON.parse(savedKitchen);
          setActiveKitchen(parsed);
        } catch (e) {
          localStorage.removeItem('kitchenSession');
        }
      }
    };

    checkSessions();
  }, [liveUser, deviceId, appData.dependents, appData.managers]);

  // Determine User Role
  let userRole: 'admin' | 'manager' | 'dependent' | 'kitchen' | 'none' = 'none';
  if (adminLoggedIn) {
    userRole = 'admin';
  } else if (activeManager) {
    userRole = 'manager';
  } else if (activeDependent) {
    userRole = 'dependent';
  } else if (activeKitchen) {
    userRole = 'kitchen';
  }

  // Auto-route authenticated users to their workspace
  useEffect(() => {
    if (userRole !== 'none' && (currentView === 'home' || currentView === 'dashboard')) {
      setCurrentView(userRole);
    }
  }, [userRole, currentView]);

  // Handle Logout & Deactivate Session in Convex
  const handleLogout = async () => {
    try {
      await deactivateUserMutation({ deviceId });
    } catch (err) {
      console.warn('Error deactivating Convex session:', err);
    }
    localStorage.removeItem('adminSession');
    localStorage.removeItem('dependentSession');
    localStorage.removeItem('managerSession');
    setAdminLoggedIn(false);
    setActiveDependent(null);
    setActiveManager(null);
    setCurrentView('home');
  };

  // Reservation Editing & Cancellation Handlers
  const handleUpdateReservation = async (id: string, newDetails: Partial<Reservation>) => {
    // 1. Update local state
    const cleanDetails = sanitizeObjectKeys(newDetails);
    const updatedReservations = appData.reservations.map(r => 
      r.id === id ? { ...r, ...cleanDetails, status: 'pending' as const } : r
    );
    updateData({ reservations: updatedReservations });

    // 2. Update Convex
    if (id && !id.includes('.') && id.length > 10) {
      try {
        await updateReservationMutation({
          id: id as any,
          customerName: newDetails.name || '',
          date: newDetails.date || '',
          timeSlot: newDetails.time || '',
          guests: newDetails.guests || 1,
          phone: newDetails.phone,
          email: newDetails.email,
          occasion: newDetails.occasion,
          dishReference: newDetails.dishReference,
        });
      } catch (err) {
        console.warn('Error updating Convex reservation:', err);
      }
    }
  };

  const updateReservationStatus = async (id: string, status: any) => {
    // 1. Update in state
    const updated = appData.reservations.map(r => r.id === id ? { ...r, status } : r);
    updateData({ reservations: updated });

    // 2. If it is a Convex ID, update it in Convex as well
    if (id && !id.includes('.') && id.length > 10) {
      try {
        await updateReservationStatusMutation({
          id: id as any,
          status: status,
          username: adminLoggedIn ? 'gestion53ym' : (activeManager?.username || 'cliente'),
          userRole: adminLoggedIn ? 'admin' : (activeManager ? 'manager' : 'cliente'),
        });
      } catch (err) {
        console.warn('Error updating Convex reservation status:', err);
      }
    }
  };

  const handleCancelReservation = async (id: string) => {
    // If client is cancelling, it goes to 'cancellation_pending'
    const newStatus = (adminLoggedIn || activeManager) ? 'cancelled' : 'cancellation_pending';
    await updateReservationStatus(id, newStatus);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'menu') {
      setCurrentView('menu');
    }
  }, []);

  const [pendingReservation, setPendingReservation] = useState<any>(null);

  const handleSendReservationAndOrder = async (reservation: any, cartItems: any[], totalPrice: number) => {
    try {
      const result = await createReservationAndOrderMutation({
        customerName: sanitizeString(reservation.name || reservation.customerName || 'Cliente'),
        date: reservation.date || new Date().toISOString().split('T')[0],
        timeSlot: reservation.time || reservation.timeSlot || '12:00',
        area: reservation.occasion || 'Cena casual',
        guests: Number(reservation.guests || reservation.people) || 2,
        phone: reservation.phone || '',
        email: reservation.email || '',
        occasion: reservation.occasion || 'Cena casual',
        dishReference: reservation.dishReference || '',
        items: cartItems.map(c => ({
          id: c.item.id,
          name: sanitizeString(c.item.name),
          quantity: c.quantity,
          priceCUP: c.item.priceCUP,
          priceUSD: c.item.priceUSD || (c.item.priceCUP / (appData.exchangeRate?.usdCUP || 320)),
          notes: '',
        })),
        totalCUP: totalPrice,
        totalUSD: totalPrice / (appData.exchangeRate?.usdCUP || 320),
      });

      if (!result || !result.reservationId || !result.orderId) {
        throw new Error("Respuesta inválida de Convex al crear reserva y pedido");
      }

      const resId = result.reservationId;
      const ordId = result.orderId;

      const newReservation = {
        id: resId,
        name: reservation.name || 'Cliente',
        phone: reservation.phone || '',
        email: reservation.email || '',
        date: reservation.date || '',
        time: reservation.time || '',
        guests: Number(reservation.guests) || 2,
        occasion: reservation.occasion || 'Cena casual',
        dishReference: reservation.dishReference || '',
        status: 'pending' as const,
        createdAt: Date.now(),
      };

      const newOrder = {
        id: ordId,
        tableNumber: `Reserva - ${reservation.name || 'Cliente'}`,
        items: cartItems.map(c => `${c.quantity}x ${c.item.name}`),
        orderItems: cartItems.map(c => ({
          id: c.item.id,
          name: c.item.name,
          quantity: c.quantity,
          priceCUP: c.item.priceCUP,
          priceUSD: c.item.priceUSD || (c.item.priceCUP / (appData.exchangeRate?.usdCUP || 320)),
          notes: '',
        })),
        totalCUP: totalPrice,
        totalUSD: totalPrice / (appData.exchangeRate?.usdCUP || 320),
        status: 'pending_dependent' as const,
        timestamp: Date.now(),
        assignedDependentId: 'no_assigned',
        reservationId: resId,
      };

      updateData({
        reservations: [newReservation, ...(appData.reservations || [])],
        orders: [newOrder, ...(appData.orders || [])]
      });

      alert("¡Tu reservación y pedido han sido enviados con éxito! Queda pendiente de confirmación por el Administrador.");
      setPendingReservation(null);
      setCurrentView('order_workspace');
      window.scrollTo(0, 0);
      return result;
    } catch (err: any) {
      console.error("Error creating reservation and order:", err);
      alert("Hubo un problema al enviar su reserva y pedido al servidor Convex. Por favor intente nuevamente.");
      throw err;
    }
  };

  const handleReservationComplete = async (reservationData: any, advanceOrder?: boolean) => {
    const cleanData = sanitizeObjectKeys(reservationData);
    
    if (advanceOrder) {
      const tempReservation = {
        ...cleanData,
        id: 'temp-' + Math.random().toString(36).substr(2, 9),
        status: 'pending' as const,
        createdAt: Date.now()
      };
      setPendingReservation(tempReservation);
      setCurrentView('menu');
      window.scrollTo(0, 0);
      return;
    }

    try {
      const convexId = await createReservationMutation({
        customerName: sanitizeString(cleanData.name || cleanData.customerName || 'Cliente'),
        date: cleanData.date || new Date().toISOString().split('T')[0],
        timeSlot: cleanData.time || cleanData.timeSlot || '12:00',
        area: cleanData.occasion || 'Cena casual',
        guests: Number(cleanData.guests || cleanData.people) || 2,
        phone: cleanData.phone || '',
        email: cleanData.email || '',
        occasion: cleanData.occasion || 'Cena casual',
        dishReference: cleanData.dishReference || '',
      });

      if (!convexId) {
        throw new Error("No se pudo obtener ID de Convex para la reserva");
      }

      const newReservation = {
        id: convexId,
        name: cleanData.name || 'Cliente',
        phone: cleanData.phone || '',
        email: cleanData.email || '',
        date: cleanData.date || '',
        time: cleanData.time || '',
        guests: Number(cleanData.guests) || 2,
        occasion: cleanData.occasion || 'Cena casual',
        dishReference: cleanData.dishReference || '',
        status: 'pending' as const,
        createdAt: Date.now()
      };
      
      const updatedReservations = [newReservation, ...(appData.reservations || [])];
      updateData({ reservations: updatedReservations });
      
      setSelectedDishForReservation(undefined);
      
      alert("¡Tu reservación ha sido enviada con éxito! Queda pendiente de confirmación por el Administrador.");
      
      setCurrentView('order_workspace');
      window.scrollTo(0, 0);
    } catch (e: any) {
      console.error('Convex reservation write error:', e);
      alert("Error al enviar la reservación al servidor Convex. Por favor, verifique los datos e intente nuevamente.");
    }
  };

  const renderView = () => {
    if (currentView === 'admin') {
      if (userRole !== 'admin') {
        setIsLoginModalOpen(true);
        setCurrentView('home');
        return null;
      }
      return (
        <div className="space-y-6">
          <AdminPanel data={appData} updateData={updateData} updateStatus={updateReservationStatus} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ConvexErrorBoundary fallbackTitle="Bitácora Operacional (Admin)">
              <BitacoraStream requesterRole={userRole} />
            </ConvexErrorBoundary>
          </div>
        </div>
      );
    }

    if (currentView === 'manager') {
      if (userRole !== 'manager') {
        setIsLoginModalOpen(true);
        setCurrentView('home');
        return null;
      }
      return (
        <div className="space-y-6">
          <ManagerPanel 
            data={appData} 
            updateData={updateData} 
            managerInfo={activeManager!} 
            updateStatus={updateReservationStatus} 
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ConvexErrorBoundary fallbackTitle="Bitácora Operacional (Gerencia)">
              <BitacoraStream requesterRole={userRole} />
            </ConvexErrorBoundary>
          </div>
        </div>
      );
    }

    if (currentView === 'dependent') {
      if (userRole !== 'dependent') {
        setIsLoginModalOpen(true);
        setCurrentView('home');
        return null;
      }
      return (
        <div className="space-y-6">
          <DependentPanel data={appData} updateData={updateData} dependentInfo={activeDependent!} />
        </div>
      );
    }

    if (currentView === 'kitchen') {
      if (userRole !== 'kitchen' && userRole !== 'admin') {
        setIsLoginModalOpen(true);
        setCurrentView('home');
        return null;
      }
      return (
        <div className="space-y-6">
          <KitchenPanel 
            data={appData} 
            updateData={updateData} 
            kitchenInfo={activeKitchen || { name: 'Cocina Principal', username: 'cocina_53m', password: '' }} 
          />
        </div>
      );
    }

    switch (currentView) {
      case 'menu':
        return <FullMenu 
          menuItems={appData.menuItems || []}
          exchangeRate={appData.exchangeRate}
          pendingReservation={pendingReservation}
          onSubmitReservationAndOrder={handleSendReservationAndOrder}
          updateData={updateData}
          onClose={() => {
            setCurrentView('home');
            window.scrollTo(0, 0);
          }} 
        />;
      case 'reservation':
        return (
          <ReservationWizard 
            initialDish={selectedDishForReservation}
            onComplete={handleReservationComplete}
            onCancel={() => {
              setCurrentView('home');
              setSelectedDishForReservation(undefined);
            }}
          />
        );
      case 'dashboard':
        return (
          <UserDashboard 
            reservations={appData.reservations} 
            data={appData}
            updateData={updateData}
            onUpdateReservation={handleUpdateReservation}
            onCancelReservation={handleCancelReservation}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOrderWorkspace={() => {
              setCurrentView('order_workspace');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        );
      case 'order_workspace':
        return (
          <ClientOrderWorkspace
            data={appData}
            updateData={updateData}
            onBack={() => {
              setCurrentView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        );
      case 'home':
      default:
        return (
          <>
            <Hero 
              config={appData.landingConfig}
              showQuestionnaire={showFirstTimeModal && userRole === 'none'}
              onCompleteQuestionnaire={(name, goToMenu) => {
                const trimmed = name.trim();
                if (trimmed) {
                  localStorage.setItem('clientUserName', trimmed);
                  setShowFirstTimeModal(false);
                  if (goToMenu) {
                    setCurrentView('order_workspace');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }
              }}
              onReserve={() => {
                if (userRole !== 'none') {
                  alert(t('Las cuentas de Administrador, Dependiente y Cocina no realizan reservas.'));
                  return;
                }
                setCurrentView('reservation');
              }} 
              onMenu={() => {
                setCurrentView('menu');
                window.scrollTo(0, 0);
              }} 
            />
            
            {/* About & Team Preview */}
            <section className="py-24 bg-stone-50" id="about">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                  <div>
                    <h3 className="text-3xl md:text-4xl font-serif text-dark-green mb-6 flex items-center flex-wrap gap-2">
                      {t('Nosotros')} <Logo variant="svg" className="h-10 md:h-12 inline-block ml-2" />
                    </h3>
                    <p className="text-stone-600 mb-6 leading-relaxed">
                      {t(appData.landingConfig.aboutText1)}
                    </p>
                    <p className="text-stone-600 mb-6 leading-relaxed">
                      {t(appData.landingConfig.aboutText2)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-8">
                      {(appData.landingConfig.aboutTags || []).map(val => (
                        <span key={val} className="bg-white border border-gold/30 text-dark-green px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                          {t(val)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 border-2 border-gold rounded-3xl transform translate-x-4 translate-y-4"></div>
                    <img 
                      src={appData.landingConfig.aboutImage}
                      alt="Ambiente" 
                      loading="lazy"
                      className="relative z-10 w-full h-auto rounded-3xl shadow-2xl object-cover aspect-[4/3]"
                    />
                  </div>
                </div>

                {/* Team Photo Gallery */}
                {(appData.landingConfig.teamImages && appData.landingConfig.teamImages.length > 0) && (
                  <div className="pt-12 border-t border-stone-200">
                    <div className="text-center mb-10">
                      <h4 className="text-2xl md:text-3xl font-serif text-dark-green mb-2 inline-block relative">
                        {t('Nuestro Equipo')}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gold"></div>
                      </h4>
                      <p className="text-stone-500 mt-4 text-sm font-light">{t('Las manos y rostros que hacen posible la excelencia en 53&M')}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {appData.landingConfig.teamImages.map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          className="group relative overflow-hidden rounded-2xl bg-white shadow-md border border-stone-200 hover:shadow-xl transition-all duration-300 aspect-[3/4]"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Equipo 53&M ${idx + 1}`} 
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                            <span className="text-white text-xs font-serif font-bold tracking-wider">
                              {t('Equipo 53&M')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Services services={appData.landingConfig.services || []} />
            <Gallery images={appData.landingConfig.galleryImages || []} />
            <MenuViewer 
              isPreview={true}
              menuItems={appData.menuItems || []}
              exchangeRate={appData.exchangeRate}
              onConsultMenu={() => {
                setCurrentView('menu');
                window.scrollTo(0, 0);
              }}
            />
            <Promotions promotions={appData.landingConfig.promotions || []} />
            <Testimonials />
            <FAQ />
            <Contact 
              config={appData.landingConfig}
              onReserve={() => {
                if (userRole !== 'none') {
                  alert(t('Las cuentas de Administrador, Dependiente y Cocina no realizan reservas.'));
                  return;
                }
                setCurrentView('reservation');
              }} 
            />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation 
        currentView={currentView} 
        setView={setCurrentView} 
        userRole={userRole}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        deviceId={deviceId}
        data={appData}
      />
      
      <main className="flex-grow">
        {renderView()}
      </main>

      {currentView !== 'reservation' && (
        <footer className="bg-stone-900 text-stone-400 py-12 text-center border-t border-stone-800">
          <div className="flex justify-center mb-6">
            <Logo variant="png" className="h-16 md:h-20 filter brightness-110 drop-shadow-md" />
          </div>
          <p className="mb-8">{t(appData.landingConfig.footerText)}</p>
          <p className="text-sm border-t border-stone-800 pt-8 max-w-xl mx-auto">
            &copy; {new Date().getFullYear()} {t('Restaurante - Terraza 53&M. Todos los derechos reservados.')}
          </p>
        </footer>
      )}

      {userRole === 'none' && currentView !== 'reservation' && currentView !== 'menu' && currentView !== 'dashboard' && (
        <FloatingWhatsApp 
          currentView={currentView} 
          onReserve={() => {
            setCurrentView('reservation');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          onOrder={() => {
            setCurrentView('order_workspace');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      <LoginModal 
        data={appData}
        isOpen={isLoginModalOpen}
        deviceId={deviceId}
        onClose={() => setIsLoginModalOpen(false)}
        onAdminLogin={async () => {
          try {
            await authorizeUserMutation({
              username: 'admin_53m',
              name: 'Administrador Principal',
              role: 'admin',
              deviceId
            });
          } catch (e) {
            console.warn('Convex auth notice:', e);
          }
          setAdminLoggedIn(true);
          setActiveDependent(null);
          setActiveManager(null);
          setActiveKitchen(null);
          setCurrentView('admin');
        }}
        onManagerLogin={async (mgr) => {
          try {
            await authorizeUserMutation({
              username: sanitizeString(mgr.username || 'jefe_restaurante'),
              name: sanitizeString(mgr.name || 'Jefe de Restaurante'),
              role: 'manager',
              deviceId
            });
          } catch (e) {
            console.warn('Convex auth notice:', e);
          }
          setActiveManager(mgr);
          setAdminLoggedIn(false);
          setActiveDependent(null);
          setActiveKitchen(null);
          setCurrentView('manager');
        }}
        onDependentLogin={async (dep) => {
          try {
            await authorizeUserMutation({
              username: sanitizeString(dep.username || 'dependiente'),
              name: sanitizeString(dep.name || 'Dependiente'),
              role: 'dependent',
              deviceId
            });
          } catch (e) {
            console.warn('Convex auth notice:', e);
          }
          setActiveDependent(dep);
          setAdminLoggedIn(false);
          setActiveManager(null);
          setActiveKitchen(null);
          setCurrentView('dependent');
        }}
        onKitchenLogin={async (kitchen) => {
          try {
            await authorizeUserMutation({
              username: sanitizeString(kitchen.username || 'cocina_53m'),
              name: sanitizeString(kitchen.name || 'Cocina Principal'),
              role: 'kitchen',
              deviceId
            });
          } catch (e) {
            console.warn('Convex auth notice:', e);
          }
          setActiveKitchen(kitchen);
          setAdminLoggedIn(false);
          setActiveManager(null);
          setActiveDependent(null);
          setCurrentView('kitchen');
        }}
      />

      <PWAInstallBanner />
    </div>
  );
}

