import React, { useState, useEffect } from 'react';
import { AppData } from '../types';
import { QrCode, Download, Printer, Save, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';

interface AdminAppQrProps {
  data: AppData;
  onSaveUrl: (newUrl: string) => void;
}

export function AdminAppQr({ data, onSaveUrl }: AdminAppQrProps) {
  const [appUrl, setAppUrl] = useState(data.appQrUrl || "https://53y-m-restaurant.vercel.app/");
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [activeQrValue, setActiveQrValue] = useState(data.appQrUrl || "https://53y-m-restaurant.vercel.app/");

  useEffect(() => {
    if (data.appQrUrl) {
      setAppUrl(data.appQrUrl);
      setActiveQrValue(data.appQrUrl);
    }
  }, [data.appQrUrl]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = appUrl.trim();
    if (cleanUrl) {
      onSaveUrl(cleanUrl);
      setActiveQrValue(cleanUrl);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 3000);
    }
  };

  const handleGenerateClick = () => {
    const cleanUrl = appUrl.trim();
    if (cleanUrl) {
      onSaveUrl(cleanUrl);
      setActiveQrValue(cleanUrl);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 3000);
    }
  };

  const handleDownloadPNG = () => {
    const svg = document.getElementById('app-main-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `App_Terraza_53yM_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("TERRAZA 53&M", 105, 40, { align: "center" });
    
    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Escanee para acceder a la aplicación oficial", 105, 55, { align: "center" });

    // Live URL
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(activeQrValue, 105, 65, { align: "center" });

    const svg = document.getElementById('app-main-qr-svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
        const pngFile = canvas.toDataURL("image/png");
        doc.addImage(pngFile, 'PNG', 65, 80, 80, 80);
        doc.save("App_Terraza_53yM_QR.pdf");
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-1">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
          <QrCode size={24} />
        </div>
        <div>
          <h3 className="font-serif text-2xl text-stone-900 font-bold">Gestión de QR Principal de Acceso</h3>
          <p className="text-xs text-stone-500">Configura la URL y genera el código QR principal que abre el restaurante.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column: Configuration form */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 space-y-6">
          <h4 className="font-serif text-lg text-stone-900 font-bold border-b border-stone-100 pb-3">
            Configuración de la URL
          </h4>

          {showSavedMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 flex items-center gap-2 text-sm font-medium">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>¡La URL de la aplicación se ha guardado correctamente!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700">
                URL de la App:
              </label>
              <input
                type="url"
                required
                placeholder="https://53y-m-restaurant.vercel.app/"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
              />
              <p className="text-xs text-stone-400">
                Asegúrate de incluir "https://" en la dirección para garantizar que los dispositivos móviles la abran de manera correcta.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                className="w-full bg-[#1A2E26] hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" /> Guardar URL
              </button>

              <button
                type="button"
                onClick={handleGenerateClick}
                className="w-full bg-gold hover:bg-yellow-500 text-stone-900 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <QrCode className="w-4 h-4" /> Generar QR
              </button>
            </div>
          </form>
        </div>

        {/* Right column: QR Display */}
        <div className="bg-stone-50 rounded-3xl border border-stone-100 shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-6">
          <h4 className="font-serif text-lg text-stone-900 font-bold w-full border-b border-stone-200 pb-3">
            Código QR Generado
          </h4>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 inline-block">
            <QRCodeSVG
              id="app-main-qr-svg"
              value={activeQrValue}
              size={220}
              level="H"
              includeMargin={true}
            />
            <p className="text-xs font-mono text-stone-400 mt-4 max-w-[260px] break-all select-all">
              {activeQrValue}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={handleDownloadPNG}
              className="bg-white border border-stone-200 text-stone-800 py-3 px-4 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4 text-stone-500" /> Descargar PNG
            </button>
            <button
              onClick={handlePrintPDF}
              className="bg-[#1A2E26] text-white py-3 px-4 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Imprimir PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
