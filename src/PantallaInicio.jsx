import './PantallaInicio.css';
import { useState } from 'react';
import FooterComuna from './FooterComuna';
import virgen1 from './virgen-1.jpg';

function PantallaInicio({ onEnter }) {
  const [isOpening, setIsOpening] = useState(false);

  const handleClick = () => {
    setIsOpening(true);
    setTimeout(() => {
      onEnter();
    }, 500);
  };

  return (
    <div className="pantalla-inicio-page">
      <div className={`hero-container ${isOpening ? 'opening' : ''}`}>
        {/* Fondo borroso */}
        <div className="background-gradient" />

        {/* Imagen completa de la Virgen */}
        <img
          src={virgen1}
          alt="Virgen del Valle"
          className="hero-imagen"
        />

        {/* Contenido principal */}
        <div className="hero-content">
          {/* Título principal */}
          <h1 className="main-title">
            8 de diciembre<br />
            <span className="highlight">Día de la Virgen del Valle</span>
          </h1>

          {/* Botón de ingreso */}
          <button className="enter-button" onClick={handleClick}>
            <span className="button-text">Ingresar</span>
          </button>
        </div>
      </div>

      <FooterComuna />
    </div>
  );
}

export default PantallaInicio;
