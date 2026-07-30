import React, { useState } from 'react';
import { AppData, Reservation, Order, DependentConfig, ManagerConfig, KitchenConfig, Comanda } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { DependentPanel } from './DependentPanel';
import { ManagerPanel } from './ManagerPanel';
import { KitchenPanel } from './KitchenPanel';
import { UserDashboard } from './UserDashboard';
import { 
  Tv, 
  Users, 
  ShieldCheck, 
  Utensils, 
  Activity, 
  Play, 
  Smartphone, 
  ChefHat, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface AdminSimulatorProps {
  data: AppData;
  updateData: (data: Partial<AppData>) => void;
  updateStatus: (id: string, status: Reservation['status']) => void;
}

interface LogEntry {
  id: string;
  time: string;
  role: 'Cliente' | 'Dependiente' | 'Cocina' | 'Gerente' | 'Administrador' | 'Sistema';
  text: string;
}

export function AdminSimulator({ data, updateData, updateStatus }: AdminSimulatorProps) {
  const { t } = useLanguage();
  const [fullRole, setFullRole] = useState<'client' | 'dependent' | 'kitchen' | 'manager'>('client');
  const [selectedDependentIndex, setSelectedDependentIndex] = useState<number>(0);
  const [showResetModal, setShowResetModal] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      role: 'Sistema',
      text: 'Simulador interconectado de 53&M listo (Modo Pantalla Completa por Rol).'
    }
  ]);

  const addLog = (role: LogEntry['role'], text: string) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      role,
      text
    };
    setLogs(prev => [newEntry, ...prev].slice(0, 30));
  };

  const activeDependent: DependentConfig = data.dependents[selectedDependentIndex] || {
    id: 'DEP-SIM',
    deviceId: 'DVC-MESA1',
    tableNumber: 'Mesa 1',
    name: 'Dependiente Simulado',
    phone: '5350000000',
    username: 'dep_sim',
    password: '123',
    isActive: true
  };

  const activeManager: ManagerConfig = (data.managers && data.managers[0]) || {
    id: 'MGR-SIM',
    name: 'Gerente de Restaurante Simulado',
    username: 'gerente_sim',
    password: '123',
    phone: data.adminConfig?.phone || '54413935',
    isActive: true
  };

  const kitchenInfo: KitchenConfig = data.kitchenConfig || {
    username: 'cocina',
    password: '123',
    name: 'Jefe de Cocina 53&M'
  };

  // Run full scenario
  const handleRunFullScenario = () => {
    const timestamp = Date.now();
    const table = `Mesa ${Math.floor(Math.random() * 5) + 1}`;
    const dish = data.menuItems[Math.floor(Math.random() * data.menuItems.length)]?.name || 'Tabla 53&M';
    const rateUsd = data.exchangeRate?.usdCUP || 320;
    const rateEur = data.exchangeRate?.eurCUP || 350;

    // 1. One test order (pending)
    const testOrder: Order = {
      id: `ORD-${timestamp}`,
      tableNumber: table,
      items: [`2x ${dish}`, '1x Mojito Tradicional'],
      orderItems: [
        { name: dish, quantity: 2, priceCUP: 1200 },
        { name: 'Mojito Tradicional', quantity: 1, priceCUP: 350 }
      ],
      status: 'pending',
      timestamp: timestamp
    };

    // 2. One kitchen ready order (ready to be delivered)
    const readyOrder: Order = {
      id: `ORD-READY-${timestamp}`,
      tableNumber: `Mesa 2`,
      items: ['1x Cerdo Glaseado'],
      orderItems: [{ name: 'Cerdo Glaseado', quantity: 1, priceCUP: 4500 }],
      status: 'kitchen_ready',
      timestamp: timestamp - 900000
    };

    // 3. One delivered order that is in an open comanda
    const deliveredOrderForOpenCom: Order = {
      id: `ORD-DELIV-${timestamp}`,
      tableNumber: `Mesa 3`,
      items: ['1x Ensalada de Camarones'],
      orderItems: [{ name: 'Ensalada de Camarones', quantity: 1, priceCUP: 3800 }],
      status: 'delivered',
      timestamp: timestamp - 1800000
    };

    // 4. One delivered order in a closed comanda
    const closedOrder: Order = {
      id: `ORD-CLOSED-${timestamp}`,
      tableNumber: `Mesa 4`,
      items: ['1x Tostones Rellenos', '1x Coctel 53&M'],
      orderItems: [
        { name: 'Tostones Rellenos', quantity: 1, priceCUP: 2100 },
        { name: 'Coctel 53&M', quantity: 1, priceCUP: 1200 }
      ],
      status: 'delivered',
      timestamp: timestamp - 3600000
    };

    // 5. Open comanda
    const openComanda: Comanda = {
      id: `COM-O-${timestamp}`,
      tableNumber: 'Mesa 3',
      dependentId: activeDependent.id || 'DEP-SIM',
      dependentName: activeDependent.name || 'Dependiente Simulado',
      customerName: 'Sra. Mercedes',
      status: 'open',
      openedAt: timestamp - 1800000,
      orders: [deliveredOrderForOpenCom]
    };

    // 6. Closed comanda
    const closedComanda: Comanda = {
      id: `COM-C-${timestamp}`,
      tableNumber: 'Mesa 4',
      dependentId: activeDependent.id || 'DEP-SIM',
      dependentName: activeDependent.name || 'Dependiente Simulado',
      customerName: 'Familia González',
      status: 'closed',
      openedAt: timestamp - 3600000,
      closedAt: timestamp - 600000,
      orders: [closedOrder],
      currency: 'CUP',
      paymentMethod: 'cash',
      cashAmount: 3300,
      digitalAmount: 0,
      totalAmountCUP: 3300,
      currencyBreakdown: { CUP: 3300 },
      paymentSummaryStr: '$3,300 CUP',
      exchangeRateUsed: { usdCUP: rateUsd, eurCUP: rateEur }
    };

    updateData({
      orders: [...(data.orders || []), testOrder, readyOrder, deliveredOrderForOpenCom, closedOrder],
      comandas: [...(data.comandas || []), openComanda, closedComanda]
    });

    addLog('Sistema', `⚡ Escenario Completo Cargado: Pedidos y Comandas creadas para mesas 2, 3 y 4. ¡Listo para interactuar!`);
    alert(`⚡ ¡Escenario Automático Interconectado Iniciado!\n\nSe han creado los siguientes datos para probar de inmediato:\n\n1. Mesa 4: Comanda CERRADA y cobrada por $3,300 CUP.\n(Listo para generar el Informe de Turno de Dependiente al Gerente en el panel "Dependiente").\n\n2. Mesa 3: Comanda ABIERTA con pedido servido.\n(Listo para cobrar y cerrar).\n\n3. Mesa 2: Pedido LISTO en cocina.\n(Aparecerá la campana de notificación en Dependiente).\n\n4. ${table}: Pedido PENDIENTE.\n(Aparecerá en el panel de Cocina).`);
  };

  const handleResetShiftClick = () => {
    // Permite al usuario/tester reiniciar la jornada de forma incondicional para facilitar pruebas
    setShowResetModal(true);
  };

  const confirmResetShift = () => {
    updateData({
      orders: [],
      comandas: [],
      orderReports: [],
      kitchenReports: [],
      cashRegisterCloses: [],
      auditLogs: [],
      reservations: [],
      notifications: [],
      downloadsState: { adminAuditLog: false, managerZip: false }
    });
    setLogs([
      {
        id: `log-${Date.now()}`,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        role: 'Administrador',
        text: 'Reinició por completo la jornada operativa en el simulador. El simulador ha quedado limpio.'
      }
    ]);
    setShowResetModal(false);
    alert(t('Jornada reiniciada correctamente. Todos los datos del simulador han quedado limpios y en blanco.'));
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Info */}
      <div className="bg-gradient-to-r from-dark-green via-stone-900 to-stone-800 text-white p-6 md:p-8 rounded-3xl shadow-lg border border-stone-700/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-2">
              <Sparkles size={16} /> {t('Herramienta de Desarrollo & Pruebas Integradas')}
            </div>
            <h3 className="text-2xl md:text-3xl font-serif text-white font-bold mb-2">
              {t('Simulador Interconectado por Rol (53&M)')}
            </h3>
            <p className="text-stone-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              {t('Selecciona un rol para interactuar en pantalla completa con la experiencia exacta que tendrá cada usuario en la operación real.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunFullScenario}
              className="bg-gold text-dark-green hover:bg-amber-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md"
            >
              <Play size={15} /> {t('Generar Pedido de Ejemplo')}
            </button>

            <button
              onClick={handleResetShiftClick}
              className="bg-red-900/80 hover:bg-red-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md border border-red-700"
            >
              <RefreshCw size={15} /> {t('Reiniciar Jornada')}
            </button>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="mt-6 pt-6 border-t border-stone-700/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-700">
            <button
              onClick={() => setFullRole('client')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                fullRole === 'client' ? 'bg-gold text-dark-green shadow-xs' : 'text-stone-300 hover:text-white'
              }`}
            >
              👤 {t('Cliente (Comensal / Pedidos)')}
            </button>
            <button
              onClick={() => setFullRole('dependent')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                fullRole === 'dependent' ? 'bg-gold text-dark-green shadow-xs' : 'text-stone-300 hover:text-white'
              }`}
            >
              🍽️ {t('Dependiente (Mesero)')}
            </button>
            <button
              onClick={() => setFullRole('kitchen')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                fullRole === 'kitchen' ? 'bg-gold text-dark-green shadow-xs' : 'text-stone-300 hover:text-white'
              }`}
            >
              👨‍🍳 {t('Cocina (Jefe de Cocina)')}
            </button>
            <button
              onClick={() => setFullRole('manager')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                fullRole === 'manager' ? 'bg-gold text-dark-green shadow-xs' : 'text-stone-300 hover:text-white'
              }`}
            >
              👔 {t('Gerente de Restaurante')}
            </button>
          </div>

          {fullRole === 'dependent' && data.dependents.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-300 font-semibold">{t('Simular Mesa:')}</span>
              <select
                value={selectedDependentIndex}
                onChange={e => setSelectedDependentIndex(parseInt(e.target.value) || 0)}
                className="bg-stone-950 text-gold border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                {data.dependents.map((dep, idx) => (
                  <option key={dep.id || dep.deviceId} value={idx}>
                    {dep.tableNumber} — {dep.name || dep.username}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* --- FULL ROLE EMBEDDED PANELS --- */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-4 md:p-8">
        {fullRole === 'client' && (
          <UserDashboard
            reservations={data.reservations}
            data={data}
            updateData={updateData}
            onUpdateReservation={(id, updated) => {
              const updatedRes = data.reservations.map(r => r.id === id ? { ...r, ...updated } : r);
              updateData({ reservations: updatedRes });
              addLog('Cliente', `Actualizó reserva #${id.slice(-4)}`);
            }}
            onCancelReservation={(id) => {
              updateStatus(id, 'cancelled');
              addLog('Cliente', `Canceló reserva #${id.slice(-4)}`);
            }}
          />
        )}

        {fullRole === 'dependent' && (
          <DependentPanel
            key={activeDependent.id || activeDependent.username}
            data={data}
            updateData={updateData}
            dependentInfo={activeDependent}
          />
        )}

        {fullRole === 'kitchen' && (
          <KitchenPanel
            data={data}
            updateData={updateData}
            kitchenInfo={kitchenInfo}
          />
        )}

        {fullRole === 'manager' && (
          <ManagerPanel
            data={data}
            updateData={updateData}
            managerInfo={activeManager}
            updateStatus={updateStatus}
          />
        )}
      </div>

      {/* BITÁCORA DE CONTROL EN TIEMPO REAL */}
      <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 shadow-md border border-stone-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-green-400" size={18} />
            <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
              {t('Bitácora de Control (Todas las Acciones de la Jornada)')}
            </h4>
          </div>
          <span className="text-[10px] text-stone-400 font-mono">
            Clientes • Dependientes • Cocina • Gerente • Administrador
          </span>
        </div>

        <div className="bg-black/60 font-mono text-xs p-4 rounded-2xl border border-stone-800 max-h-60 overflow-y-auto space-y-2">
          {/* Unified Logs */}
          {[
            ...(data.auditLogs || []).map(a => ({
              id: a.id,
              time: a.timeStr || new Date(a.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              role: a.role,
              text: `[${a.action}] (${a.userOrDevice}) — ${a.details}`
            })),
            ...logs
          ].map(log => (
            <div key={log.id} className="flex items-start gap-2 border-b border-stone-800/60 pb-1.5">
              <span className="text-stone-500 text-[10px]">[{log.time}]</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                log.role === 'Cliente' ? 'bg-blue-900 text-blue-300' :
                log.role === 'Dependiente' ? 'bg-amber-900 text-amber-300' :
                log.role === 'Cocina' ? 'bg-emerald-900 text-emerald-300' :
                log.role === 'Gerente' ? 'bg-purple-900 text-purple-300' :
                'bg-stone-800 text-gold'
              }`}>
                {log.role}
              </span>
              <span className="text-stone-300">{log.text}</span>
            </div>
          ))}

          {(!data.auditLogs || data.auditLogs.length === 0) && logs.length === 0 && (
            <div className="text-stone-500 text-xs text-center py-4">
              {t('No hay registros en la bitácora de control aún.')}
            </div>
          )}
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h3 className="font-serif font-bold text-xl text-stone-900">¿Desea reiniciar la jornada?</h3>
            <p className="text-xs text-stone-600">
              Se borrarán todos los datos del simulador (órdenes, comandas, bitácora e informes del día) para comenzar todo otra vez.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResetShift}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700"
              >
                Confirmar Reinicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
