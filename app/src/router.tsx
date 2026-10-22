import { createBrowserRouter, Navigate } from 'react-router-dom';
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

export const router = createBrowserRouter(
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
