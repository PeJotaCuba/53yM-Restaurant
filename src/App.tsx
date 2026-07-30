import React, { useState, useEffect } from 'react';
import { api } from '../convex/_generated/api';
import { useSafeQuery, useSafeMutation } from './hooks/useSafeConvex';
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
import { DependentConfig, ManagerConfig, Reservation } from './types';
import { ADMIN_DEVICE_IDS } from './utils/deviceUtils';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState('home');
  const [selectedDishForReservation, setSelectedDishForReservation] = useState<string | undefined>(undefined);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const deviceId = useDeviceId();
  const { data, loading, updateData, syncExcelencia } = useDataSync();

  // Convex Reactive Queries & Mutations (Safe Mode)
  const liveUser = useSafeQuery<any>(api.users.getLiveUserByDeviceId, { deviceId });
  const liveOrders = useSafeQuery<any[]>(api.orders.getLiveOrders);
  const liveReservations = useSafeQuery<any[]>(api.reservations.getLiveReservations);

  const authorizeUserMutation = useSafeMutation(api.users.authorizeUser);
  const deactivateUserMutation = useSafeMutation(api.users.deactivateUser);
  const createReservationMutation = useSafeMutation(api.reservations.createReservation);
  const createReservationAndOrderMutation = useSafeMutation(api.reservations.createReservationAndOrder);
  const updateReservationStatusMutation = useSafeMutation(api.reservations.updateReservationStatus);

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
          const mgrMatch = (data.managers || []).find(m => m.username === liveUser.username || m.deviceId === deviceId);
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
          const depMatch = (data.dependents || []).find(d => d.username === liveUser.username || d.deviceId === deviceId);
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
          const mgrMatch = (data.managers || []).find(m => m.id === parsed.id || m.username === parsed.username);
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
          const depMatch = data.dependents.find(d => d.id === parsed.id || d.username === parsed.username || d.deviceId === parsed.deviceId);
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
  }, [loading, liveUser, deviceId, data.dependents, data.managers]);

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
  const handleUpdateReservation = (id: string, newDetails: Partial<Reservation>) => {
    const cleanDetails = sanitizeObjectKeys(newDetails);
    const updatedReservations = data.reservations.map(r => 
      r.id === id ? { ...r, ...cleanDetails } : r
    );
    updateData({ reservations: updatedReservations });
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
    await updateReservationStatus(id, 'cancelled');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'menu') {
      setCurrentView('menu');
    }
  }, []);

  // Real-Time Reservations Sync from Convex to Local State
  useEffect(() => {
    if (liveReservations && liveReservations.length > 0) {
      const mapped = liveReservations.map((lr: any) => ({
        id: lr._id,
        name: lr.customerName || 'Cliente',
        date: lr.date,
        time: lr.timeSlot || '12:00',
        guests: lr.guests || 2,
        occasion: lr.occasion || lr.area || 'Cena casual',
        phone: lr.phone || '',
        email: lr.email || '',
        dishReference: lr.dishReference || '',
        dishes: lr.dishes || [],
        status: lr.status || 'pending',
        createdAt: lr.createdAt || Date.now(),
      }));

      const currentLocals = data.reservations || [];
      let changed = false;
      const merged = [...currentLocals];

      mapped.forEach((lr: any) => {
        const existingIdx = merged.findIndex(r => r.id === lr.id);
        if (existingIdx >= 0) {
          const existing = merged[existingIdx];
          if (
            existing.status !== lr.status ||
            existing.name !== lr.name ||
            existing.date !== lr.date ||
            existing.time !== lr.time ||
            existing.guests !== lr.guests ||
            existing.phone !== lr.phone
          ) {
            merged[existingIdx] = { ...existing, ...lr };
            changed = true;
          }
        } else {
          merged.unshift(lr);
          changed = true;
        }
      });

      if (changed) {
        updateData({ reservations: merged });
      }
    }
  }, [liveReservations]);

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

      alert("¡Tu reservación y pedido han sido enviados con éxito! Queda pendiente de confirmación por el Administrador.");
      setPendingReservation(null);
      setCurrentView('home');
      window.scrollTo(0, 0);
      return result;
    } catch (err) {
      console.error("Error creating reservation and order:", err);
      alert("Hubo un problema al enviar su pedido. Por favor intente nuevamente.");
      throw err;
    }
  };

  const handleReservationComplete = async (reservationData: any, advanceOrder?: boolean) => {
    const cleanData = sanitizeObjectKeys(reservationData);
    
    if (advanceOrder) {
      // Step 2: "Adelantar Pedidos" saves wizard data locally and redirects to menu selection
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

    // Step 3: "Solo Enviar Reserva" (Pure Reservation) triggers direct Convex write with status "pending"
    let convexId: any = null;
    try {
      convexId = await createReservationMutation({
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
    } catch (e) {
      console.warn('Convex reservation write error:', e);
    }

    const newReservation = {
      ...cleanData,
      id: convexId || Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      createdAt: Date.now()
    };
    
    const updatedReservations = [newReservation, ...data.reservations];
    updateData({ reservations: updatedReservations });
    
    setSelectedDishForReservation(undefined);
    
    alert("¡Tu reservación ha sido enviada con éxito! Queda pendiente de confirmación por el Administrador.");
    
    setCurrentView('dashboard');
    window.scrollTo(0, 0);
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
          <AdminPanel data={data} updateData={updateData} updateStatus={updateReservationStatus} />
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
            data={data} 
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
          <DependentPanel data={data} updateData={updateData} dependentInfo={activeDependent!} />
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
            data={data} 
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
          menuItems={data.menuItems || []}
          exchangeRate={data.exchangeRate}
          pendingReservation={pendingReservation}
          onSubmitReservationAndOrder={handleSendReservationAndOrder}
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
            data={data}
            updateData={updateData}
            onUpdateReservation={handleUpdateReservation}
            onCancelReservation={handleCancelReservation}
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
        data={data}
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

      {userRole === 'none' && currentView !== 'reservation' && currentView !== 'menu' && (
        <FloatingWhatsApp 
          currentView={currentView} 
          onReserve={() => {
            setCurrentView('reservation');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
        />
      )}

      <LoginModal 
        data={data}
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
    </div>
  );
}

