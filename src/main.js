// D'LAMARI · landing: carta con filtros, estado de cocina en hora de Chile y animaciones de entrada.
const FOTO = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;

const carta = [
  { nombre: 'Empanada de mariscos', detalle: 'Masa dorada, mariscos de la bahía y salsa de la casa', precio: 5900, tipo: 'comida', foto: '1769254870299-338bfd99aabd' },
  { nombre: 'Paila marina', detalle: 'Caldo de mariscos frescos, servido hirviendo', precio: 14900, tipo: 'comida', foto: '1571167366136-b57e07761625', delDia: true },
  { nombre: 'Pescado del día', detalle: 'Preparación del chef con acompañamiento a elección', precio: 16900, tipo: 'comida', foto: '1665401015549-712c0dc5ef85', delDia: true },
  { nombre: 'Ceviche mixto', detalle: 'Pesca blanca, camarón, cebolla morada y cilantro', precio: 12900, tipo: 'comida', foto: '1761314037195-1508e44c6bd2' },
  { nombre: 'Jugo natural', detalle: 'Fruta de temporada; consulta los sabores de hoy', precio: 3900, tipo: 'bebidas', foto: '1600271886742-f049cd451bba' },
  { nombre: 'Bebestible', detalle: 'Variedades disponibles según stock del día', precio: 2500, tipo: 'bebidas', foto: '1583577612013-4fecf7bf8f13' },
];

const pesos = (n) => '$' + n.toLocaleString('es-CL');
const grilla = document.getElementById('carta-grilla');

function pintar(tipo = 'todo') {
  grilla.innerHTML = carta.filter((p) => tipo === 'todo' || p.tipo === tipo).map((p) => `
    <article class="plato">
      <div class="plato-foto"><img loading="lazy" src="${FOTO(p.foto, 700)}" alt="${p.nombre}">${p.delDia ? '<span class="plato-sello">Del día</span>' : ''}</div>
      <div class="plato-info">
        <h3>${p.nombre}</h3>
        <span class="plato-puntos" aria-hidden="true"></span>
        <b>${pesos(p.precio)}</b>
      </div>
      <p>${p.detalle}</p>
    </article>`).join('');
}
pintar();

document.querySelectorAll('.pestana').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.pestana').forEach((x) => {
    x.classList.toggle('activa', x === b);
    x.setAttribute('aria-selected', String(x === b));
  });
  pintar(b.dataset.tipo);
}));

// Cocina abierta todos los días de 13:00 a 21:00, hora de Viña del Mar.
(function estado() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const m = +p.hour * 60 + +p.minute;
  const abierto = m >= 13 * 60 && m < 21 * 60;
  const texto = abierto
    ? 'Cocina abierta · hasta las 21:00'
    : (m < 13 * 60 ? 'Cerrado ahora · abrimos hoy a las 13:00' : 'Cerrado ahora · abrimos mañana a las 13:00');
  document.querySelectorAll('[data-estado]').forEach((el) => {
    el.classList.toggle('abierto', abierto);
    el.querySelector('span').textContent = texto;
  });
  setTimeout(estado, 60_000);
})();

// Nav con fondo al bajar.
const nav = document.getElementById('nav');
const alBajar = () => nav.classList.toggle('solida', scrollY > 40);
addEventListener('scroll', alBajar, { passive: true });
alBajar();

// Aparición suave al entrar en pantalla.
const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.revela').forEach((el) => io.observe(el));
