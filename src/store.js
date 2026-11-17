// Datos de la demo, compartidos por las 4 pantallas.
// Todo vive en localStorage de quien prueba la demo: no hay servidor.
// La información del local (horario, teléfono, precios) se edita en un solo lugar y de ahí sale a todos los canales.
// La lista de espera y los pedidos de las mesas se atienden en orden de llegada.

const NS = 'dlamari-demo:v1:';
export const PREF = 'dlamari-demo:pref:';
export const clp = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(Number(n) || 0)).toLocaleString('es-CL');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fotoUrl(f, w = 600) {
  if (!f) return '';
  if (/^(https?:|assets\/)/.test(f)) return f;
  return `https://images.unsplash.com/photo-${f}?w=${w}&q=70&auto=format&fit=crop`;
}

const haceMin = (m) => new Date(Date.now() - m * 60000).toISOString();
const isoChile = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
export const hoyIso = () => isoChile(new Date());

// Ola de la marca (mismo trazo que la landing).
export const OLA = '<svg class="ola" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 23c3-3 5.5-3 8.5 0s5.5 3 8.5 0 5.5-3 8.5 0M9 28c2.6-2.4 4.8-2.4 7.4 0s4.8 2.4 7.4 0 4.8-2.4 7.4 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="20" cy="14" r="3.2" fill="currentColor"/></svg>';
export const LOGO = `<span class="logo-marca">${OLA}<span>D'LAMARI</span></span>`;

const ACOMP = { grupo: 'Acompañamiento', items: [{ n: 'Papas fritas', p: 0 }, { n: 'Arroz', p: 0 }, { n: 'Puré', p: 0 }, { n: 'Ensalada a la chilena', p: 0 }, { n: 'Ensalada surtida', p: 0 }] };
const SALSA = { grupo: 'Salsa', items: [{ n: 'Sin salsa', p: 0 }, { n: 'Salsa verde', p: 4200 }, { n: 'Salsa de champiñones', p: 8900 }, { n: 'Salsa margarita', p: 9200 }, { n: 'Salsa de camarones', p: 10400 }] };
const PREP = { grupo: 'Preparación', items: [{ n: 'Frito', p: 0 }, { n: 'A la plancha', p: 0 }] };
const SCHOP = { grupo: 'Tamaño', items: [{ n: 'Chico', p: 0 }, { n: 'Mediano', p: 1000 }] };

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function semilla() {
  return {
    local: {
      nombre: "D'LAMARI",
      tipo: 'Restaurante frente al mar · Playa Cochoa',
      direccion: 'Av. Borgoño 17.150, Viña del Mar',
      telefono: '+56 9 6218 5959',
      whatsapp: '56962185959',
      email: 'contacto@dlamari.cl',
      instagram: '',
      sitio: 'https://dlamari-vina.vercel.app/landing/',
      titulo: 'Tradición frente al mar',
      frase: 'Más de 25 años sirviendo pescados, mariscos y empanadas a metros de Playa Cochoa.',
      tema: 'arena',
      horario: DIAS.map((d) => ({ dia: d, abre: '13:00', cierra: '21:00', cerrado: false })),
      excepciones: [],
      revisado: haceMin(60 * 24 * 3),
    },
    // Dónde aparece la información del local. La carta y la web salen de aquí solas;
    // en Google y directorios hay que publicar el cambio, y el panel avisa si quedó distinto.
    canales: [
      { id: 'carta', nombre: 'Carta QR', icono: '▣', auto: true, estado: 'ok', detalle: '' },
      { id: 'web', nombre: 'Sitio web dlamari.cl', icono: '🌐', auto: true, estado: 'ok', detalle: '' },
      { id: 'google', nombre: 'Google Maps', icono: '📍', auto: false, estado: 'distinto', detalle: 'Muestra otro teléfono y otro horario que la web.' },
      { id: 'tripadvisor', nombre: 'Tripadvisor', icono: '🧭', auto: false, estado: 'distinto', detalle: 'Teléfono antiguo.' },
      { id: 'instagram', nombre: 'Instagram (bio)', icono: '📸', auto: false, estado: 'ok', detalle: '' },
    ],
    categorias: [
      { id: 'empanadas', nombre: 'Empanadas', icono: '🥟', nota: 'Fritas. El valor es por unidad y no incluyen pan.' },
      { id: 'entradas', nombre: 'Entradas', icono: '🦪' },
      { id: 'pescados', nombre: 'Pescados', icono: '🐟', nota: 'Con un acompañamiento a elección.' },
      { id: 'fondo', nombre: 'Platos de fondo', icono: '🍲' },
      { id: 'pobre', nombre: 'A lo pobre', icono: '🍳' },
      { id: 'sandwiches', nombre: 'Sándwiches', icono: '🥪', nota: 'Desde las 17:00.' },
      { id: 'ninos', nombre: 'Menú niños', icono: '🧒' },
      { id: 'postres', nombre: 'Postres', icono: '🍰' },
      { id: 'jugos', nombre: 'Jugos y bebidas', icono: '🍹', bebestible: true },
      { id: 'cervezas', nombre: 'Schop y cervezas', icono: '🍺', bebestible: true },
      { id: 'vinos', nombre: 'Vinos', icono: '🍷', bebestible: true },
    ],
    // desde: hora desde la que se puede pedir (los sándwiches salen desde las 17:00).
    productos: [
      { id: 'emp-marisco', nombre: 'Empanada marisco surtido', precio: 3100, cat: 'empanadas', etiqueta: 'La favorita', tags: ['mar'], desc: 'Mariscos de la bahía y queso.', foto: '1769254870299-338bfd99aabd', estado: 'disponible', opciones: [] },
      { id: 'emp-macha', nombre: 'Empanada macha queso', precio: 4200, cat: 'empanadas', etiqueta: '', tags: ['mar'], desc: 'Machas y queso.', foto: '', emoji: '🥟', estado: 'disponible', opciones: [] },
      { id: 'emp-ostion', nombre: 'Empanada ostión queso', precio: 3800, cat: 'empanadas', etiqueta: '', tags: ['mar'], desc: 'Ostiones y queso.', foto: '', emoji: '🥟', estado: 'disponible', opciones: [] },
      { id: 'emp-camaron', nombre: 'Empanada camarón queso', precio: 3400, cat: 'empanadas', etiqueta: '', tags: ['mar'], desc: 'Camarón y queso.', foto: '', emoji: '🥟', estado: 'disponible', opciones: [] },
      { id: 'emp-jaiba', nombre: 'Empanada jaiba camarón queso', precio: 4100, cat: 'empanadas', etiqueta: '', tags: ['mar'], desc: 'Jaiba, camarón y queso.', foto: '', emoji: '🥟', estado: 'agotado', motivoAgotado: 'Hoy no llegó jaiba. Prueba la de camarón queso.', opciones: [] },
      { id: 'emp-queso', nombre: 'Empanada de queso', precio: 2600, cat: 'empanadas', etiqueta: '', tags: ['veggie'], desc: 'Queso derretido.', foto: '', emoji: '🧀', estado: 'disponible', opciones: [] },
      { id: 'emp-pino', nombre: 'Empanada de pino', precio: 3000, cat: 'empanadas', etiqueta: '', tags: [], desc: 'Pino de carne.', foto: '', emoji: '🥟', estado: 'disponible', opciones: [] },
      { id: 'machas-parm', nombre: 'Machas a la parmesana', precio: 15900, cat: 'entradas', etiqueta: 'De la casa', tags: ['mar'], desc: 'Gratinadas con queso parmesano.', foto: '1765100479761-2359e22fbe16', estado: 'disponible', opciones: [] },
      { id: 'ostiones-parm', nombre: 'Ostiones parmesanos', precio: 15500, cat: 'entradas', etiqueta: '', tags: ['mar'], desc: 'Gratinados al horno.', foto: '1679694140422-aecfd3d5dd0b', estado: 'disponible', opciones: [] },
      { id: 'camarones-pilpil', nombre: 'Camarones al pil-pil', precio: 16500, cat: 'entradas', etiqueta: '', tags: ['mar', 'picante'], desc: 'En aceite de oliva, ajo y ají.', foto: '', emoji: '🦐', estado: 'disponible', opciones: [] },
      { id: 'palta-reina', nombre: 'Palta reina', precio: 10450, cat: 'entradas', etiqueta: '', tags: [], desc: 'Palta rellena con pollo y mayonesa.', foto: '', emoji: '🥑', estado: 'disponible', opciones: [] },
      { id: 'erizos', nombre: 'Erizos', precio: 17500, cat: 'entradas', etiqueta: 'Según la pesca', tags: ['mar'], desc: 'Con limón y cebolla.', foto: '', emoji: '🌊', estado: 'disponible', opciones: [] },
      { id: 'reineta', nombre: 'Reineta', precio: 11900, cat: 'pescados', etiqueta: '', tags: ['mar'], desc: 'Filete de reineta.', foto: '1665401015549-712c0dc5ef85', estado: 'disponible', opciones: [PREP, ACOMP, SALSA] },
      { id: 'congrio', nombre: 'Congrio', precio: 13900, cat: 'pescados', etiqueta: '', tags: ['mar'], desc: 'Filete de congrio.', foto: '', emoji: '🐟', estado: 'disponible', opciones: [PREP, ACOMP, SALSA] },
      { id: 'albacora', nombre: 'Albacora', precio: 14900, cat: 'pescados', etiqueta: '', tags: ['mar'], desc: 'Albacora a la plancha.', foto: '', emoji: '🐟', estado: 'disponible', opciones: [ACOMP, SALSA] },
      // Precio en $0 como en la carta pública actual: el administrador lo marca y no se muestra hasta corregirlo.
      { id: 'merluza', nombre: 'Merluza', precio: 0, cat: 'pescados', etiqueta: '', tags: ['mar'], desc: 'Filete de merluza.', foto: '', emoji: '🐟', estado: 'disponible', opciones: [PREP, ACOMP] },
      { id: 'calugas', nombre: 'Calugas de congrio', precio: 17500, cat: 'pescados', etiqueta: '', tags: ['mar'], desc: 'Apanadas, para compartir.', foto: '', emoji: '🍤', estado: 'disponible', opciones: [ACOMP] },
      { id: 'paila', nombre: 'Paila marina', precio: 13500, cat: 'fondo', etiqueta: 'Clásico', tags: ['mar'], desc: 'Caldo de mariscos frescos, servido hirviendo.', foto: '1571167366136-b57e07761625', estado: 'disponible', opciones: [] },
      { id: 'caldillo', nombre: 'Caldillo de congrio', precio: 14500, cat: 'fondo', etiqueta: '', tags: ['mar'], desc: 'Caldillo tradicional.', foto: '', emoji: '🍲', estado: 'disponible', opciones: [] },
      { id: 'pastel-jaiba', nombre: 'Pastel de jaiba', precio: 13900, cat: 'fondo', etiqueta: '', tags: ['mar'], desc: 'Gratinado al horno.', foto: '', emoji: '🦀', estado: 'agotado', motivoAgotado: 'Hoy no llegó jaiba. Te recomendamos el chupe de mariscos.', opciones: [] },
      { id: 'chupe', nombre: 'Chupe de mariscos', precio: 13500, cat: 'fondo', etiqueta: '', tags: ['mar'], desc: 'Cremoso y gratinado.', foto: '', emoji: '🍲', estado: 'disponible', opciones: [] },
      { id: 'ceviche-mixto', nombre: 'Ceviche mixto', precio: 16500, cat: 'fondo', etiqueta: '', tags: ['mar'], desc: 'Pescado y mariscos, cebolla morada y cilantro.', foto: '1761314037195-1508e44c6bd2', estado: 'disponible', opciones: [] },
      { id: 'reineta-pobre', nombre: 'Reineta a lo pobre', precio: 17500, cat: 'pobre', etiqueta: '', tags: ['mar'], desc: 'Con papas fritas, cebolla y huevos.', foto: '', emoji: '🍳', estado: 'disponible', opciones: [PREP] },
      { id: 'lomo-pobre', nombre: 'Lomo a lo pobre', precio: 18900, cat: 'pobre', etiqueta: '', tags: [], desc: 'Con papas fritas, cebolla y huevos.', foto: '', emoji: '🥩', estado: 'disponible', opciones: [{ grupo: 'Punto', items: [{ n: 'A punto', p: 0 }, { n: 'Tres cuartos', p: 0 }, { n: 'Bien cocido', p: 0 }] }] },
      { id: 'churrasco-marino', nombre: 'Churrasco marino', precio: 10500, cat: 'sandwiches', etiqueta: '', tags: ['mar'], desc: 'Pescado apanado, palta y mayo.', foto: '', emoji: '🥪', estado: 'disponible', desde: '17:00', opciones: [] },
      { id: 'barros-luco', nombre: 'Barros Luco', precio: 7500, cat: 'sandwiches', etiqueta: '', tags: [], desc: 'Carne y queso derretido.', foto: '', emoji: '🥪', estado: 'disponible', desde: '17:00', opciones: [] },
      { id: 'chacarero', nombre: 'Chacarero', precio: 8500, cat: 'sandwiches', etiqueta: '', tags: ['picante'], desc: 'Carne, porotos verdes, tomate y ají.', foto: '', emoji: '🥪', estado: 'disponible', desde: '17:00', opciones: [] },
      { id: 'nuggets-ninos', nombre: 'Nuggets con papas fritas', precio: 7900, cat: 'ninos', etiqueta: '', tags: [], desc: 'Menú niños.', foto: '', emoji: '🍗', estado: 'disponible', opciones: [] },
      { id: 'kuchen', nombre: 'Kuchen de manzana', precio: 4500, cat: 'postres', etiqueta: '', tags: ['veggie'], desc: 'Casero.', foto: '', emoji: '🥧', estado: 'disponible', opciones: [] },
      { id: 'papayas', nombre: 'Papayas al jugo', precio: 4500, cat: 'postres', etiqueta: '', tags: ['veggie'], desc: 'Papayas al jugo.', foto: '', emoji: '🍑', estado: 'disponible', opciones: [] },
      { id: 'jugo', nombre: 'Jugo natural', precio: 4200, cat: 'jugos', etiqueta: '', tags: ['veggie'], desc: 'Fruta natural.', foto: '1600271886742-f049cd451bba', estado: 'disponible', opciones: [{ grupo: 'Sabor', items: [{ n: 'Piña', p: 0 }, { n: 'Frutilla', p: 0 }, { n: 'Melón', p: 0 }, { n: 'Sandía menta', p: 0 }, { n: 'Limonada piña menta', p: 0 }] }] },
      { id: 'bebida', nombre: 'Bebida, jugo o mineral', precio: 2800, cat: 'jugos', etiqueta: '', tags: ['veggie'], desc: 'Lata o botella individual.', foto: '', emoji: '🥤', estado: 'disponible', opciones: [] },
      { id: 'cafe', nombre: 'Café', precio: 2200, cat: 'jugos', etiqueta: '', tags: ['veggie'], desc: 'Café de grano.', foto: '', emoji: '☕', estado: 'disponible', opciones: [] },
      { id: 'schop-kunstmann', nombre: 'Schop Kunstmann', precio: 5700, cat: 'cervezas', etiqueta: '', tags: [], desc: 'Torobayo de barril.', foto: '', emoji: '🍺', estado: 'disponible', opciones: [SCHOP] },
      { id: 'schop-calafate', nombre: 'Schop Austral Calafate', precio: 5900, cat: 'cervezas', etiqueta: '', tags: [], desc: 'De barril.', foto: '', emoji: '🍺', estado: 'disponible', opciones: [SCHOP] },
      { id: 'pitcher', nombre: 'Pitcher Cristal', precio: 10800, cat: 'cervezas', etiqueta: 'Para compartir', tags: [], desc: 'Para la mesa.', foto: '', emoji: '🍻', estado: 'disponible', opciones: [] },
      { id: 'copa-vino', nombre: 'Copa de vino', precio: 2600, cat: 'vinos', etiqueta: '', tags: [], desc: 'Tinto o blanco de la casa.', foto: '1568044401410-a95b08960705', estado: 'disponible', opciones: [{ grupo: 'Vino', items: [{ n: 'Blanco', p: 0 }, { n: 'Tinto', p: 0 }] }] },
      { id: 'casillero-blanco', nombre: 'Casillero del Diablo blanco 750 cc', precio: 10900, cat: 'vinos', etiqueta: '', tags: [], desc: 'Para acompañar pescados.', foto: '', emoji: '🍷', estado: 'disponible', opciones: [] },
    ],
    // Lista de espera: se atiende en orden de llegada. Saltarse a alguien pide motivo y queda registrado.
    espera: [
      { id: 'w41', numero: 41, nombre: 'Familia Soto', personas: 4, telefono: '+56 9 1234 0041', hora: haceMin(48), estado: 'sentado', mesa: 3, llamado: haceMin(30) },
      { id: 'w42', numero: 42, nombre: 'Andrés', personas: 2, telefono: '+56 9 1234 0042', hora: haceMin(36), estado: 'sentado', mesa: 6, llamado: haceMin(18) },
      { id: 'w43', numero: 43, nombre: 'Carolina', personas: 2, telefono: '+56 9 1234 0043', hora: haceMin(29), estado: 'llamado', mesa: 2, llamado: haceMin(2) },
      { id: 'w44', numero: 44, nombre: 'Familia Rojas', personas: 6, telefono: '+56 9 1234 0044', hora: haceMin(22), estado: 'esperando', mesa: null },
      { id: 'w45', numero: 45, nombre: 'Matías', personas: 2, telefono: '+56 9 1234 0045', hora: haceMin(15), estado: 'esperando', mesa: null },
      { id: 'w46', numero: 46, nombre: 'Javiera', personas: 3, telefono: '+56 9 1234 0046', hora: haceMin(6), estado: 'esperando', mesa: null },
    ],
    mesas: [
      { n: 1, zona: 'terraza', cap: 2, nota: 'Vista al mar', ocupada: true },
      { n: 2, zona: 'terraza', cap: 2, nota: 'Vista al mar', ocupada: false },
      { n: 3, zona: 'terraza', cap: 4, nota: 'Vista al mar', ocupada: true },
      { n: 4, zona: 'terraza', cap: 4, nota: '', ocupada: true },
      { n: 5, zona: 'terraza', cap: 6, nota: 'Mesa larga', ocupada: true },
      { n: 6, zona: 'salon', cap: 2, nota: 'Junto a la ventana', ocupada: true },
      { n: 7, zona: 'salon', cap: 4, nota: '', ocupada: true },
      { n: 8, zona: 'salon', cap: 4, nota: '', ocupada: false },
      { n: 9, zona: 'salon', cap: 6, nota: '', ocupada: true },
      { n: 10, zona: 'salon', cap: 2, nota: 'Junto a la caja', ocupada: true },
    ],
    // Pedidos de las mesas: la cocina los toma en orden de llegada.
    pedidos: [
      { id: 3101, mesa: 1, cliente: 'Mesa 1', items: [{ id: 'paila', nombre: 'Paila marina', precio: 13500, cant: 2, mods: [] }], estado: 'servido', hora: haceMin(41), historial: [{ t: haceMin(41), e: 'recibido' }, { t: haceMin(38), e: 'preparacion' }, { t: haceMin(22), e: 'servido' }] },
      { id: 3102, mesa: 5, cliente: 'Francisca', items: [{ id: 'machas-parm', nombre: 'Machas a la parmesana', precio: 15900, cant: 1, mods: [] }, { id: 'reineta', nombre: 'Reineta', precio: 11900, cant: 3, mods: ['Frito', 'Papas fritas'] }], estado: 'preparacion', hora: haceMin(17), historial: [{ t: haceMin(17), e: 'recibido' }, { t: haceMin(15), e: 'preparacion' }] },
      { id: 3103, mesa: 7, cliente: 'Pedro', items: [{ id: 'emp-marisco', nombre: 'Empanada marisco surtido', precio: 3100, cant: 4, mods: [] }, { id: 'chupe', nombre: 'Chupe de mariscos', precio: 13500, cant: 2, mods: [] }], estado: 'recibido', hora: haceMin(9), historial: [{ t: haceMin(9), e: 'recibido' }] },
      { id: 3104, mesa: 9, cliente: 'Familia Díaz', items: [{ id: 'congrio', nombre: 'Congrio', precio: 13900, cant: 2, mods: ['A la plancha', 'Arroz', 'Sin salsa'] }, { id: 'nuggets-ninos', nombre: 'Nuggets con papas fritas', precio: 7900, cant: 2, mods: [] }], estado: 'recibido', hora: haceMin(5), historial: [{ t: haceMin(5), e: 'recibido' }] },
    ],
    llamadas: [
      { id: 'l1', mesa: 10, tipo: 'cuenta', hora: haceMin(3), atendida: false },
    ],
    evaluaciones: [
      { id: 'e1', mesa: 6, cliente: 'Andrés', nota: 5, texto: 'Llegamos, nos dieron número y nos sentaron justo cuando decía la pantalla.', hora: haceMin(60 * 20), resuelta: true, respuesta: '' },
      { id: 'e2', mesa: 10, cliente: 'Lorena', nota: 2, texto: 'Pedí la cuenta tres veces y en caja nos atendieron de mala gana.', hora: haceMin(60 * 5), resuelta: false, respuesta: '' },
    ],
  };
}

export const ZONAS = {
  terraza: { nombre: 'Terraza', icono: '🌊', texto: 'Frente al mar.' },
  salon: { nombre: 'Salón', icono: '🪟', texto: 'Adentro, con ventanales.' },
};

export const ESTADOS = {
  recibido: { label: 'En la fila de cocina', icono: '🧾', mensaje: 'La cocina prepara los pedidos en orden de llegada.' },
  preparacion: { label: 'Preparándose', icono: '🔥', mensaje: 'La cocina está preparando tu pedido.' },
  servido: { label: 'Servido', icono: '🍽', mensaje: '¡Buen provecho!' },
};
export const ESTADOS_ESPERA = {
  esperando: { label: 'Esperando', icono: '⏳' },
  llamado: { label: '¡Es tu turno!', icono: '🔔' },
  sentado: { label: 'En su mesa', icono: '✓' },
  no_vino: { label: 'No se presentó', icono: '✕' },
};

const CLAVES = Object.keys(semilla());

export function leer(clave) {
  try {
    const v = localStorage.getItem(NS + clave);
    if (v) return JSON.parse(v);
  } catch { /* sin almacenamiento: se usa la semilla */ }
  return semilla()[clave];
}

export function guardar(clave, valor) {
  try { localStorage.setItem(NS + clave, JSON.stringify(valor)); } catch { /* modo privado */ }
}

export function restablecer() {
  try {
    CLAVES.forEach((c) => localStorage.removeItem(NS + c));
    Object.keys(localStorage).filter((k) => k.startsWith(PREF)).forEach((k) => localStorage.removeItem(k));
  } catch { /* nada */ }
}

export function alCambiar(fn) {
  addEventListener('storage', (e) => { if (e.key?.startsWith(NS)) fn(e.key.slice(NS.length)); });
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema || 'arena';
}

export function irA(pantalla, extra = {}) {
  if (window.parent !== window) window.parent.postMessage({ demo: 'ir', pantalla, ...extra }, location.origin);
  else location.href = { carta: 'carta.html', 'admin-carta': 'admin-carta.html', pedidos: `pedidos.html${extra.mesa ? `?mesa=${extra.mesa}` : ''}`, 'admin-pedidos': 'admin-pedidos.html' }[pantalla];
}

export const totalPedido = (p) => p.items.reduce((s, i) => s + i.precio * i.cant, 0);
export const horaCorta = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' }) : '');
export const minDesde = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
export const ahoraHHMM = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// Horario de hoy (con excepciones por fecha) y si la cocina está abierta ahora.
export function horarioHoy(local = leer('local')) {
  const ex = local.excepciones?.find((x) => x.fecha === hoyIso());
  if (ex) return { ...ex, dia: 'Hoy', especial: true };
  const idx = (new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' })).getDay() + 6) % 7;
  return local.horario[idx];
}
export function estadoCocina(local = leer('local')) {
  const h = horarioHoy(local);
  const t = ahoraHHMM();
  if (h.cerrado) return { abierto: false, texto: h.motivo ? `Hoy cerrado · ${h.motivo}` : 'Hoy cerrado', h };
  if (t < h.abre) return { abierto: false, texto: `Abrimos hoy a las ${h.abre}`, h };
  if (t >= h.cierra) return { abierto: false, texto: `Cocina cerrada · hoy fue de ${h.abre} a ${h.cierra}`, h };
  return { abierto: true, texto: `Cocina abierta hasta las ${h.cierra}`, h };
}
// Un producto con hora «desde» solo se pide desde esa hora; uno sin precio no se muestra.
export const fueraDeHora = (p) => !!p.desde && ahoraHHMM() < p.desde;
export const sinPrecio = (p) => !(p.precio > 0);

// Fila de cocina: pedidos aún no servidos, en orden de llegada.
export const filaCocina = () => leer('pedidos').filter((p) => p.estado !== 'servido').sort((a, b) => a.hora.localeCompare(b.hora));
// Lista de espera en orden de llegada y minutos estimados (≈ 8 min por grupo antes que tú).
export const enEspera = () => leer('espera').filter((w) => w.estado === 'esperando').sort((a, b) => a.numero - b.numero);
export const esperaEstimada = (pos) => Math.max(5, pos * 8);
