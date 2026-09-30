import { useEffect } from 'react';
import { acquireSplash, releaseSplash } from '../splash/SplashStage';

/**
 * Dünne Hülle um die Splash-Bühne (src/splash/SplashStage.ts): der Loader steht schon in index.html (außerhalb von
 * #root), die Bühne übernimmt ihn, spielt nach 100 % die Choreografie, wartet auf "Tippen" und übergibt den i-Punkt an
 * den 3D-Helden (`request('hop')`). Sichtbar nur in der Phase 'splash'; jede andere Phase blendet aus.
 */
export function FlowSplash() {
  useEffect(() => {
    acquireSplash();
    return () => releaseSplash();
  }, []);
  return null;
}
