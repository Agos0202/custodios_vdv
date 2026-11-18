// Conexión a Supabase mediante su API REST.
// La clave publishable es pública por diseño (la seguridad la dan las reglas RLS de la tabla).
// Se puede reemplazar con REACT_APP_SUPABASE_ANON_KEY en .env.local o en Netlify.
const SUPABASE_URL = 'https://vnaznviciiiamtzxgfdk.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_dvyHvHZjKjuGD764uboESg_4DSH19il';

export const TABLA_CUSTODIOS = 'Custodios';

// Sirve tanto con la clave "anon" (empieza con eyJ...) como con la nueva
// "publishable" (empieza con sb_publishable_...). Esta última no lleva Authorization.
const encabezados = () => ({
  apikey: SUPABASE_ANON_KEY,
  ...(SUPABASE_ANON_KEY.startsWith('eyJ')
    ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    : {}),
  'Content-Type': 'application/json',
});

const leerError = async (respuesta) => {
  try {
    const cuerpo = await respuesta.json();
    return cuerpo.message || cuerpo.hint || JSON.stringify(cuerpo);
  } catch {
    return `Error ${respuesta.status}`;
  }
};

// Lista todas las filas de una tabla, ordenadas por fecha de carga
export async function listarFilas(tabla) {
  const respuesta = await fetch(
    `${SUPABASE_URL}/rest/v1/${tabla}?select=*&order=created_at.asc`,
    { headers: encabezados() }
  );

  if (!respuesta.ok) {
    throw new Error(await leerError(respuesta));
  }

  return respuesta.json();
}

export async function insertarFila(tabla, datos) {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Falta configurar la clave de Supabase (REACT_APP_SUPABASE_ANON_KEY).');
  }

  const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, {
    method: 'POST',
    headers: { ...encabezados(), Prefer: 'return=minimal' },
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    throw new Error(await leerError(respuesta));
  }
}
