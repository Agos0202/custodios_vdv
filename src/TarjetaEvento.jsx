import { useEffect, useMemo, useState } from 'react';
import './TarjetaEvento.css';
import FooterComuna from './FooterComuna';
import Carrusel from './Carrusel';
import ReproductorMusica from './ReproductorMusica';
import { insertarFila, TABLA_CUSTODIOS } from './supabase';

const getNextEventDate = () => {
  // Cuenta hasta el comienzo del 8 de diciembre
  return new Date(2026, 11, 8, 0, 0, 0);
};

const getTimeLeft = (targetDate) => {
  const difference = targetDate.getTime() - new Date().getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

// Galería: fotos y videos de peregrinaciones (archivos en public/galeria/)
// Para sumar un video: { tipo: 'video', src: '/galeria/video-1.mp4' }
const GALERIA = [
  { tipo: 'imagen', src: '/galeria/foto-1.jpg' },
  { tipo: 'video', src: '/galeria/6.mp4' },
  { tipo: 'imagen', src: '/galeria/foto-2.jpg' },
  { tipo: 'video', src: '/galeria/7.mp4' },
  { tipo: 'video', src: '/galeria/8.mp4' },
];

const FORMULARIO_VACIO = {
  nombre: '',
  apellido: '',
  barrio: '',
  telefono: '',
};

const CAMPOS = [
  { name: 'nombre', label: 'Nombre' },
  { name: 'apellido', label: 'Apellido' },
  { name: 'barrio', label: 'Barrio' },
  { name: 'telefono', label: 'Teléfono', type: 'tel' },
];

function TarjetaEvento({ onVolver }) {
  const eventDate = useMemo(() => getNextEventDate(), []);

  const [timeLeft, setTimeLeft] = useState(getTimeLeft(eventDate));
  const [formData, setFormData] = useState(FORMULARIO_VACIO);
  const [errors, setErrors] = useState({});
  const [modalAlerta, setModalAlerta] = useState({
  visible: false,
  tipo: 'info',
  titulo: '',
  mensaje: '',
});
const [guardando, setGuardando] = useState(false);
  // ⏱ contador
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(eventDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

  const onInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.apellido.trim()) newErrors.apellido = 'El apellido es obligatorio';
    if (!formData.barrio.trim()) newErrors.barrio = 'El barrio es obligatorio';
    if (!formData.telefono.trim()) newErrors.telefono = 'El teléfono es obligatorio';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (guardando) return;

    if (!validateForm()) {
      setModalAlerta({
        visible: true,
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'Por favor completá todos los campos obligatorios.'
      });
      return;
    }

    setGuardando(true);

    try {
      // 💾 guardar en Supabase (tabla Custodios)
      await insertarFila(TABLA_CUSTODIOS, {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        barrio: formData.barrio.trim(),
        telefono: formData.telefono.trim(),
      });

      setModalAlerta({
        visible: true,
        tipo: 'success',
        titulo: 'Inscripción exitosa',
        mensaje: '¡Gracias por sumarte como custodio de la Virgen del Valle!',
      });

      // limpiar form
      setFormData(FORMULARIO_VACIO);

    } catch (error) {
      setModalAlerta({
        visible: true,
        tipo: 'error',
        titulo: 'Error',
        mensaje: error.message
      });
    } finally {
      setGuardando(false);
    }
  };

  const cerrarModal = () => {
    setModalAlerta(prev => ({ ...prev, visible: false }));
  };

  const cuentaRegresiva = [
    { valor: timeLeft.days, etiqueta: 'Días' },
    { valor: timeLeft.hours, etiqueta: 'Horas' },
    { valor: timeLeft.minutes, etiqueta: 'Min' },
    { valor: timeLeft.seconds, etiqueta: 'Seg' },
  ];

  return (
    <div className="evento-page">
      <ReproductorMusica src="/musica/cancion.mp4" titulo="Sonando" inicio={20} />
      <Carrusel />
      <main className="evento-layout">
        <div className="evento-stack">
          <h1 className="evento-title">Día de la Virgen del Valle</h1>
          <div className="evento-divider" aria-hidden="true" />
          <div className="cuenta">
            <p className="cuenta-fecha">
              <span className="cuenta-linea" aria-hidden="true" />
              8 de diciembre
              <span className="cuenta-linea" aria-hidden="true" />
            </p>
            <div className="cuenta-grilla" role="timer" aria-live="off">
              {cuentaRegresiva.map(({ valor, etiqueta }) => (
                <div key={etiqueta} className="cuenta-item">
                  <span className="cuenta-numero">{String(valor).padStart(2, '0')}</span>
                  <span className="cuenta-etiqueta">{etiqueta}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="evento-subtitle">
            Este 8 de diciembre celebramos juntos a nuestra Madre, la Virgen del Valle.<br />Te invitamos a acompañarnos en este día de fe y encuentro.
          </p>
          <div className="evento-emblema-franja">
            <img src="/emblema.png" alt="Emblema" className="evento-emblema" />
          </div>
          <Carrusel items={GALERIA} variante="galeria" />
          <section className="convocatoria">
            <h2 className="convocatoria-titulo">Convocatoria de custodios</h2>
            <p className="evento-subtitle convocatoria-destacado">
              Ser custodio es mucho más que acompañar...
            </p>
            <p className="evento-subtitle">
              Es caminar con fe, ofrecer el corazón y asumir el compromiso de acompañar a nuestra Madre en su peregrinar.
            </p>
            <p className="evento-subtitle">
              Te invitamos a formar parte de esta hermosa misión, acompañando y custodiando a la Virgen del Valle, San José y el Sagrado Corazón de Jesús en una nueva peregrinación llena de fe, amor y esperanza.
            </p>
          </section>
          <form className="form-shell" onSubmit={onSubmit} autoComplete="off">
            <h2 className="form-title">Inscripción de custodios</h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              marginBottom: '1.2rem',
              maxWidth: '600px',
              width: '100%',
            }}>
              {CAMPOS.map(({ name, label, type }) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label evento-label" htmlFor={name}>{label}</label>
                  <input
                    id={name}
                    name={name}
                    type={type || 'text'}
                    className="elegant-input"
                    placeholder={label}
                    value={formData[name]}
                    onChange={onInputChange}
                    autoComplete="off"
                  />
                  {errors[name] && <p className="form-error">{errors[name]}</p>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button type="submit" className="btn-confirmar" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Confirmar'}
              </button>
              <button type="button" className="btn-volver" onClick={onVolver}>Volver</button>
            </div>
          </form>
        </div>
      </main>
      <FooterComuna />
      {/* Modal de alerta elegante */}
      {modalAlerta.visible && (
        <div className="modal-alerta-overlay">
          <div className="modal-alerta-contenido">
            <div className={`modal-alerta-header modal-alerta-header-${modalAlerta.tipo === 'success' ? 'success' : 'error'}`}> 
              <div className={`modal-alerta-icono ${modalAlerta.tipo === 'success' ? 'modal-alerta-icon-success' : 'modal-alerta-icon-error'}`}>{modalAlerta.tipo === 'success' ? '✔' : '✖'}</div>
              <h2 className="modal-alerta-titulo">{modalAlerta.titulo}</h2>
            </div>
            <div className="modal-alerta-cuerpo">
              <p className="modal-alerta-mensaje">{modalAlerta.mensaje}</p>
            </div>
            <div className="modal-alerta-acciones">
              <button className="modal-alerta-boton" onClick={cerrarModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TarjetaEvento;