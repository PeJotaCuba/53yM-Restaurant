import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { MenuViewer } from './components/MenuViewer';
import { FullMenu } from './components/FullMenu';
import { ReservationWizard } from './components/ReservationWizard';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { DependentPanel } from './components/DependentPanel';
import { ManagerPanel } from './components/ManagerPanel';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Services } from './components/Services';
import { Gallery } from './components/Gallery';
import { Promotions } from './components/Promotions';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { Contact } from './components/Contact';
import { Logo } from './components/Logo';
import { LoginModal } from './components/LoginModal';
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

  // Active Sessions state
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [activeDependent, setActiveDependent] = useState<DependentConfig | null>(null);
  const [activeManager, setActiveManager] = useState<ManagerConfig | null>(null);

  // Check login status & 24h expiration on load and intervals
  useEffect(() => {
    const checkSessions = () => {
      const currentDeviceIdClean = deviceId.trim().toUpperCase();
      const isAdminDevice = ADMIN_DEVICE_IDS.includes(currentDeviceIdClean);

      // 1. Check Admin Session (Only valid if current device is an authorized Admin Device ID)
      const savedAdmin = localStorage.getItem('adminSession');
      if (isAdminDevice) {
        setAdminLoggedIn(true);
      } else {
        if (savedAdmin) localStorage.removeItem('adminSession');
        setAdminLoggedIn(false);
      }

      // 2. Check Manager Session
      const savedManager = localStorage.getItem('managerSession');
      if (savedManager) {
        try {
          const parsed = JSON.parse(savedManager);
          const mgrMatch = (data.managers || []).find(m => m.id === parsed.id || m.username === parsed.username);
          
          if (mgrMatch && mgrMatch.isActive !== false) {
            const mgrAllowedDev = mgrMatch.deviceId ? mgrMatch.deviceId.trim().toUpperCase() : '';
            const isMgrDevValid = mgrAllowedDev ? (currentDeviceIdClean === mgrAllowedDev) : isAdminDevice;

            if (isMgrDevValid) {
              setActiveManager(mgrMatch);
            } else {
              localStorage.removeItem('managerSession');
              setActiveManager(null);
            }
          } else {
            localStorage.removeItem('managerSession');
            setActiveManager(null);
          }
        } catch (e) {
          localStorage.removeItem('managerSession');
          setActiveManager(null);
        }
      } else {
        setActiveManager(null);
      }

      // 3. Check Dependent Session (24h expiry rule & strict Device ID matching)
      const savedDep = localStorage.getItem('dependentSession');
      if (savedDep) {
        try {
          const parsed = JSON.parse(savedDep);
          const now = Date.now();
          const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

          if (parsed && parsed.loginTime && now - parsed.loginTime < EXPIRY_TIME) {
            // Find current dependent info in app data
            const depMatch = data.dependents.find(d => d.id === parsed.id || d.username === parsed.username || d.deviceId === parsed.deviceId);
            if (depMatch && depMatch.isActive !== false && depMatch.deviceId.trim().toUpperCase() === currentDeviceIdClean) {
              setActiveDependent(depMatch);
            } else {
              // Dependent removed, deactivated, or on wrong device
              localStorage.removeItem('dependentSession');
              setActiveDependent(null);
            }
          } else {
            // Expired 24h
            localStorage.removeItem('dependentSession');
            setActiveDependent(null);
          }
        } catch (e) {
          localStorage.removeItem('dependentSession');
          setActiveDependent(null);
        }
      } else {
        // Fallback device check if pre-assigned device ID matches current device
        const matchedByDevice = data.dependents.find(d => d.deviceId && d.deviceId.trim().toUpperCase() === currentDeviceIdClean);
        if (matchedByDevice && matchedByDevice.isActive !== false) {
          setActiveDependent(matchedByDevice);
        } else {
          setActiveDependent(null);
        }
      }
    };

    if (!loading) {
      checkSessions();
    }
  }, [loading, data.dependents, data.managers, deviceId]);

  // Determine User Role
  let userRole: 'admin' | 'manager' | 'dependent' | 'none' = 'none';
  if (adminLoggedIn) {
    userRole = 'admin';
  } else if (activeManager) {
    userRole = 'manager';
  } else if (activeDependent) {
    userRole = 'dependent';
  }

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('dependentSession');
    localStorage.removeItem('managerSession');
    setAdminLoggedIn(false);
    setActiveDependent(null);
    setActiveManager(null);
    setCurrentView('home');
  };

  // Reservation Editing & Cancellation Handlers for Users
  const handleUpdateReservation = (id: string, newDetails: Partial<Reservation>) => {
    const updatedReservations = data.reservations.map(r => 
      r.id === id ? { ...r, ...newDetails } : r
    );
    updateData({ reservations: updatedReservations });
  };

  const handleCancelReservation = (id: string) => {
    const updatedReservations = data.reservations.map(r => 
      r.id === id ? { ...r, status: 'cancelled' as Reservation['status'] } : r
    );
    updateData({ reservations: updatedReservations });
  };

  // View Guard: Admins, Managers and Dependents cannot reserve
  useEffect(() => {
    if ((userRole === 'admin' || userRole === 'manager' || userRole === 'dependent') && currentView === 'reservation') {
      if (userRole === 'admin') setCurrentView('admin');
      if (userRole === 'manager') setCurrentView('manager');
      if (userRole === 'dependent') setCurrentView('dependent');
    }
  }, [userRole, currentView]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'menu') {
      setCurrentView('menu');
    }
  }, []);

  const [pendingReservation, setPendingReservation] = useState<any>(null);

  const handleReservationComplete = (reservationData: any, advanceOrder?: boolean) => {
    const newReservation = {
      ...reservationData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      createdAt: Date.now()
    };
    const updatedReservations = [newReservation, ...data.reservations];
    updateData({ reservations: updatedReservations });
    
    setSelectedDishForReservation(undefined);
    
    if (advanceOrder) {
      setPendingReservation(newReservation);
      setCurrentView('menu');
    } else {
      setCurrentView('dashboard');
    }
    window.scrollTo(0, 0);
  };

  const updateReservationStatus = (id: string, status: any) => {
    const updated = data.reservations.map(r => r.id === id ? { ...r, status } : r);
    updateData({ reservations: updated });
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
      return <AdminPanel data={data} updateData={updateData} updateStatus={updateReservationStatus} />;
    }

    if (currentView === 'manager') {
      if (userRole !== 'manager') {
        setIsLoginModalOpen(true);
        setCurrentView('home');
        return null;
      }
      return (
        <ManagerPanel 
          data={data} 
          updateData={updateData} 
          managerInfo={activeManager!} 
          updateStatus={updateReservationStatus} 
        />
      );
    }

    if (currentView === 'dependent') {
      if (userRole !== 'dependent') {
        setIsLoginModalOpen(true);
        setCurrentView('home');
        return null;
      }
      return <DependentPanel data={data} updateData={updateData} dependentInfo={activeDependent!} />;
    }

    switch (currentView) {
      case 'menu':
        return <FullMenu 
          menuItems={data.menuItems || []}
          exchangeRate={data.exchangeRate}
          pendingReservation={pendingReservation}
          onClose={() => {
            setCurrentView('home');
            window.scrollTo(0, 0);
          }} 
        />;
      case 'reservation':
        if (userRole !== 'none') {
          return null;
        }
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
            reservations={data.reservations} 
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
        onAdminLogin={() => {
          setAdminLoggedIn(true);
          setActiveDependent(null);
          setActiveManager(null);
          setCurrentView('admin');
        }}
        onManagerLogin={(mgr) => {
          setActiveManager(mgr);
          setAdminLoggedIn(false);
          setActiveDependent(null);
          setCurrentView('manager');
        }}
        onDependentLogin={(dep) => {
          setActiveDependent(dep);
          setAdminLoggedIn(false);
          setActiveManager(null);
          setCurrentView('dependent');
        }}
      />
    </div>
  );
}
