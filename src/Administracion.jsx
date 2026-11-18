import { useCallback, useEffect, useMemo, useState } from 'react';
import ModalAlerta from './ModalAlerta';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Administracion.css';
import { listarFilas, insertarFila, TABLA_CUSTODIOS } from './supabase';

const RUTA_BASE = '/4dmin2026c0mun4';

// Imágenes a custodiar. Si sobran custodios, se suman en este orden.
const IMAGENES = [
  { clave: 'virgen', nombre: 'Virgen del Valle' },
  { clave: 'sanjose', nombre: 'San José' },
  { clave: 'sagrado', nombre: 'Sagrado Corazón de Jesús' },
];

const CLAVE_SORTEO_GUARDADO = 'sorteoCustodios';

// Colores del manto para los PDF
const PDF_AZUL = [62, 101, 132];
const PDF_CELESTE = [234, 242, 249];
const PDF_TEXTO = [30, 58, 84];

const FORMULARIO_VACIO = { nombre: '', apellido: '', barrio: '', telefono: '' };

const obtenerSeccionDesdeRuta = () => {
  const path = window.location.pathname.toLowerCase();
  if (path === `${RUTA_BASE}/custodios`) return 'custodios';
  if (path === `${RUTA_BASE}/sorteo`) return 'sorteo';
  return 'menu';
};

const obtenerRutaDeSeccion = (seccion) => {
  if (seccion === 'custodios') return `${RUTA_BASE}/custodios`;
  if (seccion === 'sorteo') return `${RUTA_BASE}/sorteo`;
  return RUTA_BASE;
};

const esperar = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Mezcla justa (Fisher-Yates con números aleatorios criptográficos)
const mezclar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const aleatorio = new Uint32Array(1);
    window.crypto.getRandomValues(aleatorio);
    const j = aleatorio[0] % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

const nombreCompleto = (persona) => `${persona.apellido}, ${persona.nombre}`;

const cargarEmblemaComoDataUrl = () => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('No se pudo procesar el emblema.'));
      return;
    }
    context.drawImage(image, 0, 0);
    resolve({ dataUrl: canvas.toDataURL('image/png'), ancho: image.width, alto: image.height });
  };
  image.onerror = () => reject(new Error('No se pudo cargar el emblema.'));
  image.src = '/emblema.png';
});

// Encabezado común de los PDF: franja azul con el emblema y el título
const dibujarEncabezadoPdf = async (doc, titulo) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_AZUL);
  doc.rect(0, 0, pageWidth, 90, 'F');

  let textoX = 36;
  try {
    const emblema = await cargarEmblemaComoDataUrl();
    const alto = 54;
    const ancho = (emblema.ancho / emblema.alto) * alto;
    doc.addImage(emblema.dataUrl, 'PNG', 36, 18, ancho, alto);
    textoX = 36 + ancho + 14;
  } catch (error) {
    // Si el emblema falla, el PDF se genera igual.
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(titulo, textoX, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Parroquia Nuestra Señora del Valle · ${new Date().toLocaleString('es-AR')}`, textoX, 62);
};

const leerSorteoGuardado = () => {
  try {
    const guardado = window.localStorage.getItem(CLAVE_SORTEO_GUARDADO);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
};

function Administracion({ onLogout }) {
  const [custodios, setCustodios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [formData, setFormData] = useState(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [modalAlerta, setModalAlerta] = useState({ visible: false, tipo: 'info', titulo: '', mensaje: '' });
  const [seccionActiva, setSeccionActiva] = useState(obtenerSeccionDesdeRuta);
  const [fechaActual] = useState(() => new Date());

  // Sorteo: { fecha, grupos: { virgen: [...], sanjose: [...], sagrado: [...] } }
  const [sorteo, setSorteo] = useState(leerSorteoGuardado);
  const [sorteoEnCurso, setSorteoEnCurso] = useState(false);
  const [descargandoPdfSorteo, setDescargandoPdfSorteo] = useState(false);

  const cargarCustodios = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const filas = await listarFilas(TABLA_CUSTODIOS);
      setCustodios(Array.isArray(filas) ? filas : []);
    } catch (error) {
      setErrorCarga(error.message || 'No se pudo cargar el listado de custodios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCustodios();
  }, [cargarCustodios]);

  useEffect(() => {
    const onPopState = () => setSeccionActiva(obtenerSeccionDesdeRuta());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const irASeccion = (seccion) => {
    window.history.pushState({ pantalla: 'administracion', seccion }, '', obtenerRutaDeSeccion(seccion));
    setSeccionActiva(seccion);
  };

  const custodiosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return custodios;
    return custodios.filter((item) => (
      `${item.apellido} ${item.nombre} ${item.barrio} ${item.telefono}`.toLowerCase().includes(termino)
    ));
  }, [custodios, busqueda]);

  // Tamaño de cada grupo: lo más parejo posible; si sobran, se suman en el orden de IMAGENES
  const reparto = useMemo(() => {
    const total = custodios.length;
    const base = Math.floor(total / IMAGENES.length);
    const resto = total % IMAGENES.length;
    return IMAGENES.map((imagen, i) => ({ ...imagen, cantidad: base + (i < resto ? 1 : 0) }));
  }, [custodios.length]);

  // ── Alta manual de custodios ───────────────────────────
  const onChangeFormulario = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onGuardarCustodio = async (event) => {
    event.preventDefault();
    if (guardando) return;

    const datos = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      barrio: formData.barrio.trim(),
      telefono: formData.telefono.trim(),
    };

    if (!datos.nombre || !datos.apellido || !datos.barrio || !datos.telefono) {
      setModalAlerta({ visible: true, tipo: 'error', titulo: 'Faltan datos', mensaje: 'Completá nombre, apellido, barrio y teléfono.' });
      return;
    }

    setGuardando(true);
    try {
      await insertarFila(TABLA_CUSTODIOS, datos);
      setFormData(FORMULARIO_VACIO);
      await cargarCustodios();
      setModalAlerta({ visible: true, tipo: 'success', titulo: 'Custodio agregado', mensaje: `${datos.apellido}, ${datos.nombre} fue inscripto correctamente.` });
    } catch (error) {
      setModalAlerta({ visible: true, tipo: 'error', titulo: 'Error', mensaje: error.message || 'No se pudo guardar el custodio.' });
    } finally {
      setGuardando(false);
    }
  };

  // ── PDF de inscriptos ──────────────────────────────────
  const onDescargarPdf = async () => {
    if (custodiosFiltrados.length === 0 || descargandoPdf) return;
    setDescargandoPdf(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      await dibujarEncabezadoPdf(doc, 'Custodios inscriptos');
      autoTable(doc, {
        startY: 110,
        head: [['N°', 'Apellido', 'Nombre', 'Barrio', 'Teléfono']],
        body: custodiosFiltrados.map((item, index) => [
          index + 1, item.apellido, item.nombre, item.barrio, item.telefono,
        ]),
        theme: 'grid',
        headStyles: { fillColor: PDF_AZUL, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: PDF_CELESTE },
        styles: { fontSize: 10, textColor: PDF_TEXTO },
      });
      doc.save('custodios_inscriptos.pdf');
    } finally {
      setDescargandoPdf(false);
    }
  };

  // ── Sorteo de custodios ────────────────────────────────
  const onRealizarSorteo = async () => {
    if (sorteoEnCurso || custodios.length === 0) return;

    if (sorteo && !window.confirm('Ya hay un sorteo realizado. ¿Querés hacer uno nuevo? El anterior se va a reemplazar.')) {
      return;
    }

    setSorteoEnCurso(true);
    const mezclados = mezclar(custodios);
    const grupos = { virgen: [], sanjose: [], sagrado: [] };
    setSorteo({ fecha: new Date().toISOString(), grupos: { virgen: [], sanjose: [], sagrado: [] } });

    // Se reparte uno por uno en ronda: así los grupos quedan iguales
    // o con uno más, en el orden Virgen → San José → Sagrado Corazón.
    const pausa = Math.max(60, Math.min(350, 5000 / mezclados.length));
    for (let i = 0; i < mezclados.length; i += 1) {
      const imagen = IMAGENES[i % IMAGENES.length];
      const persona = mezclados[i];
      grupos[imagen.clave] = [...grupos[imagen.clave], {
        id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        barrio: persona.barrio,
        telefono: persona.telefono,
      }];
      setSorteo((prev) => ({ ...prev, grupos: { ...grupos } }));
      // eslint-disable-next-line no-await-in-loop
      await esperar(pausa);
    }

    const resultado = { fecha: new Date().toISOString(), grupos };
    setSorteo(resultado);
    try {
      window.localStorage.setItem(CLAVE_SORTEO_GUARDADO, JSON.stringify(resultado));
    } catch {
      // Si no se puede guardar en el navegador, el resultado igual queda en pantalla.
    }
    setSorteoEnCurso(false);
  };

  const onDescargarPdfSorteo = async () => {
    if (!sorteo || descargandoPdfSorteo) return;
    setDescargandoPdfSorteo(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      await dibujarEncabezadoPdf(doc, 'Sorteo de custodios');
      let cursorY = 115;

      IMAGENES.forEach((imagen) => {
        const integrantes = sorteo.grupos[imagen.clave] || [];
        doc.setTextColor(...PDF_AZUL);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(`${imagen.nombre} (${integrantes.length})`, 36, cursorY);

        autoTable(doc, {
          startY: cursorY + 8,
          head: [['N°', 'Apellido', 'Nombre', 'Barrio', 'Teléfono']],
          body: integrantes.length > 0
            ? integrantes.map((p, i) => [i + 1, p.apellido, p.nombre, p.barrio, p.telefono])
            : [['', 'Sin custodios', '', '', '']],
          theme: 'grid',
          headStyles: { fillColor: PDF_AZUL, textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: PDF_CELESTE },
          styles: { fontSize: 10, textColor: PDF_TEXTO },
        });
        cursorY = doc.lastAutoTable.finalY + 26;
      });

      doc.save('sorteo_custodios.pdf');
    } finally {
      setDescargandoPdfSorteo(false);
    }
  };

  return (
    <main className="admin-page">
      <ModalAlerta
        visible={modalAlerta.visible}
        tipo={modalAlerta.tipo}
        titulo={modalAlerta.titulo}
        mensaje={modalAlerta.mensaje}
        onClose={() => setModalAlerta((prev) => ({ ...prev, visible: false }))}
      />
      <section className="admin-panel">
        <header className="admin-header">
          <nav className="admin-topbar" aria-label="Navegacion principal administracion">
            <button
              type="button"
              className="admin-top-icon"
              onClick={() => irASeccion('menu')}
              aria-label="Ir al inicio del panel"
            >
              ⌂
            </button>

            <p className="admin-topbar-title">Parroquia Nuestra Señora del Valle</p>

            {typeof onLogout === 'function' && (
              <button
                type="button"
                className="admin-top-icon"
                style={{ marginLeft: 'auto' }}
                onClick={onLogout}
                aria-label="Cerrar sesión"
              >
                Salir
              </button>
            )}
          </nav>
        </header>

        <section className="admin-route-shell">
          {seccionActiva === 'menu' ? (
            <>
              <div className="admin-dashboard-welcome">
                <h2 className="admin-dashboard-title">
                  Bienvenido, <span>Administrador</span>
                </h2>
                <p className="admin-dashboard-subtitle">Custodios de la Virgen del Valle · 8 de diciembre</p>
              </div>

              <h3 className="admin-modules-title">
                <span className="admin-modules-mark" />
                Módulos del sistema
              </h3>

              <div className="admin-route-grid">
                <article className="admin-route-card">
                  <div className="admin-route-card-bg" />
                  <div className="admin-route-head">
                    <span className="admin-route-tag">CUSTODIOS</span>
                    <span className="admin-route-count">{cargando ? '…' : custodios.length}</span>
                  </div>
                  <h2 className="admin-route-title">Custodios inscriptos</h2>
                  <p className="admin-route-text">Listado completo de inscriptos, búsqueda, alta manual y descarga en PDF.</p>
                  <button type="button" className="admin-route-arrow" onClick={() => irASeccion('custodios')}>
                    Ingresar
                  </button>
                </article>

                <article className="admin-route-card">
                  <div className="admin-route-card-bg" />
                  <div className="admin-route-head">
                    <span className="admin-route-tag">SORTEO</span>
                  </div>
                  <h2 className="admin-route-title">Sorteo de custodios</h2>
                  <p className="admin-route-text">Reparto de custodios en partes iguales para la Virgen del Valle, San José y el Sagrado Corazón de Jesús.</p>
                  <button type="button" className="admin-route-arrow" onClick={() => irASeccion('sorteo')}>
                    Ingresar
                  </button>
                </article>
              </div>

              <div className="admin-dashboard-footer">
                <span>Custodios de la Virgen del Valle · Administración</span>
                <span>Última actualización: {fechaActual.toLocaleString('es-AR')}</span>
              </div>
            </>
          ) : null}

          {seccionActiva === 'custodios' ? (
            <article className="admin-card">
              <h2 className="admin-section-title">Custodios inscriptos</h2>
              <p className="admin-subtitle">Total de inscriptos: {cargando ? 'cargando…' : custodios.length}</p>

              {errorCarga ? <p className="admin-error">{errorCarga}</p> : null}

              <h3 className="admin-subcard-title">Agregar custodio</h3>
              <form className="admin-form" onSubmit={onGuardarCustodio} noValidate>
                <label htmlFor="nombre" className="admin-label">Nombre</label>
                <input id="nombre" name="nombre" type="text" className="admin-input" value={formData.nombre} onChange={onChangeFormulario} />

                <label htmlFor="apellido" className="admin-label">Apellido</label>
                <input id="apellido" name="apellido" type="text" className="admin-input" value={formData.apellido} onChange={onChangeFormulario} />

                <label htmlFor="barrio" className="admin-label">Barrio</label>
                <input id="barrio" name="barrio" type="text" className="admin-input" value={formData.barrio} onChange={onChangeFormulario} />

                <label htmlFor="telefono" className="admin-label">Teléfono</label>
                <input id="telefono" name="telefono" type="tel" className="admin-input" value={formData.telefono} onChange={onChangeFormulario} />

                <button type="submit" className="admin-button primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Agregar custodio'}
                </button>
                <button type="button" className="admin-button secondary" onClick={() => setFormData(FORMULARIO_VACIO)}>Limpiar</button>
              </form>

              <div className="admin-subcard-header">
                <h3 className="admin-subcard-title">Lista de custodios</h3>
                <div className="admin-header-actions">
                  <input
                    type="text"
                    className="admin-input admin-search-input"
                    placeholder="Buscar por apellido, nombre, barrio o teléfono"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />
                  <button type="button" className="admin-button secondary" onClick={cargarCustodios} disabled={cargando}>
                    {cargando ? 'Actualizando...' : 'Actualizar'}
                  </button>
                  <button
                    type="button"
                    className="admin-button primary"
                    onClick={onDescargarPdf}
                    disabled={custodiosFiltrados.length === 0 || descargandoPdf}
                  >
                    {descargandoPdf ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>
                </div>
              </div>

              {custodiosFiltrados.length === 0 ? (
                <p className="admin-empty">
                  {cargando ? 'Cargando custodios…' : (custodios.length === 0 ? 'Todavía no hay custodios inscriptos.' : 'No hay resultados para la búsqueda.')}
                </p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Apellido</th>
                        <th>Nombre</th>
                        <th>Barrio</th>
                        <th>Teléfono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {custodiosFiltrados.map((custodio, index) => (
                        <tr key={custodio.id}>
                          <td>{index + 1}</td>
                          <td>{custodio.apellido}</td>
                          <td>{custodio.nombre}</td>
                          <td>{custodio.barrio}</td>
                          <td>{custodio.telefono}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ) : null}

          {seccionActiva === 'sorteo' ? (
            <article className="admin-card">
              <div className="admin-subcard-header" style={{ marginTop: 0 }}>
                <div>
                  <h2 className="admin-section-title" style={{ margin: 0 }}>Sorteo de custodios</h2>
                  <p className="admin-subtitle" style={{ margin: '0.2rem 0 0' }}>
                    Custodios inscriptos: <strong>{custodios.length}</strong>
                  </p>
                </div>
                <div className="admin-header-actions">
                  <button
                    type="button"
                    className="admin-button primary"
                    onClick={onRealizarSorteo}
                    disabled={sorteoEnCurso || cargando || custodios.length === 0}
                  >
                    {sorteoEnCurso ? 'Sorteando...' : (sorteo ? 'Realizar nuevo sorteo' : 'Realizar sorteo')}
                  </button>
                  <button
                    type="button"
                    className="admin-button secondary"
                    onClick={onDescargarPdfSorteo}
                    disabled={!sorteo || sorteoEnCurso || descargandoPdfSorteo}
                  >
                    {descargandoPdfSorteo ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>
                </div>
              </div>

              <p className="admin-sorteo-explicacion">
                Los custodios se mezclan al azar y se reparten en partes iguales. Si no alcanza para que sean
                exactamente iguales, los que sobran se suman primero a la Virgen del Valle y luego a San José.
              </p>

              {custodios.length > 0 ? (
                <div className="admin-sorteo-previa">
                  {reparto.map((imagen) => (
                    <span key={imagen.clave} className={`admin-sorteo-chip ${imagen.clave}`}>
                      {imagen.nombre}: <strong>{imagen.cantidad}</strong>
                    </span>
                  ))}
                </div>
              ) : null}

              {errorCarga ? <p className="admin-error">{errorCarga}</p> : null}

              {sorteo ? (
                <>
                  <p className="admin-sorteo-fecha">
                    {sorteoEnCurso ? 'Sorteando…' : `Sorteo realizado el ${new Date(sorteo.fecha).toLocaleString('es-AR')}`}
                  </p>
                  <div className={`admin-sorteo-grupos ${sorteoEnCurso ? 'is-sorteando' : ''}`}>
                    {IMAGENES.map((imagen) => {
                      const integrantes = sorteo.grupos[imagen.clave] || [];
                      return (
                        <section key={imagen.clave} className={`admin-grupo ${imagen.clave}`}>
                          <header className="admin-grupo-header">
                            <h3 className="admin-grupo-titulo">{imagen.nombre}</h3>
                            <span className="admin-grupo-cantidad">{integrantes.length}</span>
                          </header>
                          {integrantes.length === 0 ? (
                            <p className="admin-grupo-vacio">—</p>
                          ) : (
                            <ol className="admin-grupo-lista">
                              {integrantes.map((persona) => (
                                <li key={persona.id} className="admin-grupo-item">
                                  <span className="admin-grupo-nombre">{nombreCompleto(persona)}</span>
                                  <span className="admin-grupo-barrio">{persona.barrio}</span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="admin-empty">
                  {custodios.length === 0 ? 'Todavía no hay custodios inscriptos para sortear.' : 'Todavía no se realizó el sorteo.'}
                </p>
              )}
            </article>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default Administracion;
