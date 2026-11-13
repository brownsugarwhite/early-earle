import { Ecke } from '../werkstatt/ecke.js';
import { starten } from './gemeinsam.js';
import { PAR } from '../parameter.js';
// Die Geistermaus spielt hier nur auf Wunsch (?), sonst stört sie den Start mit dem Stift
if (!PAR.has('geist')) PAR.set('geist', '0');
starten(Ecke, { grund: '#f6f3ee' });
