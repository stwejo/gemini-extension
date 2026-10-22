import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/ui/AppLayout';
import { AppProvider } from '@/context/AppContext';
import { Home } from '@/pages/Home';
import { PathPage } from '@/pages/Path';
import { LessonPage } from '@/pages/Lesson';
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
const createRouter = import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter;

export const router = createRouter(
  [
    {
      path: '/',
      element: <Shell />,
      children: [
        { index: true, element: <Home /> },
        { path: 'parcours', element: <PathPage /> },
        { path: 'lecon/:lessonId', element: <LessonPage /> },
        { path: 'vocabulaire', element: <VocabPage /> },
        { path: 'reglages', element: <SettingsPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || undefined },
);
