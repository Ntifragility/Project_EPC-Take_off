# Resumen Técnico Exhaustivo y Guía de Continuidad para Cursor

Este documento describe con máximo detalle técnico todas las modificaciones, nuevas funcionalidades, reglas de negocio y consideraciones arquitectónicas implementadas en el proyecto **EPC Take-Off** (commit `a2350a9` en rama `main`), de modo que puedas continuar el desarrollo en **Cursor** con total claridad de contexto.

---

## 1. Visión General de la Arquitectura

El sistema implementa una arquitectura **Hexagonal / Feature-Sliced Design (FSD)** construida sobre **React 18 + TypeScript + Zustand + Vite + Supabase**:

```text
src/
├── entities/            # Modelos de dominio y tipos puros
│   ├── takeoff-item/    # Entidad ítem de metrado (TakeoffItem, tipos de material P/C)
│   └── takeoff-rule/    # Reglas de metrado, variantes de detalle, bandejas
├── features/            # Casos de uso de la aplicación
│   ├── manage-items/    # Estado de ítems (useItemsStore.ts, batch updates, cascadas)
│   ├── manage-rules/    # Gestión de reglas y catálogo (useRulesStore.ts, modales)
│   ├── apply-rule/      # Ejecución de reglas paramétricas (cables, bandejas, etc.)
│   └── app-config/      # Configuración de áreas (Seca/Húmeda, etc.)
├── widgets/             # Componentes de UI compuestos
│   ├── takeoff-table/   # Tabla de metrado tipo Excel (drag fill, resize, inline edit)
│   ├── rules-catalog/   # Catálogo visual de reglas de cálculo
│   ├── add-panel/       # Panel lateral retraíble de Metadatos
│   └── header/          # Barra de navegación superior
├── pages/               # Vistas principales (TakeoffPage.tsx)
└── shared/              # Utilitarios comunes, cliente Supabase, constantes y storage
```

---

## 2. Nuevas Funcionalidades: Grilla Tipo Excel en Metrado

La tabla de metrado (`TakeoffTable.tsx`, `TakeoffRow.tsx`, `TakeoffTableHeader.tsx`, `styles.css`) fue transformada para emular la experiencia de una hoja de cálculo profesional:

### 2.1. Selección de Celdas y Foco Visual
- Clic simple en cualquier celda de un ítem editable selecciona la celda activa.
- Se resalta con borde verde (`.excel-cell.is-selected`) al estilo Microsoft Excel.
- Las celdas de ítems consumibles (`material === 'C'`) se distinguen visualmente con un tono suave y quedan bloqueadas contra edición o selección de propagación.

### 2.2. Edición Inline In-Situ
- Doble clic en la celda activa activa el modo de edición inline rápida (`editingCell`).
- Soporta campos de texto (`plano`, `rev`, `detalle`, `tagUnico`, `tagPlano`, `descripcion`, `unidad`) y campos numéricos (`cantidad`).
- **Teclado:**
  - `Enter`: Guarda el valor e invoca la actualización correspondiente.
  - `Escape`: Cancela la edición y restaura el valor original sin mutar el estado.
  - `Blur`: Confirma y guarda el cambio.

### 2.3. Tirador de Arrastre para Copiar / Rellenar (Drag-to-Fill Handle)
- En la esquina inferior derecha de la celda principal seleccionada aparece el cuadro verde tirador (`.excel-fill-handle`).
- **Mecanismo de arrastre robusto:**
  - Al hacer `mousedown` en el tirador se inicializa el estado `dragFill = { sourceItemId, colKey, startIdx, currentIdx, value }`.
  - Para evitar la pérdida de eventos al arrastrar rápido el cursor por la tabla, se utiliza un listener global de `mousemove` que identifica la fila destino mediante `document.elementFromPoint(e.clientX, e.clientY)` buscando el atributo `data-item-id`.
  - Las celdas en el rango de arrastre se resaltan con borde segmentado y fondo translúcido (`.excel-cell-fill-target`).
- **Al soltar (`mouseup`):**
  - Se obtienen únicamente las filas principales (`material === 'P'`) dentro del rango arrastrado.
  - Se despacha la acción `batchUpdateField(field, value, targetItemIds)` hacia el store de Zustand.

### 2.4. Redimensión Dinámica de Columnas (Column Resizing)
- En `TakeoffTableHeader.tsx`, cada cabecera `<th>` cuenta con un divisor arrastrable `.col-resizer`.
- Arrastrar el divisor ajusta el ancho de la columna en tiempo real con límites mínimos para evitar colapsos.
- Los anchos personalizados se persisten automáticamente en `localStorage` con la clave `'epc-table-col-widths'`, manteniendo la preferencia del usuario entre sesiones.

### 2.5. Columna PLANO Integrada
- Se integró formalmente la columna `PLANO` tanto en el encabezado `TakeoffTableHeader` como en `TakeoffRow` y en la definición de anchos por defecto.

---

## 3. Panel Flotante de METADATOS Retráctil

- **Componentes:** `TakeoffPage.tsx`, `AddPanel.tsx`, `styles.css`.
- **Comportamiento:**
  - El panel lateral de Metadatos ahora es un drawer retráctil (`.takeoff-sidebar-drawer`).
  - La cabecera incluye el botón interactivo **"◀ Ocultar"**.
  - Al colapsar, la tabla de Metrado se expande suavemente ocupando todo el ancho disponible (`.takeoff-content-expanded`).
  - Cuando el panel está oculto, aparece un botón flotante **"▶ Metadatos"** en el borde izquierdo para reabrirlo con un solo clic.
  - El estado abierto/cerrado se guarda en `localStorage` con la clave `'epc-sidebar-collapsed'`.

---

## 4. Regla de Negocio Innegociable: Integridad y Cascada de Dominio

> ### Principios Fundamentales:
> 1. **Solo los elementos principales (`material === 'P'`) pueden editarse.** Los consumibles (`material === 'C'`) son derivados calculados y de solo lectura.
> 2. **Al cambiar el código `DETALLE` de un elemento principal (manualmente o mediante arrastre tipo Excel), toda la lista de consumibles asociados se actualiza en cascada de manera automática.**

### Flujo de la Cascada en `useItemsStore.ts` (`batchUpdateField` y `updateItem`):

```text
[Usuario edita o arrastra celda DETALLE en ítem Principal 'P']
                         │
                         ▼
        batchUpdateField / updateItem en useItemsStore
                         │
        ┌────────────────┴────────────────────────┐
        ▼                                         ▼
1. Sincronización de Acompañantes       2. Cascada de Consumibles
   (Ítems con igual ruleId,               • R1/R2 (Cables):
    pkgId y tagPlano actualizan             Invoca applyDetalleVariant()
    plano, rev, detalle, tagUnico)          Reconstruye consumibles desde
                                            DYNAMIC_DETALLE_VARIANTS.
                                          • R8/R9 (Barras):
                                            Invoca applyBarraPotDetalleVariant()
                                            Reconstruye terminales y pernos.
                         │
                         ▼
      [Tabla de Metrado refleja nueva composición sin ítems huérfanos]
```

- **Mapeo dinámico:** Si la nueva variante de detalle tiene más, menos o diferentes consumibles que la anterior, el motor elimina los consumibles obsoletos de la regla y genera los nuevos con sus factores correspondientes calculados sobre la cantidad del elemento principal.

---

## 5. Módulo de Bandejas Portacables (Cable Tray) y Catálogo

- **`CableTrayEditorModal.tsx`:** Nuevo modal para configurar reglas complejas de bandejas portacables (anchos de bandeja, tipo de peldaño, soportería trapecio, pernos y varillas roscadas).
- **`CableTrayRuleCard.tsx` y `RulesView.tsx`:** Tarjetas dedicadas en el catálogo de reglas para visualizar y parametrizar bandejas.
- **Renombrado y Eliminación de Reglas en `DetalleEditorModal.tsx`:**
  - Permite renombrar el código de un `DETALLE` existente, migrando todos los consumibles asociados al nuevo código y removiendo la entrada antigua.
  - Permite la eliminación completa de variantes no deseadas.

---

## 6. Mapa de Archivos Modificados

| Ruta del Archivo | Tipo de Cambio | Propósito Técnico |
| :--- | :--- | :--- |
| `frontend/src/features/manage-items/model/useItemsStore.ts` | Modificado | Incorpora `batchUpdateField` con sincronización de acompañantes y regeneración de consumibles mediante `applyDetalleVariant` y `applyBarraPotDetalleVariant`. |
| `frontend/src/widgets/takeoff-table/ui/TakeoffTable.tsx` | Modificado | Maneja `selectedCell`, `editingCell`, `dragFill`, listeners globales de mouse con `document.elementFromPoint`, y persistencia de anchos en `localStorage`. |
| `frontend/src/widgets/takeoff-table/ui/TakeoffRow.tsx` | Modificado | Renderizado con `renderCell()`, guardia `isMainItem` (`material === 'P'`), eventos de doble clic, selección y soporte del tirador verde. |
| `frontend/src/widgets/takeoff-table/ui/TakeoffTableHeader.tsx` | Modificado | Divisores `.col-resizer`, anchos dinámicos y columna PLANO. |
| `frontend/src/pages/takeoff/ui/TakeoffPage.tsx` | Modificado | Drawer retráctil de Metadatos con botón flotante alternante. |
| `frontend/src/widgets/add-panel/ui/AddPanel.tsx` | Modificado | Botón **◀ Ocultar** en cabecera de Metadatos. |
| `frontend/src/styles.css` | Modificado | Clases para grilla Excel (`.excel-cell`, `.excel-fill-handle`, `.excel-cell-fill-target`, `.col-resizer`) y drawer lateral. |
| `frontend/src/features/manage-rules/ui/CableTrayEditorModal.tsx` | Nuevo | Modal de creación y edición de reglas de bandejas portacables. |
| `frontend/src/features/manage-rules/ui/DetalleEditorModal.tsx` | Modificado | Soporte para renombrar códigos de DETALLE y borrado integral de reglas. |
| `frontend/src/widgets/rules-catalog/ui/CableTrayRuleCard.tsx` | Modificado | Renderizado de tarjetas de bandejas portacables. |
| `frontend/src/entities/takeoff-rule/model/cableTrayRules.ts` | Modificado | Definiciones y constantes de cálculo para bandejas. |

---

## 7. Instrucciones para Ejecutar y Desarrollar en Cursor

### Servidor de Desarrollo Local
Abre una terminal integrada en `frontend/` y ejecuta:
```bash
cmd.exe /c "npm run dev"
```
O directamente desde la raíz ejecutando:
```cmd
iniciar_local.bat
```
La aplicación se servirá en `http://localhost:3000/`.

### Comprobación de Tipos y Compilación (TypeScript / Vite)
Para asegurar que cualquier cambio nuevo respete las interfaces:
```bash
cmd.exe /c "npm run build"
```
*(Actualmente compila al 100% sin advertencias ni errores de TypeScript).*

### Recomendaciones para Próximos Cambios en Cursor:
1. **Modernización UI / UX (Tipo Web App):**
   - El usuario solicitó previamente modernizar la apariencia general para que se sienta como una aplicación web moderna (estilo Linear / Notion / Shadcn UI).
   - Como la arquitectura FSD está sólidamente desacoplada, puedes refactorizar los componentes de `widgets/header` y los contenedores de `TakeoffPage` sin riesgo de romper la lógica de cálculo en `features/` o `entities/`.
2. **Preservar el Principio de Consumibles:**
   - Nunca permitas que una acción de UI edite directamente un ítem con `material === 'C'`. Cualquier mutación debe originarse en su ítem principal (`material === 'P'`) o en el modal de detalle.
