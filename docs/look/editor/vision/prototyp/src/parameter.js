// Einstellungen aus der Adresse: ?form=vogel&layout=blatt … oder (im Artefakt) als Anker #vogel-blatt-leeredreht-ton
export const PAR = new URLSearchParams(location.search);
const FORMEN = ['kugel', 'vogel', 'fisch', 'kaputt'];
const LAYOUTS = ['raum', 'blatt', 'seite', 'front', 'top'];
for (const t of (location.hash || '').slice(1).split('-').filter(Boolean)) {
  if (FORMEN.includes(t)) PAR.set('form', t);
  else if (LAYOUTS.includes(t)) PAR.set('layout', t);
  else if (t === 'leeredreht') PAR.set('leere', 'drehen');
  else if (t === 'ton') PAR.set('ton', '1');
  else if (t === 'ohneseife') PAR.set('seife', '0');
  else if (t === 'zeigen') PAR.set('vorfuehren', 'formen');
  else if (t === 'ohnestift') PAR.set('start', '0');
}
