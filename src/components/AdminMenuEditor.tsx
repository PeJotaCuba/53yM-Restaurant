import React, { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { Plus, Trash2, Save, Edit2, X, Upload, Image as ImageIcon } from 'lucide-react';

interface AdminMenuEditorProps {
  menuItems: MenuItem[];
  onSave: (newItems: MenuItem[]) => void;
}

export function AdminMenuEditor({ menuItems, onSave }: AdminMenuEditorProps) {
  const [items, setItems] = useState<MenuItem[]>(menuItems || []);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (menuItems) {
      setItems(menuItems);
    }
  }, [menuItems]);

  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro que desea eliminar este plato?')) {
      const newItems = items.filter(i => i.id !== id);
      setItems(newItems);
      onSave(newItems);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
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
      imageUrl: ''
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

  if (editingItem) {
    return (
      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 mb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-xl text-stone-900">{items.find(i => i.id === editingItem.id) ? 'Editar Plato' : 'Nuevo Plato'}</h3>
          <button onClick={() => setEditingItem(null)} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
              <input required type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full border-stone-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Categoría</label>
              <input required type="text" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="w-full border-stone-200 rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Descripción Corta</label>
              <input required type="text" value={editingItem.shortDescription} onChange={e => setEditingItem({...editingItem, shortDescription: e.target.value})} className="w-full border-stone-200 rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Descripción Sensorial</label>
              <textarea value={editingItem.sensoryDescription} onChange={e => setEditingItem({...editingItem, sensoryDescription: e.target.value})} className="w-full border-stone-200 rounded-xl h-24" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Historia</label>
              <textarea value={editingItem.story} onChange={e => setEditingItem({...editingItem, story: e.target.value})} className="w-full border-stone-200 rounded-xl h-24" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Ingredientes (Separados por coma)</label>
              <input required type="text" value={editingItem.ingredients.join(', ')} onChange={e => setEditingItem({...editingItem, ingredients: e.target.value.split(',').map(s => s.trim())})} className="w-full border-stone-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Precio (CUP)</label>
              <input required type="number" value={editingItem.priceCUP} onChange={e => setEditingItem({...editingItem, priceCUP: Number(e.target.value)})} className="w-full border-stone-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Precio Referencia (USD)</label>
              <input required type="number" value={editingItem.priceUSD} onChange={e => setEditingItem({...editingItem, priceUSD: Number(e.target.value)})} className="w-full border-stone-200 rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-2">Imagen del Plato</label>
              <div className="bg-stone-50 border-2 border-dashed border-stone-200 p-4 rounded-2xl text-center">
                {editingItem.imageUrl ? (
                  <div className="relative inline-block group">
                    <img src={editingItem.imageUrl} alt="Vista previa" className="w-40 h-40 object-cover rounded-xl shadow-md border border-stone-200" />
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="Quitar imagen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-stone-400 mb-2" />
                    <p className="text-sm text-stone-500 mb-4">No hay imagen seleccionada</p>
                    <label className="cursor-pointer bg-dark-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors flex items-center gap-2">
                      <Upload size={16} /> Seleccionar / Subir Imagen
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                )}
                {editingItem.imageUrl && (
                  <div className="mt-4 flex justify-center">
                    <label className="cursor-pointer bg-stone-200 text-stone-700 px-4 py-2 rounded-xl font-medium text-xs hover:bg-stone-300 transition-colors flex items-center gap-1">
                      <Upload size={14} /> Cambiar Imagen
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button type="submit" className="bg-dark-green text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center gap-2 mt-4">
            <Save size={18} /> Guardar Plato
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 mb-12">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-serif text-xl text-stone-900">Editor de Menú</h3>
        <button onClick={handleAddNew} className="bg-gold text-stone-900 px-4 py-2 rounded-xl font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2">
          <Plus size={18} /> Nuevo Plato
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="p-4 font-bold text-sm text-stone-600">Foto</th>
              <th className="p-4 font-bold text-sm text-stone-600">Plato</th>
              <th className="p-4 font-bold text-sm text-stone-600">Categoría</th>
              <th className="p-4 font-bold text-sm text-stone-600">Precio (CUP)</th>
              <th className="p-4 font-bold text-sm text-stone-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                <td className="p-4">
                  <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                </td>
                <td className="p-4 font-medium text-stone-900">{item.name}</td>
                <td className="p-4 text-stone-600">{item.category}</td>
                <td className="p-4 text-stone-900">{item.priceCUP.toLocaleString()}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(item)} className="p-2 text-stone-400 hover:text-dark-green transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
