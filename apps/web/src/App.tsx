import { MESES } from '@dc/core';
import logo from '@dc/brand/assets/logo-light.png';
import { useCircle } from './data';
import { OrderBread } from './OrderBread';

export function App() {
  const { offerings, projects } = useCircle();
  const now = new Date();
  const edition = `${MESES[now.getMonth()]} ${now.getFullYear()}`;
  const allies = projects.filter(p => p.ring === 'aliado');
  const neighbors = projects.filter(p => p.ring === 'vecino');

  return (
    <>
      <header className="masthead">
        <div className="edition"><span>Edición de {edition}</span><span>Costa Rica</span></div>
        <img src={logo} alt="Divine Circle" className="mast-logo" />
        <nav className="sections" aria-label="Secciones">
          <a href="#horno">Del horno</a>
          <a href="#experiencias">Experiencias</a>
          <a href="#cafe">El café</a>
          <a href="#circulo">El círculo</a>
        </nav>
      </header>

      <main>
        <section className="lead">
          <p className="kicker">Manifiesto</p>
          <h1>Un círculo para encontrarnos</h1>
          <p className="dek">
            Empezamos con pan de masa madre. Vamos hacia un café donde pasan cosas: talleres, clases de surf,
            cursos, gente trabajando junta. Y alrededor, los proyectos de nuestros vecinos.
          </p>
        </section>

        <section id="horno" className="feature">
          <div className="feature-head">
            <p className="kicker">Del horno</p>
            <h2>Pan de masa madre</h2>
            <p className="dek">Fermentación lenta, horneado por encargo. Elige, dinos para qué día, y lo tenemos listo.</p>
          </div>
          <OrderBread offerings={offerings} />
        </section>

        <div className="columns">
          <section id="experiencias" className="story">
            <p className="kicker">Experiencias</p>
            <h2>Al agua</h2>
            <p>
              Clases de surf con {allies.find(p => p.id === 'take-off')?.name ?? 'Take Off Surf School'}, nuestro primer
              aliado. Muy pronto podrás reservarlas aquí mismo.
            </p>
            <p className="soon">Reservas · próximamente</p>
          </section>

          <section id="cafe" className="story">
            <p className="kicker">El café</p>
            <h2>Un lugar para quedarse</h2>
            <p>
              Café, mesas largas y una comunidad de coworking junto a Branes. Talleres, cursos y encuentros
              que se agendan desde aquí.
            </p>
            <p className="soon">Abrimos pronto</p>
          </section>
        </div>

        <section id="circulo" className="circle">
          <p className="kicker">El círculo</p>
          <h2>Quiénes nos rodean</h2>
          <p className="dek">Divine Circle también es una vitrina para los emprendimientos de la zona.</p>
          <ul className="people">
            {[...allies, ...neighbors].map(p => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                {p.tagline && <span>{p.tagline}</span>}
                <em>{p.ring === 'aliado' ? 'Aliado' : 'Vecino'}{p.branes ? ' · Branes' : ''}</em>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="colophon">
        <img src={logo} alt="" className="foot-logo" />
        <p>Divine Circle · experiencias humanas</p>
      </footer>
    </>
  );
}
