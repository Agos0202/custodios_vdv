import './ReproductorMusica.css';
import { useEffect, useRef, useState } from 'react';

// Botón flotante para reproducir / pausar la canción de fondo.
// Intenta arrancar sola (la persona ya tocó "Ingresar"); si el navegador
// no lo permite, queda en pausa hasta que toquen el botón.
// "inicio": segundo desde el que arranca (y al que vuelve cuando termina).
function ReproductorMusica({ src, titulo = 'Música', inicio = 0 }) {
  const audioRef = useRef(null);
  const posicionInicialAplicada = useRef(false);
  const [sonando, setSonando] = useState(false);
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.volume = 0.6;
    audio.play().catch(() => {
      // Reproducción automática bloqueada: se espera al botón.
    });

    return () => audio.pause();
  }, []);

  // Ubica la canción en el segundo de inicio (una sola vez, al cargar)
  const onLoadedMetadata = (e) => {
    const audio = e.currentTarget;
    if (posicionInicialAplicada.current) return;
    posicionInicialAplicada.current = true;
    if (inicio > 0 && inicio < audio.duration && audio.currentTime < inicio) {
      audio.currentTime = inicio;
    }
  };

  // Al terminar, vuelve a empezar desde el segundo de inicio
  const onEnded = (e) => {
    const audio = e.currentTarget;
    audio.currentTime = inicio < audio.duration ? inicio : 0;
    audio.play().catch(() => {});
  };

  const alternar = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  if (!disponible) return null;

  return (
    <div className={`musica ${sonando ? 'sonando' : ''}`}>
      <audio
        ref={audioRef}
        src={inicio > 0 ? `${src}#t=${inicio}` : src}
        preload="auto"
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onPlay={() => setSonando(true)}
        onPause={() => setSonando(false)}
        onError={() => setDisponible(false)}
      />

      <span className="musica-etiqueta" aria-hidden="true">
        <span className="musica-ecualizador">
          <span />
          <span />
          <span />
          <span />
        </span>
        {sonando ? titulo : 'Tocá para escuchar'}
      </span>

      <button
        type="button"
        className="musica-boton"
        onClick={alternar}
        aria-label={sonando ? 'Pausar música' : 'Reproducir música'}
        aria-pressed={sonando}
      >
        <span className="musica-halo" aria-hidden="true" />
        {sonando ? (
          <svg viewBox="0 0 24 24" className="musica-icono" aria-hidden="true">
            <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" />
            <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="musica-icono musica-icono-play" aria-hidden="true">
            <path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default ReproductorMusica;
