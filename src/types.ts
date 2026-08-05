export interface MenuItem {
  id: string;
  name: string;
  category: string;
  shortDescription: string;
  sensoryDescription: string;
  story: string;
  ingredients: string[];
  priceCUP: number;
  priceUSD: number;
  imageUrl: string;
}

export interface AdminConfig {
  username: string;
  password: string;
  phone: string;
}

export interface DependentConfig {
  id: string;
  deviceId: string;
  tableNumber: string;
  name: string;
  phone: string;
  username: string;
  password: string;
  isActive: boolean;
}

export interface ManagerConfig {
  id: string;
  username: string;
  password: string;
  phone: string;
  name: string;
  deviceId?: string;
  isActive: boolean;
}

export interface KitchenConfig {
  username: string;
  password: string;
  name: string;
  deviceId?: string;
}

export interface LandingConfig {
  heroTitle: string;
  heroSlogan?: string;
  heroSubtitle: string;
  heroBgImage?: string;
  heroBannerImage?: string;
  aboutText1: string;
  aboutText2: string;
  aboutTags: string[];
  aboutImage: string;
  services: { icon: string; title: string; description: string; }[];
  galleryImages: string[];
  promotions: { icon: string; title: string; tag: string; desc: string; }[];
  contactPhone: string;
  contactAddress: string;
  contactEmail: string;
  contactHours: string;
  teamImages?: string[];
  footerText: string;
}

export interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  priceCUP: number;
  priceUSD?: number;
  notes?: string;
}

export interface Order {
  id: string;
  comandaId?: string;
  tableNumber: string;
  items: string[]; // text descriptions or fallback
  orderItems?: OrderItem[]; // structured list with portion quantities & prices
  status: 'client_pending' | 'pending' | 'in_kitchen' | 'pending_dependent' | 'kitchen_in_progress' | 'in_progress' | 'kitchen_ready' | 'ready_to_serve' | 'delivered' | 'paid' | 'closed';
  timestamp: number;
  totalCUP?: number;
  totalUSD?: number;
  assignedDependentId?: string;
  reservationId?: string;
  customerName?: string;
}

export interface Comanda {
  id: string;
  tableNumber: string;
  dependentId?: string;
  dependentName?: string;
  customerName?: string;
  status: 'open' | 'closed';
  openedAt: number;
  closedAt?: number;
  orders: Order[];
  parentComandaId?: string;
  currency?: 'CUP' | 'USD' | 'EUR';
  paymentMethod?: 'cash' | 'digital' | 'mixed';
  cashAmount?: number;
  digitalAmount?: number;
  totalAmountCUP?: number;
  currencyBreakdown?: { CUP?: number; USD?: number; EUR?: number };
  paymentSummaryStr?: string;
  exchangeRateUsed?: { usdCUP: number; eurCUP: number };
  paymentRequested?: boolean;
}

export interface ComandaReportItem {
  comandaId: string;
  tableNumber: string;
  openedAt: number;
  closedAt?: number;
  currency: 'CUP' | 'USD' | 'EUR';
  paymentMethod: 'cash' | 'digital' | 'mixed';
  cashAmount: number;
  digitalAmount: number;
  totalAmount: number;
  currencyBreakdown?: { CUP?: number; USD?: number; EUR?: number };
  paymentSummaryStr?: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
}

export interface OrderReport {
  id: string;
  dependentName: string;
  dependentUsername: string;
  tableNumber: string;
  timestamp: number;
  dateStr: string;
  totalOrdersCount: number;
  totalItemsCount: number;
  totalAmountCUP: number;
  totalAmountUSD: number;
  totalAmountEUR: number;
  paymentSummary: {
    totalCashCUP: number;
    totalDigitalCUP: number;
    totalCashUSD: number;
    totalDigitalUSD: number;
    totalCashEUR: number;
    totalDigitalEUR: number;
  };
  comandas: ComandaReportItem[];
  itemsSummary: { name: string; count: number; totalSalesCUP: number }[];
  orders: Order[];
}

export interface KitchenReport {
  id: string;
  dateStr: string;
  timestamp: number;
  chefName: string;
  totalOrdersProcessed: number;
  totalDishesPrepared: number;
  segmentedByDependent: {
    dependentName: string;
    tableNumber: string;
    ordersCount: number;
    dishesPrepared: { name: string; count: number }[];
  }[];
  dishesSummary: { name: string; count: number }[];
}

export interface CashRegisterClose {
  id: string;
  dateStr: string;
  timestamp: number;
  managerName: string;
  countedCashCUP: number;
  countedDigitalCUP: number;
  countedCashUSD: number;
  countedDigitalUSD: number;
  countedCashEUR: number;
  countedDigitalEUR: number;
  systemExpectedCUP: number;
  systemExpectedUSD: number;
  systemExpectedEUR: number;
  differenceCUP: number;
  differenceUSD: number;
  differenceEUR: number;
  kitchenDiscrepanciesCount: number;
  status: 'balanced' | 'surplus' | 'shortage';
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  timeStr: string;
  dateStr: string;
  role: 'Cliente' | 'Dependiente' | 'Cocina' | 'Gerente' | 'Administrador' | 'Sistema';
  userOrDevice: string;
  action: string;
  details: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'cancellation_pending' | 'consolidated';

export interface ReservedDish {
  name: string;
  quantity: number;
  priceCUP?: number;
}

export interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  guests: number;
  occasion: string;
  name: string;
  email: string;
  phone: string;
  dishReference?: string;
  dishes?: ReservedDish[];
  tableNumber?: string;
  status: ReservationStatus;
  createdAt: number;
}

export interface ExchangeRateConfig {
  usdCUP: number;
  eurCUP: number;
  updatedAt: number;
}

export interface AppNotification {
  id: string;
  timestamp: number;
  orderId: string;
  tableNumber: string;
  targetRole: 'dependent' | 'client' | 'kitchen' | 'admin' | 'all';
  title: string;
  message: string;
  isRead?: boolean;
}

export interface AppData {
  landingConfig: LandingConfig;
  menuItems: MenuItem[];
  adminConfig: AdminConfig;
  dependents: DependentConfig[];
  managers?: ManagerConfig[];
  kitchenConfig?: KitchenConfig;
  orderReports?: OrderReport[];
  kitchenReports?: KitchenReport[];
  cashRegisterCloses?: CashRegisterClose[];
  auditLogs?: AuditLogEntry[];
  comandas?: Comanda[];
  reservations: Reservation[];
  orders: Order[];
  isShiftActive?: boolean;
  downloadsState?: { adminAuditLog: boolean; managerZip: boolean };
  exchangeRate?: ExchangeRateConfig;
  notifications?: AppNotification[];
  history?: any[];
  gerenteCierreCompleto?: boolean;
  appQrUrl?: string;
  mesas?: any[];
}
