import React, { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { Plus, Trash2, Save, Edit2, X, Upload, Image as ImageIcon, Power, Search, CheckCircle, XCircle } from 'lucide-react';

interface AdminMenuEditorProps {
  menuItems: MenuItem[];
  onSave: (newItems: MenuItem[]) => void;
}

export function AdminMenuEditor({ menuItems, onSave }: AdminMenuEditorProps) {
  const [items, setItems] = useState<MenuItem[]>(menuItems || []);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  useEffect(() => {
    if (menuItems) {
      setItems(menuItems);
    }
  }, [menuItems]);

  const categories = ['Todas', ...Array.from(new Set(items.map(i => i.category || 'Otros')))];

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.shortDescription && item.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Direct ON/OFF toggle for dish availability
  const handleToggleAvailability = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, isAvailable: item.isAvailable === false ? true : false };
      }
      return item;
    });
    setItems(newItems);
    onSave(newItems);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Seguro que desea eliminar este plato del menú?')) {
      const newItems = items.filter(i => i.id !== id);
      setItems(newItems);
      onSave(newItems);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem({
      ...item,
      isAvailable: item.isAvailable !== false,
      ingredients: item.ingredients || [],
      priceCUP: item.priceCUP || 0,
      priceUSD: item.priceUSD || 0,
    });
  };

  const handleAddNew = () => {
    setEditingItem({
      id: `ITEM-${Date.now()}`,
      name: '',
      category: 'Entradas',
      shortDescription: '',
      sensoryDescription: '',
      story: '',
      ingredients: [],
      priceCUP: 0,
      priceUSD: 0,
      imageUrl: '',
      isAvailable: true
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItem) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditingItem({ ...editingItem, imageUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    let newItems = [...items];
    const index = newItems.findIndex(i => i.id === editingItem.id);
    if (index >= 0) {
      newItems[index] = editingItem;
    } else {
      newItems.push(editingItem);
    }
    setItems(newItems);
    onSave(newItems);
    setEditingItem(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-4 sm:p-6 mb-12">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-100">
        <div>
          <h3 className="font-serif text-xl sm:text-2xl text-stone-900 font-bold">Gestión de Menú</h3>
          <p className="text-xs text-stone-500 mt-1">
            Gestione la disponibilidad y datos de los {items.length} platos registrados.
          </p>
        </div>
        <button 
          onClick={handleAddNew} 
          className="bg-gold hover:bg-yellow-500 text-stone-950 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-98 text-sm"
        >
          <Plus size={18} /> Nuevo Plato
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-stone-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar plato en el menú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedCategory === cat 
                  ? 'bg-dark-green text-white shadow-xs' 
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dish List Grid (Vertical Responsive Cards - No Horizontal Scroll Needed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isAvailable = item.isAvailable !== false;
          return (
            <div 
              key={item.id} 
              className={`bg-stone-50/70 border rounded-2xl p-4 transition-all flex flex-col justify-between hover:border-stone-300 hover:shadow-xs ${
                isAvailable ? 'border-stone-200' : 'border-red-200 bg-red-50/20'
              }`}
            >
              <div>
                <div className="flex gap-3.5 items-start mb-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-200">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover ${!isAvailable ? 'grayscale' : ''}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md truncate">
                        {item.category}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-stone-900 text-base leading-tight truncate">{item.name}</h4>
                    <div className="text-sm font-bold text-dark-green mt-1">
                      ${item.priceCUP.toLocaleString()} CUP 
                      {item.priceUSD ? <span className="text-xs text-stone-400 font-normal ml-1 border-l border-stone-300 pl-1.5">${item.priceUSD} USD</span> : null}
                    </div>
                  </div>
                </div>

                <p className="text-stone-500 text-xs line-clamp-2 mb-3">
                  {item.shortDescription || 'Sin descripción disponible.'}
                </p>
              </div>

              {/* Bottom Quick Controls */}
              <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between gap-2">
                {/* Direct Availability Toggle Switch */}
                <button
                  type="button"
                  onClick={(e) => handleToggleAvailability(item.id, e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isAvailable 
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200' 
                      : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
                  }`}
                  title={isAvailable ? "Desactivar plato (Marcar Agotado)" : "Activar plato (Marcar Disponible)"}
                >
                  <Power size={13} className={isAvailable ? 'text-emerald-700' : 'text-red-700'} />
                  <span>{isAvailable ? 'Activo' : 'Inactivo'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEdit(item)} 
                    className="p-2 text-stone-600 hover:text-dark-green hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                    title="Editar plato completo"
                  >
                    <Edit2 size={15} />
                    <span>Editar</span>
                  </button>
                  <button 
                    onClick={(e) => handleDelete(item.id, e)} 
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar plato"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-12 text-center text-stone-400">
          <p className="text-sm font-medium">No se encontraron platos con los filtros aplicados.</p>
        </div>
      )}

      {/* EDIT / CREATE DISH OVERLAY MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                {items.some(i => i.id === editingItem.id) ? 'Editar Plato del Menú' : 'Nuevo Plato'}
              </h3>
              <button 
                type="button"
                onClick={() => setEditingItem(null)} 
                className="p-2 bg-stone-200 text-stone-700 rounded-full hover:bg-stone-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Nombre del Plato *</label>
                  <input 
                    required 
                    type="text" 
                    value={editingItem.name} 
                    onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-gold" 
                    placeholder="Ej. Ceviche de Pescado"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Categoría *</label>
                  <input 
                    required 
                    type="text" 
                    value={editingItem.category} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-gold" 
                    placeholder="Ej. Entradas, Bebidas, Platos Fuertes"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Descripción Corta *</label>
                  <input 
                    required 
                    type="text" 
                    value={editingItem.shortDescription} 
                    onChange={e => setEditingItem({...editingItem, shortDescription: e.target.value})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-gold" 
                    placeholder="Breve resumen del plato para la carta pública"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Descripción Sensorial</label>
                  <textarea 
                    value={editingItem.sensoryDescription || ''} 
                    onChange={e => setEditingItem({...editingItem, sensoryDescription: e.target.value})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm h-20 focus:ring-2 focus:ring-gold" 
                    placeholder="Sabores, texturas y aromas del plato..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Historia / Origen</label>
                  <textarea 
                    value={editingItem.story || ''} 
                    onChange={e => setEditingItem({...editingItem, story: e.target.value})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm h-20 focus:ring-2 focus:ring-gold" 
                    placeholder="Inspiración o historia del plato en Terraza 53&M..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Ingredientes (Separados por coma)</label>
                  <input 
                    type="text" 
                    value={Array.isArray(editingItem.ingredients) ? editingItem.ingredients.join(', ') : ''} 
                    onChange={e => setEditingItem({...editingItem, ingredients: e.target.value.split(',').map(s => s.trim())})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-gold" 
                    placeholder="Ej. Pescado fresco, Limón, Cebolla morada, Cilantro"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Precio (CUP) *</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    value={editingItem.priceCUP} 
                    onChange={e => setEditingItem({...editingItem, priceCUP: Number(e.target.value)})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-gold" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Precio Referencial (USD)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.1"
                    value={editingItem.priceUSD || 0} 
                    onChange={e => setEditingItem({...editingItem, priceUSD: Number(e.target.value)})} 
                    className="w-full border-stone-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-gold" 
                  />
                </div>

                {/* State switch */}
                <div className="md:col-span-2 bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-stone-800">Estado de Disponibilidad</span>
                    <span className="text-[11px] text-stone-500">Determina si los clientes pueden solicitar este plato</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingItem({...editingItem, isAvailable: editingItem.isAvailable === false ? true : false})}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      editingItem.isAvailable !== false
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-red-600 text-white shadow-xs'
                    }`}
                  >
                    <Power size={14} />
                    <span>{editingItem.isAvailable !== false ? 'Activo (Disponible)' : 'Inactivo (Agotado)'}</span>
                  </button>
                </div>

                {/* Image Upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Imagen del Plato</label>
                  <div className="bg-stone-50 border-2 border-dashed border-stone-200 p-4 rounded-2xl text-center">
                    {editingItem.imageUrl ? (
                      <div className="relative inline-block group">
                        <img src={editingItem.imageUrl} alt="Vista previa" className="w-36 h-36 object-cover rounded-xl shadow-md border border-stone-200" />
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          title="Quitar imagen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-stone-400 mb-1" />
                        <p className="text-xs text-stone-500 mb-3">Sin imagen seleccionada</p>
                        <label className="cursor-pointer bg-dark-green text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-stone-800 transition-colors flex items-center gap-1.5">
                          <Upload size={14} /> Seleccionar / Subir Imagen
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>
                    )}
                    {editingItem.imageUrl && (
                      <div className="mt-3 flex justify-center">
                        <label className="cursor-pointer bg-stone-200 text-stone-700 px-3 py-1.5 rounded-xl font-medium text-xs hover:bg-stone-300 transition-colors flex items-center gap-1">
                          <Upload size={13} /> Cambiar Imagen
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-dark-green hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save size={16} /> Guardar Cambios
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
