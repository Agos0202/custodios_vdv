import './FooterComuna.css';

function FooterComuna() {
  return (
    <footer className="comuna-footer py-3 px-3 px-md-4">
      <div className="comuna-footer-inner">
        <img
          src="/emblema.png"
          alt="Emblema"
          className="comuna-logo"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = '/logo192.png';
          }}
        />

        <p className="comuna-text mb-2">Parroquia Nuestra Señora del Valle</p>

        <div className="comuna-social d-flex align-items-center justify-content-center gap-3">
          <a
            href="https://www.facebook.com/share/1UnLL9whZK/?mibextid=wwXIfr"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            className="social-item"
          >
            <i className="bi bi-facebook" />
          </a>
          <a
            href="https://www.instagram.com/morena_del_valle_?jplx=b3dqc3JianBpZHZs"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="social-item"
          >
            <i className="bi bi-instagram" />
          </a>
        </div>
        <p className="comuna-textoo mb-2">Agostina Jimenez - Desarrolladora web</p>
      </div>
    </footer>
  );
}

export default FooterComuna;