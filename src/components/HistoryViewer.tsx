import React, { useState, useMemo } from 'react';
import { Calendar, ChevronRight, FileText, ShoppingBag, Receipt, ClipboardList, Database, Folder, FolderOpen, ChevronDown, Award } from 'lucide-react';
import { AppData } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HistoryViewerProps {
  data: AppData;
  userRole: string;
}

export function HistoryViewer({ data, userRole }: HistoryViewerProps) {
  const { t } = useLanguage();
  const history = data.history || [];

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [selectedJornadaId, setSelectedJornadaId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'comandas' | 'informes' | 'recibos' | 'bitacora'>('comandas');

  // Group history records by Year -> Month -> Day/DateStr
  const groupedTree = useMemo(() => {
    const tree: Record<number, Record<number, Record<string, any[]>>> = {};

    history.forEach((record) => {
      const year = record.year || new Date(record.timestamp).getFullYear();
      const month = record.month || (new Date(record.timestamp).getMonth() + 1);
      const dateStr = record.dateStr || new Date(record.timestamp).toLocaleDateString('es-ES');

      if (!tree[year]) {
        tree[year] = {};
      }
      if (!tree[year][month]) {
        tree[year][month] = {};
      }
      if (!tree[year][month][dateStr]) {
        tree[year][month][dateStr] = [];
      }
      tree[year][month][dateStr].push(record);
    });

    return tree;
  }, [history]);

  // Years list
  const years = useMemo(() => {
    return Object.keys(groupedTree).map(Number).sort((a, b) => b - a);
  }, [groupedTree]);

  // Months list for selected Year
  const months = useMemo(() => {
    if (selectedYear === null || !groupedTree[selectedYear]) return [];
    return Object.keys(groupedTree[selectedYear]).map(Number).sort((a, b) => b - a);
  }, [groupedTree, selectedYear]);

  // Days list for selected Year & Month
  const days = useMemo(() => {
    if (selectedYear === null || selectedMonth === null || !groupedTree[selectedYear]?.[selectedMonth]) return [];
    return Object.keys(groupedTree[selectedYear][selectedMonth]).sort((a, b) => {
      // Sort dates descending
      const partsA = a.split('/');
      const partsB = b.split('/');
      const timeA = new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0])).getTime();
      const timeB = new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0])).getTime();
      return timeB - timeA;
    });
  }, [groupedTree, selectedYear, selectedMonth]);

  // Selected Jornada details
  const selectedJornada = useMemo(() => {
    if (!selectedJornadaId) return null;
    return history.find((h) => h.jornadaId === selectedJornadaId) || null;
  }, [history, selectedJornadaId]);

  // Helper for month names
  const getMonthName = (m: number) => {
    const monthNames = [
      t('Enero'), t('Febrero'), t('Marzo'), t('Abril'),
      t('Mayo'), t('Junio'), t('Julio'), t('Agosto'),
      t('Septiembre'), t('Octubre'), t('Noviembre'), t('Diciembre')
    ];
    return monthNames[m - 1] || m.toString();
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
        <div className="p-3 bg-stone-100 text-stone-900 rounded-2xl">
          <Database size={24} />
        </div>
        <div>
          <h3 className="font-serif text-2xl text-stone-900">{t('Historial de Jornadas Archivadas')}</h3>
          <p className="text-xs text-stone-500">
            {t('Consulte de forma segura los datos de turnos anteriores almacenados en Convex.')}
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-200 rounded-2xl space-y-3">
          <Calendar className="mx-auto text-stone-300" size={48} />
          <p className="text-stone-600 font-bold">{t('No hay jornadas archivadas todavía.')}</p>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            {t('Cuando el Administrador cierre y archive la primera jornada activa, aparecerá aquí organizada.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: NAVIGATION TREE */}
          <div className="lg:col-span-4 border-r border-stone-100 pr-0 lg:pr-6 space-y-4">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">{t('Selector de Jornada')}</h4>
            
            {/* YEARS LEVEL */}
            <div className="space-y-2">
              {years.map((year) => {
                const isYearOpen = selectedYear === year;
                return (
                  <div key={year} className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedYear(isYearOpen ? null : year);
                        setSelectedMonth(null);
                        setSelectedDayStr(null);
                        setSelectedJornadaId(null);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-sm font-bold ${
                        isYearOpen ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isYearOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
                        <span>{year}</span>
                      </div>
                      <ChevronDown size={14} className={`transform transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* MONTHS LEVEL */}
                    {isYearOpen && (
                      <div className="pl-4 space-y-1 transition-all">
                        {months.map((month) => {
                          const isMonthOpen = selectedMonth === month;
                          return (
                            <div key={month} className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedMonth(isMonthOpen ? null : month);
                                  setSelectedDayStr(null);
                                  setSelectedJornadaId(null);
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-xs font-bold ${
                                  isMonthOpen ? 'bg-stone-200 text-stone-900' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} />
                                  <span>{getMonthName(month)}</span>
                                </div>
                                <ChevronRight size={12} className={`transform transition-transform ${isMonthOpen ? 'rotate-90' : ''}`} />
                              </button>

                              {/* DAYS LEVEL */}
                              {isMonthOpen && (
                                <div className="pl-4 space-y-1">
                                  {days.map((dayStr) => {
                                    const records = groupedTree[year][month][dayStr] || [];
                                    const isDayOpen = selectedDayStr === dayStr;
                                    return (
                                      <div key={dayStr} className="space-y-1">
                                        <button
                                          onClick={() => {
                                            setSelectedDayStr(isDayOpen ? null : dayStr);
                                            // auto select first index if only 1 record
                                            if (records.length === 1) {
                                              setSelectedJornadaId(records[0].jornadaId);
                                            } else {
                                              setSelectedJornadaId(null);
                                            }
                                          }}
                                          className={`w-full text-left p-2 rounded-lg transition-all text-xs ${
                                            isDayOpen ? 'bg-stone-100 font-bold text-stone-900' : 'text-stone-500 hover:bg-stone-50'
                                          }`}
                                        >
                                          📅 {dayStr} ({records.length} {t('turno(s)')})
                                        </button>

                                        {/* JORNADAS LEVEL (IF MULTIPLE) */}
                                        {isDayOpen && records.length > 1 && (
                                          <div className="pl-4 space-y-1">
                                            {records.map((rec) => {
                                              const timeStr = new Date(rec.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                              const isSelected = selectedJornadaId === rec.jornadaId;
                                              return (
                                                <button
                                                  key={rec.jornadaId}
                                                  onClick={() => setSelectedJornadaId(rec.jornadaId)}
                                                  className={`w-full text-left p-1.5 rounded text-xxs transition-all ${
                                                    isSelected ? 'bg-stone-800 text-white font-bold' : 'text-stone-400 hover:bg-stone-50'
                                                  }`}
                                                >
                                                  🕒 {timeStr} ({rec.jornadaId.slice(8, 14)})
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAIL VIEWER */}
          <div className="lg:col-span-8 space-y-6">
            {selectedJornada ? (
              <div className="space-y-6 animate-fade-in">
                {/* JORNADA HEADER CARD */}
                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="bg-stone-800 text-white text-xxs font-black px-2.5 py-1 rounded-full uppercase">
                      {selectedJornada.jornadaId}
                    </span>
                    <h4 className="text-xl font-serif text-stone-900 mt-2">
                      {t('Jornada del')} {selectedJornada.dateStr}
                    </h4>
                    <p className="text-xs text-stone-500 mt-1">
                      🕒 {t('Archivado el')} {new Date(selectedJornada.timestamp).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="bg-stone-200 text-stone-800 px-4 py-3 rounded-2xl text-center min-w-[120px]">
                    <div className="text-xxs uppercase font-black text-stone-500 tracking-wider">{t('Comandas')}</div>
                    <div className="text-lg font-bold">{(selectedJornada.orders || []).length}</div>
                  </div>
                </div>

                {/* HISTORICAL SUB-TABS */}
                <div className="flex gap-2 border-b border-stone-100 pb-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveSubTab('comandas')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                      activeSubTab === 'comandas' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <ShoppingBag size={14} /> {t('Comandas')} ({(selectedJornada.orders || []).length})
                  </button>

                  <button
                    onClick={() => setActiveSubTab('informes')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                      activeSubTab === 'informes' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <FileText size={14} /> {t('Informes Finales')} ({
                      ((selectedJornada.orderReports || []).length) + ((selectedJornada.kitchenReports || []).length)
                    })
                  </button>

                  <button
                    onClick={() => setActiveSubTab('recibos')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                      activeSubTab === 'recibos' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <Receipt size={14} /> {t('Caja / Recibos')} ({(selectedJornada.cashRegisterCloses || []).length})
                  </button>

                  {(userRole === 'admin' || userRole === 'manager') && (
                    <button
                      onClick={() => setActiveSubTab('bitacora')}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                        activeSubTab === 'bitacora' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      <ClipboardList size={14} /> {t('Bitácora')} ({(selectedJornada.bitacora || []).length})
                    </button>
                  )}
                </div>

                {/* SUB-TABS CONTENT CONTAINER */}
                <div className="min-h-[300px] border border-stone-100 rounded-2xl p-4 md:p-6 bg-stone-50/50">
                  {/* COMANDAS SUB-TAB */}
                  {activeSubTab === 'comandas' && (
                    <div className="space-y-4">
                      {(selectedJornada.orders || []).length === 0 ? (
                        <p className="text-center text-xs text-stone-400 py-8">{t('No se registraron comandas en esta jornada.')}</p>
                      ) : (
                        (selectedJornada.orders || []).map((order: any, idx: number) => (
                          <div key={order._id || idx} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-xs font-bold text-stone-950 bg-stone-100 px-2 py-0.5 rounded mr-2">
                                  {order.tableNumber}
                                </span>
                                <span className="text-xxs text-stone-400">
                                  {new Date(order.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <span className={`text-xxs font-bold px-2 py-0.5 rounded-full ${
                                order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            
                            {/* Items list */}
                            <div className="space-y-1.5 pl-2 border-l-2 border-stone-200">
                              {(order.items || []).map((item: any, iIdx: number) => (
                                <div key={iIdx} className="text-xs text-stone-600 flex justify-between">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span className="font-medium text-stone-900">${((item.priceCUP || 0) * (item.quantity || 1)).toLocaleString()} CUP</span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 pt-2 border-t border-stone-100 flex justify-between items-center">
                              <span className="text-xxs text-stone-400">ID: {(order._id || order.id || "").slice(-6)}</span>
                              <span className="text-xs font-bold text-stone-900">
                                Total: ${order.totalCUP?.toLocaleString() || order.totalAmountCUP?.toLocaleString() || 0} CUP
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* INFORMES SUB-TAB */}
                  {activeSubTab === 'informes' && (
                    <div className="space-y-4">
                      {/* Dependent reports list */}
                      {(selectedJornada.orderReports || []).length === 0 && (selectedJornada.kitchenReports || []).length === 0 ? (
                        <p className="text-center text-xs text-stone-400 py-8">{t('No se enviaron informes en esta jornada.')}</p>
                      ) : (
                        <>
                          {/* Dependientes */}
                          {(selectedJornada.orderReports || []).map((rep: any, idx: number) => (
                            <div key={`rep-dep-${idx}`} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
                              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                                <span className="bg-stone-900 text-white text-xxs font-black px-2 py-0.5 rounded">
                                  {rep.tableNumber || t('SALÓN')}
                                </span>
                                <h5 className="text-xs font-bold text-stone-800">{rep.dependentName}</h5>
                                <span className="text-xxs text-stone-400 font-mono">(@{rep.dependentUsername})</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xxs text-stone-600">
                                <div>📦 {rep.totalOrdersCount} {t('Comandas')}</div>
                                <div>🍽️ {rep.totalItemsCount} {t('Raciones')}</div>
                                <div className="col-span-2 font-bold text-emerald-800">
                                  💰 ${rep.totalAmountCUP?.toLocaleString()} CUP
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Cocina */}
                          {(selectedJornada.kitchenReports || []).map((rep: any, idx: number) => (
                            <div key={`rep-kit-${idx}`} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
                              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                                <span className="bg-amber-600 text-white text-xxs font-black px-2 py-0.5 rounded uppercase">
                                  {t('COCINA')}
                                </span>
                                <h5 className="text-xs font-bold text-stone-800">{rep.chefName || t('Cocina Oficial')}</h5>
                              </div>
                              <div className="text-xxs text-stone-600 flex justify-between">
                                <span>🍽️ {rep.totalDishesPrepared} {t('Platos Elaborados')}</span>
                                <span className="text-xxs text-stone-400">{rep.dateStr}</span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* RECIBOS DE CAJA SUB-TAB */}
                  {activeSubTab === 'recibos' && (
                    <div className="space-y-4">
                      {(selectedJornada.cashRegisterCloses || []).length === 0 ? (
                        <p className="text-center text-xs text-stone-400 py-8">{t('No se registraron cierres de caja/recibos en esta jornada.')}</p>
                      ) : (
                        (selectedJornada.cashRegisterCloses || []).map((close: any, idx: number) => (
                          <div key={idx} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
                            <div className="flex justify-between border-b border-stone-100 pb-2 mb-2">
                              <span className="text-xs font-bold text-stone-800">{close.managerName}</span>
                              <span className="text-xxs text-stone-400">{close.timestamp ? new Date(close.timestamp).toLocaleTimeString() : close.dateStr}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xxs text-stone-600">
                              <div>💰 {t('Total CUP')}: <span className="font-bold text-stone-900">${close.totalExpectedCUP?.toLocaleString()}</span></div>
                              <div>💵 {t('Caja CUP')}: <span className="font-bold text-stone-900">${close.totalCashCUP?.toLocaleString()}</span></div>
                              <div>💳 {t('Tarjeta CUP')}: <span className="font-bold text-stone-900">${close.totalDigitalCUP?.toLocaleString()}</span></div>
                              <div>💵 {t('Total USD')}: <span className="font-bold text-stone-900">${close.totalExpectedUSD?.toLocaleString()}</span></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* BITACORA SUB-TAB (ONLY FOR ADMIN/MANAGER) */}
                  {activeSubTab === 'bitacora' && (userRole === 'admin' || userRole === 'manager') && (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {(selectedJornada.bitacora || []).length === 0 ? (
                        <p className="text-center text-xs text-stone-400 py-8">{t('No hay registros de bitácora en esta jornada.')}</p>
                      ) : (
                        (selectedJornada.bitacora || []).map((log: any, idx: number) => (
                          <div key={idx} className="text-xxs border-b border-stone-100 pb-2 flex gap-3">
                            <span className="text-stone-400 shrink-0">
                              {new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-stone-700 mr-1">[{log.userRole?.toUpperCase()}] {log.username}:</span>
                              <span className="text-stone-600">{log.action}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 border border-stone-200 rounded-3xl space-y-4 bg-stone-50/50">
                <Database className="mx-auto text-stone-300 animate-pulse" size={48} />
                <h4 className="font-serif text-lg text-stone-700">{t('Seleccione un año, mes y día')}</h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {t('Explore el árbol de navegación de la izquierda para desplegar y consultar las jornadas guardadas.')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
