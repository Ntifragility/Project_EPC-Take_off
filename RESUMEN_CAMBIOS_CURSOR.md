# Resumen Técnico y Guía de Continuidad para Cursor

Este documento detalla todas las modificaciones, nuevas funcionalidades y reglas de negocio implementadas en el proyecto **EPC Take-Off** para continuar el desarrollo fluido en Cursor.

---

## 1. Visión General del Proyecto y Arquitectura

El proyecto sigue una arquitectura **Hexagonal / Feature-Sliced Design (FSD)** en React + TypeScript + Zustand, desacoplando la lógica de negocio de la capa de presentación:

- `src/entities/`: Modelos de dominio y tipos centrales (`takeoff-item`, `takeoff-rule`).
- `src/features/`: Casos de uso de negocio (`manage-items`, `manage-rules`, `apply-rule`, `app-config`).
- `src/widgets/`: Componentes compuestos de interfaz (`takeoff-table`, `rules-catalog`, `add-panel`, `header`).
- `src/pages/`: Vistas de nivel superior (`TakeoffPage.tsx`).
- `src/shared/`: Librerías, configuración de Supabase, storage y constantes.

---

## 2. Nuevas Funcionalidades Implementadas

### A. Grilla Interactiva Tipo Excel en la Tabla Metrado
1. **Selección de Celdas y Foco Visual:**
   - Clic simple en cualquier celda de un ítem editable selecciona la celda y resalta el contorno verde al estilo Excel (`.excel-cell.is-selected`).
2. **Edición Inline Dinámica:**
   - Doble clic o selección para editar valores in-situ (`plano`, `rev`, `detalle`, `tagUnico`, `cantidad`, etc.).
   - Al presionar `Enter` o hacer blur se confirma el cambio; con `Escape` se cancela.
3. **Tirador de Arrastre para Copiar / Rellenar (Drag-to-Fill Handle):**
   - Esquina inferior derecha de la celda activa con el cuadrito verde (`.excel-fill-handle`).
   - Al arrastrar hacia abajo sobre las filas inferiores, se calcula el rango y se visualiza la zona de destino (`.excel-cell-fill-target`).
   - Usa un listener global de `mousemove` con `document.elementFromPoint` para evitar pérdidas de eventos durante arrastre rápido.
   - Al soltar (`mouseup`), se invoca `batchUpdateField` propagando el valor copiado hacia todas las filas seleccionadas.
4. **Redimensión de Columnas (Column Resizing):**
   - Cabecera con divisores interactivos (`.col-resizer`).
   - Arrastre horizontal en tiempo real con ancho mínimo seguro.
   - Anchos personalizados persistidos automáticamente en `localStorage` (`epc-table-col-widths`).
5. **Columna PLANO Visible:**
   - La columna `PLANO` está ahora explícitamente incorporada y posicionada en el encabezado y en cada fila de la grilla de Metrado.

### B. Ventana / Panel Flotante de METADATOS Retráctil
- En `TakeoffPage.tsx` y `AddPanel.tsx`, la barra lateral de Metadatos ahora funciona como un panel plegable (drawer / dock).
- Incluye botón **"◀ Ocultar"** en el encabezado de Metadatos y un botón flotante **"▶ Metadatos"** cuando está oculta.
- Transición CSS suave (`transition: all 0.25s ease`) y persistencia de su estado abierto/cerrado en `localStorage` (`epc-sidebar-collapsed`).

### C. Soporte y Gestión de Reglas de Bandejas (Cable Tray)
- **`CableTrayEditorModal.tsx`:** Modal completo para crear/editar reglas de bandejas portacables (anchos, peldaños, soportería y consumibles asociados).
- **`CableTrayRuleCard.tsx` y `RulesView.tsx`:** Visualización y edición en catálogo.
- **Renombrado y Eliminación Completa de DETALLE:**
  - En `DetalleEditorModal.tsx` se agregó la posibilidad de renombrar códigos de DETALLE (migrando los consumibles al nuevo código y depurando el anterior) y la opción de eliminar variantes completas.

---

## 3. Regla Innegociable de Consistencia y Cascada de Dominio

> **Principio de Oro:**
> 1. **Solo los elementos principales (`material === 'P'`) pueden ser editados o seleccionados para propagación.**
> 2. **Los consumibles (`material === 'C'`) son derivados automáticamente y permanecen en solo lectura.**
> 3. **Si se cambia el `DETALLE` de un elemento principal, todos los elementos consumibles asociados deben actualizarse en cascada para reflejar la nueva lista de consumibles.**

### ¿Cómo funciona la cascada en el Store (`useItemsStore.ts`)?
Tanto `updateItem` como la nueva acción `batchUpdateField` ejecutan el siguiente ciclo:
1. **Identificación de Regla Agrupada (`isGroupedRule`):**
   - Agrupa los ítems que comparten `ruleId`, `pkgId` y `tagPlano`.
2. **Sincronización de Acompañantes:**
   - Si se modifica `plano`, `rev`, `detalle` o `tagUnico`, los ítems hermanos se mantienen sincronizados.
3. **Expansión y Reconstrucción Dinámica de Consumibles:**
   - **Reglas de Cables (R1 / R2):** Invoca `applyDetalleVariant(...)` desde `ruleExpander.ts`. Lee el diccionario dinámico de variantes (`DYNAMIC_DETALLE_VARIANTS`), remueve los consumibles anteriores y crea/actualiza los nuevos consumibles correspondientes al nuevo código de detalle.
   - **Reglas de Barra (R8 / R9 / BARRA):** Invoca `applyBarraPotDetalleVariant(...)`, reconstruyendo los terminales y pernos según el nuevo detalle.
   - Si la nueva lista de detalle tiene diferente cantidad o tipo de consumibles, la tabla de Metrado refleja inmediatamente la nueva composición sin inconsistencias huérfanas.

---

## 4. Mapa de Archivos Clave Modificados

| Archivo | Responsabilidad / Cambios |
| :--- | :--- |
| `frontend/src/features/manage-items/model/useItemsStore.ts` | Acción `batchUpdateField` con sincronización de acompañantes y regeneración de variantes vía `applyDetalleVariant` y `applyBarraPotDetalleVariant`. |
| `frontend/src/widgets/takeoff-table/ui/TakeoffTable.tsx` | Estado de celda activa (`selectedCell`), celda en edición (`editingCell`), estado de arrastre (`dragFill`), cálculo con `elementFromPoint`, persistencia de anchos de columna. |
| `frontend/src/widgets/takeoff-table/ui/TakeoffRow.tsx` | Renderizado condicional `renderCell()`, bloqueo de consumibles (`material === 'P'`), eventos de doble clic, selección y soporte del tirador verde (`.excel-fill-handle`). |
| `frontend/src/widgets/takeoff-table/ui/TakeoffTableHeader.tsx` | Divisores `.col-resizer` en cada columna, gestión de anchos dinámicos `colWidths`. |
| `frontend/src/pages/takeoff/ui/TakeoffPage.tsx` | Estado de colapso de sidebar `isSidebarCollapsed` con botón flotante alternante. |
| `frontend/src/widgets/add-panel/ui/AddPanel.tsx` | Botón **◀ Ocultar** en la cabecera de Metadatos. |
| `frontend/src/styles.css` | Estilos para celdas Excel, tirador de arrastre, rango sombreado, divisores de columna y animaciones del drawer. |
| `frontend/src/features/manage-rules/ui/CableTrayEditorModal.tsx` | Modal nuevo para edición de reglas de bandejas portacables. |
| `frontend/src/features/manage-rules/ui/DetalleEditorModal.tsx` | Soporte para renombrar códigos de DETALLE y eliminar reglas completas. |

---

## 5. Instrucciones para Ejecutar en Local y Trabajar en Cursor

### Ejecutar el Servidor de Desarrollo
En una terminal en `d:\OneDrive\OneDrive - cosapi.com.pe\Escritorio\EPC_Take_Off\frontend`:
```bash
cmd.exe /c "npm run dev"
```
O usando el script bat en la raíz:
```bash
iniciar_local.bat
```
La aplicación correrá en `http://localhost:3000/`.

### Verificar Compilación y Tipado
```bash
cmd.exe /c "npm run build"
```
*(Compila TypeScript y genera el bundle con Vite sin errores).*

---

## 6. Próximos Pasos para Continuar en Cursor
1. **Modernización UI/UX tipo Web App:**
   - La estructura está desacoplada. Se puede renovar el Header, barra de navegación, tipografías y sombras sin alterar los stores de Zustand ni las reglas de cálculo.
2. **Validación Visual de Arrastre en Metrado:**
   - Probar en `http://localhost:3000/` arrastrar valores de `DETALLE` entre filas principales y verificar que los consumibles de cada fila se recalculen al instante.
