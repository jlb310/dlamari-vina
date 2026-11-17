// Pantallas 1 (carta + horario único + lista de espera) y 3 (pedido desde la mesa, en orden de llegada).
// El modo viene de <body data-modo>.
import {
  leer, guardar, alCambiar, aplicarTema, fotoUrl, clp, esc, uid, ESTADOS, ESTADOS_ESPERA, DIAS, ZONAS,
  totalPedido, horaCorta, minDesde, estadoCocina, horarioHoy, fueraDeHora, sinPrecio, filaCocina, enEspera, esperaEstimada, PREF, LOGO,
} from './store.js';

const MODO = document.body.dataset.modo; // 'carta' | 'pedidos'
const PIDE = MODO === 'pedidos';
const MESA = Number(new URLSearchParams(location.search).get('mesa')) || 4;
const pref = (k, d) => { try { return localStorage.getItem(PREF + k) ?? d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(PREF + k, v); } catch { /* nada */ } };

let local, categorias, productos;
let filtro = 'todos';
let etiquetaFiltro = '';
let busqueda = '';
let carro = PIDE ? JSON.parse(pref(`carro:${MESA}`, '[]')) : [];

const app = document.getElementById('app');
const aviso = document.getElementById('aviso');
let avisoT;
function avisar(t) { aviso.textContent = t; aviso.classList.add('ver'); clearTimeout(avisoT); avisoT = setTimeout(() => aviso.classList.remove('ver'), 3400); }
const wa = (texto) => `https://wa.me/${esc(local.whatsapp)}?text=${encodeURIComponent(texto)}`;

const ETIQUETAS = [['mar', '🌊 Del mar'], ['veggie', '🌱 Sin carne'], ['picante', '🌶 Picante']];

function cargar() {
  local = leer('local');
  categorias = leer('categorias');
  // Un producto sin precio no se publica: mejor no mostrarlo que mostrar $0.
  productos = leer('productos').filter((p) => p.estado !== 'oculto' && !sinPrecio(p));
  aplicarTema(pref('tema', '') || local.tema);
}

const fotoDe = (p, w) => (p.foto ? `<img loading="lazy" src="${esc(fotoUrl(p.foto, w))}" alt="">` : `<span class="emoji">${esc(p.emoji || '🍽️')}</span>`);
const enCarro = (id) => carro.filter((c) => c.id === id).reduce((s, c) => s + c.cant, 0);
const agotado = (p) => p.estado === 'agotado';
const pedible = (p) => !agotado(p) && !fueraDeHora(p);

function tarjeta(p) {
  const n = enCarro(p.id);
  const ag = agotado(p);
  const tarde = !ag && fueraDeHora(p);
  return `
    <article class="prod${ag ? ' prod--agotado' : ''}${tarde ? ' prod--local' : ''}" data-detalle="${esc(p.id)}" role="button" tabindex="0" aria-label="Ver ${esc(p.nombre)}">
      <div class="prod-foto">${fotoDe(p, 500)}${ag ? '<span class="sello">Agotado hoy</span>' : tarde ? `<span class="sello sello--local">Desde las ${esc(p.desde)}</span>` : ''}</div>
      <div class="prod-texto">
        ${p.etiqueta ? `<span class="etiqueta">${esc(p.etiqueta)}</span>` : ''}
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.desc)}</p>
        <div class="prod-pie"><span class="precio">${clp(p.precio)}</span>
          ${p.opciones?.length && pedible(p) ? '<span class="personaliza" title="Puedes elegir opciones">✎</span>' : ''}
          ${PIDE && pedible(p) ? (n ? `<span class="en-carro" aria-label="${n} en tu pedido">${n}</span>` : `<button class="mas" data-sumar="${esc(p.id)}" aria-label="Agregar ${esc(p.nombre)}">+</button>`) : ''}
        </div>
      </div>
    </article>`;
}

// ---------- Bloques de cabecera ----------
function bloqueHorario() {
  const e = estadoCocina(local);
  return `<button class="estado-local${e.abierto ? '' : ' estado-local--pausa'}" data-accion="info">
    <span>${e.abierto ? '🟢' : '🕐'}</span>
    <div><b>${esc(e.texto)}</b><small>${esc(local.direccion)} · ${esc(local.telefono)}<br>Información verificada por el local el ${new Date(local.revisado).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}. Ver horario de la semana →</small></div>
  </button>`;
}

function miTurno() {
  const id = pref('turno', '');
  return id ? leer('espera').find((w) => w.id === id) : null;
}

function bloqueEspera() {
  const t = miTurno();
  if (t && t.estado !== 'sentado' && t.estado !== 'no_vino') return `<button class="pedido-vivo${t.estado === 'llamado' ? ' pedido-vivo--alerta' : ''}" data-accion="turno">${turnoResumen(t)}</button>`;
  const fila = enEspera();
  return `<div class="cta-reserva">
    <div><b>${fila.length ? `${fila.length} ${fila.length === 1 ? 'grupo esperando' : 'grupos esperando'} · ~${esperaEstimada(fila.length + 1)} min` : 'Hay mesas disponibles'}</b><small>Anótate y te avisamos cuando sea tu turno. Se atiende en orden de llegada.</small></div>
    <button class="boton-acento" data-accion="anotarse">Anotarme</button>
  </div>`;
}

function turnoResumen(t) {
  if (t.estado === 'llamado') return `<span class="vivo-ico">🔔</span><span class="vivo-texto"><b>¡Es tu turno, n.º ${t.numero}!</b><small>Acércate a la entrada: te espera la mesa ${t.mesa}.</small></span><span class="vivo-ir">Ver →</span>`;
  const pos = enEspera().findIndex((w) => w.id === t.id) + 1;
  return `<span class="vivo-ico">⏳</span><span class="vivo-texto"><b>Tu número: ${t.numero} · ${pos === 1 ? 'eres el siguiente' : `${pos - 1} antes que tú`}</b><small>Espera estimada ~${esperaEstimada(pos)} min. Te avisamos aquí y por WhatsApp.</small></span><span class="vivo-ir">Ver →</span>`;
}

function misPedidos() {
  return leer('pedidos').filter((p) => p.mesa === MESA && !p.cerrado).sort((a, b) => b.id - a.id);
}

function bloqueMesa() {
  const llamadas = leer('llamadas').filter((l) => l.mesa === MESA && !l.atendida);
  const garzon = llamadas.some((l) => l.tipo === 'garzon');
  const cuenta = llamadas.some((l) => l.tipo === 'cuenta');
  const activos = misPedidos().filter((p) => p.estado !== 'servido');
  return `
    ${activos.length ? `<button class="pedido-vivo" data-accion="seguimiento">${vivoPedido(activos.at(-1))}</button>` : ''}
    <div class="mesa">
      <div class="mesa-texto"><b>Mesa ${MESA} · pide desde aquí</b><small>Tu pedido entra a la fila de la cocina en orden de llegada. Ves cuántos hay antes del tuyo.</small></div>
      <div class="mesa-botones">
        <button class="boton-chip${garzon ? ' llamado' : ''}" data-accion="garzon">${garzon ? '🔔 Viene en camino' : '🔔 Llamar garzón'}</button>
        <button class="boton-chip${cuenta ? ' llamado' : ''}" data-accion="cuenta">${cuenta ? '🧾 Cuenta pedida' : '🧾 Pedir la cuenta'}</button>
      </div>
    </div>`;
}

function vivoPedido(p) {
  const fila = filaCocina();
  const pos = fila.findIndex((x) => x.id === p.id);
  const linea = p.estado === 'preparacion' ? 'La cocina lo está preparando' : pos <= 0 ? 'Eres el siguiente en la cocina' : `${pos} ${pos === 1 ? 'pedido' : 'pedidos'} antes que el tuyo`;
  return `<span class="vivo-ico">${ESTADOS[p.estado].icono}</span><span class="vivo-texto"><b>Pedido ${p.id} · ${ESTADOS[p.estado].label}</b><small>${linea}</small></span><span class="vivo-ir">Ver →</span>`;
}

function render() {
  const q = busqueda.trim().toLowerCase();
  const coincide = (p) => (!q || `${p.nombre} ${p.desc} ${p.etiqueta}`.toLowerCase().includes(q)) && (!etiquetaFiltro || p.tags?.includes(etiquetaFiltro));
  const ordenar = (l) => [...l].sort((a, b) => !pedible(a) - !pedible(b));
  const destacados = productos.filter((p) => p.etiqueta && pedible(p) && coincide(p));
  const grupos = [
    ...(filtro === 'todos' ? [{ id: 'destacados', nombre: 'Los de siempre', items: destacados }] : []),
    ...categorias.filter((c) => filtro === 'todos' || filtro === c.id).map((c) => ({ ...c, items: ordenar(productos.filter((p) => p.cat === c.id && coincide(p))) })),
  ].filter((g) => g.items.length);
  const cuenta = carro.reduce((s, c) => s + c.cant, 0);
  const agotados = productos.filter(agotado).length;

  document.body.classList.toggle('sin-carro', !cuenta);
  app.innerHTML = `
    <header class="top">
      ${LOGO}
      <span class="abierto" id="abierto"></span>
      <button class="icono" data-accion="info" aria-label="Información del local">i</button>
    </header>
    <section class="portada">
      <img src="${fotoUrl(PIDE ? '1765100479761-2359e22fbe16' : '1779919025347-2993d994c506', 900)}" alt="">
      <div class="portada-texto">
        <span class="pill">${PIDE ? `Mesa ${MESA}` : 'Carta digital · Playa Cochoa'}</span>
        <h1>${PIDE ? 'Pide sin esperar al garzón' : esc(local.titulo)}</h1>
        <p>${PIDE ? 'Tu pedido entra a la cocina en orden de llegada y lo sigues desde aquí.' : esc(local.frase)}</p>
      </div>
    </section>
    ${PIDE ? bloqueMesa() : bloqueHorario() + bloqueEspera()}
    <div class="acciones">
      <a class="red" href="tel:${esc(local.telefono.replace(/\s/g, ''))}" aria-label="Llamar">☎</a>
      <a class="red" href="https://wa.me/${esc(local.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">WA</a>
      <a class="red" href="${esc(local.sitio)}" target="_blank" rel="noopener" aria-label="Sitio web">↗</a>
      <span class="espacio"></span>
      ${PIDE && misPedidos().length ? '<button class="chip-accion" data-accion="seguimiento">🧾 Mis pedidos</button>' : ''}
      <button class="chip-accion" data-accion="tema">${document.documentElement.dataset.tema === 'mar' ? '☀ Arena' : '☾ Mar'}</button>
    </div>
    <div class="pegajoso">
      <label class="buscar"><span aria-hidden="true">⌕</span><input type="search" id="buscar" placeholder="Buscar: macha, reineta, paila…" value="${esc(busqueda)}" aria-label="Buscar en la carta"></label>
      <div class="chips" aria-label="Categorías">
        <button class="chip${filtro === 'todos' ? ' activa' : ''}" data-filtro="todos">Todo</button>
        ${categorias.map((c) => `<button class="chip${filtro === c.id ? ' activa' : ''}" data-filtro="${esc(c.id)}">${esc(c.icono)} ${esc(c.nombre)}</button>`).join('')}
      </div>
      <div class="chips chips--tags" aria-label="Filtros">
        ${ETIQUETAS.map(([id, n]) => `<button class="tag${etiquetaFiltro === id ? ' activa' : ''}" data-tag="${id}" aria-pressed="${etiquetaFiltro === id}">${n}</button>`).join('')}
      </div>
    </div>
    ${agotados && filtro === 'todos' && !q && !etiquetaFiltro ? `<p class="aviso-agotados">Hoy ${agotados === 1 ? 'hay 1 producto agotado' : `hay ${agotados} productos agotados`}: los marcamos para que no te lleves sorpresas.</p>` : ''}
    ${grupos.length ? grupos.map((g) => `
      <section class="seccion">
        <div class="seccion-cab"><h2>${esc(g.nombre)}</h2><span>${g.items.length}</span></div>
        ${g.nota ? `<p class="nota-cat">${esc(g.nota)}</p>` : ''}
        <div class="grilla">${g.items.map(tarjeta).join('')}</div>
      </section>`).join('') : '<p class="vacio">No encontramos productos con ese filtro.</p>'}
    <div class="ayuda-pie">
      <b>¿Una consulta?</b>
      <p>Escríbenos por WhatsApp al ${esc(local.telefono)}. Es el mismo número en la web, en Google y aquí.</p>
      <a class="boton-linea" href="${wa(`Hola ${local.nombre}, tengo una consulta:`)}" target="_blank" rel="noopener">💬 Escribir por WhatsApp</a>
    </div>
    <p class="pie">${esc(local.direccion)} · ${esc(local.email)}<br>Carta digital por <a href="https://spacehost.cl" target="_blank" rel="noopener">Spacehost</a></p>
    ${PIDE ? `<div class="barra-carro${cuenta ? ' ver' : ''}"><span><span class="cuenta">${cuenta}</span>${clp(subtotal())}</span><button class="ir" data-accion="carro">Ver pedido</button></div>` : ''}
  `;
  pintarAbierto();
}

function pintarAbierto() {
  const el = document.getElementById('abierto');
  if (!el) return;
  const e = estadoCocina(local);
  el.className = `abierto${e.abierto ? ' si' : ''}`;
  el.textContent = e.abierto ? 'Abierto' : 'Cerrado';
}

// ---------- Hojas ----------
function abrirHoja(html) {
  let d = document.getElementById('hoja');
  if (!d) { d = document.createElement('dialog'); d.id = 'hoja'; d.className = 'hoja'; document.body.append(d); }
  d.innerHTML = html;
  if (!d.open) d.showModal();
  d.onclick = null; d.oninput = null; d.onchange = null; d.onsubmit = null;
  return d;
}
const cerrarSi = (e, d) => { if (e.target === d || e.target.closest('[data-cerrar]')) { d.close(); return true; } return false; };
const CAB = (titulo) => `<div class="hoja-cab"><h2>${titulo}</h2><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>`;

// ---------- Detalle de producto ----------
function detalle(id) {
  const p = productos.find((x) => x.id === id);
  if (!p) return;
  let cant = 1;
  const sel = (p.opciones || []).map((g) => (g.multi ? new Set() : 0));
  const extra = () => (p.opciones || []).reduce((s, g, i) => s + (g.multi ? [...sel[i]].reduce((a, k) => a + g.items[k].p, 0) : g.items[sel[i]].p), 0);
  const mods = () => (p.opciones || []).flatMap((g, i) => (g.multi ? [...sel[i]].map((k) => g.items[k].n) : (g.items.length > 1 ? [g.items[sel[i]].n] : [])));
  const unitario = () => p.precio + extra();
  const ag = agotado(p);
  const tarde = !ag && fueraDeHora(p);

  const pintar = () => {
    const d = abrirHoja(`
      <button class="cerrar cerrar--flotante" data-cerrar aria-label="Cerrar">×</button>
      <div class="hoja-cuerpo">
        <div class="detalle-foto">${fotoDe(p, 900)}</div>
        <div class="detalle-cuerpo">
          ${p.etiqueta ? `<span class="etiqueta">${esc(p.etiqueta)}</span>` : ''}
          <h2>${esc(p.nombre)}</h2>
          <p>${esc(p.desc)}</p>
        </div>
        ${ag ? `<div class="explica explica--agotado"><b>Agotado hoy</b><span>${esc(p.motivoAgotado || 'No está disponible en este momento.')}</span></div>` : ''}
        ${tarde ? `<div class="explica"><b>Se sirve desde las ${esc(p.desde)}</b><span>Antes de esa hora la cocina está con los platos de almuerzo.</span></div>` : ''}
        ${pedible(p) ? (p.opciones || []).map((g, i) => `
          <fieldset class="grupo">
            <legend>${esc(g.grupo)}<small>${g.multi ? 'Elige las que quieras' : 'Elige una'}</small></legend>
            ${g.items.map((o, k) => {
              const on = g.multi ? sel[i].has(k) : sel[i] === k;
              return `<button type="button" class="opcion${on ? ' on' : ''}" data-op="${i}:${k}" aria-pressed="${on}"><span class="marca-op ${g.multi ? 'cuadro' : 'radio'}"></span><span>${esc(o.n)}</span><b>${o.p ? (o.p > 0 ? '+' : '') + clp(o.p) : ''}</b></button>`;
            }).join('')}
          </fieldset>`).join('') : ''}
        ${PIDE && pedible(p) ? `
          <div class="fila-total"><span class="precio" style="font-size:22px">${clp(unitario())}</span>
            <span class="cantidad"><button data-cant="-1" aria-label="Quitar uno">−</button><span>${cant}</span><button data-cant="1" aria-label="Agregar uno">+</button></span>
          </div>
          <button class="boton-primario" data-agregar>Agregar · ${clp(unitario() * cant)}</button>`
        : `<div class="fila-total"><span class="precio" style="font-size:22px">${clp(unitario())}</span></div>
           <button class="boton-primario boton-primario--linea" data-cerrar>Volver a la carta</button>`}
      </div>`);
    d.onclick = (e) => {
      if (cerrarSi(e, d)) return;
      const op = e.target.closest('[data-op]');
      if (op) {
        const [i, k] = op.dataset.op.split(':').map(Number);
        if (p.opciones[i].multi) { sel[i].has(k) ? sel[i].delete(k) : sel[i].add(k); } else sel[i] = k;
        const y = d.scrollTop; pintar(); d.scrollTop = y; return;
      }
      const c = e.target.closest('[data-cant]');
      if (c) { cant = Math.max(1, cant + Number(c.dataset.cant)); const y = d.scrollTop; pintar(); d.scrollTop = y; return; }
      if (e.target.closest('[data-agregar]')) { sumar(p, cant, mods(), unitario()); d.close(); }
    };
  };
  pintar();
}

// ---------- Carrito (pantalla 3) ----------
const subtotal = () => carro.reduce((s, c) => s + c.precio * c.cant, 0);
function guardarCarro() { setPref(`carro:${MESA}`, JSON.stringify(carro)); }

function sumar(p, cant = 1, mods = [], precio = p.precio) {
  const key = `${p.id}|${mods.join('|')}`;
  const c = carro.find((x) => x.key === key);
  if (c) c.cant += cant; else carro.push({ key, id: p.id, nombre: p.nombre, precio, cant, mods });
  guardarCarro(); render(); avisar(`${cant} × ${p.nombre} agregado`);
}

function sumarRapido(id) {
  const p = productos.find((x) => x.id === id);
  if (p.opciones?.some((g) => !g.multi && g.items.length > 1)) return detalle(id);
  sumar(p);
}

function hojaCarro() {
  const antes = filaCocina().length;
  const d = abrirHoja(`
    ${CAB(`Tu pedido · mesa ${MESA}`)}
    <form class="hoja-cuerpo">
      <div>${carro.map((c, i) => `
        <div class="linea"><div><b>${esc(c.nombre)}</b>${c.mods?.length ? `<br><small class="mods">${c.mods.map(esc).join(' · ')}</small>` : ''}<br><small>${clp(c.precio)} c/u</small></div>
          <span class="cantidad"><button type="button" data-item="${i}" data-cant="-1" aria-label="Quitar uno">−</button><span>${c.cant}</span><button type="button" data-item="${i}" data-cant="1" aria-label="Agregar uno">+</button></span></div>`).join('')}</div>
      <label class="campo">Tu nombre<input id="cliente" class="entrada" value="${esc(pref('cliente', ''))}" autocomplete="given-name" required></label>
      <label class="campo">Nota para la cocina<textarea id="nota" rows="2" placeholder="Ej.: la paila sin cilantro, traer todo junto">${esc(pref('nota', ''))}</textarea></label>
      <div class="totales"><div class="fila-total total"><span>Total</span><span>${clp(subtotal())}</span></div></div>
      <div class="promesa"><b>Orden de llegada</b>
        <span>Ahora hay ${antes} ${antes === 1 ? 'pedido' : 'pedidos'} en la cocina. El tuyo entra después de ${antes === 1 ? 'ese' : 'esos'} y lo ves avanzar en tu celular.</span>
        <span>Los bebestibles salen directo de la barra, sin esperar la fila.</span>
      </div>
      <button class="boton-primario">Enviar a la cocina · ${clp(subtotal())}</button>
    </form>`);
  d.onclick = (e) => {
    if (cerrarSi(e, d)) return;
    const it = e.target.closest('[data-item]');
    if (it) {
      carro[Number(it.dataset.item)].cant += Number(it.dataset.cant);
      carro = carro.filter((x) => x.cant > 0);
      guardarCarro(); render();
      if (!carro.length) return d.close();
      return hojaCarro();
    }
  };
  d.oninput = (e) => { if (['cliente', 'nota'].includes(e.target.id)) setPref(e.target.id, e.target.value); };
  d.onsubmit = (e) => {
    e.preventDefault();
    const pedidos = leer('pedidos');
    const id = Math.max(3100, ...pedidos.map((p) => p.id)) + 1;
    const ahora = new Date().toISOString();
    pedidos.push({ id, mesa: MESA, cliente: d.querySelector('#cliente').value.trim(), nota: d.querySelector('#nota').value.trim(), items: carro.map(({ id: pid, nombre, precio, cant, mods }) => ({ id: pid, nombre, precio, cant, mods })), estado: 'recibido', hora: ahora, historial: [{ t: ahora, e: 'recibido' }] });
    guardar('pedidos', pedidos);
    carro = []; guardarCarro(); setPref('nota', '');
    render(); seguimiento();
    avisar(`Pedido ${id} enviado a la cocina`);
  };
}

// ---------- Seguimiento del pedido ----------
const TEXTO_HIST = { recibido: 'Entró a la fila de la cocina.', preparacion: 'La cocina empezó tu pedido.', servido: 'Servido en tu mesa.' };
function seguimiento() {
  const lista = misPedidos();
  const fila = filaCocina();
  const d = abrirHoja(`
    ${CAB(`Pedidos de la mesa ${MESA}`)}
    <div class="hoja-cuerpo" id="seguimiento">
      ${lista.map((p) => {
        const pos = fila.findIndex((x) => x.id === p.id);
        const e = ESTADOS[p.estado];
        const paso = ['recibido', 'preparacion', 'servido'].indexOf(p.estado);
        return `<div class="seguimiento seguimiento--grande">
          <div class="seguimiento-cab"><b>Pedido ${p.id}</b><span class="estado estado--${p.estado}">${e.icono} ${e.label}</span></div>
          <div class="pasos pasos--3">${[0, 1, 2].map((i) => `<i class="${i <= paso ? 'hecho' : ''}"></i>`).join('')}</div>
          ${p.estado === 'recibido' ? `<div class="eta"><small>Tu lugar en la cocina</small><b>${pos <= 0 ? 'Siguiente' : `${pos} antes`}</b><small>${pos <= 0 ? 'Es el próximo que empieza la cocina.' : `Hay ${pos} ${pos === 1 ? 'pedido' : 'pedidos'} que llegaron antes que el tuyo.`}</small></div>` : ''}
          <ol class="historial">${[...p.historial].reverse().map((h) => `<li><span>${ESTADOS[h.e]?.icono || '•'}</span><p>${esc(h.texto || TEXTO_HIST[h.e] || '')}<small>${horaCorta(h.t)}</small></p></li>`).join('')}</ol>
          <small>${p.items.map((i) => `${i.cant} × ${esc(i.nombre)}${i.mods?.length ? ` (${i.mods.map(esc).join(', ')})` : ''}`).join(' · ')}</small>
          <div class="fila-total"><small class="tenue">Total</small><b>${clp(totalPedido(p))}</b></div>
        </div>`;
      }).join('') || '<p class="vacio">Todavía no hay pedidos de esta mesa.</p>'}
      <p class="nota-envio">Se actualiza solo cuando la cocina avanza.</p>
    </div>`);
  d.onclick = (e) => cerrarSi(e, d);
}

// ---------- Garzón, cuenta y evaluación ----------
function llamar(tipo) {
  const llamadas = leer('llamadas');
  if (llamadas.some((l) => l.mesa === MESA && l.tipo === tipo && !l.atendida)) return avisar(tipo === 'cuenta' ? 'Ya pediste la cuenta, viene en camino' : 'Ya avisamos, viene en camino');
  llamadas.push({ id: uid(), mesa: MESA, tipo, hora: new Date().toISOString(), atendida: false });
  guardar('llamadas', llamadas);
  render();
  if (tipo === 'cuenta') evaluar(); else avisar('Listo, avisamos al garzón de tu mesa');
}

function evaluar() {
  const d = abrirHoja(`
    ${CAB('Cuenta pedida')}
    <form class="hoja-cuerpo">
      <div class="listo"><span>🧾</span><h3>Te la llevamos a la mesa ${MESA}</h3><p>Mientras tanto, ¿cómo te atendimos hoy?</p></div>
      <div class="evaluacion"><b>Tu evaluación (solo la ve el encargado)</b>
        <div class="estrellas" role="radiogroup" aria-label="Nota">${[5, 4, 3, 2, 1].map((n) => `<label><input type="radio" name="nota" value="${n}" required><span aria-label="${n} estrellas">★</span></label>`).join('')}</div>
        <textarea name="texto" rows="2" class="entrada" placeholder="¿Algo que debamos mejorar? (opcional)"></textarea>
      </div>
      <button class="boton-primario">Enviar evaluación</button>
      <button type="button" class="boton-primario boton-primario--linea" data-cerrar>Ahora no</button>
    </form>`);
  d.onclick = (e) => cerrarSi(e, d);
  d.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nota = Number(f.get('nota'));
    if (!nota) return;
    guardar('evaluaciones', [{ id: uid(), mesa: MESA, cliente: pref('cliente', '') || `Mesa ${MESA}`, nota, texto: String(f.get('texto') || '').trim(), hora: new Date().toISOString(), resuelta: nota >= 4, respuesta: '' }, ...leer('evaluaciones')]);
    abrirHoja(`${CAB('¡Gracias!')}<div class="hoja-cuerpo"><div class="evaluacion">${nota >= 4
      ? `<p>Nos alegra. Si tienes un minuto, contarlo en Google nos ayuda mucho.</p><a class="boton-primario boton-primario--linea" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("D'lamari Viña del Mar")}" target="_blank" rel="noopener">Dejar reseña en Google ↗</a>`
      : '<p>Gracias por decírnoslo. Tu comentario le llegó directo al encargado, que te va a contactar para solucionarlo.</p>'}</div>
      <button class="boton-primario boton-primario--linea" data-cerrar>Cerrar</button></div>`).onclick = (ev) => cerrarSi(ev, document.getElementById('hoja'));
  };
}

// ---------- Lista de espera (pantalla 1) ----------
function anotarse() {
  const f = { nombre: pref('w-nombre', ''), personas: 2, telefono: pref('w-telefono', '') };
  const pintar = () => {
    const fila = enEspera();
    const d = abrirHoja(`
      ${CAB('Lista de espera')}
      <form class="hoja-cuerpo">
        <p class="intro">Hay ${fila.length} ${fila.length === 1 ? 'grupo' : 'grupos'} antes que tú. Espera estimada ~${esperaEstimada(fila.length + 1)} min. Se atiende <b>en orden de llegada</b>: si alguien pasa antes, el local tiene que registrar el motivo.</p>
        <label class="campo">Nombre<input id="w-nombre" class="entrada" value="${esc(f.nombre)}" required autocomplete="name"></label>
        <div class="campo fila-total">¿Cuántos son?<span class="cantidad"><button type="button" data-personas="-1" aria-label="Menos">−</button><span>${f.personas}</span><button type="button" data-personas="1" aria-label="Más">+</button></span></div>
        <label class="campo">WhatsApp <small class="tenue">Para avisarte cuando sea tu turno</small><input id="w-telefono" class="entrada" value="${esc(f.telefono)}" inputmode="tel" autocomplete="tel" placeholder="+56 9 …" required></label>
        <button class="boton-primario">Tomar número</button>
        <p class="nota-envio">Puedes esperar en la playa: te avisamos aquí y por WhatsApp.</p>
      </form>`);
    d.onclick = (e) => {
      if (cerrarSi(e, d)) return;
      const t = e.target.closest('[data-personas]');
      if (t) { f.personas = Math.min(12, Math.max(1, f.personas + Number(t.dataset.personas))); pintar(); }
    };
    d.oninput = (e) => { if (e.target.id === 'w-nombre') f.nombre = e.target.value; if (e.target.id === 'w-telefono') f.telefono = e.target.value; };
    d.onsubmit = (e) => {
      e.preventDefault();
      setPref('w-nombre', f.nombre); setPref('w-telefono', f.telefono);
      const lista = leer('espera');
      const numero = Math.max(40, ...lista.map((w) => w.numero)) + 1;
      const w = { id: uid(), numero, nombre: f.nombre.trim(), personas: f.personas, telefono: f.telefono.trim(), hora: new Date().toISOString(), estado: 'esperando', mesa: null };
      guardar('espera', [...lista, w]);
      setPref('turno', w.id);
      render(); turno();
      avisar(`Tienes el número ${numero}`);
    };
  };
  pintar();
}

function turno() {
  const t = miTurno();
  if (!t) return anotarse();
  const fila = enEspera();
  const pos = fila.findIndex((w) => w.id === t.id) + 1;
  const e = ESTADOS_ESPERA[t.estado];
  const d = abrirHoja(`
    ${CAB('Tu número')}
    <div class="hoja-cuerpo" id="turno">
      <div class="ticket${t.estado === 'llamado' ? ' ticket--llamado' : ''}">
        <small>${esc(t.nombre)} · ${t.personas} ${t.personas === 1 ? 'persona' : 'personas'}</small>
        <b>${t.numero}</b>
        <span class="estado estado--${t.estado === 'llamado' ? 'servido' : 'recibido'}">${e.icono} ${e.label}</span>
      </div>
      ${t.estado === 'esperando' ? `<div class="eta"><small>${pos === 1 ? 'Eres el siguiente' : `${pos - 1} ${pos - 1 === 1 ? 'grupo' : 'grupos'} antes que tú`}</small><b>~${esperaEstimada(pos)} min</b><small>Se atiende en orden de llegada.</small></div>
        <ol class="fila-espera">${fila.map((w) => `<li class="${w.id === t.id ? 'yo' : ''}"><b>${w.numero}</b><span>${w.id === t.id ? 'Tú' : `${w.personas} pers.`}</span></li>`).join('')}</ol>` : ''}
      ${t.estado === 'llamado' ? `<div class="problema"><b>Mesa ${t.mesa} lista para ustedes</b><p>Acércate a la entrada. La guardamos 10 minutos.</p></div>` : ''}
      ${t.estado === 'sentado' ? '<p class="intro">Ya estás en tu mesa. ¡Buen provecho!</p>' : ''}
      ${t.estado === 'esperando' ? '<button class="enlace" data-salir>Ya no voy a esperar</button>' : ''}
    </div>`);
  d.onclick = (ev) => {
    if (cerrarSi(ev, d)) return;
    if (ev.target.closest('[data-salir]') && confirm('¿Salir de la lista de espera?')) {
      guardar('espera', leer('espera').map((w) => (w.id === t.id ? { ...w, estado: 'no_vino', motivo: 'El cliente salió de la lista' } : w)));
      setPref('turno', '');
      d.close(); render();
    }
  };
}

// ---------- Información del local (una sola fuente) ----------
function info() {
  const hoy = horarioHoy(local);
  const d = abrirHoja(`
    ${CAB(esc(local.nombre))}
    <div class="hoja-cuerpo"><div class="info-lista">
      <div><span>📍</span><p><small>Dirección</small>${esc(local.direccion)}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.direccion)}" target="_blank" rel="noopener">Abrir en Google Maps ↗</a></p></div>
      <div><span>☎</span><p><small>Teléfono y WhatsApp</small><a href="tel:${esc(local.telefono.replace(/\s/g, ''))}">${esc(local.telefono)}</a></p></div>
      <div><span>✉</span><p><small>Correo</small>${esc(local.email)}</p></div>
      <div><span>🕐</span><p><small>Horario de cocina</small>
        <span class="semana">${local.horario.map((h, i) => `<span class="${DIAS[i] === hoy.dia ? 'hoy' : ''}"><b>${h.dia}</b>${h.cerrado ? 'Cerrado' : `${h.abre} – ${h.cierra}`}</span>`).join('')}</span>
        ${(local.excepciones || []).map((x) => `<span class="excepcion">${new Date(`${x.fecha}T12:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}: ${x.cerrado ? 'cerrado' : `${x.abre} – ${x.cierra}`}${x.motivo ? ` (${esc(x.motivo)})` : ''}</span>`).join('')}
      </p></div>
    </div>
    <p class="nota-envio">Estos datos son los mismos en la web, la carta y Google. Revisados por el local el ${new Date(local.revisado).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}.</p></div>`);
  d.onclick = (e) => cerrarSi(e, d);
}

// ---------- Eventos ----------
app.addEventListener('click', (e) => {
  const sumarB = e.target.closest('[data-sumar]');
  if (sumarB) { e.stopPropagation(); return sumarRapido(sumarB.dataset.sumar); }
  const f = e.target.closest('[data-filtro]');
  if (f) { filtro = f.dataset.filtro; return render(); }
  const tg = e.target.closest('[data-tag]');
  if (tg) { etiquetaFiltro = etiquetaFiltro === tg.dataset.tag ? '' : tg.dataset.tag; return render(); }
  const a = e.target.closest('[data-accion]')?.dataset.accion;
  if (a === 'info') return info();
  if (a === 'tema') { setPref('tema', document.documentElement.dataset.tema === 'mar' ? 'arena' : 'mar'); cargar(); return render(); }
  if (a === 'carro') return hojaCarro();
  if (a === 'seguimiento') return seguimiento();
  if (a === 'garzon') return llamar('garzon');
  if (a === 'cuenta') return llamar('cuenta');
  if (a === 'anotarse') return anotarse();
  if (a === 'turno') return turno();
  const det = e.target.closest('[data-detalle]');
  if (det) detalle(det.dataset.detalle);
});
app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-detalle]')) detalle(e.target.dataset.detalle); });
app.addEventListener('input', (e) => {
  if (e.target.id !== 'buscar') return;
  busqueda = e.target.value;
  const pos = e.target.selectionStart;
  render();
  const b = document.getElementById('buscar'); b.focus(); b.setSelectionRange(pos, pos);
});

// Cambios del administrador (otra pantalla) se ven al tiro.
const firmaTurno = () => { const t = miTurno(); return t ? `${t.estado}|${enEspera().findIndex((w) => w.id === t.id)}` : ''; };
const firmaPedidos = () => { const fila = filaCocina(); return misPedidos().map((p) => `${p.id}:${p.estado}:${fila.findIndex((x) => x.id === p.id)}`).join(','); };
let antesTurno = firmaTurno();
let antesPedidos = firmaPedidos();
alCambiar((clave) => {
  cargar();
  carro = carro.filter((c) => productos.some((p) => p.id === c.id && pedible(p)));
  guardarCarro();
  const hoja = document.getElementById('hoja');
  if (!PIDE && clave === 'espera') {
    const t = miTurno();
    const ahora = firmaTurno();
    if (t && ahora !== antesTurno && t.estado !== 'sentado') avisar(t.estado === 'llamado' ? `🔔 ¡Es tu turno! Mesa ${t.mesa}` : 'La fila avanzó');
    antesTurno = ahora;
    if (hoja?.open && hoja.querySelector('#turno')) turno();
  }
  if (PIDE && clave === 'pedidos') {
    const ahora = firmaPedidos();
    if (ahora !== antesPedidos) {
      const p = misPedidos().find((x) => !antesPedidos.includes(`${x.id}:${x.estado}`));
      if (p) avisar(`${ESTADOS[p.estado].icono} Pedido ${p.id}: ${ESTADOS[p.estado].label}`);
      else avisar('La fila de la cocina avanzó');
    }
    antesPedidos = ahora;
    if (hoja?.open && hoja.querySelector('#seguimiento')) seguimiento();
  }
  if (!(hoja?.open && hoja.querySelector('form'))) render();
});
setInterval(() => { pintarAbierto(); }, 30000);

cargar();
render();
