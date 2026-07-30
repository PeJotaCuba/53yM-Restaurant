import React, { useState } from 'react';
import { LandingConfig } from '../types';
import { Save, Plus, Trash2, Upload, Image as ImageIcon, Utensils, Wine, Leaf, PartyPopper, Coffee, Cake, Music, Star, Gift, Shield, Heart, CalendarCheck, Tag, Award, Zap, Percent, X } from 'lucide-react';

interface AdminLandingEditorProps {
  config: LandingConfig;
  onSave: (newConfig: LandingConfig) => void;
}

const AVAILABLE_SERVICE_ICONS = [
  { value: 'Utensils', label: 'Restaurante / Cubiertos' },
  { value: 'Wine', label: 'Bar / Copa de Vino' },
  { value: 'Leaf', label: 'Terraza / Hoja' },
  { value: 'PartyPopper', label: 'Eventos / Fiesta' },
  { value: 'Coffee', label: 'Café' },
  { value: 'Cake', label: 'Pastel / Cumpleaños' },
  { value: 'Music', label: 'Música en Vivo' },
  { value: 'Star', label: 'Estrella' },
  { value: 'Gift', label: 'Regalo / Oferta' },
  { value: 'Shield', label: 'Seguridad / Exclusivo' }
];

const AVAILABLE_PROMO_ICONS = [
  { value: 'Gift', label: 'Regalo / Cumpleaños' },
  { value: 'Heart', label: 'Corazón / Parejas' },
  { value: 'CalendarCheck', label: 'Calendario / Fin de Semana' },
  { value: 'Tag', label: 'Etiqueta / Descuento' },
  { value: 'Star', label: 'Estrella Especial' },
  { value: 'Award', label: 'Premio / Premio Especial' },
  { value: 'Zap', label: 'Rápido / Flash' },
  { value: 'Percent', label: 'Porcentaje' }
];

export function AdminLandingEditor({ config, onSave }: AdminLandingEditorProps) {
  const [formData, setFormData] = useState<LandingConfig>({
    ...config,
    services: config.services || [],
    promotions: config.promotions || [],
    galleryImages: config.galleryImages || [],
    aboutTags: config.aboutTags || [],
    teamImages: config.teamImages || []
  });

  const [newTagInput, setNewTagInput] = useState('');

  const handleChange = (field: keyof LandingConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Team Images Management
  const handleAddTeamImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      const newImages: string[] = [];
      let loadedCount = 0;

      fileList.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            newImages.push(reader.result);
          }
          loadedCount++;
          if (loadedCount === fileList.length) {
            handleChange('teamImages', [...(formData.teamImages || []), ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveTeamImage = (index: number) => {
    const updated = [...(formData.teamImages || [])];
    updated.splice(index, 1);
    handleChange('teamImages', updated);
  };

  // Tag Management
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    if (!formData.aboutTags.includes(newTagInput.trim())) {
      handleChange('aboutTags', [...formData.aboutTags, newTagInput.trim()]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    const updated = [...formData.aboutTags];
    updated.splice(index, 1);
    handleChange('aboutTags', updated);
  };

  // Hero BG Image Upload
  const handleHeroBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleChange('heroBgImage', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Hero Banner Logo Upload
  const handleHeroBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleChange('heroBannerImage', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // About Image Upload
  const handleAboutImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleChange('aboutImage', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Services Management
  const handleAddService = () => {
    const newService = {
      icon: 'Utensils',
      title: 'Nuevo Servicio',
      description: 'Descripción del servicio ofrecido.'
    };
    handleChange('services', [...formData.services, newService]);
  };

  const handleUpdateService = (index: number, field: string, value: string) => {
    const updated = [...formData.services];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('services', updated);
  };

  const handleRemoveService = (index: number) => {
    const updated = [...formData.services];
    updated.splice(index, 1);
    handleChange('services', updated);
  };

  // Promotions Management
  const handleAddPromotion = () => {
    const newPromo = {
      icon: 'Gift',
      title: 'Nueva Promoción',
      tag: 'Especial',
      desc: 'Detalles de la oferta o promoción especial.'
    };
    handleChange('promotions', [...formData.promotions, newPromo]);
  };

  const handleUpdatePromotion = (index: number, field: string, value: string) => {
    const updated = [...formData.promotions];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('promotions', updated);
  };

  const handleRemovePromotion = (index: number) => {
    const updated = [...formData.promotions];
    updated.splice(index, 1);
    handleChange('promotions', updated);
  };

  // Gallery Management
  const handleAddGalleryImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    let readCount = 0;

    Array.from(files).forEach((file: Blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          newImages.push(reader.result);
        }
        readCount++;
        if (readCount === files.length) {
          handleChange('galleryImages', [...formData.galleryImages, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveGalleryImage = (index: number) => {
    const updated = [...formData.galleryImages];
    updated.splice(index, 1);
    handleChange('galleryImages', updated);
  };

  const handleSave = () => {
    onSave(formData);
    alert('Cambios guardados con éxito.');
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 mb-12 space-y-10">
      <div className="flex justify-between items-center border-b pb-4 border-stone-100">
        <div>
          <h3 className="font-serif text-2xl text-stone-900">Editor Visual de Landing Page</h3>
          <p className="text-sm text-stone-500">Edita textos, sube o cambia imágenes y gestiona tus servicios de forma intuitiva.</p>
        </div>
        <button onClick={handleSave} className="bg-dark-green text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-sm">
          <Save size={18} /> Guardar Cambios
        </button>
      </div>

      {/* 1. SECCIÓN HERO / BANNER SUPERIOR */}
      <section className="bg-stone-50 p-6 rounded-2xl border border-stone-200/80 space-y-6">
        <div>
          <h4 className="font-serif text-xl text-dark-green mb-1">1. Banner Superior de la Landing (Hero)</h4>
          <p className="text-xs text-stone-500">
            Personaliza el título del banner, el eslogan, la frase descriptiva inferior y la imagen transparente/fondo de la portada principal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Título del Banner</label>
            <input 
              type="text" 
              value={formData.heroTitle || ''} 
              onChange={e => handleChange('heroTitle', e.target.value)} 
              className="w-full border-stone-200 rounded-xl text-sm px-3 py-2" 
              placeholder="Ej. Restaurante - Terraza 53&M"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Eslogan</label>
            <input 
              type="text" 
              value={formData.heroSlogan || ''} 
              onChange={e => handleChange('heroSlogan', e.target.value)} 
              className="w-full border-stone-200 rounded-xl text-sm px-3 py-2 text-gold font-serif italic" 
              placeholder="Ej. Exclusivo, diferente y delicioso"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Frase de Abajo (Subtítulo)</label>
            <input 
              type="text" 
              value={formData.heroSubtitle || ''} 
              onChange={e => handleChange('heroSubtitle', e.target.value)} 
              className="w-full border-stone-200 rounded-xl text-sm px-3 py-2" 
              placeholder="Ej. Donde la elegancia y el sabor confluyen..."
            />
          </div>
        </div>

        {/* Imagen de Fondo del Banner (Hero BG) */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">
            Imagen de Fondo del Banner Superior
          </label>
          <div className="bg-white border-2 border-dashed border-stone-200 p-4 rounded-2xl text-center">
            {formData.heroBgImage ? (
              <div className="relative inline-block max-w-lg w-full">
                <img 
                  src={formData.heroBgImage} 
                  alt="Fondo Hero" 
                  className="w-full h-48 object-cover rounded-xl shadow-md border border-stone-200" 
                />
                <button
                  type="button"
                  onClick={() => handleChange('heroBgImage', '')}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  title="Quitar imagen de fondo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center">
                <ImageIcon className="w-12 h-12 text-stone-400 mb-2" />
                <p className="text-sm text-stone-500 mb-4">No hay imagen de fondo personalizada configurada</p>
                <label className="cursor-pointer bg-dark-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors flex items-center gap-2">
                  <Upload size={16} /> Seleccionar / Subir Imagen de Fondo
                  <input type="file" accept="image/*" onChange={handleHeroBgImageUpload} className="hidden" />
                </label>
              </div>
            )}
            {formData.heroBgImage && (
              <div className="mt-4 flex justify-center">
                <label className="cursor-pointer bg-stone-200 text-stone-700 px-4 py-2 rounded-xl font-medium text-xs hover:bg-stone-300 transition-colors flex items-center gap-1">
                  <Upload size={14} /> Cambiar Imagen de Fondo
                  <input type="file" accept="image/*" onChange={handleHeroBgImageUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Logo / Imagen Transparente del Banner */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">
            Imagen Transparente / Logo del Banner (Opcional - Reemplaza el logo 53&M en el Hero)
          </label>
          <div className="bg-white border-2 border-dashed border-stone-200 p-4 rounded-2xl text-center">
            {formData.heroBannerImage ? (
              <div className="relative inline-block">
                <img 
                  src={formData.heroBannerImage} 
                  alt="Logo Banner Transparente" 
                  className="h-32 object-contain rounded-xl p-2 bg-stone-900/10 shadow-md border border-stone-200" 
                />
                <button
                  type="button"
                  onClick={() => handleChange('heroBannerImage', '')}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  title="Quitar logo transparente"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center justify-center">
                <p className="text-xs text-stone-500 mb-3">
                  Si no subes una imagen transparente personalizada, se mostrará el logo oficial de 53&M.
                </p>
                <label className="cursor-pointer bg-stone-100 text-stone-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-stone-200 transition-colors flex items-center gap-2 border border-stone-300">
                  <Upload size={14} /> Subir Imagen Transparente (PNG / WebP)
                  <input type="file" accept="image/*" onChange={handleHeroBannerImageUpload} className="hidden" />
                </label>
              </div>
            )}
            {formData.heroBannerImage && (
              <div className="mt-4 flex justify-center">
                <label className="cursor-pointer bg-stone-200 text-stone-700 px-4 py-2 rounded-xl font-medium text-xs hover:bg-stone-300 transition-colors flex items-center gap-1">
                  <Upload size={14} /> Cambiar Imagen Transparente
                  <input type="file" accept="image/*" onChange={handleHeroBannerImageUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN NOSOTROS */}
      <section className="bg-stone-50 p-6 rounded-2xl border border-stone-200/80">
        <h4 className="font-serif text-xl text-dark-green mb-4">2. Sección "Nosotros" (Acerca de)</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Párrafo 1</label>
            <textarea value={formData.aboutText1} onChange={e => handleChange('aboutText1', e.target.value)} className="w-full border-stone-200 rounded-xl h-24" />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Párrafo 2</label>
            <textarea value={formData.aboutText2} onChange={e => handleChange('aboutText2', e.target.value)} className="w-full border-stone-200 rounded-xl h-24" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Etiquetas / Destacados</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.aboutTags.map((tag, idx) => (
                <span key={idx} className="bg-white border border-gold/40 text-stone-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(idx)} className="text-stone-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input 
                type="text" 
                placeholder="Añadir nueva etiqueta (ej. Elegancia)" 
                value={newTagInput} 
                onChange={e => setNewTagInput(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                className="flex-1 border-stone-200 rounded-xl text-sm" 
              />
              <button type="button" onClick={handleAddTag} className="bg-gold text-stone-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-500 transition-colors">
                Añadir
              </button>
            </div>
          </div>

          {/* About Image */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Imagen de la Sección Nosotros</label>
            <div className="bg-white border-2 border-dashed border-stone-200 p-4 rounded-2xl text-center">
              {formData.aboutImage ? (
                <div className="relative inline-block">
                  <img src={formData.aboutImage} alt="Acerca de" className="w-64 h-44 object-cover rounded-xl shadow-md border border-stone-200" />
                  <button
                    type="button"
                    onClick={() => handleChange('aboutImage', '')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    title="Quitar imagen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-stone-400 mb-2" />
                  <p className="text-sm text-stone-500 mb-4">No hay imagen configurada</p>
                  <label className="cursor-pointer bg-dark-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors flex items-center gap-2">
                    <Upload size={16} /> Seleccionar / Subir Imagen
                    <input type="file" accept="image/*" onChange={handleAboutImageUpload} className="hidden" />
                  </label>
                </div>
              )}
              {formData.aboutImage && (
                <div className="mt-4 flex justify-center">
                  <label className="cursor-pointer bg-stone-200 text-stone-700 px-4 py-2 rounded-xl font-medium text-xs hover:bg-stone-300 transition-colors flex items-center gap-1">
                    <Upload size={14} /> Cambiar Imagen
                    <input type="file" accept="image/*" onChange={handleAboutImageUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Team Images Gallery */}
          <div className="pt-4 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div>
                <label className="block text-sm font-bold text-stone-700">Galería de Imágenes del Equipo (Nosotros)</label>
                <p className="text-xs text-stone-500">Sube, organiza o elimina fotos de los miembros del equipo que se mostrarán en la sección Nosotros.</p>
              </div>
              <label className="cursor-pointer bg-dark-green text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors flex items-center gap-1 shadow-sm">
                <Upload size={16} /> Subir Fotos del Equipo
                <input type="file" accept="image/*" multiple onChange={handleAddTeamImages} className="hidden" />
              </label>
            </div>

            {(!formData.teamImages || formData.teamImages.length === 0) ? (
              <div className="bg-white border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center">
                <ImageIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">No hay fotos de equipo subidas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {formData.teamImages.map((imgUrl, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm border border-stone-200 aspect-[3/4] bg-stone-100">
                    <img src={imgUrl} alt={`Equipo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamImage(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="Quitar foto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN SERVICIOS */}
      <section className="bg-stone-50 p-6 rounded-2xl border border-stone-200/80">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-serif text-xl text-dark-green">3. Servicios Ofrecidos</h4>
          <button type="button" onClick={handleAddService} className="bg-gold text-stone-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1">
            <Plus size={16} /> Añadir Servicio
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.services.map((svc, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative space-y-3">
              <button 
                type="button" 
                onClick={() => handleRemoveService(idx)} 
                className="absolute top-4 right-4 text-stone-400 hover:text-red-500 p-1 transition-colors"
                title="Eliminar servicio"
              >
                <Trash2 size={18} />
              </button>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Icono</label>
                <select 
                  value={svc.icon} 
                  onChange={e => handleUpdateService(idx, 'icon', e.target.value)}
                  className="w-full border-stone-200 rounded-xl text-sm"
                >
                  {AVAILABLE_SERVICE_ICONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Título</label>
                <input 
                  type="text" 
                  value={svc.title} 
                  onChange={e => handleUpdateService(idx, 'title', e.target.value)}
                  className="w-full border-stone-200 rounded-xl text-sm font-bold" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Descripción</label>
                <textarea 
                  value={svc.description} 
                  onChange={e => handleUpdateService(idx, 'description', e.target.value)}
                  className="w-full border-stone-200 rounded-xl text-sm h-20" 
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SECCIÓN PROMOCIONES */}
      <section className="bg-stone-50 p-6 rounded-2xl border border-stone-200/80">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-serif text-xl text-dark-green">4. Promociones y Ofertas</h4>
          <button type="button" onClick={handleAddPromotion} className="bg-gold text-stone-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1">
            <Plus size={16} /> Añadir Promoción
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.promotions.map((promo, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative space-y-3">
              <button 
                type="button" 
                onClick={() => handleRemovePromotion(idx)} 
                className="absolute top-4 right-4 text-stone-400 hover:text-red-500 p-1 transition-colors"
                title="Eliminar promoción"
              >
                <Trash2 size={18} />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Icono</label>
                  <select 
                    value={promo.icon} 
                    onChange={e => handleUpdatePromotion(idx, 'icon', e.target.value)}
                    className="w-full border-stone-200 rounded-xl text-sm"
                  >
                    {AVAILABLE_PROMO_ICONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Etiqueta (ej. 15% OFF)</label>
                  <input 
                    type="text" 
                    value={promo.tag} 
                    onChange={e => handleUpdatePromotion(idx, 'tag', e.target.value)}
                    className="w-full border-stone-200 rounded-xl text-sm font-bold text-gold" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Título de la Oferta</label>
                <input 
                  type="text" 
                  value={promo.title} 
                  onChange={e => handleUpdatePromotion(idx, 'title', e.target.value)}
                  className="w-full border-stone-200 rounded-xl text-sm font-bold" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Descripción</label>
                <textarea 
                  value={promo.desc} 
                  onChange={e => handleUpdatePromotion(idx, 'desc', e.target.value)}
                  className="w-full border-stone-200 rounded-xl text-sm h-20" 
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SECCIÓN GALERÍA */}
      <section className="bg-stone-50 p-6 rounded-2xl border border-stone-200/80">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="font-serif text-xl text-dark-green">5. Galería de Fotos</h4>
            <p className="text-xs text-stone-500">Haz clic en la 'X' para quitar fotos, o usa el botón para subir nuevas imágenes.</p>
          </div>
          <label className="cursor-pointer bg-dark-green text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors flex items-center gap-1 shadow-sm">
            <Upload size={16} /> Agregar Fotos
            <input type="file" accept="image/*" multiple onChange={handleAddGalleryImages} className="hidden" />
          </label>
        </div>

        {formData.galleryImages.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center">
            <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">La galería está vacía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.galleryImages.map((imgUrl, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm border border-stone-200 aspect-square bg-stone-100">
                <img src={imgUrl} alt={`Galería ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryImage(idx)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  title="Quitar foto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. INFORMACIÓN DE CONTACTO Y PIE DE PÁGINA */}
      <section className="bg-stone-50 p-6 rounded-2xl border border-stone-200/80">
        <h4 className="font-serif text-xl text-dark-green mb-4">6. Contacto y Pie de Página</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Teléfono</label>
            <input type="text" value={formData.contactPhone} onChange={e => handleChange('contactPhone', e.target.value)} className="w-full border-stone-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Email</label>
            <input type="text" value={formData.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} className="w-full border-stone-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Dirección</label>
            <input type="text" value={formData.contactAddress} onChange={e => handleChange('contactAddress', e.target.value)} className="w-full border-stone-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">Horarios</label>
            <input type="text" value={formData.contactHours} onChange={e => handleChange('contactHours', e.target.value)} className="w-full border-stone-200 rounded-xl" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-stone-700 mb-1">Texto Pie de Página (Footer)</label>
            <input type="text" value={formData.footerText} onChange={e => handleChange('footerText', e.target.value)} className="w-full border-stone-200 rounded-xl" />
          </div>
        </div>
      </section>

      {/* SAVE BUTTON */}
      <div className="flex justify-end pt-4 border-t border-stone-100">
        <button onClick={handleSave} className="bg-dark-green text-white px-8 py-3.5 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-lg">
          <Save size={20} /> Guardar Cambios en Landing Page
        </button>
      </div>
    </div>
  );
}
