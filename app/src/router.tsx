import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/ui/AppLayout';
import { AppProvider } from '@/context/AppContext';
import { Home } from '@/pages/Home';
import { PathPage } from '@/pages/Path';
import { LessonPage } from '@/pages/Lesson';
import { ReviewPage } from '@/pages/Review';
import { VocabPage } from '@/pages/Vocab';
import { SettingsPage } from '@/pages/Settings';

function Shell() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

/**
 * Routage par # (VITE_ROUTER=hash) pour les hebergements statiques qui ne
 * savent pas rediriger les routes inconnues vers index.html.
 */
const useHash = import.meta.env.VITE_ROUTER === 'hash';
const createRouter = useHash ? createHashRouter : createBrowserRouter;

/**
 * Prefixe des URL. Le routage par # n'en a pas besoin, et une base relative
 * ("./", utilisee pour un fichier autonome) n'est pas un prefixe valide.
 */
function routerBasename(): string | undefined {
  if (useHash) return undefined;
  const base = import.meta.env.BASE_URL;
  if (!base || !base.startsWith('/') || base === '/') return undefined;
  return base.replace(/\/$/, '');
}

export const router = createRouter(
  [
    {
      path: '/',
      element: <Shell />,
      children: [
        { index: true, element: <Home /> },
        { path: 'parcours', element: <PathPage /> },
        { path: 'lecon/:lessonId', element: <LessonPage /> },
        { path: 'revision', element: <ReviewPage /> },
        { path: 'vocabulaire', element: <VocabPage /> },
        { path: 'reglages', element: <SettingsPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: routerBasename() },
);
