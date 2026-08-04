## 1. RESUMEN EJECUTIVO
Auditoría técnica del sistema actual de exportación (Excelencia.json), almacenamiento de historiales (tabla `history`) y flujo de cierre de jornada. Se detectaron desconexiones críticas entre la información exportada y la función de restauración actual. La exportación incluye la totalidad de los datos operativos y el registro histórico acumulado, pero la restauración existente es puramente frontal, iterativa y no implementa la reconstrucción de historiales, reservas ni usuarios. Existe un riesgo inminente de sobrescritura de órdenes activas (ya que la restauración itera e intenta sincronizar `orders`). Actualmente no existe ninguna barrera en código que impida restaurar cuando la jornada está abierta (`isShiftActive = true`).

## 2. ESTRUCTURA REAL DE EXCELENCIA.JSON
Se genera en `src/components/AdminPanel.tsx` mediante la función `handleExportJson`. Es el resultado de aplicar `JSON.stringify(appData)` sobre el objeto compuesto reactivamente desde Convex.
Campos reales detectados en la exportación:
- `landingConfig`: Configuración pública de la página de inicio.
- `menuItems`: Array completo de todos los platos del menú.
- `adminConfig`: Configuraciones del administrador y credenciales autorizadas.
- `dependents`: Array de dependientes (extraídos en memoria de la tabla `users`).
- `managers`: Array de gerentes (extraídos en memoria de la tabla `users`).
- `kitchenConfig`: Configuración del usuario de cocina.
- `orderReports`: Array de informes de ventas de dependientes (de la jornada en curso).
- `kitchenReports`: Array de informes de cocina (de la jornada en curso).
- `cashRegisterCloses`: Array de cierres de caja (de la jornada en curso).
- `auditLogs`: Array de la bitácora viva actual.
- `comandas`: Array de comandas/mesas activas.
- `reservations`: Array de todas las reservas registradas.
- `orders`: Array de todas las órdenes en la jornada actual.
- `isShiftActive`: Booleano, indica si la jornada está operando.
- `gerenteCierreCompleto`: Booleano de estado del cierre del gerente.
- `downloadsState`: Estado local de descargas de la UI.
- `exchangeRate`: Tasas de cambio (USD/EUR) actuales.
- `notifications`: Array de notificaciones.
- `history`: Array masivo de TODOS los registros históricos (todas las jornadas pasadas ya archivadas).

## 3. DATOS POR CUENTA
### Dependiente
- **Jornada activa**: Órdenes asignadas (`assignedDependentId`), comandas abiertas, su informe final (`orderReports`), logs en bitácora.
- **Historial**: Sus informes de venta y órdenes generadas quedan en los arrays `orderReports` y `orders` dentro de cada bloque de la tabla `history`.
- **Identidad**: Guardada en la tabla `users` (exportada bajo el array `dependents`).

### Cocina
- **Jornada activa**: Órdenes en progreso/listas, reportes de cocina enviados, logs de bitácora.
- **Historial**: Sus reportes diarios quedan en `kitchenReports` dentro de la tabla `history`. Su rendimiento queda en las órdenes marcadas como entregadas.
- **Identidad**: Guardada en la tabla `users` (exportada bajo `kitchenConfig`).

### Gerente de Restaurante
- **Jornada activa**: Cierres de caja/recibos generados, autorizaciones.
- **Historial**: Sus cierres de caja se archivan en `cashRegisterCloses` del documento de jornada en `history`.
- **Identidad**: Guardada en la tabla `users` (exportada bajo `managers`).

### Administrador
- **Jornada activa**: Acciones administrativas (aperturas/cierres) en `bitacora`.
- **Historial**: Sus acciones quedan guardadas de manera perpetua en `bitacora` dentro del historial de jornada.
- **Identidad**: Configuraciones y IDs de dispositivos autorizados exportados bajo `adminConfig`.

## 4. DATOS COMUNES DE JORNADA
- **Jornada Activa**: Existe en forma de variables de estado (como `isShiftActive`, `exchangeRate`, `gerenteCierreCompleto`, `comandas`).
- **Historial Consolidado**: Documento estructurado bajo `jornadaId` que reúne toda la actividad transversal de un día.
- **Reservas**: Las reservas operan fuera del ciclo de vida estricto de una jornada (no se borran al cerrar). Viven de manera permanente en el array `reservations`.

## 5. MAPA COMPLETO DE TABLAS CONVEX
Auditado `convex/schema.ts`:
- `users`: Gestiona identidad, rol, credenciales e identificador de dispositivo (`deviceId`).
- `orders`: Almacena las órdenes activas de la jornada, su estado y mesa.
- `reservations`: Almacena la totalidad de las reservas (pendientes, confirmadas, canceladas, consolidadas).
- `menuItems`: Tabla de platos, precios y disponibilidad.
- `bitacora`: Registro de eventos (auditoría/logs) de la jornada activa, indexado por `timestamp`.
- `settings`: Tabla genérica Clave-Valor. Contiene: tasas de cambio, reportes de turno activos, cajas activas, comandas vivas y booleanos de control operativo.
- `history`: Archivo inmutable de jornadas pasadas. Contiene `jornadaId`, `orders`, `reservations` (instantáneas), `orderReports`, `kitchenReports`, `cashRegisterCloses`, `comandas`, y `bitacora`.
- `snapshots`: Respaldos directos en servidor.
- `pushSubscriptions`: Gestiona notificaciones del navegador.

## 6. ESTRUCTURA ACTUAL DE HISTORIALES
El sistema no crea tablas históricas separadas por rol. Utiliza un modelo de **Snapshots de Jornada**.
Al cerrar la jornada, los datos de todas las cuentas se empaquetan en un solo registro dentro de la tabla `history`. 
- Historial del Dependiente = Sub-arrays de `orders` y `orderReports`.
- Historial de Cocina = Sub-arrays de `kitchenReports`.
- Historial del Gerente = Sub-arrays de `cashRegisterCloses`.
- Historial de Administrador = Sub-array de `bitacora`.

## 7. FLUJO ACTUAL DE CIERRE DE JORNADA
Auditado `convex/admin.ts` (`closeWorkdayAndArchive`):
1. Verificación de permisos de admin.
2. Agrupación (Gathering): Lee todo el contenido de `orders`, `reservations`, `bitacora` y las claves de `settings` (reportes y cajas).
3. **Copia**: Crea un único bloque de `history` con todo lo anterior y lo inserta en Convex.
4. **Destrucción de Operativa**: Borra FÍSICAMENTE de Convex las tablas `orders` y `bitacora`.
5. **Limpieza de Operativa**: Vuelve `[]` todos los reportes, cierres de caja y comandas en la tabla `settings`.
6. **Conservación Fuerte**: NO borra las reservas. Estas se mantienen activas en su tabla.
7. Cambia `isShiftActive` a `false`.
8. Escribe un log fundacional para la próxima jornada indicando el cierre exitoso.

## 8. FLUJO ACTUAL DE EXCELENCIA.JSON
- **Independiente**: La generación del JSON (`handleExportJson`) es un proceso desconectado del cierre de jornada. No cierra nada ni limpia nada.
- **Estructura Masiva**: Contiene absolutamente todo: datos de la jornada viva en el instante de la descarga, y toda la propiedad `history` con años de registros si los hubiera.

## 9. RESTAURACIÓN ACTUAL
Auditada la función `updateData` en `App.tsx`:
1. Convierte el JSON leído.
2. Itera ejecutando mutaciones a `settings` para sobrescribir (tasas, reportes, caja, comandas, booleanos).
3. Itera `menuItems` forzando una sincronización.
4. Intenta insertar `auditLogs` generando duplicación en bitácora.
5. Intenta re-sincronizar órdenes vivas iterando `orders`.
- **Fallo fundamental**: No posee código para restaurar `reservations`, `history` ni `users`. Ignora por completo esos arrays del JSON, haciendo la restauración incompleta y destructiva.

## 10. PROTECCIONES ACTUALES
- **Riesgo Crítico**: No existe ninguna protección actual que impida la restauración cuando `isShiftActive = true`. El botón de restauración siempre está habilitado. Restaurar en este momento sobrescribe configuraciones en caliente.

## 11. RIESGOS DETECTADOS
1. **Pérdida de Historiales**: Dado que `updateData` ignora la clave `history` del JSON, es imposible recuperar historiales de jornadas pasadas si la tabla de Convex fuese vaciada.
2. **Pérdida de Reservas**: Ignorar el array de reservas provoca su pérdida ante una eventual recuperación de desastre total.
3. **Sobrescritura Activa**: Si se restaura con jornada abierta, las configuraciones de caja y comandas se machacan instantáneamente.
4. **Duplicación**: Se reinsertan logs de auditoría a lo bruto en `bitacora`.
5. **Incompatibilidad de Identidades**: Restaurar usuarios desde la memoria (dependents/managers en JSON) no los re-inserta a la tabla real `users`, dejando comandas huérfanas o errores de autenticación.

## 12. QUÉ DATOS DE EXCELENCIA.JSON PUEDEN RECONSTRUIRSE DIRECTAMENTE
Toda la información estructural de jornadas pasadas (`history`) y el estado actual de las reservas (`reservations`) está contenida nítidamente en el JSON y puede ser importada mediante una mutación de backend que lea y procese adecuadamente estos nodos.

## 13. QUÉ DATOS NO PUEDEN RECONSTRUIRSE
- **Identidad de Hardware (deviceId)**: Si se borra la base de usuarios de Convex, la vinculación a los dispositivos físicos (tablets de dependientes, celulares de gerentes) deberá re-hacerse de manera manual haciendo "login/autorización" en cada equipo, aunque el JSON contenga sus nombres de usuario.

## 14. ARQUITECTURA PROPUESTA PARA RESTAURACIÓN
La restauración no debe mutar datos operativos ni inicializar una jornada. El objetivo es recuperar datos históricos.
1. **Capa Frontal**: Bloqueo absoluto de UI del botón Restaurar si `isShiftActive === true`.
2. **Validación Estricta**: Comprobar claves obligatorias en el JSON importado.
3. **Transacción en Backend**: Crear una mutation de tipo `internal` o de administración (`admin.restoreDatabase`) que:
   - Limpie las tablas objetivo (evitar duplicación de historiales).
   - Inserte los registros de `history` leyendo el array importado.
   - Restaure las `reservations` mediante inserción masiva.
   - Opcionalmente regenere a los usuarios (`users`) si se requiere.
   - Asegure que el flag `isShiftActive` siga siendo `false` y no altere operaciones.

## 15. ARCHIVOS QUE DEBERÁN MODIFICARSE EN LA FASE C-B
- `src/components/AdminPanel.tsx`: Reglas y bloqueo condicional del botón de Restaurar y lectura de archivo.
- `src/App.tsx`: Remover la lógica iterativa de `updateData` o aislarla a las configuraciones locales.
- `convex/admin.ts`: Nueva mutación para la restauración del JSON a nivel transaccional (Convex).

## 16. DEPENDENCIAS Y RIESGOS ANTES DE IMPLEMENTAR
- Implementar la mutación de restauración en Convex demanda cautela para no violar límites de payload en el servidor si el archivo JSON llega a ser excesivamente grande en varios años de operación. Se deberá diseñar un mecanismo de procesamiento por lotes si excede un megabyte, o confiar en que las arquitecturas Convex actuales procesen el array con normalidad dentro del payload limit (~10MB por query).
