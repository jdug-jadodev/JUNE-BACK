const BASE = 'http://127.0.0.1:8787';

async function req(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error('FALLO: ' + msg);
  console.log('OK  ' + msg);
}

async function main() {
  const sufijo = Date.now();
  const emailAdmin = `admin${sufijo}@andromeda.local`;
  const emailMiembro = `miembro${sufijo}@andromeda.local`;
  const password = `Test${sufijo}!`;
  const adminPassword = `Admin${sufijo}!`;

  const registro = await req('/auth/register', {
    method: 'POST',
    body: { email: emailAdmin, password, nombre: 'Andrés' },
  });
  assert(registro.status === 201, `registro admin (${registro.status})`);
  const tokenAdmin = registro.data.accessToken;

  const hogar = await req('/households', {
    method: 'POST',
    token: tokenAdmin,
    body: { nombre: 'Casa Andrómeda' },
  });
  assert(hogar.status === 201, `crear hogar (${hogar.status})`);
  const hogarId = hogar.data.id;
  const inviteCode = hogar.data.inviteCode;

  const misHogares = await req('/households', { token: tokenAdmin });
  assert(
    misHogares.status === 200 && misHogares.data.some((h) => h.id === hogarId),
    `listar hogares del usuario (${misHogares.data.length})`,
  );

  const passwordAdmin = await req(`/households/${hogarId}/admin-password`, {
    method: 'POST',
    token: tokenAdmin,
    body: { password: adminPassword },
  });
  assert(passwordAdmin.status === 204, `configurar contraseña admin (${passwordAdmin.status})`);

  const gasto = await req(`/households/${hogarId}/expenses`, {
    method: 'POST',
    token: tokenAdmin,
    body: { producto: 'Arroz y pollo', montoCents: 3500000, fecha: '2026-10-30' },
  });
  assert(gasto.status === 201, `registrar gasto (${gasto.status})`);
  const gastoId = gasto.data.id;

  const lista = await req(`/households/${hogarId}/expenses`, { token: tokenAdmin });
  assert(lista.status === 200 && lista.data.length === 1, `listar gastos (${lista.data.length})`);

  const sinPassword = await req(`/households/${hogarId}/expenses/${gastoId}`, {
    method: 'PATCH',
    token: tokenAdmin,
    body: { producto: 'Arroz, pollo y pan', montoCents: 3800000, fecha: '2026-10-30' },
  });
  assert(sinPassword.status === 403, `editar sin contraseña es bloqueado (${sinPassword.status})`);

  const conPassword = await req(`/households/${hogarId}/expenses/${gastoId}`, {
    method: 'PATCH',
    token: tokenAdmin,
    headers: { 'X-Admin-Password': adminPassword },
    body: { producto: 'Arroz, pollo y pan', montoCents: 3800000, fecha: '2026-10-30' },
  });
  assert(conPassword.status === 200, `editar con contraseña (${conPassword.status})`);

  const registroMiembro = await req('/auth/register', {
    method: 'POST',
    body: { email: emailMiembro, password, nombre: 'Familiar' },
  });
  assert(registroMiembro.status === 201, `registro miembro (${registroMiembro.status})`);
  const tokenMiembro = registroMiembro.data.accessToken;

  const unirse = await req('/households/join', {
    method: 'POST',
    token: tokenMiembro,
    body: { inviteCode },
  });
  assert(unirse.status === 200, `unirse con código (${unirse.status})`);

  const listaMiembro = await req(`/households/${hogarId}/expenses`, { token: tokenMiembro });
  assert(
    listaMiembro.status === 200 && listaMiembro.data.length === 1,
    `miembro ve el gasto (${listaMiembro.data.length})`,
  );

  const miembros = await req(`/households/${hogarId}/members`, { token: tokenAdmin });
  assert(
    miembros.status === 200 && miembros.data.length === 2,
    `listar miembros (${miembros.data.length})`,
  );
  assert(
    miembros.data.every((m) => m.nombre && m.email),
    'los miembros incluyen nombre y email',
  );

  const csv = await req(`/households/${hogarId}/export.csv`, { token: tokenAdmin });
  assert(
    csv.status === 200 && String(csv.data).includes('Arroz'),
    `exportar CSV (${csv.status})`,
  );

  const miembroEdita = await req(`/households/${hogarId}/expenses/${gastoId}`, {
    method: 'PATCH',
    token: tokenMiembro,
    headers: { 'X-Admin-Password': adminPassword },
    body: { producto: 'Hack', montoCents: 1, fecha: '2026-10-30' },
  });
  assert(miembroEdita.status === 403, `miembro no puede editar (${miembroEdita.status})`);

  const borrar = await req(`/households/${hogarId}/expenses/${gastoId}`, {
    method: 'DELETE',
    token: tokenAdmin,
    headers: { 'X-Admin-Password': adminPassword },
  });
  assert(borrar.status === 204, `eliminar con contraseña (${borrar.status})`);

  const listaFinal = await req(`/households/${hogarId}/expenses`, { token: tokenAdmin });
  assert(listaFinal.data.length === 0, `lista vacía tras eliminar (${listaFinal.data.length})`);

  console.log('\nSmoke test completado correctamente.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
