import { useState, useEffect } from 'react';
import { AppData, Reservation, LandingConfig, DependentConfig, Order, MenuItem } from '../types';
import { MENU_ITEMS } from '../data';
import img1 from '../assets/552397741_122289404858023400_851556489372836371_n.jpg';
import img2 from '../assets/558189256_122291528378023400_8957644650611402298_n.jpg';
import img3 from '../assets/559119213_122292263138023400_6687862613514902407_n.jpg';
import img4 from '../assets/581523515_122297267198023400_6019037963018324053_n.jpg';
import img5 from '../assets/594058864_122300276882023400_2688798652534128561_n.jpg';
import img6 from '../assets/597484494_122301404036023400_4555413421550982025_n.jpg';

import eq1 from '../assets/equipo/568132671_122293522268023400_6158341171119163800_n.jpg';
import eq2 from '../assets/equipo/588189132_122298994394023400_5327873896669641941_n.jpg';
import eq3 from '../assets/equipo/589949879_122299264208023400_8018245798621944349_n.jpg';
import eq4 from '../assets/equipo/590164409_122298994400023400_1040987832500758880_n.jpg';
import eq5 from '../assets/equipo/617499308_122307590018023400_186687902327869449_n.jpg';
import eq6 from '../assets/equipo/628030779_122309755778023400_6384611490953368083_n.jpg';

const DEFAULT_TEAM_IMAGES = [eq1, eq2, eq3, eq4, eq5, eq6];

const INITIAL_LANDING_CONFIG: LandingConfig = {
  heroTitle: '',
  heroSlogan: 'Exclusivo, diferente y delicioso',
  heroSubtitle: 'Donde la excelencia y el sabor confluyen',
  heroBgImage: 'https://z-cdn-media.chatglm.cn/files/8040c33e-80d6-4d6b-a432-40b2d97abdbc.jpg?auth_key=1885072204-5c2e4753cf824b03b28516ea2ab7779e-0-b0687f954c886420df99687d3ae0380a',
  heroBannerImage: '',
  aboutText1: 'En el Reparto Nuevo Bayamo, nació una idea transformadora: crear un espacio donde la gastronomía cubana se vistiera de gala. Restaurante - Terraza 53&M se ha consolidado como un "lugar de lujo" en la zona, redefiniendo la experiencia culinaria con un toque de distinción y autenticidad.',
  aboutText2: 'Nuestra misión es ofrecer gastronomía cubana elegante con un servicio excepcional. Cada detalle está diseñado para que disfrutes no solo de platos exquisitos, sino de momentos memorables en un ambiente que combina la calidez de nuestra tierra con la sofisticación internacional.',
  aboutTags: ['Exclusividad', 'Diferencia', 'Sabor', 'Elegancia'],
  aboutImage: 'https://z-cdn-media.chatglm.cn/files/6bec7882-cc95-438d-b057-cc7b8f5e1346.jpg?auth_key=1885072204-0ffb1a7eca5645cebfb5ba564e33faea-0-a51e75e28e7e8ea35ccd90cfde74f7b3',
  teamImages: DEFAULT_TEAM_IMAGES,
  services: [
    { icon: 'Utensils', title: 'Restaurante', description: 'Almuerzos y cenas elegantes con lo mejor de la cocina cubana e internacional.' },
    { icon: 'Wine', title: 'Bar y Coctelería', description: 'Una selección exclusiva de cócteles preparados por nuestros bartenders expertos.' },
    { icon: 'Leaf', title: 'Terraza Privada', description: 'Espacios al aire libre ideales para eventos, celebraciones y reuniones íntimas.' },
    { icon: 'PartyPopper', title: 'Eventos Especiales', description: 'Cumpleaños, aniversarios y ocasiones especiales con un toque de distinción.' },
  ],
  galleryImages: [img1, img2, img3, img4, img5, img6],
  promotions: [
    { icon: 'Gift', title: 'Cumpleañeros', tag: '15% OFF', desc: 'Disfruta de un 15% de descuento en tu celebración durante los meses de junio, julio y agosto. ¡Ven a festejar tu día especial con nosotros!' },
    { icon: 'Heart', title: 'Paquetes para Dos', tag: 'Parejas', desc: 'Paquetes gastronómicos diseñados exclusivamente para parejas, incluyendo servicios complementarios para una velada inolvidable.' },
    { icon: 'CalendarCheck', title: 'Fin de Semana', tag: 'Sáb & Dom', desc: 'Ofertas especiales de almuerzo y cena todos los sábados y domingos. ¡Te esperamos desde las 12:00 pm para comenzar el fin de semana con sabor!' },
  ],
  contactPhone: '+53 5 441 3935',
  contactAddress: 'Reparto Nuevo Bayamo, Avenida Frank País García',
  contactEmail: 'reservas@53ym.com',
  contactHours: 'Lunes a Domingo: 12:00 PM - 11:00 PM',
  footerText: 'Reparto Nuevo Bayamo, Avenida Frank País García'
};

function cleanLandingConfig(rawConfig: any): LandingConfig {
  const merged = rawConfig ? { ...INITIAL_LANDING_CONFIG, ...rawConfig } : INITIAL_LANDING_CONFIG;
  if (!merged.heroSubtitle || merged.heroSubtitle.includes('Descubre la auténtica') || merged.heroSubtitle.includes('corazón de Bayamo')) {
    merged.heroSubtitle = 'Donde la excelencia y el sabor confluyen';
  }
  if (!merged.heroSlogan || merged.heroSlogan.toLowerCase().includes('sabores que cuentan historias')) {
    merged.heroSlogan = 'Exclusivo, diferente y delicioso';
  }
  merged.heroTitle = '';
  merged.contactHours = 'Lunes a Domingo: 12:00 PM - 11:00 PM';
  if (!merged.teamImages || merged.teamImages.length === 0) {
    merged.teamImages = DEFAULT_TEAM_IMAGES;
  }
  return merged;
}

const INITIAL_ADMIN_CONFIG = {
  username: 'gestion53ym',
  password: 'adminrestaurant.53yM',
  phone: '54413935'
};

const JSON_URL = 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/cbe6458389a81d36475dd6f78a8d3750052eb7cf/excelencia.json';

export function useDataSync() {
  const INITIAL_EXCHANGE_RATE = {
    usdCUP: 320,
    eurCUP: 350,
    updatedAt: Date.now()
  };

  const [data, setData] = useState<AppData>({
    landingConfig: INITIAL_LANDING_CONFIG,
    menuItems: MENU_ITEMS,
    adminConfig: INITIAL_ADMIN_CONFIG,
    dependents: [],
    managers: [],
    reservations: [],
    orders: [],
    comandas: [],
    orderReports: [],
    kitchenReports: [],
    cashRegisterCloses: [],
    auditLogs: [],
    downloadsState: { adminAuditLog: false, managerZip: false },
    exchangeRate: INITIAL_EXCHANGE_RATE,
    notifications: []
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      console.log('[DataSync] Fetching initial data...');
      // First check if user has local state saved in localStorage
      const localData = localStorage.getItem('appData');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setData({
            ...parsed,
            landingConfig: cleanLandingConfig(parsed.landingConfig),
            menuItems: parsed.menuItems || MENU_ITEMS,
            adminConfig: parsed.adminConfig || INITIAL_ADMIN_CONFIG,
            dependents: parsed.dependents || [],
            managers: parsed.managers || [],
            reservations: parsed.reservations || [],
            orders: parsed.orders || [],
            comandas: parsed.comandas || [],
            orderReports: parsed.orderReports || [],
            kitchenReports: parsed.kitchenReports || [],
            cashRegisterCloses: parsed.cashRegisterCloses || [],
            auditLogs: parsed.auditLogs || [],
            downloadsState: parsed.downloadsState || { adminAuditLog: false, managerZip: false },
            exchangeRate: parsed.exchangeRate || INITIAL_EXCHANGE_RATE,
            notifications: parsed.notifications || []
          });
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error reading local appData:', e);
        }
      }

      // Fallback: Fetch from remote JSON URL on first load
      try {
        const response = await fetch(JSON_URL);
        if (response.ok) {
          const text = await response.text();
          if (text.trim()) {
            const jsonData = JSON.parse(text);
            const initialData: AppData = {
              landingConfig: cleanLandingConfig(jsonData.landingConfig),
              menuItems: jsonData.menuItems || MENU_ITEMS,
              adminConfig: jsonData.adminConfig || INITIAL_ADMIN_CONFIG,
              dependents: jsonData.dependents || [],
              managers: jsonData.managers || [],
              reservations: jsonData.reservations || [],
              orders: jsonData.orders || [],
              comandas: jsonData.comandas || [],
              orderReports: jsonData.orderReports || [],
              kitchenReports: jsonData.kitchenReports || [],
              cashRegisterCloses: jsonData.cashRegisterCloses || [],
              auditLogs: jsonData.auditLogs || [],
              downloadsState: jsonData.downloadsState || { adminAuditLog: false, managerZip: false }
            };
            setData(initialData);
            localStorage.setItem('appData', JSON.stringify(initialData));
          }
        }
      } catch (e) {
        console.error('Error fetching initial data from github:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appData' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setData(parsed);
        } catch (err) {
          console.error('[DataSync] Error parsing storage update:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('appData', JSON.stringify(updated));
      return updated;
    });
  };

  const syncExcelencia = async () => {
    try {
      const response = await fetch(JSON_URL);
      if (response.ok) {
        const text = await response.text();
        if (text.trim()) {
          const jsonData = JSON.parse(text);
          const syncedData = {
            landingConfig: jsonData.landingConfig ? { ...INITIAL_LANDING_CONFIG, ...jsonData.landingConfig } : INITIAL_LANDING_CONFIG,
            menuItems: jsonData.menuItems || MENU_ITEMS,
            adminConfig: jsonData.adminConfig || INITIAL_ADMIN_CONFIG,
            dependents: jsonData.dependents || [],
            reservations: jsonData.reservations || [],
            orders: jsonData.orders || []
          };
          setData(syncedData);
          localStorage.setItem('appData', JSON.stringify(syncedData));
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Error syncing excelence.json:', e);
      return false;
    }
  };

  return {
    data,
    loading,
    updateData,
    syncExcelencia
  };
}
