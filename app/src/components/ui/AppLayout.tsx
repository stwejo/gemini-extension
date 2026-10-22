import { NavLink, Outlet } from 'react-router-dom';
import { UpdatePrompt } from './UpdatePrompt';

const NAV = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/parcours', label: 'Parcours', icon: '🗺️' },
  { to: '/revision', label: 'Révision', icon: '🔁' },
  { to: '/vocabulaire', label: 'Mots', icon: '📒' },
  { to: '/reglages', label: 'Réglages', icon: '⚙️' },
];

/** Gabarit mobile : contenu + navigation basse. */
export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:block focus:bg-brand-600 focus:p-2 focus:text-white"
      >
        Aller au contenu
      </a>
      <main id="contenu" className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <UpdatePrompt />
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur"
        aria-label="Navigation principale"
      >
        <ul className="mx-auto flex max-w-2xl">
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-xs ${
                    isActive ? 'text-brand-700' : 'text-slate-600'
                  }`
                }
              >
                <span aria-hidden="true" className="text-lg">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
