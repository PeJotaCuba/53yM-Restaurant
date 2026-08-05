import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  CheckCircle, 
  Key, 
  Calendar, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  User,
  Power,
  Sliders
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Helper to generate a highly readable 6-character token (avoiding ambiguous characters like O, 0, I, 1)
function generate6CharToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function MesasManagement() {
  const { t } = useLanguage();
  
  // Queries
  const mesas = useQuery(api.mesas.getMesas) || [];
  const tokenBankSetting = useQuery(api.admin.getSetting, { key: "token_bank" });
  
  // Mutations
  const createMesa = useMutation(api.mesas.createMesa);
  const updateMesa = useMutation(api.mesas.updateMesa);
  const updateMesaStatus = useMutation(api.mesas.updateMesaStatus);
  const deleteMesa = useMutation(api.mesas.deleteMesa);
  const assignTokens = useMutation(api.mesas.assignTokens);
  const removeToken = useMutation(api.mesas.removeToken);
  const updateSetting = useMutation(api.admin.updateSetting);

  // Component States
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<any>(null);
  const [newNumber, setNewNumber] = useState<number | ''>('');
  const [newCapacity, setNewCapacity] = useState<number | ''>('');
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Form Inputs for Editing
  const [editNumber, setEditNumber] = useState<number | ''>('');
  const [editCapacity, setEditCapacity] = useState<number | ''>('');

  // 1. Handlers for Mesa CRUD
  const handleCreateMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newNumber === '') return;
    try {
      await createMesa({
        number: newNumber,
        capacity: newCapacity === '' ? undefined : newCapacity,
      });
      setIsCreating(false);
      setNewNumber('');
      setNewCapacity('');
    } catch (err: any) {
      alert(err.message || 'Error al registrar la mesa');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing || editNumber === '') return;
    try {
      await updateMesa({
        id: isEditing._id,
        number: editNumber,
        capacity: editCapacity === '' ? undefined : editCapacity,
      });
      setIsEditing(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar la mesa');
    }
  };

  const handleToggleStatus = async (mesa: any) => {
    const nextStatus = mesa.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = nextStatus === 'inactive' 
      ? `¿Estás seguro de desactivar la Mesa ${mesa.number}? Sus tokens activos se eliminarán y no aceptará pedidos.`
      : `¿Activar la Mesa ${mesa.number} y dejarla disponible?`;
      
    if (confirm(confirmMsg)) {
      try {
        await updateMesaStatus({
          id: mesa._id,
          status: nextStatus,
        });
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleDeleteMesa = async (mesa: any) => {
    if (confirm(`⚠️ ¿Estás seguro de eliminar permanentemente la Mesa ${mesa.number}? Esta acción es irreversible.`)) {
      try {
        await deleteMesa({ id: mesa._id });
        if (isEditing?._id === mesa._id) setIsEditing(null);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleRemoveToken = async (mesa: any) => {
    if (confirm(`¿Estás seguro de retirar el token actual de la Mesa ${mesa.number}? El cliente no podrá realizar pedidos hasta que se le asigne uno nuevo.`)) {
      try {
        await removeToken({ id: mesa._id });
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // 2. Token Bank Generation (Botón 2)
  const handleGenerateBank = async () => {
    if (confirm('¿Deseas generar un nuevo Banco de Tokens Preelaborados? El banco anterior (si existe) quedará invalidado.')) {
      const generatedSet = new Set<string>();
      while (generatedSet.size < 50) {
        generatedSet.add(generate6CharToken());
      }
      
      const newBank = {
        tokens: Array.from(generatedSet),
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // Valid for 30 days
      };

      try {
        await updateSetting({
          key: "token_bank",
          value: newBank,
        });
        alert('✅ ¡Banco de 50 tokens preelaborados generado con éxito! Válido por 30 días.');
      } catch (err: any) {
        alert('Error al guardar el banco de tokens: ' + err.message);
      }
    }
  };

  // 3. Dynamic Token Distribution (Botón 3)
  const handleAssignTokens = async () => {
    if (!tokenBankSetting || !tokenBankSetting.tokens || tokenBankSetting.tokens.length === 0) {
      alert('⚠️ Primero debes generar un Banco de Tokens para poder asignarlos a las mesas.');
      return;
    }

    const now = Date.now();
    if (tokenBankSetting.expiresAt && now > tokenBankSetting.expiresAt) {
      alert('⚠️ El banco de tokens preelaborados actual ha expirado. Por favor, genera un nuevo banco primero.');
      return;
    }

    const activeMesas = mesas.filter((m: any) => m.status === 'active');
    if (activeMesas.length === 0) {
      alert('No hay mesas activas registradas para asignarles tokens.');
      return;
    }

    const confirmMsg = `¿Deseas asignar automáticamente nuevos tokens de seguridad a las ${activeMesas.length} mesas activas?\n\nLos tokens tendrán una vigencia estricta de 24 horas.`;
    if (!confirm(confirmMsg)) return;

    // We will shuffle or slice the tokens in the bank
    const availableTokens = [...tokenBankSetting.tokens];
    
    // To ensure unique assignments, we assign each active mesa a fresh token from the bank.
    // If the bank has 50 tokens, that's plenty for the tables.
    if (availableTokens.length < activeMesas.length) {
      alert(`Error: El banco solo tiene ${availableTokens.length} tokens, pero tienes ${activeMesas.length} mesas activas. Por favor, regenera un banco más grande.`);
      return;
    }

    const assignments = activeMesas.map((mesa: any, index: number) => {
      return {
        id: mesa._id,
        token: availableTokens[index],
        tokenAssignedAt: now,
        tokenExpiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      };
    });

    try {
      await assignTokens({ assignments });
      alert(`✅ Tokens de jornada asignados correctamente a ${activeMesas.length} mesas.\n\nLos clientes ya pueden autenticarse con sus nuevos códigos de mesa de 6 dígitos.`);
    } catch (err: any) {
      alert('Error al asignar los tokens: ' + err.message);
    }
  };

  // Format expiry times
  const getExpiresLabel = (expiryTime?: number) => {
    if (!expiryTime) return 'Expirado / No Asignado';
    const diff = expiryTime - Date.now();
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Vence en ${hours}h ${mins}m`;
    }
    return `Vence en ${mins} min`;
  };

  // Token Bank Info
  const isBankActive = tokenBankSetting && tokenBankSetting.expiresAt && Date.now() < tokenBankSetting.expiresAt;
  const bankExpiryDateStr = tokenBankSetting?.expiresAt 
    ? new Date(tokenBankSetting.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* 1. Header with custom style instructions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E0D0] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] text-gold uppercase tracking-widest font-black block mb-2">Seguridad de Pedidos</span>
          <h2 className="text-3xl font-serif text-stone-900 font-bold">Control de Acceso por Tokens</h2>
          <p className="text-sm text-stone-500 mt-2 max-w-2xl">
            Sustituye por completo el acceso físico QR por autenticación segura por tokens dinámicos. 
            Los clientes solicitan o reciben el código actual para realizar comandas, garantizando presencia real en mesa.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-center min-w-[100px]">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Total Mesas</span>
            <span className="text-xl font-bold text-stone-800">{mesas.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2 text-center min-w-[100px]">
            <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider block">Activas</span>
            <span className="text-xl font-bold text-emerald-700">
              {mesas.filter((m: any) => m.status === 'active').length}
            </span>
          </div>
          <div className={`${isBankActive ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'} border rounded-2xl px-4 py-2 text-center min-w-[120px]`}>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Banco de Tokens</span>
            <span className={`text-sm font-bold ${isBankActive ? 'text-amber-700' : 'text-red-700'}`}>
              {isBankActive ? 'Vigente' : 'Inactivo / Expirado'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Admin Three Main Actions panel */}
      <div className="bg-stone-100/60 rounded-3xl p-6 border border-stone-200 shadow-inner">
        <h3 className="text-sm font-bold text-stone-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sliders size={16} /> Panel de Control de Jornada
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Botón 1 Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between shadow-xs">
            <div>
              <div className="bg-[#0F2E26] text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold font-serif mb-3">
                1
              </div>
              <h4 className="font-bold text-stone-900 font-serif text-lg">Nueva Mesa</h4>
              <p className="text-xs text-stone-500 mt-1">
                Registra una nueva mesa física en el sistema de forma limpia y directa.
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 w-full bg-[#0F2E26] hover:bg-stone-950 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={14} /> Crear Mesa
            </button>
          </div>

          {/* Botón 2 Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between shadow-xs">
            <div>
              <div className="bg-gold text-stone-900 w-10 h-10 rounded-xl flex items-center justify-center font-bold font-serif mb-3">
                2
              </div>
              <h4 className="font-bold text-stone-900 font-serif text-lg">Generar Banco</h4>
              <p className="text-xs text-stone-500 mt-1">
                Prepara un listado de 50 tokens de 6 caracteres únicos con vigencia de 30 días.
              </p>
            </div>
            <button
              onClick={handleGenerateBank}
              className="mt-4 w-full bg-stone-900 hover:bg-stone-950 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Key size={14} className="text-gold" /> Generar Banco de Tokens
            </button>
          </div>

          {/* Botón 3 Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between shadow-xs">
            <div>
              <div className="bg-emerald-800 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold font-serif mb-3">
                3
              </div>
              <h4 className="font-bold text-stone-900 font-serif text-lg">Asignar Tokens</h4>
              <p className="text-xs text-stone-500 mt-1">
                Distribuye automáticamente tokens vigentes por 24 horas a todas las mesas activas.
              </p>
            </div>
            <button
              onClick={handleAssignTokens}
              className="mt-4 w-full bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw size={14} /> Distribuir / Renovar Jornada
            </button>
          </div>
        </div>
      </div>

      {/* 3. Token Bank Sub-Section Viewer */}
      {tokenBankSetting && tokenBankSetting.tokens && (
        <div className="bg-white rounded-3xl border border-[#E8E0D0] overflow-hidden shadow-xs">
          <button 
            onClick={() => setShowBankDetails(!showBankDetails)}
            className="w-full px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center text-left"
          >
            <div className="flex items-center gap-3">
              <Key size={18} className="text-gold" />
              <div>
                <span className="font-bold text-stone-800 text-sm">Ver Banco de Tokens Preelaborados</span>
                <span className="text-xs text-stone-400 block mt-0.5">
                  {isBankActive 
                    ? `Vigente hasta el ${bankExpiryDateStr}` 
                    : '⚠️ Banco expirado - requiere regeneración'
                  }
                </span>
              </div>
            </div>
            <span className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              {showBankDetails ? 'Contraer' : 'Expandir'} {showBankDetails ? <EyeOff size={12} /> : <Eye size={12} />}
            </span>
          </button>
          
          {showBankDetails && (
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {tokenBankSetting.tokens.map((tok: string, i: number) => {
                  const numStr = String(i + 1).padStart(3, '0');
                  // Check if this token is currently assigned to some mesa
                  const assignedMesa = mesas.find((m: any) => m.token === tok && m.status === 'active');
                  
                  return (
                    <div 
                      key={tok} 
                      className={`p-2 rounded-xl border text-center relative transition-all ${
                        assignedMesa 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}
                    >
                      <span className="text-[9px] font-mono text-stone-400 block">Token {numStr}</span>
                      <span className="font-mono font-bold text-xs tracking-wider block">{tok}</span>
                      {assignedMesa && (
                        <span className="text-[8px] bg-emerald-600 text-white px-1 py-0.5 rounded-sm absolute -top-1.5 left-1/2 transform -translate-x-1/2 font-bold font-mono">
                          MESA {assignedMesa.number}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Interactive Forms: Create / Edit Modals */}
      {isCreating && (
        <div className="bg-[#FAF9F5] p-6 rounded-3xl border-2 border-dashed border-[#E8E0D0] shadow-xs animate-fade-in">
          <h3 className="font-serif font-black text-lg mb-4 text-[#1A2E26] flex items-center gap-2">
            <Plus size={18} className="text-gold" /> Registrar Nueva Mesa Física
          </h3>
          <form onSubmit={handleCreateMesa} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Número de Mesa</label>
              <input
                type="number"
                min="1"
                value={newNumber}
                onChange={(e) => setNewNumber(parseInt(e.target.value) || '')}
                required
                className="w-full bg-white border border-[#E8E0D0] rounded-xl px-4 py-3 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
                placeholder="Ej. 1"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Capacidad (Opcional)</label>
              <input
                type="number"
                min="1"
                value={newCapacity}
                onChange={(e) => setNewCapacity(parseInt(e.target.value) || '')}
                className="w-full bg-white border border-[#E8E0D0] rounded-xl px-4 py-3 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
                placeholder="Ej. 4 personas"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 bg-stone-200 text-stone-700 py-3 rounded-xl font-bold text-xs hover:bg-stone-300 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#0F2E26] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#1A3D32] transition-colors shadow-sm uppercase tracking-wider"
              >
                Guardar Mesa
              </button>
            </div>
          </form>
        </div>
      )}

      {isEditing && (
        <div className="bg-[#FAF9F5] p-6 rounded-3xl border-2 border-gold/40 shadow-sm animate-fade-in">
          <h3 className="font-serif font-black text-lg mb-4 text-[#1A2E26] flex items-center gap-2">
            <Edit3 size={18} className="text-gold" /> Editar Mesa {isEditing.number}
          </h3>
          <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nuevo Número de Mesa</label>
              <input
                type="number"
                min="1"
                value={editNumber}
                onChange={(e) => setEditNumber(parseInt(e.target.value) || '')}
                required
                className="w-full bg-white border border-[#E8E0D0] rounded-xl px-4 py-3 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nueva Capacidad (Opcional)</label>
              <input
                type="number"
                min="1"
                value={editCapacity}
                onChange={(e) => setEditCapacity(parseInt(e.target.value) || '')}
                className="w-full bg-white border border-[#E8E0D0] rounded-xl px-4 py-3 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(null)}
                className="flex-1 bg-stone-200 text-stone-700 py-3 rounded-xl font-bold text-xs hover:bg-stone-300 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#0F2E26] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#1A3D32] transition-colors shadow-sm uppercase tracking-wider"
              >
                Aplicar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Clean, Professional Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mesas.map((mesa: any) => {
          const hasToken = !!mesa.token;
          const isExpired = mesa.tokenExpiresAt && Date.now() > mesa.tokenExpiresAt;
          
          return (
            <div 
              key={mesa._id} 
              className={`bg-white rounded-3xl border overflow-hidden flex flex-col group transition-all duration-300 ${
                mesa.status === 'active' 
                  ? 'border-[#E8E0D0] hover:shadow-md' 
                  : 'border-stone-200 opacity-75'
              }`}
            >
              {/* Header inside Mesa Card */}
              <div className="p-5 border-b border-[#E8E0D0] flex justify-between items-start bg-stone-50/50">
                <div>
                  <h3 className="text-xl font-serif font-black text-stone-900">Mesa {mesa.number}</h3>
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mt-1">
                    {mesa.capacity ? `Capacidad: ${mesa.capacity} pax` : 'Sin cap. definida'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleStatus(mesa)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                    mesa.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                  title={mesa.status === 'active' ? "Desactivar Mesa" : "Activar Mesa"}
                >
                  <Power size={10} />
                  {mesa.status === 'active' ? 'Activa' : 'Inactiva'}
                </button>
              </div>
              
              {/* Dynamic Token Display Canvas */}
              <div className="p-6 flex-1 flex flex-col items-center justify-center bg-stone-50 border-b border-stone-100">
                {mesa.status === 'inactive' ? (
                  <div className="text-center py-6">
                    <ShieldAlert className="text-stone-400 mx-auto mb-2" size={28} />
                    <p className="text-xs font-bold text-stone-500">Mesa Desactivada</p>
                    <p className="text-[10px] text-stone-400 mt-1">No admite pedidos ni tokens.</p>
                  </div>
                ) : !hasToken ? (
                  <div className="text-center py-6">
                    <ShieldAlert className="text-amber-500 mx-auto mb-2 animate-pulse" size={28} />
                    <p className="text-xs font-bold text-amber-600">Sin Token de Jornada</p>
                    <p className="text-[10px] text-stone-400 mt-1">Haga clic en 'Asignar Tokens' arriba.</p>
                  </div>
                ) : isExpired ? (
                  <div className="text-center py-6">
                    <X className="text-red-500 bg-red-100 rounded-full p-1 mx-auto mb-2" size={28} />
                    <p className="text-xs font-bold text-red-600">Token Expirado</p>
                    <p className="text-[10px] text-stone-400 mt-1">Expiró a las {new Date(mesa.tokenExpiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest block mb-2">Token de Seguridad Actual</span>
                    
                    <div className="bg-stone-900 text-gold py-3 px-6 rounded-2xl font-mono text-3xl font-black tracking-widest shadow-inner inline-block select-all min-w-[160px] relative group-hover:scale-105 transition-transform">
                      {mesa.token}
                    </div>
                    
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-100 inline-flex">
                      <CheckCircle size={11} className="fill-emerald-600 text-white" />
                      <span>{getExpiresLabel(mesa.tokenExpiresAt)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons Panel */}
              <div className="p-3 bg-white flex gap-1.5 justify-between border-t border-stone-100">
                <button
                  onClick={() => {
                    setIsEditing(mesa);
                    setEditNumber(mesa.number);
                    setEditCapacity(mesa.capacity || '');
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }}
                  className="p-2.5 bg-stone-50 hover:bg-stone-150 text-stone-700 hover:text-stone-900 rounded-xl transition-colors flex-1 flex justify-center items-center gap-1 text-xs font-bold border border-stone-200"
                  title="Editar número o capacidad de la mesa"
                >
                  <Edit3 size={13} /> Editar
                </button>
                
                {mesa.status === 'active' && hasToken && (
                  <button
                    onClick={() => handleRemoveToken(mesa)}
                    className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors flex-shrink-0"
                    title="Retirar token actual de esta mesa"
                  >
                    <X size={14} />
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteMesa(mesa)}
                  className="p-2.5 bg-red-50 hover:bg-red-100 text-[#C93A3A] rounded-xl transition-colors flex-shrink-0"
                  title="Eliminar Mesa Permanentemente"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        
        {mesas.length === 0 && !isCreating && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#E8E0D0] rounded-3xl text-stone-400 bg-stone-50/50">
            <ShieldAlert size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="font-serif font-bold text-stone-600 text-lg">No hay mesas en el restaurante</p>
            <p className="text-xs text-stone-400 mt-1">Cree una mesa pulsando en 'Crear Mesa' o 'Nueva Mesa' arriba.</p>
          </div>
        )}
      </div>
    </div>
  );
}
