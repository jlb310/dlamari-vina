// Pantalla 2: administrador de la carta. Una sola fuente para horario, teléfono y precios: de aquí sale a la carta, la web y los demás canales.
import { leer, guardar, alCambiar, fotoUrl, clp, esc, uid, irA, PREF, DIAS, hoyIso, sinPrecio } from './store.js';
import { crearAdmin, modal, qrSvg, urlDe, toast } from './admin-base.js';

let busq = '';
let catFiltro = '';

const fotoMini = (p) => (p.foto ? `<img src="${esc(fotoUrl(p.foto, 120))}" alt="">` : esc(p.emoji || '🍽️'));
const ESTADO_P = { disponible: ['Disponible', 'chip-estado--ok'], agotado: ['Agotado hoy', 'chip-estado--no'], oculto: ['Oculto', ''] };

// Opciones como texto editable: «Grupo: opción +precio, opción, …» (un grupo por línea; «*» al final del grupo = elegir varias).
const opcionesATexto = (ops = []) => ops.map((g) => `${g.grupo}${g.multi ? '*' : ''}: ${g.items.map((o) => `${o.n}${o.p ? ` ${o.p > 0 ? '+' : ''}${o.p}` : ''}`).join(', ')}`).join('\n');
function textoAOpciones(t) {
  return t.split('\n').map((l) => l.trim()).filter((l) => l.includes(':')).map((l) => {
    const [cab, resto] = [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1)];
    const multi = cab.trim().endsWith('*');
    const items = resto.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(.*?)\s*([+-]\s*\d[\d.]*)$/);
      return m ? { n: m[1].trim(), p: Number(m[2].replace(/[\s.]/g, '')) } : { n: s, p: 0 };
    });
    return { grupo: cab.replace('*', '').trim(), multi, items };
  }).filter((g) => g.items.length);
}

const admin = crearAdmin({
  plan: 'Plan carta',
  verCarta: 'carta',
  pestanas: [
    { id: 'resumen', nombre: 'Hoy', icono: '▦' },
    { id: 'productos', nombre: 'Productos', icono: '☰' },
    { id: 'categorias', nombre: 'Categorías', icono: '⌗' },
    { id: 'local', nombre: 'Información única', icono: '◎' },
    { id: 'personalizar', nombre: 'Personalizar', icono: '✦' },
    { id: 'qr', nombre: 'Código QR', icono: '▣' },
  ],
  badges: () => ({ resumen: leer('productos').filter((p) => p.estado === 'agotado' || sinPrecio(p)).length, local: leer('canales').filter((c) => c.estado !== 'ok').length }),
  pintar(id, el) { VISTAS[id](el); },
});

const VISTAS = {
  resumen(el) {
    const productos = leer('productos');
    const agotados = productos.filter((p) => p.estado === 'agotado');
    const malos = productos.filter(sinPrecio);
    const canales = leer('canales').filter((c) => c.estado !== 'ok');
    el.innerHTML = `
      <div class="cab"><div><h1>La carta de hoy</h1><p>Antes de abrir, marca lo que se agotó. El cliente lo ve con el motivo en vez de enterarse cuando ya pidió.</p></div>
        <button class="boton" data-ir-carta>Ver la carta ↗</button></div>
      ${malos.map((p) => `<button class="alerta alerta--roja" data-editar="${esc(p.id)}"><span>$0</span><span><b>${esc(p.nombre)} no tiene precio</b><small>No se muestra en la carta hasta que lo corrijas. Hoy en dlamari.cl aparece publicado a $0.</small></span><b>Poner precio →</b></button>`).join('')}
      ${canales.length ? `<button class="alerta" data-ir-tab="local"><span>⚠</span><span><b>${canales.length} ${canales.length === 1 ? 'canal muestra' : 'canales muestran'} datos distintos</b><small>${canales.map((c) => esc(c.nombre)).join(', ')}: ${esc(canales[0].detalle)}</small></span><b>Revisar →</b></button>` : ''}
      <div class="numeros">
        <div class="numero"><b>${productos.filter((p) => p.estado === 'disponible' && !sinPrecio(p)).length}</b><span>Disponibles hoy</span></div>
        <div class="numero"><b>${agotados.length}</b><span>Agotados hoy</span></div>
        <div class="numero"><b>${productos.filter((p) => p.desde).length}</b><span>Con horario (desde las 17:00)</span></div>
        <div class="numero${malos.length ? ' numero--mal' : ''}"><b>${malos.length}</b><span>Sin precio (ocultos)</span></div>
      </div>
      <div class="panel">
        <div class="cab"><div><h2>Disponibilidad rápida</h2><p>Un toque para marcar agotado o volver a disponible.</p></div></div>
        <div class="lista" style="margin-top:8px">
          ${productos.filter((p) => p.estado !== 'oculto').map((p) => `
            <div class="fila">
              <div class="mini">${fotoMini(p)}</div>
              <div><b>${esc(p.nombre)}</b><small>${p.estado === 'agotado' ? `<span class="alerta-mesa">Agotado:</span> ${esc(p.motivoAgotado || 'sin motivo')}` : sinPrecio(p) ? '<span class="alerta-mesa">Sin precio: oculto</span>' : `${clp(p.precio)}${p.desde ? ` · desde las ${esc(p.desde)}` : ''}`}</small></div>
              <div class="fila-acciones"><button class="boton boton--chico ${p.estado === 'agotado' ? '' : 'boton--linea'}" data-agotar="${esc(p.id)}">${p.estado === 'agotado' ? '✓ Volvió' : 'Se agotó'}</button></div>
            </div>`).join('')}
        </div>
      </div>`;
  },

  productos(el) {
    const productos = leer('productos');
    const cats = leer('categorias');
    const q = busq.toLowerCase();
    const lista = productos.filter((p) => (!catFiltro || p.cat === catFiltro) && (!q || p.nombre.toLowerCase().includes(q)));
    const catNombre = (id) => cats.find((c) => c.id === id)?.nombre || 'Sin categoría';
    el.innerHTML = `
      <div class="cab"><div><h1>Productos</h1><p>Precios, fotos, disponibilidad y las opciones que el cliente puede elegir (preparación, acompañamiento, salsa…).</p></div>
        <button class="boton" data-nuevo>+ Nuevo producto</button></div>
      <div class="panel">
        <div class="filtros">
          <input type="search" id="busq" placeholder="Buscar producto" value="${esc(busq)}" aria-label="Buscar producto">
          <select id="cat-filtro" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>${cats.map((c) => `<option value="${esc(c.id)}"${c.id === catFiltro ? ' selected' : ''}>${esc(c.icono)} ${esc(c.nombre)}</option>`).join('')}</select>
        </div>
        <div class="lista" style="margin-top:8px">
          ${lista.length ? lista.map((p) => {
            const [label, cls] = ESTADO_P[p.estado] || ESTADO_P.disponible;
            return `
            <div class="fila">
              <div class="mini">${fotoMini(p)}</div>
              <div><b>${esc(p.nombre)}</b><small>${esc(catNombre(p.cat))} · ${clp(p.precio)}${p.desde ? ` · desde las ${esc(p.desde)}` : ''}${sinPrecio(p) ? ' · <span class="alerta-mesa">sin precio</span>' : ''}${p.opciones?.length ? ` · ${p.opciones.length} ${p.opciones.length === 1 ? 'grupo' : 'grupos'} de opciones` : ''}</small></div>
              <div class="fila-acciones">
                <span class="chip-estado ${cls}">${label}</span>
                <button class="icono-b" data-editar="${esc(p.id)}" aria-label="Editar ${esc(p.nombre)}">✎</button>
              </div>
            </div>`;
          }).join('') : '<p class="vacio">No hay productos con ese filtro.</p>'}
        </div>
      </div>`;
  },

  categorias(el) {
    const cats = leer('categorias');
    const productos = leer('productos');
    el.innerHTML = `
      <div class="cab"><div><h1>Categorías</h1><p>Las secciones de la carta, en el orden en que aparecen.</p></div>
        <button class="boton" data-nueva-cat>+ Nueva categoría</button></div>
      <div class="panel"><div class="lista">
        ${cats.map((c, i) => `
          <div class="fila">
            <div class="mini">${esc(c.icono)}</div>
            <div><b>${esc(c.nombre)}</b><small>${productos.filter((p) => p.cat === c.id).length} productos</small></div>
            <div class="fila-acciones">
              <button class="icono-b" data-subir="${i}" aria-label="Subir"${i === 0 ? ' disabled style="opacity:.35"' : ''}>↑</button>
              <button class="icono-b" data-editar-cat="${esc(c.id)}" aria-label="Editar ${esc(c.nombre)}">✎</button>
            </div>
          </div>`).join('')}
      </div></div>`;
  },

  local(el) {
    const l = leer('local');
    const canales = leer('canales');
    const malos = canales.filter((c) => c.estado !== 'ok');
    el.innerHTML = `
      <div class="cab"><div><h1>Información única</h1><p>Horario, teléfono y dirección se editan solo aquí. La carta y la web se actualizan solas; en Google y directorios te decimos qué quedó distinto y lo publicamos por ti.</p></div></div>
      <div class="panel">
        <h2>Dónde aparece esta información</h2>
        <div class="lista" style="margin-top:6px">${canales.map((c) => `
          <div class="fila"><div class="mini">${c.icono}</div>
            <div><b>${esc(c.nombre)}</b><small>${c.auto ? 'Se actualiza sola desde aquí' : c.estado === 'ok' ? 'Igual a lo de aquí' : `<span class="alerta-mesa">${esc(c.detalle)}</span>`}</small></div>
            <div class="fila-acciones">${c.estado === 'ok' ? '<span class="chip-estado chip-estado--ok">✓ Al día</span>' : `<span class="chip-estado chip-estado--no">Distinto</span><button class="boton boton--chico" data-publicar="${c.id}">Publicar</button>`}</div>
          </div>`).join('')}</div>
        ${malos.length ? `<div class="filtros" style="margin-top:10px"><button class="boton boton--acento" data-publicar="todos">Publicar en todos los canales</button></div>` : ''}
      </div>
      <form class="panel form" id="form-local">
        <h2>Contacto</h2>
        <div class="form-2">
          <label class="campo">Nombre del local<input name="nombre" value="${esc(l.nombre)}" required></label>
          <label class="campo">Dirección<input name="direccion" value="${esc(l.direccion)}"></label>
          <label class="campo">Teléfono <small>El mismo en todas partes</small><input name="telefono" value="${esc(l.telefono)}" inputmode="tel"></label>
          <label class="campo">WhatsApp <small>Solo números, con 56</small><input name="whatsapp" value="${esc(l.whatsapp)}" inputmode="numeric"></label>
          <label class="campo">Correo<input name="email" value="${esc(l.email)}" type="email"></label>
          <label class="campo">Sitio web<input name="sitio" value="${esc(l.sitio)}"></label>
        </div>
        <h2>Horario de cocina</h2>
        <div class="horario-ed">${l.horario.map((h, i) => `
          <div class="dia-ed"><b>${h.dia}</b>
            <input name="abre-${i}" type="time" value="${h.abre}" aria-label="${h.dia} abre"${h.cerrado ? ' disabled' : ''}>
            <input name="cierra-${i}" type="time" value="${h.cierra}" aria-label="${h.dia} cierra"${h.cerrado ? ' disabled' : ''}>
            <label class="mini-check"><input type="checkbox" name="cerrado-${i}"${h.cerrado ? ' checked' : ''}> Cerrado</label></div>`).join('')}</div>
        <h2>Días especiales</h2>
        <p style="color:var(--tenue);font-size:13px">Feriados, eventos o cierres. Se avisan solos en la carta y la web ese día.</p>
        <div class="lista">${(l.excepciones || []).map((x, i) => `<div class="fila" style="grid-template-columns:1fr auto"><div><b>${new Date(`${x.fecha}T12:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</b><small>${x.cerrado ? 'Cerrado' : `${x.abre} – ${x.cierra}`}${x.motivo ? ` · ${esc(x.motivo)}` : ''}</small></div><button type="button" class="icono-b" data-quitar-ex="${i}" aria-label="Quitar">×</button></div>`).join('') || '<small style="color:var(--tenue)">Sin días especiales.</small>'}</div>
        <div class="filtros"><button type="button" class="boton boton--linea boton--chico" data-ex>+ Agregar día especial</button></div>
        <div><button class="boton">Guardar y publicar</button></div>
      </form>`;
  },

  personalizar(el) {
    const l = leer('local');
    const temas = [
      ['arena', 'Arena', 'Claro, arena y terracota, como la web.', 'linear-gradient(135deg,#f4ede1 60%,#b8583a 60%)'],
      ['mar', 'Mar', 'Azul profundo para la noche.', 'linear-gradient(135deg,#0f2b2f 60%,#e3a184 60%)'],
    ];
    el.innerHTML = `
      <div class="cab"><div><h1>Personalizar la carta</h1><p>Título, frase de portada y el tema de colores.</p></div><button class="boton boton--linea" data-ir-carta>Ver cómo queda ↗</button></div>
      <form class="panel form" id="form-portada">
        <label class="campo">Título de portada <small>Máximo 28 caracteres, para que quede en una línea.</small><input name="titulo" maxlength="28" value="${esc(l.titulo)}"></label>
        <label class="campo">Frase de portada<input name="frase" maxlength="90" value="${esc(l.frase)}"></label>
        <div class="campo">Tema de la carta
          <div class="opciones">${temas.map(([id, n, d, g]) => `<button type="button" class="opcion" data-tema="${id}" aria-pressed="${l.tema === id}"><i style="background:${g}"></i><b>${n}</b><small>${d}</small></button>`).join('')}</div>
        </div>
        <div><button class="boton">Guardar cambios</button></div>
      </form>`;
  },

  qr(el) {
    const url = urlDe('carta.html');
    el.innerHTML = `
      <div class="cab"><div><h1>Código QR</h1><p>Un solo QR para la carta, el horario y la lista de espera. Para la entrada, Instagram o Google.</p></div></div>
      <div class="panel qr-grande">
        <div class="qr">${qrSvg(url)}</div>
        <div><b>${esc(leer('local').nombre)}</b><br><small style="color:var(--tenue)">${esc(url)}</small></div>
        <div class="filtros" style="justify-content:center">
          <button class="boton" onclick="window.print()">Imprimir</button>
          <button class="boton boton--linea" data-ir-carta>Abrir la carta</button>
        </div>
        <p style="color:var(--tenue);font-size:13px;max-width:440px">Cada mesa tiene además su propio QR para pedir desde la mesa (en el administrador del salón).</p>
      </div>`;
  },
};

// ---------- Formularios ----------
function formProducto(id) {
  const productos = leer('productos');
  const cats = leer('categorias');
  const p = productos.find((x) => x.id === id) || { id: '', nombre: '', precio: '', cat: cats[0]?.id, etiqueta: '', desc: '', detalle: '', foto: '', emoji: '🍽️', estado: 'disponible', motivoAgotado: '', cambios: true, motivoCambios: '', opciones: [] };
  const d = modal({
    titulo: id ? 'Editar producto' : 'Nuevo producto',
    cuerpo: `
      <div class="form-2">
        <label class="campo">Nombre<input name="nombre" value="${esc(p.nombre)}" required></label>
        <label class="campo">Precio<input name="precio" type="number" min="0" step="1" value="${esc(p.precio)}" required inputmode="numeric"></label>
        <label class="campo">Categoría<select name="cat">${cats.map((c) => `<option value="${esc(c.id)}"${c.id === p.cat ? ' selected' : ''}>${esc(c.icono)} ${esc(c.nombre)}</option>`).join('')}</select></label>
        <label class="campo">Etiqueta <small>Opcional: «De la casa», «Nuevo»…</small><input name="etiqueta" value="${esc(p.etiqueta)}"></label>
      </div>
      <label class="campo">Descripción corta<input name="desc" value="${esc(p.desc)}"></label>
      <div class="form-2">
        <label class="campo">Disponibilidad<select name="estado">${Object.entries(ESTADO_P).map(([k, [n]]) => `<option value="${k}"${k === p.estado ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="campo">Si está agotado, ¿por qué? <small>El cliente lo lee en la carta</small><input name="motivoAgotado" value="${esc(p.motivoAgotado || '')}" placeholder="Ej.: se terminó por hoy, prueba el…"></label>
      </div>
      <label class="campo">Opciones para el cliente <small>Un grupo por línea: <code>Acompañamiento: Papas rústicas, Papas Owl +2500</code>. Agrega * al nombre del grupo si se pueden elegir varias.</small><textarea name="opciones" rows="4">${esc(opcionesATexto(p.opciones))}</textarea></label>
      <label class="campo" style="max-width:260px">Se sirve desde <small>Opcional, ej.: sándwiches desde las 17:00</small><input name="desde" type="time" value="${esc(p.desde || '')}"></label>
      <div class="form-2">
        <label class="campo">Foto <small>Enlace a una imagen (opcional)</small><input name="foto" value="${esc(p.foto ? fotoUrl(p.foto, 900) : '')}" placeholder="https://…"></label>
        <label class="campo">Emoji si no hay foto<input name="emoji" value="${esc(p.emoji || '')}" maxlength="4"></label>
      </div>`,
    extra: id ? '<button type="button" class="boton boton--peligro" data-borrar style="margin-right:auto">Eliminar</button>' : '',
    onGuardar(f) {
      if (!(Number(f.get('precio')) > 0)) { toast('✋', 'Falta el precio', 'Un producto sin precio no se publica: así evitamos mostrar $0.'); return false; }
      const datos = { nombre: f.get('nombre').trim(), precio: Number(f.get('precio')), cat: f.get('cat'), etiqueta: f.get('etiqueta').trim(), desc: f.get('desc').trim(), estado: f.get('estado'), motivoAgotado: f.get('motivoAgotado').trim(), opciones: textoAOpciones(f.get('opciones')), desde: f.get('desde') || '', foto: f.get('foto').trim(), emoji: f.get('emoji').trim() };
      const lista = leer('productos');
      if (id) Object.assign(lista.find((x) => x.id === id), datos); else lista.push({ id: uid(), tags: [], ...datos });
      guardar('productos', lista);
      admin.refrescar();
      toast('✓', 'Producto guardado', 'Ya se ve en la carta.');
    },
  });
  d.addEventListener('click', (e) => {
    if (e.target.closest('[data-borrar]') && confirm(`¿Eliminar «${p.nombre}» de la carta?`)) {
      guardar('productos', leer('productos').filter((x) => x.id !== id));
      d.close();
      admin.refrescar();
    }
  });
}

function formAgotado(id) {
  const p = leer('productos').find((x) => x.id === id);
  modal({
    titulo: `Se agotó: ${esc(p.nombre)}`,
    cuerpo: `<p style="color:var(--tenue)">Sale del pedido online al tiro y sigue en la carta marcado como agotado. Cuéntale al cliente por qué y qué puede pedir en su lugar.</p>
      <label class="campo">Mensaje para el cliente<input name="motivo" value="${esc(p.motivoAgotado || 'Se terminó por hoy.')}" required></label>`,
    guardar: 'Marcar agotado',
    onGuardar(f) {
      guardar('productos', leer('productos').map((x) => (x.id === id ? { ...x, estado: 'agotado', motivoAgotado: f.get('motivo').trim() } : x)));
      admin.refrescar();
      toast('✓', `${p.nombre} agotado`, 'La carta ya lo muestra con tu mensaje.');
    },
  });
}

function formCategoria(id) {
  const cats = leer('categorias');
  const c = cats.find((x) => x.id === id) || { id: '', nombre: '', icono: '🍣' };
  modal({
    titulo: id ? 'Editar categoría' : 'Nueva categoría',
    cuerpo: `<div class="form-2"><label class="campo">Nombre<input name="nombre" value="${esc(c.nombre)}" required></label><label class="campo">Ícono (emoji)<input name="icono" value="${esc(c.icono)}" maxlength="4"></label></div>`,
    extra: id ? '<button type="button" class="boton boton--peligro" data-borrar style="margin-right:auto">Eliminar</button>' : '',
    onGuardar(f) {
      const lista = leer('categorias');
      const datos = { nombre: f.get('nombre').trim(), icono: f.get('icono').trim() || '🍣' };
      if (id) Object.assign(lista.find((x) => x.id === id), datos); else lista.push({ id: uid(), ...datos });
      guardar('categorias', lista);
      admin.refrescar();
    },
  }).addEventListener('click', (e) => {
    if (!e.target.closest('[data-borrar]')) return;
    const n = leer('productos').filter((p) => p.cat === id).length;
    if (n) return alert(`Esta categoría tiene ${n} productos. Muévelos a otra categoría antes de eliminarla.`);
    if (confirm(`¿Eliminar la categoría «${c.nombre}»?`)) { guardar('categorias', leer('categorias').filter((x) => x.id !== id)); e.target.closest('dialog').close(); admin.refrescar(); }
  });
}

// ---------- Eventos ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-ir-carta]')) return irA('carta');
  const ag = t.closest('[data-agotar]');
  if (ag) {
    const p = leer('productos').find((x) => x.id === ag.dataset.agotar);
    if (p.estado === 'agotado') { guardar('productos', leer('productos').map((x) => (x.id === p.id ? { ...x, estado: 'disponible' } : x))); admin.refrescar(); return toast('✓', `${p.nombre} disponible`, 'Volvió a la carta.'); }
    return formAgotado(p.id);
  }
  if (t.closest('[data-nuevo]')) return formProducto();
  const ed = t.closest('[data-editar]');
  if (ed) return formProducto(ed.dataset.editar);
  if (t.closest('[data-nueva-cat]')) return formCategoria();
  const ec = t.closest('[data-editar-cat]');
  if (ec) return formCategoria(ec.dataset.editarCat);
  const sub = t.closest('[data-subir]');
  if (sub) { const l = leer('categorias'); const i = Number(sub.dataset.subir); [l[i - 1], l[i]] = [l[i], l[i - 1]]; guardar('categorias', l); return admin.refrescar(); }
  const it = t.closest('[data-ir-tab]');
  if (it) return admin.mostrar(it.dataset.irTab);
  const pub = t.closest('[data-publicar]');
  if (pub) {
    const id = pub.dataset.publicar;
    guardar('canales', leer('canales').map((c) => (id === 'todos' || c.id === id ? { ...c, estado: 'ok', detalle: '' } : c)));
    guardar('local', { ...leer('local'), revisado: new Date().toISOString() });
    admin.refrescar();
    return toast('✓', id === 'todos' ? 'Publicado en todos los canales' : 'Publicado', 'Horario y teléfono quedaron iguales en todas partes.');
  }
  if (t.closest('[data-ex]')) return formExcepcion();
  const qx = t.closest('[data-quitar-ex]');
  if (qx) { const l = leer('local'); l.excepciones.splice(Number(qx.dataset.quitarEx), 1); guardar('local', l); return admin.refrescar(); }
  const tema = t.closest('[data-tema]');
  if (tema) document.querySelectorAll('[data-tema]').forEach((b) => b.setAttribute('aria-pressed', b === tema));
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'cat-filtro') { catFiltro = e.target.value; admin.refrescar(); }
  const m = e.target.name?.match(/^cerrado-(\d)$/);
  if (m) e.target.closest('.dia-ed').querySelectorAll('input[type=time]').forEach((x) => { x.disabled = e.target.checked; });
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'busq') return;
  busq = e.target.value;
  admin.refrescar();
  const b = document.getElementById('busq'); b.focus(); b.setSelectionRange(busq.length, busq.length);
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'form-local') {
    e.preventDefault();
    const f = new FormData(e.target);
    const l = leer('local');
    const horario = DIAS.map((dia, i) => ({ dia, abre: f.get(`abre-${i}`) || l.horario[i].abre, cierra: f.get(`cierra-${i}`) || l.horario[i].cierra, cerrado: f.get(`cerrado-${i}`) === 'on' }));
    const datos = Object.fromEntries(['nombre', 'direccion', 'telefono', 'whatsapp', 'email', 'sitio'].map((k) => [k, String(f.get(k) || '').trim()]));
    const cambio = ['telefono', 'direccion'].some((k) => datos[k] !== l[k]) || JSON.stringify(horario) !== JSON.stringify(l.horario);
    guardar('local', { ...l, ...datos, horario, revisado: new Date().toISOString() });
    // La carta y la web toman el cambio solas; los canales externos quedan por publicar.
    if (cambio) guardar('canales', leer('canales').map((c) => (c.auto ? c : { ...c, estado: 'distinto', detalle: 'Falta publicar el cambio que acabas de hacer.' })));
    admin.refrescar();
    toast('✓', 'Guardado', cambio ? 'La carta y la web ya lo muestran. Publica en Google y los demás canales.' : 'La carta ya muestra la información.');
  }
  if (e.target.id === 'form-portada') {
    e.preventDefault();
    const tema = document.querySelector('[data-tema][aria-pressed="true"]')?.dataset.tema || 'arena';
    guardar('local', { ...leer('local'), ...Object.fromEntries(new FormData(e.target)), tema });
    try { localStorage.removeItem(PREF + 'tema'); } catch { /* nada */ }
    toast('✓', 'Carta personalizada', 'Abre la carta para ver el cambio.', () => irA('carta'));
  }
});

function formExcepcion() {
  modal({
    titulo: 'Día especial',
    cuerpo: `<div class="form-2"><label class="campo">Fecha<input name="fecha" type="date" min="${hoyIso()}" value="${hoyIso()}" required></label>
      <label class="campo">Motivo<input name="motivo" placeholder="Ej.: feriado, evento privado"></label></div>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="cerrado" checked><span></span></span>Cerrado todo el día</label>
      <div class="form-2"><label class="campo">Si abre, desde<input name="abre" type="time" value="13:00"></label><label class="campo">Hasta<input name="cierra" type="time" value="18:00"></label></div>`,
    onGuardar(f) {
      const l = leer('local');
      l.excepciones = [...(l.excepciones || []), { fecha: f.get('fecha'), motivo: f.get('motivo').trim(), cerrado: f.get('cerrado') === 'on', abre: f.get('abre'), cierra: f.get('cierra') }].sort((a, b) => a.fecha.localeCompare(b.fecha));
      guardar('local', l);
      admin.refrescar();
      toast('✓', 'Día especial agregado', 'La carta y la web lo avisan ese día.');
    },
  });
}

alCambiar(() => { if (!document.querySelector('dialog[open]')) admin.refrescar(); });
admin.refrescar();
