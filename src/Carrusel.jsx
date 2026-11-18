import './Carrusel.css';
import { useEffect, useRef, useState } from 'react';
import virgen1 from './virgen-1.jpg';
import virgen2 from './virgen-2.jpg';
import virgen3 from './virgen-3.jpg';

const IMAGENES_VIRGEN = [virgen1, virgen2, virgen3];
const INTERVALO_MS = 4000;

// Acepta una lista de imágenes (texto) o de objetos { tipo: 'imagen' | 'video', src }
const normalizar = (item) => (typeof item === 'string' ? { tipo: 'imagen', src: item } : item);

function Carrusel({ items = IMAGENES_VIRGEN, variante = 'pantalla' }) {
  const elementos = items.map(normalizar);
  const total = elementos.length;
  const [actual, setActual] = useState(0);
  const toqueInicioX = useRef(null);
  const videosRef = useRef([]);

  const irA = (indice) => {
    setActual((indice + total) % total);
  };

  // Imágenes: avance automático cada 4 s. Videos: avanzan cuando terminan.
  useEffect(() => {
    videosRef.current.forEach((video, i) => {
      if (!video) return;
      if (i === actual) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });

    if (elementos[actual]?.tipo === 'video') return undefined;

    const timer = setTimeout(() => {
      setActual((prev) => (prev + 1) % total);
    }, INTERVALO_MS);
    return () => clearTimeout(timer);
  }, [actual, total]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deslizar con el dedo en el celular
  const onTouchStart = (e) => {
    toqueInicioX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (toqueInicioX.current === null) return;
    const diferencia = e.changedTouches[0].clientX - toqueInicioX.current;
    if (Math.abs(diferencia) > 40) {
      irA(actual + (diferencia < 0 ? 1 : -1));
    }
    toqueInicioX.current = null;
  };

  return (
    <div
      className={`carrusel carrusel-${variante}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carrusel"
    >
      <div
        className="carrusel-pista"
        style={{ transform: `translateX(-${actual * 100}%)` }}
      >
        {elementos.map((el, i) => (
          <div key={el.src} className="carrusel-slide">
            {el.tipo === 'imagen' && (
              <div
                className="carrusel-fondo"
                style={{ backgroundImage: `url(${el.src})` }}
                aria-hidden="true"
              />
            )}
            {el.tipo === 'video' ? (
              <video
                ref={(nodo) => { videosRef.current[i] = nodo; }}
                src={el.src}
                className="carrusel-imagen"
                muted
                playsInline
                disablePictureInPicture
                preload="metadata"
                onVolumeChange={(e) => { e.currentTarget.muted = true; }}
                onEnded={() => irA(i + 1)}
              />
            ) : (
              <img
                src={el.src}
                alt={`Imagen ${i + 1}`}
                className="carrusel-imagen"
                draggable="false"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            )}
          </div>
        ))}
      </div>

      <div className="carrusel-puntos">
        {elementos.map((el, i) => (
          <button
            key={el.src}
            type="button"
            className={`carrusel-punto ${i === actual ? 'activo' : ''}`}
            onClick={() => irA(i)}
            aria-label={`Ver elemento ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default Carrusel;
