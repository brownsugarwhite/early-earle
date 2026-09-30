import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { IS_NATIVE } from '../editor/content/target';
import { routeFromAppUrl } from './appUrl';

export { APP_SCHEME, routeFromAppUrl } from './appUrl';

/**
 * Deep links in the iOS app: opening `earlyearle://…` (Safari, Notes, Shortcuts, `xcrun simctl openurl`) jumps to
 * that route — at launch and while running. No-op on the web.
 */
export function useDeepLinks(): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!IS_NATIVE) return;
    let alive = true;
    const go = (url: string | undefined) => {
      const route = url ? routeFromAppUrl(url) : null;
      if (alive && route) navigate(route);
    };
    void App.getLaunchUrl()
      .then((r) => go(r?.url))
      .catch(() => undefined);
    const handle = App.addListener('appUrlOpen', (e: URLOpenListenerEvent) => go(e.url));
    return () => {
      alive = false;
      void handle.then((h) => h.remove()).catch(() => undefined);
    };
  }, [navigate]);
}
