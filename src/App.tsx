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
import { UserDashboard } from './components/UserDashboard';
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
import { useDataSync } from './hooks/useDataSync';
import { useDeviceId } from './hooks/useDeviceId';
import { DependentConfig, ManagerConfig, Reservation, AppData } from './types';
import { ADMIN_DEVICE_IDS } from './utils/deviceUtils';
import { useLanguage } from './context/LanguageContext';
import { MENU_ITEMS } from './data';

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
  const { data, loading, updateData: rawUpdateData, syncExcelencia } = useDataSync();

  // Convex Reactive Queries & Mutations (Safe Mode)
  const liveUser = useQuery(api.users.getLiveUserByDeviceId, { deviceId });
  const liveOrders = useQuery(api.orders.getLiveOrders);
  const liveReservations = useQuery(api.reservations.getLiveReservations);
  const liveLogs = useQuery(api.bitacora.getLiveLogs, { limit: 100 });
  const liveExchangeRate = useQuery(api.admin.getSetting, { key: "exchangeRate" });
  const liveLandingConfig = useQuery(api.admin.getSetting, { key: "landingConfig" });
  const liveAdminConfig = useQuery(api.admin.getSetting, { key: "adminConfig" });

  const liveMenuItems = useQuery(api.menuItems.getLiveMenuItems);
  const convexUsers = useQuery(api.users.getAllUsers) || [];

  const mappedReservations = useMemo(() => {
    const raw = (liveReservations !== undefined) ? liveReservations : (data.reservations || []);
    return raw.map((lr: any) => ({
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
  }, [liveReservations, data.reservations]);

  const mappedOrders = useMemo(() => {
    const raw = (liveOrders !== undefined) ? liveOrders : (data.orders || []);
    return raw.map((lo: any) => {
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
  }, [liveOrders, data.orders]);

  // Create a merged AppData object that combines local data with live Convex users, reservations, and orders!
  const mergedData = useMemo(() => {
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

    
    

    const mappedAuditLogs = (!liveLogs) ? (data.auditLogs || []) : liveLogs.map((log: any) => ({
      id: log._id,
      timestamp: log.timestamp,
      timeStr: new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date(log.timestamp).toLocaleDateString('es-ES'),
      role: log.userRole || 'SISTEMA',
      userOrDevice: log.username || 'usuario',
      action: log.action || '',
      details: log.action || ''
    }));

    const currentExchangeRate = liveExchangeRate || data.exchangeRate;
    const currentLandingConfig = liveLandingConfig || data.landingConfig;
    const currentAdminConfig = liveAdminConfig || data.adminConfig;
    
    const mappedMenuItems = (liveMenuItems && liveMenuItems.length > 0)
      ? liveMenuItems.map((item: any) => ({
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
        }))
      : (data.menuItems || []);

    return {
      ...data,
      exchangeRate: currentExchangeRate,
      landingConfig: currentLandingConfig,
      menuItems: mappedMenuItems,
      reservations: mappedReservations,
      orders: mappedOrders,
      managers: dbManagers,
      dependents: dbDependents,
      auditLogs: mappedAuditLogs,
      adminConfig: currentAdminConfig
    };
  }, [data, convexUsers, mappedReservations, mappedOrders, liveExchangeRate, liveLandingConfig, liveAdminConfig, liveMenuItems, liveLogs]);

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

  // Wrapper to intercept local UI state updates and synchronize them to Convex
  const updateData = (newData: Partial<AppData>) => {
    // Sync settings to Convex
    if (newData.exchangeRate && JSON.stringify(newData.exchangeRate) !== JSON.stringify(data.exchangeRate)) {
      updateSettingMutation({ key: "exchangeRate", value: newData.exchangeRate }).catch(console.warn);
    }
    if (newData.landingConfig && JSON.stringify(newData.landingConfig) !== JSON.stringify(data.landingConfig)) {
      updateSettingMutation({ key: "landingConfig", value: newData.landingConfig }).catch(console.warn);
    }
    if (newData.menuItems && JSON.stringify(newData.menuItems) !== JSON.stringify(data.menuItems)) {
      syncMenuItemsMutation({ 
        items: newData.menuItems.map((item: any) => ({
          name: item.name || '',
          category: item.category || 'Otros',
          priceCUP: item.priceCUP || 0,
          priceUSD: item.priceUSD || 0,
          isAvailable: item.isAvailable !== false,
          image: item.image || '',
        })),
        username: 'Administrador'
      }).catch(console.warn);
    }

    // 1. Sync local audit logs to Convex
    if (newData.auditLogs && newData.auditLogs.length > 0) {
      const existing = data.auditLogs || [];
      const newLogs = newData.auditLogs.filter(nl => !existing.some(el => el.id === nl.id || (el.action === nl.action && Math.abs(el.timestamp - nl.timestamp) < 5000)));
      newLogs.forEach((log: any) => {
        addLogMutation({
          action: log.action || log.details || '',
          userRole: log.role || log.userRole || 'cliente',
          username: log.userOrDevice || log.username || 'Cliente',
        }).catch(err => console.warn('Convex addLog error:', err));
      });
    }

    // 2. Sync local order updates to Convex
    if (newData.orders && newData.orders.length > 0) {
      const existing = data.orders || [];
      newData.orders.forEach((newOrder: any) => {
        const oldOrder = existing.find(o => o.id === newOrder.id) as any;
        const isNew = !oldOrder;
        const isUpdated = oldOrder && (
          oldOrder.status !== newOrder.status ||
          oldOrder.tableNumber !== newOrder.tableNumber ||
          JSON.stringify(oldOrder.orderItems || oldOrder.items) !== JSON.stringify(newOrder.orderItems || newOrder.items)
        );

        if (isNew || isUpdated) {
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
          const totalUSD = totalCUP / (data.exchangeRate?.usdCUP || 320);

          syncOrUpdateOrderMutation({
            id: newOrder.id,
            tableNumber: newOrder.tableNumber || 'Mesa 1',
            items: formattedItems,
            totalCUP: totalCUP || newOrder.totalAmountCUP || 0,
            totalUSD: totalUSD || newOrder.totalAmountUSD || 0,
            status: newOrder.status || 'pending_dependent',
            timestamp: newOrder.timestamp || Date.now(),
            assignedDependentId: newOrder.comandaId || 'no_assigned',
            reservationId: newOrder.reservationId || undefined,
          }).catch(err => console.warn('Convex syncOrder error:', err));
        }
      });
    }

    // Call raw state updates
    rawUpdateData(newData);
  };

  // Active Sessions state
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [activeDependent, setActiveDependent] = useState<DependentConfig | null>(null);
  const [activeManager, setActiveManager] = useState<ManagerConfig | null>(null);

  // Real-Time Session Verification via Convex & Fallback local check
  useEffect(() => {
    const checkSessions = async () => {
      const currentDeviceIdClean = deviceId.trim().toUpperCase();
      const isAdminDevice = ADMIN_DEVICE_IDS.includes(currentDeviceIdClean); 

      // If Convex liveUser exists and is active, automatically recognize user
      if (liveUser && liveUser.isActive) {
        if (liveUser.role === 'admin') {
          setAdminLoggedIn(true);
          setActiveManager(null);
          setActiveDependent(null);
          return;
        }
        if (liveUser.role === 'manager') {
          const mgrMatch = (mergedData.managers || []).find(m => m.username === liveUser.username || m.deviceId === deviceId);
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
          return;
        }
        if (liveUser.role === 'dependent') {
          const depMatch = (mergedData.dependents || []).find(d => d.username === liveUser.username || d.deviceId === deviceId);
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
          return;
        }
      }

      // Local storage fallback for backwards compatibility
      const savedAdmin = localStorage.getItem('adminSession');
      if (isAdminDevice && savedAdmin) {
        setAdminLoggedIn(true);
      } else {
        setAdminLoggedIn(false);
      }

      const savedManager = localStorage.getItem('managerSession');
      if (savedManager) {
        try {
          const parsed = JSON.parse(savedManager);
          const mgrMatch = (mergedData.managers || []).find(m => m.id === parsed.id || m.username === parsed.username);
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
          const depMatch = mergedData.dependents.find(d => d.id === parsed.id || d.username === parsed.username || d.deviceId === parsed.deviceId);
          if (depMatch && depMatch.isActive !== false) {
            setActiveDependent(depMatch);
          }
        } catch (e) {
          localStorage.removeItem('dependentSession');
        }
      }
    };

    if (!loading) {
      checkSessions();
    }
  }, [loading, liveUser, deviceId, mergedData.dependents, mergedData.managers, mergedData.adminConfig]);

  // Determine User Role
  let userRole: 'admin' | 'manager' | 'dependent' | 'none' = 'none';
  if (adminLoggedIn) {
    userRole = 'admin';
  } else if (activeManager) {
    userRole = 'manager';
  } else if (activeDependent) {
    userRole = 'dependent';
  }

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
    const updatedReservations = data.reservations.map(r => 
      r.id === id ? { ...r, ...cleanDetails, status: 'pending' } : r
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
    // 1. Update in local State/LocalStorage
    const updated = data.reservations.map(r => r.id === id ? { ...r, status } : r);
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

  const mappedLogs = useMemo(() => {
    const raw = (liveLogs !== undefined) ? liveLogs : (data.auditLogs || []);
    return raw.map((ll: any) => ({
      id: ll._id || ll.id,
      timestamp: ll.timestamp || Date.now(),
      timeStr: new Date(ll.timestamp || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date(ll.timestamp || Date.now()).toLocaleDateString('es-ES'),
      role: (ll.userRole === 'admin' ? 'Administrador' :
             ll.userRole === 'manager' ? 'Gerente' :
             ll.userRole === 'dependent' ? 'Dependiente' :
             ll.userRole === 'kitchen' ? 'Cocina' :
             ll.userRole === 'sistema' ? 'Sistema' : 'Cliente') as any,
      userOrDevice: ll.username || ll.userOrDevice || 'Cliente',
      action: ll.action || ll.details || '',
      details: ll.action || ll.details || '',
    })).sort((a: any, b: any) => b.timestamp - a.timestamp);
  }, [liveLogs, data.auditLogs]);

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
          priceUSD: c.item.priceUSD || (c.item.priceCUP / (data.exchangeRate?.usdCUP || 320)),
          notes: '',
        })),
        totalCUP: totalPrice,
        totalUSD: totalPrice / (data.exchangeRate?.usdCUP || 320),
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
          priceUSD: c.item.priceUSD || (c.item.priceCUP / (data.exchangeRate?.usdCUP || 320)),
          notes: '',
        })),
        totalCUP: totalPrice,
        totalUSD: totalPrice / (data.exchangeRate?.usdCUP || 320),
        status: 'pending_dependent',
        timestamp: Date.now(),
        assignedDependentId: 'no_assigned',
        reservationId: resId,
      };

      updateData({
        reservations: [newReservation, ...(data.reservations || [])],
        orders: [newOrder, ...(data.orders || [])]
      });

      alert("¡Tu reservación y pedido han sido enviados con éxito! Queda pendiente de confirmación por el Administrador.");
      setPendingReservation(null);
      setCurrentView('dashboard');
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
      
      const updatedReservations = [newReservation, ...(data.reservations || [])];
      updateData({ reservations: updatedReservations });
      
      setSelectedDishForReservation(undefined);
      
      alert("¡Tu reservación ha sido enviada con éxito! Queda pendiente de confirmación por el Administrador.");
      
      setCurrentView('dashboard');
      window.scrollTo(0, 0);
    } catch (e: any) {
      console.error('Convex reservation write error:', e);
      alert("Error al enviar la reservación al servidor Convex. Por favor, verifique los datos e intente nuevamente.");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-dark-green font-serif text-2xl">Cargando 53&M...</div>;
  }

  const renderView = () => {
    if (currentView === 'admin') {
      if (userRole !== 'admin') {
        setIsLoginModalOpen(true);
        setCurrentView('home');
        return null;
      }
      return (
        <div className="space-y-6">
          <AdminPanel data={mergedData} updateData={updateData} updateStatus={updateReservationStatus} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ConvexErrorBoundary fallbackTitle="Bitácora Operacional (Admin)">
              <BitacoraStream />
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
            data={mergedData} 
            updateData={updateData} 
            managerInfo={activeManager!} 
            updateStatus={updateReservationStatus} 
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ConvexErrorBoundary fallbackTitle="Bitácora Operacional (Gerencia)">
              <BitacoraStream />
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
          <DependentPanel data={mergedData} updateData={updateData} dependentInfo={activeDependent!} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ConvexErrorBoundary fallbackTitle="Bitácora Operacional (Dependientes)">
              <BitacoraStream />
            </ConvexErrorBoundary>
          </div>
        </div>
      );
    }

    if (currentView === 'kitchen') {
      return (
        <div className="space-y-6">
          <KitchenPanel 
            data={mergedData} 
            updateData={updateData} 
            kitchenInfo={{ name: 'Cocina Principal', username: 'cocina_53m', password: '' }} 
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ConvexErrorBoundary fallbackTitle="Bitácora Operacional (Cocina)">
              <BitacoraStream />
            </ConvexErrorBoundary>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'menu':
        return <FullMenu 
          menuItems={mergedData.menuItems || []}
          exchangeRate={mergedData.exchangeRate}
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
            reservations={liveReservations || data.reservations} 
            data={mergedData}
            updateData={updateData}
            onUpdateReservation={handleUpdateReservation}
            onCancelReservation={handleCancelReservation}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        );
      case 'home':
      default:
        return (
          <>
            <Hero 
              config={data.landingConfig}
              onReserve={() => {
                if (userRole !== 'none') {
                  alert(t('Las cuentas de Administrador y Dependiente no realizan reservas.'));
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
                      {t(data.landingConfig.aboutText1)}
                    </p>
                    <p className="text-stone-600 mb-6 leading-relaxed">
                      {t(data.landingConfig.aboutText2)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-8">
                      {(data.landingConfig.aboutTags || []).map(val => (
                        <span key={val} className="bg-white border border-gold/30 text-dark-green px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                          {t(val)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 border-2 border-gold rounded-3xl transform translate-x-4 translate-y-4"></div>
                    <img 
                      src={data.landingConfig.aboutImage}
                      alt="Ambiente" 
                      loading="lazy"
                      className="relative z-10 w-full h-auto rounded-3xl shadow-2xl object-cover aspect-[4/3]"
                    />
                  </div>
                </div>

                {/* Team Photo Gallery */}
                {(data.landingConfig.teamImages && data.landingConfig.teamImages.length > 0) && (
                  <div className="pt-12 border-t border-stone-200">
                    <div className="text-center mb-10">
                      <h4 className="text-2xl md:text-3xl font-serif text-dark-green mb-2 inline-block relative">
                        {t('Nuestro Equipo')}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gold"></div>
                      </h4>
                      <p className="text-stone-500 mt-4 text-sm font-light">{t('Las manos y rostros que hacen posible la excelencia en 53&M')}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {data.landingConfig.teamImages.map((imgUrl, idx) => (
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

            <Services services={data.landingConfig.services || []} />
            <Gallery images={data.landingConfig.galleryImages || []} />
            <MenuViewer 
              isPreview={true}
              menuItems={data.menuItems || []}
              exchangeRate={data.exchangeRate}
              onConsultMenu={() => {
                setCurrentView('menu');
                window.scrollTo(0, 0);
              }}
            />
            <Promotions promotions={data.landingConfig.promotions || []} />
            <Testimonials />
            <FAQ />
            <Contact 
              config={data.landingConfig}
              onReserve={() => {
                if (userRole !== 'none') {
                  alert(t('Las cuentas de Administrador y Dependiente no realizan reservas.'));
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
        onSyncExcelencia={syncExcelencia}
        deviceId={deviceId}
        data={mergedData}
      />
      
      <main className="flex-grow">
        {renderView()}
      </main>

      {currentView !== 'reservation' && (
        <footer className="bg-stone-900 text-stone-400 py-12 text-center border-t border-stone-800">
          <div className="flex justify-center mb-6">
            <Logo variant="png" className="h-16 md:h-20 filter brightness-110 drop-shadow-md" />
          </div>
          <p className="mb-8">{t(data.landingConfig.footerText)}</p>
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
        />
      )}

      <LoginModal 
        data={mergedData}
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
          setCurrentView('dependent');
        }}
      />

      <PWAInstallBanner />

      {showFirstTimeModal && userRole === 'none' && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-stone-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-dark-green/10 text-dark-green rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                👋
              </div>
              <h3 className="text-2xl font-serif text-dark-green mb-2">¡Bienvenido a 53&M!</h3>
              <p className="text-sm text-stone-600">
                Para mejorar tu experiencia en el restaurante y terraza, por favor ingresa tu nombre:
              </p>
            </div>
            <form onSubmit={handleSaveFirstTimeName} className="space-y-4">
              <input
                type="text"
                placeholder="Tu nombre (ej. Carlos Pérez)"
                value={firstTimeName}
                onChange={(e) => setFirstTimeName(e.target.value)}
                autoFocus
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold outline-none text-stone-800 font-medium text-center text-lg"
              />
              <button
                type="submit"
                disabled={!firstTimeName.trim()}
                className="w-full bg-dark-green text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                Comenzar Experiencia
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

