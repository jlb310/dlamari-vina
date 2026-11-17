// Pantalla 4: administrador del salón. Lista de espera, fila de cocina, mesas y llamadas, evaluaciones.
// La regla de fondo: se atiende en orden de llegada. Saltarse a alguien se puede, pero pide motivo y queda registrado.
import {
  leer, guardar, alCambiar, clp, esc, uid, ESTADOS, ZONAS, totalPedido, horaCorta, minDesde, filaCocina, enEspera, esperaEstimada, irA, PREF,
} from './store.js';
import { crearAdmin, modal, qrSvg, urlDe, toast } from './admin-base.js';

const hace = (iso) => { const m = minDesde(iso); return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h`; };
const elegida = {}; // mesa elegida para cada grupo en espera
const esBebestible = (p) => {
  const cats = Object.fromEntries(leer('categorias').map((c) => [c.id, c]));
  const prods = Object.fromEntries(leer('productos').map((x) => [x.id, x]));
  return p.items.every((i) => cats[prods[i.id]?.cat]?.bebestible);
};

const admin = crearAdmin({
  plan: 'Plan salón',
  verCarta: 'carta',
  pestanas: [
    { id: 'espera', nombre: 'Lista de espera', icono: '⏳' },
    { id: 'cocina', nombre: 'Fila de cocina', icono: '🔥' },
    { id: 'mesas', nombre: 'Mesas y llamadas', icono: '🔔' },
    { id: 'evaluaciones', nombre: 'Evaluaciones', icono: '★' },
  ],
  badges: () => ({
    espera: enEspera().length,
    cocina: leer('pedidos').filter((p) => p.estado === 'recibido').length,
    mesas: leer('llamadas').filter((l) => !l.atendida).length,
    evaluaciones: leer('evaluaciones').filter((e) => !e.resuelta).length,
  }),
  pintar(id, el) { VISTAS[id](el); },
});

const MOTIVOS_SALTO = ['La mesa libre es para 2 y el grupo siguiente es más grande.', 'Persona mayor o con movilidad reducida.', 'Tenía reserva confirmada.'];
const MOTIVOS_COCINA = ['Es un plato frío que sale en un minuto.', 'Es para un niño.', 'Se le cayó el plato y lo estamos reponiendo.'];

const VISTAS = {
  espera(el) {
    const fila = enEspera();
    const lista = leer('espera');
    const llamados = lista.filter((w) => w.estado === 'llamado');
    const libres = leer('mesas').filter((m) => !m.ocupada && !llamados.some((w) => w.mesa === m.n));
    const saltos = lista.filter((w) => w.salto);
    el.innerHTML = `
      <div class="cab"><div><h1>Lista de espera</h1><p>Cada grupo toma número al llegar y ve su lugar en el celular. El sistema llama al siguiente; si alguien pasa antes, queda registrado el motivo.</p></div>
        <div class="filtros"><button class="boton boton--linea" data-probar>Tomar número de prueba ↗</button><button class="boton" data-agregar>+ Anotar en la puerta</button></div></div>
      <div class="numeros">
        <div class="numero"><b>${fila.length}</b><span>Grupos esperando</span></div>
        <div class="numero"><b>~${fila.length ? esperaEstimada(fila.length) : 0} min</b><span>Espera para el último</span></div>
        <div class="numero"><b>${libres.length}</b><span>Mesas libres</span></div>
        <div class="numero${saltos.length ? ' numero--mal' : ''}"><b>${saltos.length}</b><span>Saltos de orden hoy</span></div>
      </div>
      ${llamados.length ? `<h2>Llamados: deben acercarse a la entrada</h2>${llamados.map((w) => `
        <article class="tarjeta tarjeta--pendiente">
          <div class="tarjeta-cab"><div><b style="font-size:18px">N.º ${w.numero} · ${esc(w.nombre)} · ${w.personas} pers.</b><small>Llamado ${hace(w.llamado)} a la mesa ${w.mesa}${minDesde(w.llamado) >= 10 ? ' · <span class="alerta-mesa">pasaron 10 min</span>' : ''}</small></div>
            <div class="filtros"><button class="boton boton--acento" data-sentar="${w.id}">✓ Ya se sentó</button><button class="boton boton--linea" data-novino="${w.id}">No llegó</button></div></div>
        </article>`).join('')}` : ''}
      <h2>En orden de llegada</h2>
      ${fila.length ? `<div class="fila-adm">${fila.map((w, i) => grupoHtml(w, i, libres)).join('')}</div>` : '<div class="panel vacio">Nadie esperando. 🌊</div>'}
      ${saltos.length ? `<h2>Registro de saltos</h2><div class="panel"><div class="lista">${saltos.map((w) => `<div class="fila" style="grid-template-columns:auto 1fr"><div class="mini">↷</div><div><b>N.º ${w.numero} pasó antes que n.º ${w.salto.antesDe}</b><small>${esc(w.salto.motivo)} · ${horaCorta(w.salto.hora)}</small></div></div>`).join('')}</div></div>` : ''}`;
  },

  cocina(el) {
    const fila = filaCocina();
    const primero = fila.find((p) => p.estado === 'recibido' && !esBebestible(p));
    const servidos = leer('pedidos').filter((p) => p.estado === 'servido').sort((a, b) => b.id - a.id);
    const prom = servidos.length ? Math.round(servidos.reduce((s, p) => s + (new Date(p.historial.find((h) => h.e === 'servido')?.t || p.hora) - new Date(p.hora)) / 60000, 0) / servidos.length) : 0;
    el.innerHTML = `
      <div class="cab"><div><h1>Fila de cocina</h1><p>Los pedidos de las mesas entran en orden de llegada. La cocina empieza siempre el más antiguo; los bebestibles salen directo de la barra.</p></div>
        <button class="boton boton--linea" data-probar-mesa>Pedir desde una mesa ↗</button></div>
      <div class="numeros">
        <div class="numero"><b>${fila.filter((p) => p.estado === 'recibido').length}</b><span>En la fila</span></div>
        <div class="numero"><b>${fila.filter((p) => p.estado === 'preparacion').length}</b><span>Preparándose</span></div>
        <div class="numero"><b>${prom} min</b><span>Tiempo promedio hasta servir</span></div>
      </div>
      ${fila.length ? `<div class="fila-adm">${fila.map((p, i) => pedidoHtml(p, i, primero)).join('')}</div>` : '<div class="panel vacio">La cocina está al día.</div>'}
      ${servidos.length ? `<h2>Servidos</h2><div class="panel"><div class="lista">${servidos.map((p) => `<div class="fila" style="grid-template-columns:auto 1fr auto"><div class="mini">🍽</div><div><b>Pedido ${p.id} · mesa ${p.mesa}</b><small>${p.items.map((i) => `${i.cant} × ${esc(i.nombre)}`).join(' · ')}${p.salto ? ` · ↷ adelantado: ${esc(p.salto)}` : ''}</small></div><b>${clp(totalPedido(p))}</b></div>`).join('')}</div></div>` : ''}`;
  },

  mesas(el) {
    const llamadas = leer('llamadas').filter((l) => !l.atendida).sort((a, b) => a.hora.localeCompare(b.hora));
    const mesas = leer('mesas');
    el.innerHTML = `
      <div class="cab"><div><h1>Mesas y llamadas</h1><p>Las llamadas al garzón y los pedidos de cuenta llegan aquí en orden. Cada mesa tiene su QR.</p></div></div>
      <div class="panel" ${llamadas.length ? 'style="border-color:#e8c3b4;background:#fff8f4"' : ''}>
        <h2>🔔 Llamadas (${llamadas.length})</h2>
        ${llamadas.length ? `<div class="lista" style="margin-top:6px">${llamadas.map((l, i) => `
          <div class="fila" style="grid-template-columns:auto 1fr auto"><div class="mini">${l.tipo === 'cuenta' ? '🧾' : '🔔'}</div>
            <div><b>${i === 0 ? '<span class="chip-estado chip-estado--pendiente">Primero</span> ' : ''}Mesa ${l.mesa} · ${l.tipo === 'cuenta' ? 'pide la cuenta' : 'llama al garzón'}</b><small>${hace(l.hora)}${minDesde(l.hora) >= 5 ? ' · <span class="alerta-mesa">más de 5 min esperando</span>' : ''}</small></div>
            <button class="boton boton--chico" data-atender="${l.id}">Atendida</button></div>`).join('')}</div>` : '<p class="vacio">Sin llamadas pendientes.</p>'}
      </div>
      ${Object.entries(ZONAS).map(([z, info]) => `
        <h2>${info.icono} ${info.nombre}</h2>
        <div class="qr-grilla">${mesas.filter((m) => m.zona === z).map((m) => `
          <div class="qr-tarjeta">
            <h3>Mesa ${m.n}</h3>
            <small style="color:var(--tenue)">${m.cap} personas${m.nota ? ` · ${esc(m.nota)}` : ''}</small>
            <span class="chip-estado chip-estado--${m.ocupada ? 'no' : 'ok'}">${m.ocupada ? 'Ocupada' : 'Libre'}</span>
            <div class="qr">${qrSvg(urlDe(`pedidos.html?mesa=${m.n}`))}</div>
            <div class="acciones"><button class="boton boton--chico boton--linea" data-ocupar="${m.n}">${m.ocupada ? 'Liberar' : 'Ocupar'}</button><button class="boton boton--chico" data-abrir-mesa="${m.n}">Probar</button></div>
          </div>`).join('')}</div>`).join('')}`;
  },

  evaluaciones(el) {
    const evals = leer('evaluaciones');
    const prom = evals.length ? (evals.reduce((s, e) => s + e.nota, 0) / evals.length).toFixed(1) : '–';
    const pend = evals.filter((e) => !e.resuelta);
    el.innerHTML = `
      <div class="cab"><div><h1>Evaluaciones</h1><p>Al pedir la cuenta, el cliente evalúa la atención. Con 4 o 5 estrellas lo invitamos a Google; con 1 a 3, el comentario llega primero aquí para que lo resuelvas.</p></div></div>
      <div class="numeros">
        <div class="numero"><b>${prom} ★</b><span>Promedio</span></div>
        <div class="numero${pend.length ? ' numero--mal' : ''}"><b>${pend.length}</b><span>Por resolver</span></div>
      </div>
      ${evals.map((e) => `
        <article class="tarjeta${!e.resuelta ? ' tarjeta--pendiente' : ''}">
          <div class="tarjeta-cab"><div><b>${esc(e.cliente)} · mesa ${e.mesa}</b><small>${hace(e.hora)}</small></div>
            <span class="chip-estado chip-estado--${e.nota >= 4 || e.resuelta ? 'ok' : 'no'}">${'★'.repeat(e.nota)}${'☆'.repeat(5 - e.nota)}</span></div>
          ${e.texto ? `<p class="pregunta">${esc(e.texto)}</p>` : ''}
          ${e.respuesta ? `<div class="respuesta"><b>Tu respuesta</b>${esc(e.respuesta)}</div>` : ''}
          ${!e.resuelta ? `<div><button class="boton boton--acento" data-resolver="${esc(e.id)}">Responder y resolver</button></div>` : e.nota >= 4 ? '<small style="color:var(--ok);font-weight:700">✓ Invitado a dejar reseña en Google</small>' : '<small style="color:var(--ok);font-weight:700">✓ Resuelta</small>'}
        </article>`).join('') || '<div class="panel vacio">Aún no hay evaluaciones.</div>'}`;
  },
};

// ---------- Lista de espera ----------
function grupoHtml(w, i, libres) {
  const caben = libres.filter((m) => m.cap >= w.personas).sort((a, b) => a.cap - b.cap);
  const mesa = elegida[w.id] ?? caben[0]?.n;
  const siguiente = i === 0;
  return `
    <article class="pedido${siguiente ? ' pedido--nuevo' : ''}">
      <div class="pedido-cab"><b><span class="turno-n">${w.numero}</span> ${esc(w.nombre)} · ${w.personas} pers.</b><span class="reloj${minDesde(w.hora) > 30 ? ' reloj--tarde' : ''}">llegó ${hace(w.hora)}</span></div>
      <small class="estado-p">${siguiente ? '<b>Siguiente en la fila</b>' : `${i + 1}.º en la fila`} · ${esc(w.telefono || 'sin teléfono')}</small>
      ${caben.length ? `<div class="filtros">${caben.map((m) => `<button class="boton boton--chico ${m.n === mesa ? 'boton--acento' : 'boton--linea'}" data-mesa-w="${w.id}:${m.n}">Mesa ${m.n} · ${m.cap}p · ${ZONAS[m.zona].nombre}</button>`).join('')}</div>
        <div class="filtros">${siguiente ? `<button class="boton" data-llamar="${w.id}:${mesa}">🔔 Llamar a mesa ${mesa}</button>` : `<button class="boton boton--linea" data-saltar="${w.id}:${mesa}">↷ Pasar antes… (pide motivo)</button>`}</div>`
        : `<small style="color:var(--tenue)">No hay mesa libre para ${w.personas}.${siguiente ? ' Cuando se libere una, aparece aquí. Si se libera una más chica, puedes pasar al siguiente que quepa (con motivo).' : ''}</small>`}
    </article>`;
}

function llamar(id, mesa, salto) {
  const lista = leer('espera');
  const w = lista.find((x) => x.id === id);
  const primero = enEspera()[0];
  guardar('espera', lista.map((x) => (x.id === id ? { ...x, estado: 'llamado', mesa, llamado: new Date().toISOString(), ...(salto ? { salto: { motivo: salto, antesDe: primero.numero, hora: new Date().toISOString() } } : {}) } : x)));
  delete elegida[id];
  admin.refrescar();
  toast('🔔', `Llamado n.º ${w.numero} · mesa ${mesa}`, 'Le llegó el aviso al celular y por WhatsApp.');
}

function saltar(id, mesa) {
  const w = leer('espera').find((x) => x.id === id);
  const primero = enEspera()[0];
  const d = modal({
    titulo: `Pasar al n.º ${w.numero} antes del n.º ${primero.numero}`,
    cuerpo: `<p style="color:var(--tenue)">El orden de llegada es lo que el cliente ve en su celular. Si lo cambias, deja el motivo: queda en el registro del día.</p>
      <label class="campo">Motivo (obligatorio)<textarea name="motivo" rows="2" required></textarea></label>
      <div class="rapidas">${MOTIVOS_SALTO.map((m) => `<button type="button" data-motivo="${esc(m)}">${esc(m)}</button>`).join('')}</div>`,
    guardar: `Llamar a mesa ${mesa}`,
    onGuardar(f) { const m = f.get('motivo').trim(); if (!m) return false; llamar(id, mesa, m); },
  });
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-motivo]'); if (b) d.querySelector('[name=motivo]').value = b.dataset.motivo; });
}

function cerrarTurno(id, estado) {
  const w = leer('espera').find((x) => x.id === id);
  guardar('espera', leer('espera').map((x) => (x.id === id ? { ...x, estado } : x)));
  if (estado === 'sentado') guardar('mesas', leer('mesas').map((m) => (m.n === w.mesa ? { ...m, ocupada: true } : m)));
  admin.refrescar();
  toast(estado === 'sentado' ? '✓' : '✕', estado === 'sentado' ? `N.º ${w.numero} en la mesa ${w.mesa}` : `N.º ${w.numero} no llegó`, estado === 'sentado' ? 'La fila avanza sola.' : `La mesa ${w.mesa} queda libre para el siguiente.`);
}

function agregarPuerta() {
  modal({
    titulo: 'Anotar en la puerta',
    cuerpo: `<p style="color:var(--tenue)">Para quien llega sin celular. Recibe el número siguiente, igual que todos.</p>
      <div class="form-2"><label class="campo">Nombre<input name="nombre" required></label><label class="campo">Personas<input name="personas" type="number" min="1" max="12" value="2" required></label></div>
      <label class="campo">Teléfono <small>Opcional</small><input name="telefono" inputmode="tel"></label>`,
    guardar: 'Dar número',
    onGuardar(f) {
      const lista = leer('espera');
      const numero = Math.max(40, ...lista.map((w) => w.numero)) + 1;
      guardar('espera', [...lista, { id: uid(), numero, nombre: f.get('nombre').trim(), personas: Number(f.get('personas')) || 2, telefono: f.get('telefono').trim(), hora: new Date().toISOString(), estado: 'esperando', mesa: null }]);
      admin.refrescar();
      toast('⏳', `Número ${numero}`, 'Anotado al final de la fila.');
    },
  });
}

// ---------- Fila de cocina ----------
function pedidoHtml(p, i, primero) {
  const beb = esBebestible(p);
  const min = minDesde(p.hora);
  let accion;
  if (p.estado === 'preparacion') accion = `<button class="boton" data-servir="${p.id}">🍽 Servido</button>`;
  else if (beb) accion = `<span class="chip-estado chip-estado--ok">Solo bebestibles: sale de la barra</span><button class="boton boton--chico" data-servir="${p.id}">🍽 Servido</button>`;
  else if (p.id === primero?.id) accion = `<button class="boton boton--acento" data-empezar="${p.id}">🔥 Empezar (es el más antiguo)</button>`;
  else accion = `<small style="color:var(--tenue)">Espera su turno: antes va el pedido ${primero?.id}.</small><button class="enlace" data-adelantar="${p.id}">Adelantar… (pide motivo)</button>`;
  return `
    <article class="pedido${p.estado === 'preparacion' ? '' : p.id === primero?.id ? ' pedido--nuevo' : ''}${min >= 25 ? ' pedido--tarde' : ''}">
      <div class="pedido-cab"><b><span class="turno-n">${i + 1}</span> Mesa ${p.mesa} · pedido ${p.id}</b><span class="reloj${min >= 25 ? ' reloj--tarde' : min >= 15 ? ' reloj--justo' : ''}">⏱ ${min} min · ${horaCorta(p.hora)}</span></div>
      <small class="estado-p">${ESTADOS[p.estado].icono} ${ESTADOS[p.estado].label} · ${esc(p.cliente || '')}</small>
      <div class="items">${p.items.map((it) => `<div><span>${it.cant} × ${esc(it.nombre)}${it.mods?.length ? `<span class="mods">↳ ${it.mods.map(esc).join(' · ')}</span>` : ''}</span></div>`).join('')}</div>
      ${p.nota ? `<div class="nota-p">✎ ${esc(p.nota)}</div>` : ''}
      ${p.salto ? `<div class="nota-p nota-p--espera">↷ Adelantado: ${esc(p.salto)}</div>` : ''}
      <div class="filtros">${accion}</div>
    </article>`;
}

function avanzar(id, estado, salto) {
  const ahora = new Date().toISOString();
  guardar('pedidos', leer('pedidos').map((p) => (p.id === id ? { ...p, estado, historial: [...p.historial, { t: ahora, e: estado }], ...(salto ? { salto } : {}) } : p)));
  admin.refrescar();
  toast(ESTADOS[estado].icono, `Pedido ${id}: ${ESTADOS[estado].label}`, 'La mesa lo ve al instante.');
}

function adelantar(id) {
  const d = modal({
    titulo: `Adelantar el pedido ${id}`,
    cuerpo: `<p style="color:var(--tenue)">Hay pedidos que llegaron antes y ven su lugar en la fila. Si lo adelantas, deja el motivo.</p>
      <label class="campo">Motivo (obligatorio)<textarea name="motivo" rows="2" required></textarea></label>
      <div class="rapidas">${MOTIVOS_COCINA.map((m) => `<button type="button" data-motivo="${esc(m)}">${esc(m)}</button>`).join('')}</div>`,
    guardar: 'Empezar ahora',
    onGuardar(f) { const m = f.get('motivo').trim(); if (!m) return false; avanzar(id, 'preparacion', m); },
  });
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-motivo]'); if (b) d.querySelector('[name=motivo]').value = b.dataset.motivo; });
}

function resolver(eid) {
  const ev = leer('evaluaciones').find((x) => x.id === eid);
  modal({
    titulo: `Responder a ${esc(ev.cliente)}`,
    cuerpo: `<p class="pregunta" style="font-size:15px">${'★'.repeat(ev.nota)} · ${esc(ev.texto || 'Sin comentario')}</p>
      <label class="campo">Tu respuesta <small>Le llega por WhatsApp</small><textarea name="r" rows="3" required>Te pedimos disculpas, ${esc(ev.cliente)}. Ya lo conversamos con el equipo. La próxima vez te esperamos con una paila marina de regalo.</textarea></label>`,
    guardar: 'Enviar respuesta',
    onGuardar(f) {
      guardar('evaluaciones', leer('evaluaciones').map((x) => (x.id === eid ? { ...x, resuelta: true, respuesta: f.get('r').trim() } : x)));
      admin.refrescar();
      toast('★', 'Respuesta enviada', 'Quedó registrada como resuelta.');
    },
  });
}

// ---------- Eventos ----------
const par = (s) => { const [a, b] = s.split(':'); return [a, Number(b)]; };
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('dialog')) return;
  if (t.closest('[data-probar]')) return irA('carta');
  if (t.closest('[data-probar-mesa]')) return irA('pedidos', { mesa: 4 });
  if (t.closest('[data-agregar]')) return agregarPuerta();
  const mw = t.closest('[data-mesa-w]');
  if (mw) { const [id, n] = par(mw.dataset.mesaW); elegida[id] = n; return admin.refrescar(); }
  const ll = t.closest('[data-llamar]');
  if (ll) { const [id, n] = par(ll.dataset.llamar); return llamar(id, n); }
  const sa = t.closest('[data-saltar]');
  if (sa) { const [id, n] = par(sa.dataset.saltar); return saltar(id, n); }
  const se = t.closest('[data-sentar]');
  if (se) return cerrarTurno(se.dataset.sentar, 'sentado');
  const nv = t.closest('[data-novino]');
  if (nv) return cerrarTurno(nv.dataset.novino, 'no_vino');
  const em = t.closest('[data-empezar]');
  if (em) return avanzar(Number(em.dataset.empezar), 'preparacion');
  const sv = t.closest('[data-servir]');
  if (sv) return avanzar(Number(sv.dataset.servir), 'servido');
  const ad = t.closest('[data-adelantar]');
  if (ad) return adelantar(Number(ad.dataset.adelantar));
  const at = t.closest('[data-atender]');
  if (at) { guardar('llamadas', leer('llamadas').map((l) => (l.id === at.dataset.atender ? { ...l, atendida: true } : l))); return admin.refrescar(); }
  const oc = t.closest('[data-ocupar]');
  if (oc) { const n = Number(oc.dataset.ocupar); guardar('mesas', leer('mesas').map((m) => (m.n === n ? { ...m, ocupada: !m.ocupada } : m))); return admin.refrescar(); }
  const am = t.closest('[data-abrir-mesa]');
  if (am) return irA('pedidos', { mesa: Number(am.dataset.abrirMesa) });
  const rs = t.closest('[data-resolver]');
  if (rs) return resolver(rs.dataset.resolver);
});

// ---------- Avisos en vivo desde las pantallas 1 y 3 ----------
const ids = (clave) => new Set(leer(clave).map((x) => x.id));
let conocidos = { espera: ids('espera'), pedidos: ids('pedidos'), llamadas: ids('llamadas'), evaluaciones: ids('evaluaciones') };
alCambiar((clave) => {
  for (const x of leer(clave) || []) {
    if (!conocidos[clave] || conocidos[clave].has(x.id)) continue;
    if (clave === 'espera') toast('⏳', `Número ${x.numero} · ${esc(x.nombre)}`, `${x.personas} pers. se anotó en la lista de espera.`, () => admin.mostrar('espera'));
    if (clave === 'pedidos') toast('🧾', `Pedido ${x.id} · mesa ${x.mesa}`, 'Entró al final de la fila de cocina.', () => admin.mostrar('cocina'));
    if (clave === 'llamadas') toast(x.tipo === 'cuenta' ? '🧾' : '🔔', `Mesa ${x.mesa}`, x.tipo === 'cuenta' ? 'Pide la cuenta.' : 'Llama al garzón.', () => admin.mostrar('mesas'));
    if (clave === 'evaluaciones') toast(x.nota >= 4 ? '★' : '⚠', `Evaluación ${'★'.repeat(x.nota)} · mesa ${x.mesa}`, x.nota >= 4 ? 'Lo invitamos a Google.' : 'Llegó para que la resuelvas.', () => admin.mostrar('evaluaciones'));
  }
  if (clave in conocidos) conocidos[clave] = ids(clave);
  if (!document.querySelector('dialog[open]')) admin.refrescar(); else admin.pintarTabs();
});
(function avisosPendientes() {
  const K = PREF + 'vistos-admin';
  let vistos;
  try { vistos = new Set(JSON.parse(localStorage.getItem(K) || '[]')); } catch { vistos = new Set(); }
  const fila = enEspera();
  if (fila.length && !vistos.has('inicio')) toast('⏳', `${fila.length} grupos en la lista de espera`, `El siguiente es el n.º ${fila[0].numero} (${fila[0].personas} pers.).`, () => admin.mostrar('espera'));
  try { localStorage.setItem(K, JSON.stringify(['inicio'])); } catch { /* nada */ }
})();

setInterval(() => { if (!document.querySelector('dialog[open]')) admin.refrescar(); }, 20000);
admin.refrescar();
