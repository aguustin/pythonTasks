# Velatrix One · Projects — Identidad de producto

> **Gestión de proyectos y equipos**
> Capa de producto de Projects dentro de la familia Velatrix One. Definida el 2026-11-19; decisiones
> pendientes resueltas el mismo día (ver sección 10).
> Base institucional y sistema de diseño compartido: `C:\dentalflow\docs\product\design-system.md`
> (en adelante, **sistema Velatrix One**). Este documento solo define lo propio de Projects;
> todo lo que no figura acá se hereda sin cambios.
> Referencias visuales de marca: `docs/velatrix-brand-reference.png` y `docs/verificacion-logo.png`.

---

## 1. Ficha

| | |
|---|---|
| Nombre | **Velatrix One · Projects** |
| Descriptor | Gestión de proyectos y equipos (en la interfaz y en la comunicación; "Project & Team Management" fue la denominación de trabajo) |
| Unidad principal | **Proyecto**. En la interfaz siempre se dice "proyecto"; en el backend la entidad se llama `Board` |
| Propósito | Gestionar proyectos, tareas, equipos, responsabilidades y flujos de trabajo desde un único lugar |
| Público | Empresas, comercios, kioscos y equipos de trabajo; usuarios que pertenecen a varias organizaciones |
| Repositorio | `pythonTasks` (backend Django en `/`, frontend Next.js en `taskfront/`) |
| Color identificador | Azul eléctrico `#3B82F6` |
| Preferencia de apariencia | `velatrix.projects.theme` (independiente del resto de los productos) |

---

## 2. Relación con Velatrix

**Diferenciación equilibrada:** Projects comparte el lenguaje visual de Velatrix, pero no es Clinic con otro color.

| Se hereda del sistema Velatrix One | Es propio de Projects |
|---|---|
| Marca institucional (logotipo, símbolo V, verde Velatrix reservado a la marca) | Color de producto (azul eléctrico) y sus tokens `--product-*` |
| Tipografías: Space Grotesk, Inter, JetBrains Mono, y su escala | Personalidad y tono visual (sección 3) |
| Iconografía Lucide (lineal, ~1,75–2 px, extremos redondeados) | Navegación, dashboard y composición de pantallas (sección 7) |
| Neutros grafito, colores funcionales, tokens de tema (`--bg`, `--surface`, `--text`…) | Componentes especializados: tablero Kanban, tarjeta de tarea, prioridad, responsables |
| | Menú lateral que sigue al tema (oscuro en oscuro, claro en claro) — en Clinic es oscuro siempre |
| Componentes base: botones, formularios, tablas, pestañas, foco, `StatusBadge` | Uso de color en columnas, prioridades y gráficos (sección 6) |
| Reglas de accesibilidad (WCAG 2.2 AA) y de uso del color | |
| Mecanismo de apariencia: Claro / Oscuro / Automático, preferencia por producto | |

---

## 3. Personalidad

Plataforma tecnológica profesional, moderna y confiable. **Ni corporativa rígida ni genérica.**

| Rasgo | Cómo se traduce en la interfaz |
|---|---|
| Organización | Grilla firme, columnas de ancho constante, alineaciones consistentes, agrupación clara (proyecto → columna → tarea) |
| Claridad | Jerarquía tipográfica marcada (Space Grotesk para títulos y cifras); cada tarjeta muestra solo lo decisivo: título, prioridad, vencimiento y responsables |
| Colaboración | Las personas son visibles: avatares de responsables, autor en comentarios y actividad, quién hizo qué y cuándo |
| Dinamismo | Microinteracciones breves (150–200 ms) al arrastrar, soltar y completar; la tarjeta "se levanta" al arrastrarla; barras de progreso. Siempre respetando `prefers-reduced-motion` |
| Productividad | Pocos clics para las acciones frecuentes (crear tarea, mover, asignar); atajos de teclado; filtros a mano |
| Control y seguimiento | Estado del proyecto legible de un vistazo: avance, vencidas y bloqueos destacados, sin sobrecargar |

**Tono de los textos:** directo, en español rioplatense neutro ("Creá una tarea"), orientado a la acción. Sin jerga técnica.

---

## 4. Paleta de producto

### Valores base aprobados

| Rol | Valor |
|---|---|
| Principal (identidad) | `#3B82F6` |
| Hover | `#2563EB` |
| Profundo | `#1D4ED8` |
| Suave | `#DBEAFE` |
| Sutil | `#EFF6FF` |

### Ajustes por contraste (verificados)

El texto blanco sobre `#3B82F6` da **3,68:1**: no alcanza AA para texto (4,5:1). Por eso:

- `#3B82F6` es el **color de identidad**: nombre de la edición, indicadores en tema oscuro y primera serie de los gráficos en oscuro. **No** se usa como relleno de botón con texto blanco.
- El **relleno de las acciones principales** es `#2563EB` (texto blanco 5,17:1) en ambos temas. Así el botón primario se ve igual en claro y en oscuro.
- Los estados se desplazan un paso hacia lo profundo: hover `#1D4ED8` (6,70:1) y presionado `#1E40AF` (8,72:1).
- En tema oscuro, el texto azul usa `#60A5FA` (7,31:1 sobre `#111317`) para el trabajo prolongado.

A diferencia de Clinic (texto oscuro sobre cian), en Projects el texto sobre el azul es **blanco**.

### Tokens `--product-*`

| Token | Valor | Uso | Contraste verificado |
|---|---|---|---|
| `--product-accent` | `#3B82F6` | color de identidad; indicador en oscuro | sobre `#111317` 5,06:1 · sobre `#1A1B1E` 4,68:1 · sobre blanco 3,68:1 (solo no textual) |
| `--product-accent-fill` | `#2563EB` | relleno del botón primario (ambos temas) | texto blanco 5,17:1 · sobre `#111317` 3,60:1 · sobre blanco 5,17:1 |
| `--product-accent-hover` | `#1D4ED8` | hover del botón primario (ambos temas) | texto blanco 6,70:1 |
| `--product-accent-pressed` | `#1E40AF` | presionado (ambos temas) | texto blanco 8,72:1 |
| `--product-accent-ink` | `#1D4ED8` | **texto** azul en claro (enlaces, ítem seleccionado) | sobre blanco 6,70:1 · sobre `#DBEAFE` 5,49:1 · sobre `#EFF6FF` 6,16:1 |
| `--product-accent-strong` | `#2563EB` | indicadores en claro: foco, barras, bordes seleccionados, casillas | sobre blanco 5,17:1 |
| `--product-accent-soft` | `#DBEAFE` | fondo seleccionado (claro) | — |
| `--product-accent-subtle` | `#EFF6FF` | superficie suave (claro) | — |
| `--product-accent-light` | `#60A5FA` | texto azul y foco en oscuro; nombre de la edición en el menú | sobre `#111317` 7,31:1 · sobre `#0A0B0D` 7,74:1 |
| `--product-accent-dark-soft` | `rgb(59 130 246 / .14)` | fondo seleccionado (oscuro) | texto `#60A5FA` encima 6,21:1 · texto `#F8FAFC` 15,1:1 |

Nunca texto `#3B82F6` sobre blanco (3,68:1), ni `#2563EB` sobre `#DBEAFE` para texto chico (4,24:1): para eso está `--product-accent-ink`.

---

## 5. Temas

Projects usa el mecanismo de apariencia del sistema Velatrix One **sin modificarlo**. Claro, Oscuro y Automático; por defecto, Automático. La preferencia se guarda en `velatrix.projects.theme` y se aplica antes del primer render. Neutros, funcionales y tokens de tema se heredan; solo cambia la capa de acento:

| Token semántico | Claro | Oscuro |
|---|---|---|
| `--accent` (relleno principal) | `#2563EB` | `#2563EB` |
| `--accent-hover` / `--accent-pressed` | `#1D4ED8` / `#1E40AF` | `#1D4ED8` / `#1E40AF` |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` |
| `--accent-text` | `#1D4ED8` | `#60A5FA` |
| `--accent-indicator` (barras, bordes, casillas, pestañas) | `#2563EB` | `#3B82F6` |
| `--accent-soft` / `--accent-subtle` | `#DBEAFE` / `#EFF6FF` | `rgb(59 130 246 / .14)` / `/ .07` |
| `--focus-ring` | `#2563EB` | `#60A5FA` |

- **Tema claro:** fondo `#F8FAFC`, superficies blancas con sombra suave, bordes `#E2E6EB`. El azul aparece en la acción principal, la selección y el foco.
- **Tema oscuro:** fondo `#0A0B0D`, superficies grafito `#111317`/`#1A1B1E`, texto `#F8FAFC`. El texto azul se aclara a `#60A5FA` para que no fatigue.
- **Menú lateral — sigue al tema (rasgo propio de Projects).** Es oscuro en tema oscuro y tiene una versión clara en tema claro. En Automático acompaña al sistema operativo. El ancla de marca la siguen dando el ícono oficial y el nombre de la edición.

| Menú lateral | Claro | Oscuro |
|---|---|---|
| Fondo | `#FFFFFF` + borde derecho `#E2E6EB` | `#0A0B0D` |
| Texto de ítems / ícono | `#4B5563` | `#9CA3AF` |
| Hover de ítem | fondo `#F1F4F7`, texto `#0A0B0D` | fondo `#1A1B1E`, texto `#F8FAFC` |
| Ítem activo: texto | `#1D4ED8` (6,16:1 sobre `#EFF6FF`) | `#60A5FA` (7,74:1 sobre `#0A0B0D`) |
| Ítem activo: barra izquierda 3 px | `#2563EB` | `#3B82F6` |
| Ítem activo: fondo | `#EFF6FF` | `rgb(59 130 246 / .12)` |
| Nombre de la edición "Projects" | `#1D4ED8` (6,70:1) | `#60A5FA` (7,74:1) |
| Etiquetas de grupo | `#6B7280` | `#8B93A1` |

---

## 6. Color en los elementos propios de Projects

La regla 80 / 15 / 5 del sistema se mantiene: el azul es acento, no relleno.

### Columnas del tablero (hasta 6 por proyecto)
Cada columna puede llevar un color, que se muestra **solo** como punto o barra fina en el encabezado, nunca como fondo de la columna. Se elige de la paleta categórica de Projects (debajo), que tiene exactamente 6 colores: uno por columna posible. Toda columna muestra siempre su nombre; el color nunca es el único identificador.

### Paleta categórica (columnas y gráficos)
Igual que la de Clinic, pero con el azul de Projects en primer lugar. No hay dos azules juntos.

| Orden | Oscuro | Claro |
|---|---|---|
| 1 · producto | `#60A5FA` | `#2563EB` |
| 2 | `#F59E0B` | `#B45309` |
| 3 | `#A78BFA` | `#7C3AED` |
| 4 | `#F472B6` | `#DB2777` |
| 5 | `#4ADE80` | `#15803D` |
| 6 | `#94A3B8` | `#64748B` |

Todos verificados: ≥ 6,8:1 sobre `#111317` en oscuro y ≥ 4,6:1 sobre blanco en claro.

### Prioridad (propuesta)
Siempre con **ícono + texto**, nunca en azul (para no confundirse con la selección):

| Prioridad | Color | Ícono Lucide |
|---|---|---|
| Baja | neutro `--text-subtle` | `chevron-down` |
| Media | neutro `--text-muted` | `equal` |
| Alta | advertencia (funcional) | `chevron-up` |
| Urgente | peligro (funcional) | `chevrons-up` |

### Azul de información (decidido)
El color funcional "Información" del sistema (`#1D4ED8` / `#60A5FA`) coincide con el acento de Projects. Por eso, en Projects:

- La categoría **"Confirmado" no se usa** en las tareas.
- Los avisos informativos se muestran en **neutro** (fondo `--surface-2`, borde `--border`, texto `--text`) con el ícono Lucide `info`.
- En la interfaz, el azul significa siempre **acción, selección o foco**, nunca un estado.

### Estado de una tarea
Se usan las categorías comunes del sistema (`StatusBadge`), salvo "Confirmado":

- Tarea en una columna marcada como terminada → **Finalizado**.
- Vencida y sin terminar → **Problema**.
- Vence hoy o en los próximos días → **Pendiente** (ámbar), como aviso.

El nombre de la columna se muestra tal cual lo definió el equipo.

### Responsables
Avatares con iniciales sobre fondo neutro (`--surface-2`). No se colorean por persona con el azul de producto.

---

## 7. Dirección de experiencia

> Es la dirección que orienta el diseño. La especificación funcional (pantallas, flujos, permisos, MVP) está en
> [`especificacion-funcional.md`](especificacion-funcional.md).

**Ámbito funcional de referencia:** dashboard general · proyectos · tareas · tableros Kanban · equipos e integrantes · asignaciones y responsabilidades · prioridades y estados · calendario y cronogramas · comentarios y actividad · seguimiento de avances · reportes y métricas.

### Principios de experiencia propios
1. **El trabajo de cada persona primero.** La vista de inicio responde "¿qué tengo que hacer hoy?": mis tareas, las vencidas y las que vencen hoy.
2. **El tablero es el lienzo.** Las columnas tienen **ancho fijo** (referencia: 296 px) y el tablero se desplaza **en horizontal** para ver las que no entran en pantalla. El ancho de las columnas nunca se achica para que entren todas.
3. **Estado en un vistazo.** Cada proyecto expone su avance (completadas sobre total), las vencidas y las urgentes, sin abrirlo.
4. **Contexto organizacional explícito.** Como un usuario puede estar en varias organizaciones, la organización activa siempre es visible y se cambia con un selector.
5. **Los permisos se reflejan en la interfaz.** Lo que no se puede hacer no se ofrece; un lector ve el tablero sin controles de edición, pero puede mover sus tareas asignadas.

### Navegación (propuesta)
Menú lateral con el **selector de organización** arriba; luego Inicio, Mis tareas, Proyectos (con acceso rápido a los recientes y favoritos, con su punto de color) e Integrantes; Calendario y Reportes cuando existan; y Configuración al pie. La actividad vive dentro de cada proyecto y en Inicio. Detalle completo en [`especificacion-funcional.md`](especificacion-funcional.md) §4. Difiere de Clinic, que agrupa en Operación / Gestión / Configuración. Los colores del menú en cada tema están en la sección 5.

**Vocabulario:** "Proyecto" (nunca "tablero" ni "lista"), "Tarea", "Columna", "Responsable", "Integrantes" (las personas de la organización), "Equipo" (un grupo de integrantes; Etapa 2), "Prioridad", "Vencimiento".

### Dashboard (propuesta)
KPIs en Space Grotesk (tareas abiertas, vencidas, completadas en la semana), lista "Mis tareas" ordenada por vencimiento y prioridad, y tarjetas de proyecto con barra de avance en `--accent-indicator`. La tarjeta destacada lleva la línea superior de 2 px del sistema.

### Tarjeta de tarea
Título (Inter 14/600), prioridad (ícono + texto), insignia de vencimiento, avatares de responsables y contador de comentarios. Al arrastrarla se eleva con sombra; al soltarla vuelve con una transición breve. El identificador técnico de la tarea, si se muestra, va en JetBrains Mono.

---

## 8. Diferenciación dentro de Velatrix One

| Producto | Ámbito | Acento | Carácter |
|---|---|---|---|
| Clinic | Gestión clínica | Cian `#22D3EE` (implementado) | Sereno, preciso, texto oscuro sobre cian |
| Retail | Gestión comercial | Violeta (propuesto) | — sin cambios — |
| Workshop | Talleres y servicios técnicos | Naranja (propuesto) | — sin cambios — |
| **Projects** | **Proyectos y equipos** | **Azul eléctrico `#3B82F6`** | **Organizado y dinámico; texto blanco sobre azul; el tablero como lienzo; menú que sigue al tema** |

Projects se reconoce como Velatrix por el fondo grafito, las tipografías, los íconos y el símbolo V. Se distingue por el azul, por el menú lateral que acompaña al tema, por la navegación centrada en organizaciones y proyectos y por el tablero Kanban horizontal como pantalla protagonista.

---

## 9. Marca dentro del producto

- Se usa el **ícono oficial** de Velatrix sin modificar. El logotipo no se recrea con tipografías: hasta tener los SVG oficiales, el nombre se escribe en texto plano.
- Nombre en la interfaz: "Velatrix One" en Space Grotesk y "Projects" en azul junto al ícono (`#60A5FA` en el menú oscuro, `#1D4ED8` en el claro). Debajo, o en login y onboarding, el descriptor "Gestión de proyectos y equipos".
- El verde Velatrix y su degradado quedan para la marca (ícono, logotipo, "por Velatrix"). **Nunca** como acento de Projects. Tampoco el cian de Clinic.
- Curvas de luz y onda de partículas: solo en login, onboarding y estados vacíos, con baja opacidad. En Projects pueden teñirse de azul.

---

## 10. Decisiones (2026-11-19)

| # | Tema | Decisión |
|---|---|---|
| 1 | Azul de información vs. acento | Sin categoría "Confirmado" en tareas; avisos informativos en neutro con ícono `info` (sección 6) |
| 2 | Nombre de la unidad principal | **Proyecto** (en el backend sigue siendo `Board`) |
| 3 | Descriptor | **Gestión de proyectos y equipos** |
| 4 | Menú lateral | Oscuro en tema oscuro, con versión clara en tema claro (sección 5) |
| 5 | SVG oficiales del símbolo y el logotipo | Se agregan más adelante. Mientras tanto: ícono oficial + nombre en texto plano |
| 6 | Dependencias de interfaz | `lucide-react` y las fuentes empaquetadas (Space Grotesk, JetBrains Mono) se agregan al implementar |
| 7 | Ficha en el sitio institucional (`C:\velatrix`) | No se crea por ahora. El acento `#3B82F6` pasa la validación V8 del sitio (5,32:1 sobre `#0B0C0E`) |
