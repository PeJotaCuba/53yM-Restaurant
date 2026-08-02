import React, { useState, useEffect, useRef } from 'react';
import { AppData, Order, OrderItem, Comanda } from '../types';
import { 
  Utensils, Plus, Trash2, Send, ShoppingBag, Download, ArrowLeft, 
  MessageCircle, X, QrCode, Camera, CheckCircle2, Image as ImageIcon, 
  AlertTriangle, RotateCcw, Sparkles, BookOpen, Clock, ChevronRight,
  ChefHat, Bell, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceId } from '../hooks/useDeviceId';
import { useLanguage } from '../context/LanguageContext';
import { jsPDF } from 'jspdf';
import { Html5Qrcode } from 'html5-qrcode';
import { FullMenu } from './FullMenu';

interface ClientOrderWorkspaceProps {
  data?: AppData;
  updateData?: (data: Partial<AppData>) => void;
  onBack: () => void;
}

export function ClientOrderWorkspace({ data, updateData, onBack }: ClientOrderWorkspaceProps) {
  const { t } = useLanguage();
  const deviceId = useDeviceId();

  const [clientTable, setClientTable] = useState('');
  const [clientName, setClientName] = useState('');
  
  // Selection Flow States
  const [showMesaSelection, setShowMesaSelection] = useState(true);
  const [selectionMode, setSelectionMode] = useState<'options' | 'qr' | 'manual' | 'qr_success'>('options');
  const [scannedTable, setScannedTable] = useState('');
  const [qrError, setQrError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Cart & Order Review States
  const [isReviewingOrder, setIsReviewingOrder] = useState(false);
  const [selectedDishName, setSelectedDishName] = useState(data?.menuItems[0]?.name || '');
  const [dishRations, setDishRations] = useState<number>(1);
  const [cartItems, setCartItems] = useState<{ dishName: string; quantity: number; priceCUP: number }[]>([]);
  const [showClosedComandas, setShowClosedComandas] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'welcome' | 'consult' | 'order'>('welcome');
  const [targetAnnexedComandaId, setTargetAnnexedComandaId] = useState<string | undefined>(undefined);

  const getComandaOrdersClient = (com?: Comanda | null, allOrders: Order[] = []) => {
    if (!com) return [];
    const comOrders = com.orders || [];
    const liveOrders = allOrders.filter(o => {
      if (o.comandaId && o.comandaId === com.id) return true;
      return comOrders.some(co => 
        (co.id && (co.id === o.id || (co as any)._id === o.id)) || 
        ((co as any)._id && ((co as any)._id === o.id || (co as any)._id === (o as any)._id))
      );
    });
    const map = new Map<string, Order>();
    comOrders.forEach(o => {
      const key = o.id || (o as any)._id;
      if (key) map.set(key, o);
    });
    liveOrders.forEach(o => {
      const key = o.id || (o as any)._id;
      if (key) map.set(key, o);
    });
    return Array.from(map.values());
  };

  const getGroupOrdersClient = (com?: Comanda | null, allComandas: Comanda[] = [], allOrders: Order[] = []) => {
    if (!com) return [];
    const rootId = com.parentComandaId || com.id;
    const root = allComandas.find(c => c.id === rootId) || com;
    const annexed = allComandas.filter(c => c.parentComandaId === root.id && c.id !== root.id && c.status === 'open');
    const group = [root, ...annexed];
    const map = new Map<string, Order>();
    group.forEach(c => {
      getComandaOrdersClient(c, allOrders).forEach(o => {
        const key = o.id || (o as any)._id;
        if (key) map.set(key, o);
      });
    });
    return Array.from(map.values());
  };

  const handleClientAddAnnexedOrder = (rootComanda: Comanda) => {
    const rootId = rootComanda.parentComandaId || rootComanda.id;
    const shortId = Date.now().toString().slice(-4);
    const newAnnexedComandaId = `COM-ANX-${rootId}-${shortId}`;
    
    const newAnnexedComanda: Comanda = {
      id: newAnnexedComandaId,
      tableNumber: clientTable,
      customerName: rootComanda.customerName || clientName || 'Cliente Comensal',
      dependentId: rootComanda.dependentId,
      dependentName: rootComanda.dependentName,
      status: 'open',
      openedAt: Date.now(),
      orders: [],
      parentComandaId: rootId,
    };

    const updatedComandas = [newAnnexedComanda, ...(data?.comandas || [])];
    
    const depNotif = {
      id: `NOTIF-ANX-${Date.now()}`,
      timestamp: Date.now(),
      orderId: rootId,
      tableNumber: clientTable || '',
      targetRole: 'dependent' as const,
      title: `➕ Comanda Anexa: ${clientTable}`,
      message: `El cliente ${rootComanda.customerName || clientName || 'Comensal'} ha iniciado una comanda anexa.`
    };
    const updatedNotifications = [depNotif, ...(data?.notifications || [])].slice(0, 50);

    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Cliente' as const,
      userOrDevice: clientName.trim() || 'Cliente',
      action: 'Creación de Comanda Anexa',
      details: `Cliente inició Comanda Anexa #${newAnnexedComandaId} vinculada a comanda principal #${rootId} en ${clientTable}.`
    };

    if (updateData) {
      updateData({
        comandas: updatedComandas,
        notifications: updatedNotifications,
        auditLogs: [log, ...(data?.auditLogs || [])]
      });
    }

    setTargetAnnexedComandaId(newAnnexedComandaId);
    setActiveSubView('order');
  };

  const handleClientRequestPayment = (rootComanda: Comanda) => {
    const rootId = rootComanda.parentComandaId || rootComanda.id;
    const groupComandas = (data?.comandas || []).filter(
      c => (c.id === rootId || c.parentComandaId === rootId) && c.status === 'open'
    );

    const groupIds = groupComandas.map(c => c.id);

    const updatedComandas = (data?.comandas || []).map(c => {
      if (groupIds.includes(c.id)) {
        return { ...c, paymentRequested: true };
      }
      return c;
    });

    const depNotif = {
      id: `NOTIF-PAY-${Date.now()}`,
      timestamp: Date.now(),
      orderId: rootId,
      tableNumber: clientTable || '',
      targetRole: 'dependent' as const,
      title: `💳 Solicitud de Pago: ${clientTable}`,
      message: `El cliente ${rootComanda.customerName || clientName || 'Comensal'} solicita cerrar la cuenta.`
    };
    const updatedNotifications = [depNotif, ...(data?.notifications || [])].slice(0, 50);

    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Cliente' as const,
      userOrDevice: clientName.trim() || 'Cliente',
      action: 'Solicitud de Pago de Cuenta',
      details: `Cliente en ${clientTable} solicitó la cuenta para la comanda #${rootId}.`
    };

    if (updateData) {
      updateData({
        comandas: updatedComandas,
        notifications: updatedNotifications,
        auditLogs: [log, ...(data?.auditLogs || [])]
      });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Restore previous session or parsed URL QR query parameters on load
  useEffect(() => {
    // Check if there was a URL parameter for table/mesa
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table') || params.get('mesa') || window.location.hash.replace('#', '').split('=')[1];
    
    let initialTable = '';
    if (tableParam) {
      let resolved = tableParam.trim();
      if (!resolved.toLowerCase().startsWith('mesa')) {
        const num = parseInt(resolved.replace(/\D/g, ''), 10);
        if (!isNaN(num)) {
          resolved = `Mesa ${num}`;
        }
      }
      resolved = resolved.charAt(0).toUpperCase() + resolved.slice(1);
      initialTable = resolved;
      localStorage.setItem('scannedTable', resolved);
    }

    const savedTable = initialTable || localStorage.getItem('clientTable') || localStorage.getItem('scannedTable');
    const savedName = localStorage.getItem('clientUserName') || '';

    if (savedTable) {
      setClientTable(savedTable);
      setClientName(savedName);
      setShowMesaSelection(false);
    } else {
      setShowMesaSelection(true);
      setSelectionMode('options');
    }
  }, []);

  // 2. Set default dish name when menuItems are loaded
  useEffect(() => {
    if (data?.menuItems && data.menuItems.length > 0 && !selectedDishName) {
      setSelectedDishName(data.menuItems[0].name);
    }
  }, [data?.menuItems]);

  // 3. Derive tables dynamically from Convex data.dependents with fallback
  const configuredTables = Array.from(
    new Set([
      ...(data?.dependents || []).map(d => d.tableNumber),
      'Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6'
    ])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Helper to query table configuration from Convex (source of truth)
  const getTableConfig = (table: string) => {
    const activeComanda = data?.comandas?.find(c => c.tableNumber === table && c.status === 'open');
    const assignedDependent = data?.dependents?.find(d => d.tableNumber === table);
    return {
      activeComanda,
      assignedDependent,
      isShiftActive: data?.isShiftActive !== false,
      customerName: activeComanda?.customerName || '',
    };
  };

  const clientReadyOrders = (data?.orders || []).filter(o => o.status === 'kitchen_ready' && o.tableNumber === clientTable);
  const clientClosedComandas = (data?.comandas || []).filter(c => c.tableNumber === clientTable && c.status === 'closed').sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  // 4. In-App QR Scanning Camera Cycle
  useEffect(() => {
    if (selectionMode !== 'qr') return;

    let html5Qrcode: Html5Qrcode | null = null;
    const qrReaderId = 'qr-reader';
    setQrError('');
    setIsCameraActive(false);

    const timer = setTimeout(() => {
      try {
        html5Qrcode = new Html5Qrcode(qrReaderId);
        setIsCameraActive(true);
        html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            handleQrCodeDecoded(decodedText);
            if (html5Qrcode) {
              html5Qrcode.stop().catch(console.warn);
              setIsCameraActive(false);
            }
          },
          () => {
            // Passive scanner errors can be ignored safely
          }
        ).catch(err => {
          console.warn('Camera start error:', err);
          setQrError(t('No se pudo abrir la cámara. Asegúrate de otorgar permisos o utiliza la opción de subir una foto del código QR.'));
          setIsCameraActive(false);
        });
      } catch (e) {
        console.error('Html5Qrcode initialization failed', e);
        setQrError(t('Error de inicialización del escáner.'));
        setIsCameraActive(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => console.warn('Stopping scanner on unmount error:', err));
      }
    };
  }, [selectionMode]);

  // Decode QR content safely
  const handleQrCodeDecoded = (decodedText: string) => {
    let table = '';
    try {
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        const url = new URL(decodedText);
        const params = new URLSearchParams(url.search);
        table = params.get('table') || params.get('mesa') || '';
        if (!table && url.hash) {
          const hashParams = new URLSearchParams(url.hash.replace('#', ''));
          table = hashParams.get('table') || hashParams.get('mesa') || '';
        }
      } else {
        table = decodedText;
      }
    } catch (e) {
      table = decodedText;
    }

    table = table.trim();
    if (table) {
      if (!table.toLowerCase().startsWith('mesa')) {
        const num = parseInt(table.replace(/\D/g, ''), 10);
        if (!isNaN(num)) {
          table = `Mesa ${num}`;
        }
      }
      table = table.charAt(0).toUpperCase() + table.slice(1);
      
      setScannedTable(table);
      
      // Auto-fill client name if Convex already has an active comanda on this table
      const config = getTableConfig(table);
      if (config.customerName) {
        setClientName(config.customerName);
      }
      
      setSelectionMode('qr_success');
    } else {
      alert(t('El código QR escaneado no contiene una mesa válida del restaurante.'));
    }
  };

  // Upload/Image Scan Fallback
  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const dummyDiv = document.getElementById('qr-reader-dummy');
    if (!dummyDiv) return;

    const html5Qrcode = new Html5Qrcode('qr-reader-dummy');
    html5Qrcode.scanFile(file, true)
      .then(decodedText => {
        handleQrCodeDecoded(decodedText);
        html5Qrcode.clear();
      })
      .catch(err => {
        console.warn('File scanning error:', err);
        alert(t('No se pudo detectar ningún código QR en la imagen. Por favor toma una foto más nítida o ingresa la mesa manualmente.'));
        html5Qrcode.clear();
      });
  };

  const handleConfirmMesa = (table: string) => {
    if (!table) {
      alert(t('Por favor selecciona una mesa válida.'));
      return;
    }
    
    // Save to device localStorage
    localStorage.setItem('clientTable', table);
    if (clientName.trim()) {
      localStorage.setItem('clientUserName', clientName.trim());
    }
    
    setClientTable(table);
    setShowMesaSelection(false);
  };

  const handleLogoutMesa = () => {
    localStorage.removeItem('clientTable');
    localStorage.removeItem('scannedTable');
    setClientTable('');
    setShowMesaSelection(true);
    setSelectionMode('options');
    setActiveSubView('welcome');
  };

  const handleAddToCart = () => {
    const foundDish = data?.menuItems.find(m => m.name === selectedDishName);
    const priceCUP = foundDish ? foundDish.priceCUP : 100;

    const existingIndex = cartItems.findIndex(i => i.dishName === selectedDishName);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += dishRations;
      setCartItems(updated);
    } else {
      setCartItems(prev => [...prev, { dishName: selectedDishName, quantity: dishRations, priceCUP }]);
    }
    setDishRations(1);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((acc, item) => acc + (item.priceCUP * item.quantity), 0);
  };

  const handleSubmitCartOrder = () => {
    if (data?.isShiftActive === false) {
      alert(t('⚠️ La jornada actual no ha sido iniciada por el Administrador.'));
      return;
    }
    if (cartItems.length === 0) {
      alert(t('Agrega al menos un plato a tu pedido antes de enviar.'));
      return;
    }

    const orderItemsList: OrderItem[] = cartItems.map(c => ({
      name: c.dishName,
      quantity: c.quantity,
      priceCUP: c.priceCUP
    }));

    const rawItemsList = cartItems.map(c => `${c.quantity}x ${c.dishName}`);

    const totalCUP = calculateCartTotal();

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      tableNumber: clientTable,
      items: rawItemsList,
      orderItems: orderItemsList,
      totalCUP,
      status: 'client_pending',
      customerName: clientName.trim() || undefined,
      timestamp: Date.now()
    };

    if (updateData && data) {
      const updatedOrders = [...(data.orders || []), newOrder];
      const log = {
        id: `LOG-${Date.now()}`,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        dateStr: new Date().toLocaleDateString('es-ES'),
        role: 'Cliente' as const,
        userOrDevice: clientName.trim() || 'Cliente',
        action: 'Pedido Solicitado en Mesa',
        details: `Cliente solicitó pedido de ${cartItems.length} plato(s) en ${clientTable} (Enviado a Dependiente).`
      };
      updateData({
        orders: updatedOrders,
        auditLogs: [log, ...(data.auditLogs || [])]
      });
    }

    setCartItems([]);
    setIsReviewingOrder(false);
    alert(t('¡Tu pedido ha sido enviado al dependiente de tu mesa! El dependiente revisará tu pedido y lo mandará a cocina.'));
  };

  const generateComandaPDF = (com: any) => {
    try {
      const doc = new jsPDF();
      const totalCUP = com.totalAmountCUP || 0;
      const usdCUP = data?.exchangeRate?.usdCUP || 320;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('53&M RESTAURANT', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('COMPROBANTE DE CONSUMO - CLIENTE', 105, 28, { align: 'center' });
      doc.text('----------------------------------------------------', 105, 34, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Comanda ID: #${com.id}`, 20, 45);
      doc.text(`Mesa: ${com.tableNumber}`, 20, 52);
      doc.text(`Cliente: ${com.customerName || 'Cliente'}`, 20, 59);
      doc.text(`Fecha y Hora: ${new Date(com.closedAt || Date.now()).toLocaleDateString('es-ES')} ${new Date(com.closedAt || Date.now()).toLocaleTimeString('es-ES')}`, 20, 66);

      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE CONSUMO:', 20, 78);
      doc.setFont('helvetica', 'normal');

      let y = 86;
      if (com.orders) {
        com.orders.forEach((ord: any) => {
          if (ord.orderItems) {
            ord.orderItems.forEach((it: any) => {
              doc.text(`${it.quantity}x ${it.name}`, 25, y);
              doc.text(`$${(it.quantity * it.priceCUP).toLocaleString()} CUP`, 180, y, { align: 'right' });
              y += 7;
            });
          }
        });
      }

      doc.text('----------------------------------------------------', 105, y + 2, { align: 'center' });
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL:', 20, y);
      doc.text(`$${totalCUP.toLocaleString()} CUP`, 180, y, { align: 'right' });

      y += 8;
      doc.text('PAGO REALIZADO:', 20, y);
      doc.text(`${com.paymentSummaryStr || `$${totalCUP} CUP`}`, 180, y, { align: 'right' });

      y += 18;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('¡Gracias por su visita a 53&M Restaurant!', 105, y, { align: 'center' });

      doc.save(`Recibo_53yM_Mesa_${com.tableNumber}_${com.id.slice(-5)}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Error al generar el PDF. Por favor intente de nuevo.');
    }
  };

  return (
    <div className="pt-28 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      {/* Hidden container for HTML5 QR code scanning from image files */}
      <div id="qr-reader-dummy" style={{ display: 'none' }}></div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-stone-200/60 pb-6">
        <div>
          <button onClick={onBack} className="mb-4 text-stone-500 hover:text-dark-green font-bold text-sm flex items-center gap-1 transition-colors cursor-pointer">
            <ArrowLeft size={16} /> {t('Volver a Mi Perfil')}
          </button>
          <h2 className="text-4xl font-serif text-dark-green mb-2">{t('Hacer Pedido')}</h2>
          <p className="text-stone-500 text-sm">{t('Realiza y sigue tu pedido directamente en el restaurante')}</p>
        </div>
      </div>

      {clientReadyOrders.length > 0 && (
        <div className="bg-emerald-900 text-white rounded-3xl p-6 mb-8 shadow-2xl border-2 border-emerald-400/80 flex items-center gap-4 animate-fade-in">
          <div className="p-3 bg-emerald-800/80 rounded-2xl text-3xl shrink-0 animate-pulse border border-emerald-500/40">🔔</div>
          <div>
            <h4 className="font-serif font-bold text-lg text-white">¡Tu Pedido está listo en cocina!</h4>
            <p className="text-xs text-emerald-100 mt-1">El dependiente te lo servirá en breve.</p>
          </div>
        </div>
      )}

      {showMesaSelection ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-100 shadow-sm max-w-lg mx-auto animate-fade-in">
          {selectionMode === 'options' && (
            <div className="text-center space-y-6">
              <div className="bg-stone-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border border-stone-100">
                <Utensils className="w-10 h-10 text-dark-green" />
              </div>
              <div>
                <h3 className="text-2xl font-serif text-stone-800 mb-2">{t('Selecciona tu mesa')}</h3>
                <p className="text-stone-500 text-sm">{t('Elige cómo deseas identificar la mesa en la que te encuentras para comenzar tu pedido.')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => setSelectionMode('qr')}
                  className="bg-dark-green hover:bg-stone-900 text-white p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-md group border border-transparent cursor-pointer"
                >
                  <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                    <QrCode className="w-8 h-8 text-gold" />
                  </div>
                  <div className="text-center">
                    <span className="font-serif font-bold block text-sm">{t('Escanear QR')}</span>
                    <span className="text-[11px] text-stone-300 block mt-1">{t('Usa la cámara de tu móvil')}</span>
                  </div>
                </button>

                <button
                  onClick={() => setSelectionMode('manual')}
                  className="bg-stone-50 hover:bg-stone-100 text-stone-800 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all duration-300 border border-stone-200/60 group cursor-pointer"
                >
                  <div className="bg-white p-3 rounded-2xl shadow-xs group-hover:scale-110 transition-transform border border-stone-100">
                    <Camera className="w-8 h-8 text-dark-green" />
                  </div>
                  <div className="text-center">
                    <span className="font-serif font-bold block text-sm">{t('Ingreso Manual')}</span>
                    <span className="text-[11px] text-stone-500 block mt-1">{t('Escribe los datos de la mesa')}</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {selectionMode === 'qr' && (
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <button
                  onClick={() => setSelectionMode('options')}
                  className="text-stone-500 hover:text-stone-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> {t('Volver')}
                </button>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('Escanear QR')}</span>
                <div className="w-6"></div>
              </div>

              <div className="relative">
                {/* Real-time HTML5 Camera scanning stage */}
                <div id="qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-3xl border border-stone-200/80 bg-stone-950 aspect-square shadow-inner flex items-center justify-center relative">
                  {!isCameraActive && !qrError && (
                    <div className="text-center p-6 text-stone-400 flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
                      <span className="text-xs">{t('Iniciando cámara...')}</span>
                    </div>
                  )}
                  {qrError && (
                    <div className="p-6 text-stone-300 text-xs text-center flex flex-col items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <p>{qrError}</p>
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 border-2 border-dashed border-gold/40 pointer-events-none rounded-3xl max-w-sm mx-auto aspect-square scale-90 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-gold rounded-2xl animate-pulse"></div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-stone-500">{t('Apunta la cámara de tu dispositivo hacia el código QR de la mesa para identificarla de forma segura.')}</p>
                
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileScan}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer border border-stone-200/40"
                  >
                    <ImageIcon size={14} /> {t('Subir foto de QR')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectionMode === 'manual' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <button
                  onClick={() => setSelectionMode('options')}
                  className="text-stone-500 hover:text-stone-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> {t('Volver')}
                </button>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('Datos Manuales')}</span>
                <div className="w-6"></div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('Tu Nombre (Opcional)')}</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-dark-green transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('Selecciona tu Mesa *')}</label>
                  <select
                    value={scannedTable}
                    onChange={e => setScannedTable(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-dark-green appearance-none"
                  >
                    <option value="">{t('Selecciona una mesa...')}</option>
                    {configuredTables.map(tableOpt => (
                      <option key={tableOpt} value={tableOpt}>{tableOpt}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleConfirmMesa(scannedTable)}
                  className="w-full bg-dark-green hover:bg-stone-900 text-white font-serif font-bold py-4 rounded-2xl transition-all shadow-md mt-4 cursor-pointer"
                >
                  {t('Comenzar a Pedir')}
                </button>
              </div>
            </div>
          )}

          {selectionMode === 'qr_success' && (
            <div className="space-y-6 text-center">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
              </div>
              
              <div>
                <h3 className="text-2xl font-serif text-stone-900">{t('¡Mesa Identificada!')}</h3>
                <span className="inline-block bg-emerald-100 text-emerald-800 font-bold text-lg px-6 py-2 rounded-2xl mt-2 border border-emerald-200 shadow-xs font-mono">
                  {scannedTable}
                </span>
              </div>

              {/* Convex consultation details display */}
              {scannedTable && (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/60 text-xs text-left space-y-2 max-w-sm mx-auto">
                  <span className="font-bold text-stone-500 block uppercase tracking-wider text-[10px] border-b border-stone-100 pb-1.5 mb-1.5">{t('Estado del Sistema (Convex)')}</span>
                  
                  {getTableConfig(scannedTable).activeComanda ? (
                    <div className="flex justify-between items-center text-stone-800">
                      <span>{t('Comanda actual:')}</span>
                      <span className="font-bold text-emerald-600 font-mono">#{getTableConfig(scannedTable).activeComanda?.id.slice(-6)} ({getTableConfig(scannedTable).activeComanda?.customerName || 'Abierta'})</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-stone-500 italic">
                      <span>{t('Comanda actual:')}</span>
                      <span>{t('Nueva sesión de mesa')}</span>
                    </div>
                  )}

                  {getTableConfig(scannedTable).assignedDependent ? (
                    <div className="flex justify-between items-center text-stone-800">
                      <span>{t('Camarero asignado:')}</span>
                      <span className="font-bold text-dark-green">{getTableConfig(scannedTable).assignedDependent?.name}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-stone-500 italic">
                      <span>{t('Camarero asignado:')}</span>
                      <span>{t('Cualquier camarero')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-stone-800">
                    <span>{t('Servicio del Restaurante:')}</span>
                    {getTableConfig(scannedTable).isShiftActive ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">{t('Abierto')}</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">{t('Cerrado')}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="text-left">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('Confirma tu Nombre (Opcional)')}</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-dark-green transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectionMode('options')}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-1 cursor-pointer border border-stone-200/40"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    onClick={() => handleConfirmMesa(scannedTable)}
                    className="flex-1 bg-dark-green hover:bg-stone-900 text-white font-serif font-bold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={16} className="text-gold fill-gold" /> {t('Confirmar y Comenzar')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          {activeSubView === 'welcome' ? (
            <div className="space-y-8">
              {/* Header Card */}
              <div className="bg-gradient-to-br from-dark-green to-stone-900 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10">
                  <Utensils size={200} />
                </div>
                <span className="text-xs font-bold text-gold uppercase tracking-widest block mb-2">{t('Mesa Confirmada')}</span>
                <h3 className="text-3xl font-serif mb-2">¡Hola, {clientName.trim() || t('Cliente')}!</h3>
                <p className="text-stone-300 text-sm max-w-md">
                  Te damos la bienvenida a la <strong className="text-white">{clientTable}</strong>. Elige una de las opciones a continuación para interactuar con nuestro menú interactivo.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                    📍 {clientTable}
                  </span>
                  <button
                    onClick={handleLogoutMesa}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-xs text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all border border-white/10 cursor-pointer"
                  >
                    🔄 Cambiar Mesa / Nombre
                  </button>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Option 1: Consult Menu */}
                <button
                  onClick={() => setActiveSubView('consult')}
                  className="bg-white hover:bg-stone-50 border border-stone-200/80 p-6 rounded-3xl text-left flex flex-col justify-between h-48 transition-all hover:shadow-lg group cursor-pointer"
                >
                  <div className="bg-stone-50 group-hover:bg-gold/10 p-4 rounded-2xl w-14 h-14 flex items-center justify-center border border-stone-100 transition-colors">
                    <BookOpen className="w-7 h-7 text-dark-green group-hover:text-gold transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-stone-900 mb-1 flex items-center gap-2">
                      {t('Consultar Menú')} <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Explora la carta visual, categorías de platos y precios actualizados del día en tiempo real.
                    </p>
                  </div>
                </button>

                {/* Option 2: Place Order */}
                <button
                  onClick={() => setActiveSubView('order')}
                  className="bg-white hover:bg-stone-50 border border-stone-200/80 p-6 rounded-3xl text-left flex flex-col justify-between h-48 transition-all hover:shadow-lg group cursor-pointer"
                >
                  <div className="bg-stone-50 group-hover:bg-gold/10 p-4 rounded-2xl w-14 h-14 flex items-center justify-center border border-stone-100 transition-colors">
                    <Sparkles className="w-7 h-7 text-gold fill-gold" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-stone-900 mb-1 flex items-center gap-2">
                      {t('Hacer Pedido')} <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Añade tus platos favoritos a tu pedido y envíalos instantáneamente al camarero asignado.
                    </p>
                  </div>
                </button>
              </div>

              {/* Client Comanda & Account Card */}
              {(() => {
                const clientRootComanda = (data?.comandas || []).find(
                  c => (c.tableNumber === clientTable || (c.tableNumber && clientTable && c.tableNumber.replace(/\D/g, '') === clientTable.replace(/\D/g, '') && clientTable.replace(/\D/g, '') !== '')) && c.status === 'open' && !c.parentComandaId
                ) || (data?.comandas || []).find(
                  c => (c.tableNumber === clientTable || (c.tableNumber && clientTable && c.tableNumber.replace(/\D/g, '') === clientTable.replace(/\D/g, '') && clientTable.replace(/\D/g, '') !== '')) && c.status === 'open'
                );

                if (!clientRootComanda) return null;

                const activeGroupComandas = [
                  clientRootComanda,
                  ...(data?.comandas || []).filter(c => c.parentComandaId === clientRootComanda.id && c.status === 'open')
                ];

                const activeGroupOrders = getGroupOrdersClient(clientRootComanda, data?.comandas || [], data?.orders || []);

                // Consolidate dishes for this comanda group
                const groupDishes: { name: string; quantity: number; priceCUP: number }[] = [];
                activeGroupOrders.forEach(o => {
                  if (o.orderItems && o.orderItems.length > 0) {
                    o.orderItems.forEach(it => {
                      const cleanName = (it.name || '').replace(/^(\d+)\s*x\s*/i, '').trim();
                      let priceCUP = Number(it.priceCUP || 0);
                      if (priceCUP <= 0 && cleanName) {
                        const found = (data?.menuItems || []).find(m => m.name.trim().toLowerCase() === cleanName.toLowerCase());
                        if (found) priceCUP = found.priceCUP;
                      }
                      const existing = groupDishes.find(d => d.name.toLowerCase() === cleanName.toLowerCase());
                      if (existing) {
                        existing.quantity += Number(it.quantity) || 1;
                      } else {
                        groupDishes.push({ name: cleanName, quantity: Number(it.quantity) || 1, priceCUP });
                      }
                    });
                  } else if (o.items && o.items.length > 0) {
                    o.items.forEach(raw => {
                      const match = raw.match(/^(\d+)\s*x\s*(.+)$/i);
                      const qty = match ? parseInt(match[1], 10) : 1;
                      const name = match ? match[2].trim() : raw.trim();
                      const found = (data?.menuItems || []).find(m => m.name.trim().toLowerCase() === name.toLowerCase());
                      const priceCUP = found ? found.priceCUP : 100;
                      const existing = groupDishes.find(d => d.name.toLowerCase() === name.toLowerCase());
                      if (existing) {
                        existing.quantity += qty;
                      } else {
                        groupDishes.push({ name, quantity: qty, priceCUP });
                      }
                    });
                  }
                });

                const groupTotalCUP = groupDishes.reduce((acc, d) => acc + (d.priceCUP * d.quantity), 0);
                const isPaymentRequested = clientRootComanda.paymentRequested || activeGroupComandas.some(c => c.paymentRequested);

                return (
                  <div className="bg-white rounded-3xl p-6 border-2 border-stone-200 shadow-xl space-y-5 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-dark-green bg-stone-100 px-2.5 py-1 rounded-lg">
                            Comanda #{clientRootComanda.id.slice(-6).toUpperCase()}
                          </span>
                          {activeGroupComandas.length > 1 && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              + {activeGroupComandas.length - 1} Comanda(s) Anexa(s)
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif font-bold text-lg text-stone-900 mt-1">
                          {clientTable} • {clientRootComanda.customerName || clientName || 'Comensal'}
                        </h4>
                      </div>

                      <div>
                        {isPaymentRequested ? (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            <span>💳</span> {t('Solicitud de Pago enviada')}
                          </div>
                        ) : activeGroupOrders.some(o => o.status === 'delivered') ? (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <span>🍽️</span> {t('Servido en Mesa • En consumo')}
                          </div>
                        ) : (
                          <div className="bg-stone-50 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <span>⏳</span> {t('En preparación')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                        {t('Resumen Completo de la Cuenta (Platos Consumidos):')}
                      </span>
                      {groupDishes.length > 0 ? (
                        <div className="divide-y divide-stone-100 bg-stone-50/60 rounded-2xl p-4 border border-stone-100">
                          {groupDishes.map((dish, dIdx) => (
                            <div key={dIdx} className="py-2 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-dark-green text-sm">{dish.quantity}x</span>
                                <span className="font-semibold text-stone-800">{dish.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-stone-500 font-semibold">
                                  ${(dish.priceCUP * dish.quantity).toLocaleString()} CUP
                                </span>
                                {dish.priceCUP > 0 && (
                                  <span className="text-[10px] text-stone-400 block font-mono">
                                    (${dish.priceCUP.toLocaleString()} c/u)
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="border-t border-stone-200 pt-3 mt-2 flex justify-between items-center">
                            <span className="font-serif font-bold text-stone-900 text-sm">{t('TOTAL CONSOLIDADO:')}</span>
                            <div className="text-right">
                              <span className="font-serif font-extrabold text-xl text-dark-green block">
                                ${groupTotalCUP.toLocaleString()} CUP
                              </span>
                              {data?.exchangeRate?.usdCUP && (
                                <span className="text-[11px] text-stone-500 font-mono">
                                  ≈ ${(groupTotalCUP / data.exchangeRate.usdCUP).toFixed(2)} USD
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-stone-400 italic p-3 text-center">
                          {t('No hay platos aprobados registrados aún en esta comanda.')}
                        </div>
                      )}
                    </div>

                    {isPaymentRequested && (
                      <div className="bg-amber-100/80 border border-amber-300 rounded-2xl p-4 text-amber-950 text-xs font-medium flex items-center gap-3">
                        <span className="text-xl">🔔</span>
                        <div>
                          <strong className="block font-bold text-amber-900">{t('Has solicitado la cuenta al camarero.')}</strong>
                          <span>{t('El camarero se acerca a tu mesa con el comprobante para procesar el cobro.')}</span>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const hasServedOrder = activeGroupOrders.some(o => o.status === 'delivered' || o.status === 'paid' || o.status === 'closed');
                      
                      if (!hasServedOrder) {
                        return (
                          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-stone-600 text-xs text-center font-medium animate-pulse">
                            ⏳ {t('Tus platos están siendo elaborados en cocina. Una vez servidos en la mesa, se habilitará la opción de agregar pedidos anexos o solicitar la cuenta.')}
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={() => handleClientAddAnnexedOrder(clientRootComanda)}
                            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-serif font-bold py-3.5 px-4 rounded-2xl text-xs md:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-stone-800"
                          >
                            <Plus size={18} className="text-gold" />
                            <span>{t('AGREGAR PEDIDO (Comanda Anexa)')}</span>
                          </button>

                          <button
                            onClick={() => handleClientRequestPayment(clientRootComanda)}
                            disabled={isPaymentRequested}
                            className={`w-full font-serif font-bold py-3.5 px-4 rounded-2xl text-xs md:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                              isPaymentRequested
                                ? 'bg-amber-200 text-amber-900 cursor-not-allowed border border-amber-300'
                                : 'bg-gold hover:bg-amber-400 text-dark-green border border-amber-300 font-extrabold'
                            }`}
                          >
                            <DollarSign size={18} />
                            <span>
                              {isPaymentRequested ? t('✓ Solicitud de Pago Enviada') : t('PAGAR LA CUENTA')}
                            </span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Active Orders Track list */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <Clock size={18} className="text-dark-green" />
                  <h4 className="font-serif font-bold text-stone-800 text-lg">{t('Seguimiento de tu Pedido')}</h4>
                </div>

                {/* Fetch current active orders for this table */}
                {(() => {
                  const tableOrders = (data?.orders || [])
                    .filter(o => (o.tableNumber === clientTable || (o.tableNumber && clientTable && o.tableNumber.replace(/\D/g, '') === clientTable.replace(/\D/g, '') && clientTable.replace(/\D/g, '') !== '')) && o.status !== 'closed' && o.status !== 'paid')
                    .sort((a, b) => b.timestamp - a.timestamp);

                  if (tableOrders.length === 0) {
                    return (
                      <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm text-center py-10 text-stone-400 text-xs flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-stone-300">
                          <Clock size={22} />
                        </div>
                        <span>{t('Aún no has realizado pedidos para esta mesa en la sesión actual.')}</span>
                      </div>
                    );
                  }

                  const getOrderStepIndex = (status: string): number => {
                    switch (status) {
                      case 'client_pending':
                        return 0;
                      case 'pending_dependent':
                      case 'confirmed':
                      case 'pending':
                        return 1;
                      case 'kitchen_pending':
                      case 'kitchen_cooking':
                      case 'in_kitchen':
                      case 'in_progress':
                      case 'kitchen_in_progress':
                        return 2;
                      case 'kitchen_ready':
                      case 'ready_to_serve':
                        return 3;
                      case 'delivered':
                      case 'served':
                      case 'closed':
                      case 'paid':
                        return 4;
                      default:
                        return 0;
                    }
                  };

                  return (
                    <div className="space-y-6">
                      {tableOrders.map(order => {
                        const currentStep = getOrderStepIndex(order.status);
                        
                        // Parse list of dishes in the order
                        const dishes = (order.orderItems && order.orderItems.length > 0 
                          ? order.orderItems
                          : (order.items || []).map(itemStr => {
                              const match = itemStr.match(/^(\d+)\s*x\s*(.+)$/i);
                              const quantity = match ? parseInt(match[1], 10) : 1;
                              const name = match ? match[2].trim() : itemStr.trim();
                              return { name, quantity, priceCUP: 0 };
                            })
                        ).map(d => {
                          const cleanName = (d.name || '').replace(/^(\d+)\s*x\s*/i, '').trim();
                          const menuItem = data?.menuItems?.find(m => m.name.trim().toLowerCase() === cleanName.toLowerCase());
                          const priceCUP = (d.priceCUP && d.priceCUP > 0) ? d.priceCUP : (menuItem?.priceCUP || 0);
                          return {
                            name: cleanName,
                            quantity: Number(d.quantity) || 1,
                            priceCUP,
                            imageUrl: menuItem?.imageUrl || ''
                          };
                        });

                        const orderTotal = (order.totalCUP && order.totalCUP > 0) ? order.totalCUP : dishes.reduce((sum, item) => sum + (item.priceCUP * item.quantity), 0);

                        const stepDetails = [
                          { label: t('Recibido'), icon: Clock, desc: t('Hemos recibido tu solicitud y estamos esperando la confirmación de nuestro equipo.') },
                          { label: t('Confirmado'), icon: CheckCircle2, desc: t('El camarero ha confirmado tu pedido y lo ha enviado al sistema de la cocina.') },
                          { label: t('Preparando'), icon: ChefHat, desc: t('¡El chef y su equipo están preparando tus platos en la cocina!') },
                          { label: t('Listo'), icon: Bell, desc: t('¡Tu pedido está listo! El camarero lo llevará a tu mesa de inmediato.') },
                          { label: t('Servido'), icon: Sparkles, desc: t('¡Buen provecho! Tus platos han sido entregados con éxito en la mesa.') }
                        ];

                        const activeStepDetail = stepDetails[currentStep];

                        // Set banner style based on active step
                        let bannerBg = 'bg-stone-50 border-stone-200 text-stone-700';
                        if (currentStep === 0) bannerBg = 'bg-amber-50/70 border-amber-200 text-amber-800 border-l-4 border-l-amber-500';
                        else if (currentStep === 1) bannerBg = 'bg-sky-50/70 border-sky-200 text-sky-800 border-l-4 border-l-sky-500';
                        else if (currentStep === 2) bannerBg = 'bg-orange-50/70 border-orange-200 text-orange-800 border-l-4 border-l-orange-500';
                        else if (currentStep === 3) bannerBg = 'bg-emerald-500 text-white font-bold animate-pulse shadow-sm';
                        else if (currentStep === 4) bannerBg = 'bg-green-50/70 border-green-200 text-green-800 border-l-4 border-l-green-500';

                        return (
                          <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-sm transition-all duration-300 overflow-hidden">
                            {/* Card Header */}
                            <div className="px-5 py-4 bg-stone-50/40 border-b border-stone-100 flex justify-between items-center flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-dark-green text-white text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-2xs">
                                  #{order.id.slice(-6).toUpperCase()}
                                </span>
                                <span className="text-[10px] font-semibold text-stone-400 flex items-center gap-1">
                                  <Clock size={11} /> {new Date(order.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md font-mono">
                                {clientTable}
                              </span>
                            </div>

                            {/* Active Status Banner */}
                            <div className={`px-5 py-3.5 border-b border-stone-100 flex items-start gap-2.5 text-xs leading-relaxed ${bannerBg}`}>
                              <span className="text-base shrink-0 select-none">
                                {currentStep === 0 && '⏳'}
                                {currentStep === 1 && '✅'}
                                {currentStep === 2 && '🍳'}
                                {currentStep === 3 && '🔔'}
                                {currentStep === 4 && '🍽️'}
                              </span>
                              <div>
                                <strong className={`block text-xs uppercase tracking-wider mb-0.5 ${currentStep === 3 ? 'text-white' : 'text-stone-800'}`}>{activeStepDetail.label}</strong>
                                <span className={currentStep === 3 ? 'text-emerald-50' : 'text-stone-600 font-medium'}>{activeStepDetail.desc}</span>
                              </div>
                            </div>

                            {/* Responsive Interactive Stepper */}
                            <div className="relative px-5 py-7 bg-stone-50/10 border-b border-stone-100">
                              {/* Background Connecting Line */}
                              <div className="absolute left-8 right-8 top-[42px] h-0.5 bg-stone-100 -z-0" />
                              {/* Active Progress Connecting Line */}
                              <div 
                                className="absolute left-8 right-8 top-[42px] h-0.5 bg-dark-green z-0 transition-all duration-500 origin-left"
                                style={{ width: `${(currentStep / 4) * 100}%` }}
                              />

                              {/* Step Nodes */}
                              <div className="flex justify-between items-center relative z-10">
                                {stepDetails.map((step, idx) => {
                                  const StepIcon = step.icon;
                                  const isCompleted = idx < currentStep;
                                  const isActive = idx === currentStep;
                                  const isPending = idx > currentStep;

                                  return (
                                    <div key={idx} className="flex flex-col items-center flex-1">
                                      <div 
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border ${
                                          isCompleted 
                                            ? 'bg-dark-green border-dark-green text-white shadow-2xs' 
                                            : isActive 
                                              ? 'bg-gold border-gold text-dark-green font-bold shadow-xs scale-110 ring-4 ring-gold/20' 
                                              : 'bg-white border-stone-200 text-stone-400'
                                        }`}
                                      >
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-5 h-5 text-white" />
                                        ) : (
                                          <StepIcon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                                        )}
                                      </div>
                                      <span className={`text-[9px] font-bold mt-2 text-center select-none ${
                                        isActive ? 'text-dark-green font-black' : isCompleted ? 'text-stone-700 font-semibold' : 'text-stone-400 font-medium'
                                      }`}>
                                        {step.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Ordered Dishes Section */}
                            <div className="p-5 space-y-3 bg-stone-50/10">
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                                {t('Detalle del Pedido')}
                              </span>
                              <div className="divide-y divide-stone-100">
                                {dishes.map((dish, dIdx) => (
                                  <div key={dIdx} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                      {dish.imageUrl ? (
                                        <img 
                                          src={dish.imageUrl} 
                                          alt={dish.name} 
                                          referrerPolicy="no-referrer"
                                          className="w-10 h-10 rounded-lg object-cover bg-stone-50 border border-stone-200/50 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200/40 flex items-center justify-center text-stone-400 shrink-0">
                                          <Utensils size={14} />
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-xs font-bold text-stone-800">
                                          {t(dish.name)}
                                        </div>
                                        <span className="text-[10px] text-stone-400 font-medium">
                                          {dish.priceCUP > 0 ? `${dish.priceCUP.toLocaleString()} CUP ${t('c/u')}` : t('Precio del día')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-stone-900 block">
                                        x{dish.quantity}
                                      </span>
                                      {dish.priceCUP > 0 && (
                                        <span className="text-[10px] text-stone-500 font-semibold block">
                                          ${(dish.priceCUP * dish.quantity).toLocaleString()} CUP
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Summary / Total */}
                              {orderTotal > 0 && (
                                <div className="border-t border-stone-100 pt-3 flex justify-between items-center">
                                  <span className="text-xs font-bold text-stone-500">{t('Total de este Pedido:')}</span>
                                  <span className="font-serif font-bold text-sm text-dark-green bg-stone-50 px-3 py-1 rounded-lg border border-stone-200/40">
                                    ${orderTotal.toLocaleString()} CUP
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Receipts of Closed Comandas for this table */}
              {clientClosedComandas.length > 0 && (
                <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-stone-200/60 pb-3">
                    <h4 className="font-bold text-stone-800 text-sm flex items-center gap-2">
                      🧾 {t('Recibos de Comandas Cerradas')}
                    </h4>
                    <button 
                      onClick={() => setShowClosedComandas(!showClosedComandas)} 
                      className="text-xs font-bold text-dark-green hover:underline cursor-pointer"
                    >
                      {showClosedComandas ? t('Ocultar') : t('Ver')}
                    </button>
                  </div>
                  {showClosedComandas && (
                    <div className="space-y-3">
                      {clientClosedComandas.map(c => (
                        <div key={c.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-xs flex justify-between items-center transition-all hover:border-stone-300">
                          <div>
                            <div className="text-xs font-bold text-stone-900">Comanda #{c.id.slice(-6)}</div>
                            <div className="text-[10px] text-stone-500">{new Date(c.closedAt || 0).toLocaleString()}</div>
                          </div>
                          <button 
                            onClick={() => generateComandaPDF(c)} 
                            className="bg-stone-50 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-stone-200"
                          >
                            <Download size={14} /> PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeSubView === 'consult' ? (
            <div className="animate-fade-in -mx-4 md:-mx-8">
              <FullMenu 
                menuItems={data?.menuItems || []}
                exchangeRate={data?.exchangeRate}
                prefilledTable={clientTable}
                prefilledName={clientName}
                isOrderMode={false}
                updateData={updateData}
                onClose={() => setActiveSubView('welcome')}
              />
            </div>
          ) : (
            <div className="animate-fade-in -mx-4 md:-mx-8">
              <FullMenu 
                menuItems={data?.menuItems || []}
                exchangeRate={data?.exchangeRate}
                prefilledTable={clientTable}
                prefilledName={clientName}
                isOrderMode={true}
                targetComandaId={targetAnnexedComandaId}
                updateData={updateData}
                onClose={() => {
                  setActiveSubView('welcome');
                  setTargetAnnexedComandaId(undefined);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
