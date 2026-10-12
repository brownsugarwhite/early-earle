// Bedien-Versuch Maul und Zähne (12.10.): Tabs über die Eckpunkte, Maullinie ab der Kontur zeichnen, Kiefer getrennt,
// offener Zustand im Tab Fressen, Öffnung in der Seitenleiste, Zahnanzahl und Zahnmenü.
import { type Page, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');

type V3 = [number, number, number];
type Linie = { knoten: { p: V3 }[] };
type Fenster = Window & {
  __editor?: { backend: string; vertices: () => number };
  __stores: {
    editor: { getState(): { dok: { maul?: { zu: { oben: Linie; unten?: Linie }; auf?: { oben: Linie; unten?: Linie } }; zaehne?: { oben: { anzahl: number; zaehne: { u: number; laenge: number }[] } } }; modus: string; gesteStart: unknown } };
    ui: { getState(): { ebene: string; oeffnung: number } };
  };
};

const R = 0.265; // Startkugel

async function bereit(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

const dok = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().dok);

/** Welt → Bildschirm in einer Ansicht, abgelesen an den Knoten der Startkugel (vorher im Form-Tab). */
async function abbildung(page: Page, ansicht: 'seite' | 'front') {
  const pkt = await page.locator(`.vp-ober[data-view="${ansicht}"] .knoten-punkt`).evaluateAll((els) =>
    els.map((e) => {
      const b = e.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }),
  );
  const xs = pkt.map((p) => p.x);
  const ys = pkt.map((p) => p.y);
  const oben = Math.min(...ys);
  const unten = Math.max(...ys);
  const s = (unten - oben) / (2 * R);
  // Seite: x = 0 in der Mitte der Kugel; Front: Achse = Knoten oben/unten
  const cx = ansicht === 'seite' ? (Math.min(...xs) + Math.max(...xs)) / 2 : pkt.find((p) => Math.abs(p.y - oben) < 1)!.x;
  return (w: { x: number; y: number }) => ({ x: cx + w.x * s, y: unten - w.y * s });
}

async function warteAufBau(page: Page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => !(window as unknown as Fenster).__stores.editor.getState().gesteStart);
  await page.waitForTimeout(900);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Maul-Tab: Linie ab der Kontur zeichnen, Kiefer getrennt, offen, Öffnung, Zähne', async ({ page }) => {
  await bereit(page);
  const seite = await abbildung(page, 'seite');
  const v0 = await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());

  // blauer Punkt = Maul-Tab in allen Ansichten
  await page.click('[data-view="seite"] [data-tab="maul"]');
  expect(await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().ebene)).toBe('maul');
  await expect(page.locator('[data-view="front"] [data-tab="maul"].aktiv')).toBeVisible();

  // Start knapp neben der Kontur (rastet auf die Außenkontur ein), dann zwei Punkte, Enter beendet
  const s0 = seite({ x: -R - 0.015, y: R * 0.8 });
  await page.mouse.click(s0.x, s0.y);
  const s1 = seite({ x: -R * 0.75, y: R * 0.7 });
  await page.mouse.click(s1.x, s1.y);
  const s2 = seite({ x: -R * 0.4, y: R * 0.66 });
  await page.mouse.click(s2.x, s2.y);
  await page.keyboard.press('Enter');
  let d = await dok(page);
  const zu = d.maul!.zu.oben.knoten;
  expect(zu).toHaveLength(3);
  expect(zu[0]!.p[2]).toBe(0);
  // Start auf der Kugel (Kontur), weitere Punkte mit Tiefe von der Fläche
  for (const k of zu) expect(Math.abs(Math.hypot(k.p[0], k.p[1] - R, k.p[2]) - R)).toBeLessThan(0.006);
  expect(zu[2]!.p[2]).toBeGreaterThan(0.1);
  // die Linie erscheint auch in Front und Top
  await expect(page.locator('.vp-ober[data-view="front"] .maul path').first()).toBeVisible();
  await expect(page.locator('.vp-ober[data-view="top"] .maul path').first()).toBeVisible();

  // 3D: Körper mit Maul (andere Vertexzahl als der Platzhalter)
  await warteAufBau(page);
  expect(await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices())).not.toBe(v0);
  await page.screenshot({ path: path.join(bilder, 'maul-tab-zu.png') });

  // Kiefer getrennt: rote Ober- und blaue Unterlippe
  await page.locator('.leiste').getByRole('button', { name: 'getrennt' }).click();
  d = await dok(page);
  expect(d.maul!.zu.unten?.knoten).toHaveLength(3);
  await warteAufBau(page);

  // Fressen = offener Zustand: Vorschlag, Unterlippe weiter öffnen (zweiten Knoten nach unten ziehen)
  await page.locator('.menueleiste').getByRole('button', { name: 'Fressen', exact: true }).click();
  const knoten = page.locator('.vp-ober[data-view="seite"] [data-maulknoten="unten:1"] .maul-punkt');
  const b = (await knoten.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 10, b.y + b.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  d = await dok(page);
  expect(d.maul!.auf?.unten?.knoten).toHaveLength(3);
  await warteAufBau(page);

  // Öffnung in der Seitenleiste
  await page.locator('.leiste .regler input[type="range"]').first().fill('0.7');
  expect(await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().oeffnung)).toBeCloseTo(0.7, 5);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(bilder, 'maul-tab-offen.png') });

  // oranger Punkt = Rig: vorgeschlagene Kiefergelenke
  await page.click('[data-view="creation"] [data-tab="rig"]');
  await expect(page.locator('.vp-ober[data-view="seite"] .rig circle').first()).toBeVisible();
  await page.screenshot({ path: path.join(bilder, 'rig-tab.png') });

  // brauner Punkt = Zähne (geschlossen): Anzahl je Kiefer, Umrisse in Seite und Front
  await page.locator('.menueleiste').getByRole('button', { name: 'Editor', exact: true }).click();
  await page.click('[data-view="front"] [data-tab="zaehne"]');
  for (let i = 0; i < 3; i++) await page.locator('.leiste').getByRole('button', { name: 'mehr Zähne oben' }).click();
  d = await dok(page);
  expect(d.zaehne?.oben.anzahl).toBe(3);
  expect(d.zaehne?.oben.zaehne).toHaveLength(2);
  // Front: Mittelzahn und Paar; Seite: Mittelzahn und rechter Zahn (der linke liegt dahinter)
  await expect(page.locator('.vp-ober[data-view="front"] [data-zahn]')).toHaveCount(3);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-zahn]')).toHaveCount(2);
  await warteAufBau(page);
  const vZaehne = await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());

  // Klick wählt den rechten Zahn (Untermenü), Ziehen nach hinten verschiebt ihn längs des Zahnfleischs
  const u0 = d.zaehne!.oben.zaehne[1]!.u;
  const zb = (await page.locator('.vp-ober[data-view="seite"] [data-zahn="oben:1"]').boundingBox())!;
  await page.mouse.move(zb.x + zb.width / 2, zb.y + zb.height / 2);
  await page.mouse.down();
  await page.mouse.move(zb.x + zb.width / 2 + 30, zb.y + zb.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.leiste .unterbereich')).toBeVisible();
  d = await dok(page);
  expect(d.zaehne!.oben.zaehne[1]!.u).toBeGreaterThan(u0 + 0.02);
  // Regler Länge im Untermenü: ein langer Zahn stößt geschlossen in den Unterkiefer und wird rot, mit Vorschlägen
  await page.locator('.leiste .unterbereich .regler input[type="range"]').first().fill('0.08');
  expect((await dok(page)).zaehne!.oben.zaehne[1]!.laenge).toBeCloseTo(0.08, 5);
  await warteAufBau(page);
  expect(await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices())).toBe(vZaehne);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-zahn="oben:1"][data-stoert]')).toHaveCount(1);
  await expect(page.locator('.leiste .befund .vorschlag').first()).toBeVisible();
  await page.screenshot({ path: path.join(bilder, 'zahn-tab.png') });
  // ersten Vorschlag übernehmen: danach stört der Zahn nicht mehr
  await page.locator('.leiste .befund .vorschlag').first().click();
  await warteAufBau(page);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-zahn="oben:1"][data-stoert]')).toHaveCount(0);

  // Rückgängig nimmt Schritte zurück (Vorschlag, Länge, Verschieben, Anzahl), Maul bleibt erhalten
  await page.keyboard.press('ControlOrMeta+z');
  expect((await dok(page)).zaehne!.oben.zaehne[1]!.laenge).toBeCloseTo(0.08, 5);
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  expect((await dok(page)).zaehne!.oben.zaehne[1]!.u).toBeCloseTo(u0, 6);
  await page.keyboard.press('ControlOrMeta+z');
  expect((await dok(page)).zaehne?.oben.anzahl).toBe(2);
  expect((await dok(page)).maul).toBeTruthy();
});

// Florian 12.10. abends: „Das Maul muss an der Umrisslinie direkt sitzen und ein Maulspalt muss entstehen, so wie bei
// der Fressen-Pose. Nur so kann ich sauber einen Über- oder Unterbiss erstellen.“
test('Maul an der Umrisslinie: Anfänge sind Umrissknoten, Spalt im Umriss, Unterbiss durch Ziehen', async ({ page }) => {
  await bereit(page);
  const seite = await abbildung(page, 'seite');
  type Seite = { profile: { seite: { knoten: { p: { x: number; y: number } }[] }; top: { knoten: { p: { x: number; y: number } }[] } } };
  const profile = () => page.evaluate(() => (window as unknown as { __stores: { editor: { getState(): { dok: Seite } } } }).__stores.editor.getState().dok.profile);
  const n0 = (await profile()).seite.knoten.length;

  await page.click('[data-view="seite"] [data-tab="maul"]');
  for (const w of [{ x: -R - 0.015, y: R * 0.8 }, { x: -R * 0.75, y: R * 0.7 }, { x: -R * 0.4, y: R * 0.66 }]) {
    const s = seite(w);
    await page.mouse.click(s.x, s.y);
  }
  await page.keyboard.press('Enter');
  // Anfang der Maullinie = neuer Knoten des Seitenumrisses
  let d = await dok(page);
  let pr = await profile();
  expect(pr.seite.knoten).toHaveLength(n0 + 1);
  const o0 = d.maul!.zu.oben.knoten[0]!.p;
  expect(pr.seite.knoten.some((k) => Math.hypot(k.p.x - o0[0], k.p.y - o0[1]) < 1e-9)).toBe(true);

  // getrennt: zweiter Knoten auf der Kinnseite, der Umriss zeigt den Spalt
  await page.locator('.leiste').getByRole('button', { name: 'getrennt' }).click();
  d = await dok(page);
  pr = await profile();
  expect(pr.seite.knoten).toHaveLength(n0 + 2);
  const u0 = d.maul!.zu.unten!.knoten[0]!.p;
  expect(u0[1]).toBeLessThan(o0[1]);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);

  // Unterbiss: blauen Anfang nach vorn ziehen – der Umrissknoten geht mit, der Anfang bleibt auf ihm
  const vorTop = Math.min(...pr.top.knoten.map((k) => k.p.x));
  const b = (await page.locator('.vp-ober[data-view="seite"] [data-maulknoten="unten:0"] .maul-punkt').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  d = await dok(page);
  pr = await profile();
  const u1 = d.maul!.zu.unten!.knoten[0]!.p;
  expect(u1[0]).toBeLessThan(u0[0] - 0.05);
  expect(pr.seite.knoten.some((k) => Math.hypot(k.p.x - u1[0], k.p.y - u1[1]) < 1e-9)).toBe(true);
  // Oberlippe bleibt, das Top folgt der neuen Länge (nur die Spitze)
  expect(d.maul!.zu.oben.knoten[0]!.p).toEqual(o0);
  expect(Math.min(...pr.top.knoten.map((k) => k.p.x))).toBeLessThan(vorTop - 0.05);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);
  await warteAufBau(page);
  await page.screenshot({ path: path.join(bilder, 'maul-unterbiss.png') });

  // ein Zug = ein Rückgängig-Schritt
  await page.keyboard.press('ControlOrMeta+z');
  d = await dok(page);
  expect(d.maul!.zu.unten!.knoten[0]!.p[0]).toBeCloseTo(u0[0], 9);
});

// Florian 12.10. nachts: „In der Fressenpose muss ich auch den Shape bearbeiten können!“
test('Fressen: Seitenform der Pose bearbeiten, geschlossener Umriss bleibt, offenes Maul im Umriss', async ({ page }) => {
  await bereit(page);
  const seite = await abbildung(page, 'seite');
  type P = { knoten: { p: { x: number; y: number } }[] };
  type D = { profile: { seite: P }; posenProfile?: { fressen?: { seite?: P } } };
  const dokument = () => page.evaluate(() => (window as unknown as { __stores: { editor: { getState(): { dok: D } } } }).__stores.editor.getState().dok);

  await page.click('[data-view="seite"] [data-tab="maul"]');
  for (const w of [{ x: -R - 0.015, y: R * 0.8 }, { x: -R * 0.75, y: R * 0.7 }, { x: -R * 0.4, y: R * 0.66 }]) {
    const s = seite(w);
    await page.mouse.click(s.x, s.y);
  }
  await page.keyboard.press('Enter');
  await page.locator('.leiste').getByRole('button', { name: 'getrennt' }).click();
  await warteAufBau(page);
  const zuVorher = (await dokument()).profile.seite;

  // Fressen, zurück zur Form: die Seite zeigt die Pose-Form mit offenem Maul im Umriss
  await page.locator('.menueleiste').getByRole('button', { name: 'Fressen', exact: true }).click();
  await page.click('[data-view="seite"] [data-tab="maul"]');
  await warteAufBau(page);
  await expect(page.locator('.leiste [data-posebereich]')).toBeVisible();
  await expect(page.locator('.leiste [data-poseform="folgt"]')).toBeVisible();
  await expect(page.locator('.vp-ober[data-view="seite"] .knoten-punkt')).toHaveCount(zuVorher.knoten.length);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);

  // tiefsten Punkt (Kinn/Bauch) nach unten ziehen: nur die Pose-Form ändert sich
  const punkte = await page.locator('.vp-ober[data-view="seite"] .knoten-punkt').evaluateAll((els) =>
    els.map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }),
  );
  const tief = punkte.reduce((a, q) => (q.y > a.y ? q : a));
  await page.mouse.move(tief.x, tief.y);
  await page.mouse.down();
  await page.mouse.move(tief.x, tief.y + 30, { steps: 6 });
  await page.mouse.up();
  let d = await dokument();
  expect(d.posenProfile?.fressen?.seite?.knoten).toHaveLength(d.profile.seite.knoten.length);
  const yMin = (p: P) => Math.min(...p.knoten.map((k) => k.p.y));
  expect(yMin(d.posenProfile!.fressen!.seite!)).toBeLessThan(yMin(zuVorher) - 0.03);
  expect(yMin(d.profile.seite)).toBeCloseTo(yMin(zuVorher), 9);
  await expect(page.locator('.leiste [data-poseform="eigen"]')).toBeVisible();
  await warteAufBau(page);
  await page.screenshot({ path: path.join(bilder, 'fressen-form.png') });

  // Editor-Tab: geschlossener Umriss unverändert; Rückgängig verwirft die Pose-Form wieder
  await page.locator('.menueleiste').getByRole('button', { name: 'Editor', exact: true }).click();
  d = await dokument();
  expect(yMin(d.profile.seite)).toBeCloseTo(yMin(zuVorher), 9);
  await page.keyboard.press('ControlOrMeta+z');
  d = await dokument();
  expect(d.posenProfile?.fressen?.seite).toBeUndefined();
});

// Florian 12.10. nachts: „Das Maul macht auch kein Loch in den Shape mehr, bei Fressen sind die Kiefer nichtmal mehr mit
// dem Shape verbunden.“ Älteres Maul (Anfänge nicht auf Umrisspunkten), Bauweise Wirbelsäule, Fressen, Lippen ziehen.
test('Fressen: Kiefer bleiben mit der Form verbunden, Umriss zeigt den Spalt (auch bei älteren Mäulern)', async ({ page }) => {
  await bereit(page);
  type K3 = { p: [number, number, number]; ein: [number, number, number]; aus: [number, number, number]; art: 'glatt' };
  type P = { knoten: { p: { x: number; y: number } }[] };
  type D = { profile: { seite: P }; maul?: { zu: { oben: { knoten: K3[] }; unten?: { knoten: K3[] } }; auf?: { oben: { knoten: K3[] }; unten?: { knoten: K3[] } } }; posenProfile?: { fressen?: { seite?: P } } };
  const dokument = () => page.evaluate(() => (window as unknown as { __stores: { editor: { getState(): { dok: D } } } }).__stores.editor.getState().dok);
  // Langhals mit einem Maul, dessen Anfänge knapp neben dem Umriss liegen (wie vor dem Umbau gezeichnet)
  await page.evaluate(async () => {
    const v = (await (await fetch('/versuch/langhals/langhals.json')).json()) as { profile: Record<string, { knoten: { p: { x: number; y: number } }[] }> };
    const seite = v.profile.seite!;
    const spitze = seite.knoten.reduce((a, k) => (k.p.x < a.p.x ? k : a)).p;
    const k = (x: number, y: number, z: number) => ({ p: [x, y, z], ein: [0, 0, 0], aus: [0, 0, 0], art: 'glatt' });
    const oben = { knoten: [k(spitze.x + 0.004, spitze.y - 0.003, 0), k(spitze.x + 0.05, spitze.y - 0.008, 0.03), k(spitze.x + 0.1, spitze.y - 0.004, 0.045)] };
    const unten = { knoten: [k(spitze.x + 0.006, spitze.y - 0.012, 0), k(spitze.x + 0.05, spitze.y - 0.016, 0.03), k(spitze.x + 0.1, spitze.y - 0.004, 0.045)] };
    const st = (window as unknown as { __stores: { editor: { getState(): { dok: Record<string, unknown>; laden(d: unknown, f: null): void } } } }).__stores.editor.getState();
    st.laden({ ...st.dok, name: 'Langhals', profile: { seite, front: v.profile.front, top: v.profile.top }, maul: { zu: { oben, unten } } }, null);
  });
  // beim Laden repariert: beide Anfänge sind Knoten des Umrisses
  let d = await dokument();
  const istKnoten = (pr: P, p: [number, number, number]) => pr.knoten.some((q) => Math.hypot(q.p.x - p[0], q.p.y - p[1]) < 1e-9);
  expect(istKnoten(d.profile.seite, d.maul!.zu.oben.knoten[0]!.p)).toBe(true);
  expect(istKnoten(d.profile.seite, d.maul!.zu.unten!.knoten[0]!.p)).toBe(true);

  await page.click('[data-view="creation"] [data-bauweise="wirbel"]');
  await warteAufBau(page);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);
  // Fressen: Umriss mit offenem Maul
  await page.locator('.menueleiste').getByRole('button', { name: 'Fressen', exact: true }).click();
  await warteAufBau(page);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);

  // offene Unterlippe: Anfang nach unten ziehen – die Pose-Form geht mit, der Spalt bleibt
  await page.click('[data-view="seite"] [data-tab="maul"]');
  const b = (await page.locator('.vp-ober[data-view="seite"] [data-maulknoten="unten:0"] .maul-punkt').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 10, b.y + b.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await warteAufBau(page);
  d = await dokument();
  const pose = d.posenProfile?.fressen?.seite;
  expect(pose).toBeDefined();
  expect(istKnoten(pose!, d.maul!.auf!.unten!.knoten[0]!.p)).toBe(true);
  expect(istKnoten(pose!, d.maul!.auf!.oben.knoten[0]!.p)).toBe(true);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);
  // mittleren Punkt der offenen Unterlippe ziehen: Anfänge bleiben verbunden
  const m = (await page.locator('.vp-ober[data-view="seite"] [data-maulknoten="unten:1"] .maul-punkt').boundingBox())!;
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2);
  await page.mouse.down();
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2 + 25, { steps: 6 });
  await page.mouse.up();
  await warteAufBau(page);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);
  // gestrichelter 3D-Umriss kommt vom Körper mit Maul
  await expect(page.locator('.vp-ober[data-view="seite"] [data-wirbelumriss]')).toHaveCount(1);
  await page.screenshot({ path: path.join(bilder, 'fressen-verbunden.png') });
});

// 12.10. nachts: Beginnt das Maul an der Unterseite des Kopfes (beide Umriss-Nachbarn gleich hoch), lag der zweite
// Maulanfang auf der Schnauzenseite – offen hing die Schnauze am Kinn. Jetzt zählt der Winkel zur Maulrichtung.
test('Fressen: Maul an der Kopfunterseite (Kiefer gleich) – Schnauze bleibt oben, Kinn ohne Delle', async ({ page }) => {
  await bereit(page);
  type Kn = { p: { x: number; y: number }; ein: { x: number; y: number }; aus: { x: number; y: number } };
  await page.evaluate(async () => {
    const v = (await (await fetch('/versuch/langhals/langhals.json')).json()) as { profile: Record<string, unknown> };
    const st = (window as unknown as { __stores: { editor: { getState(): { dok: Record<string, unknown>; laden(d: unknown, f: null): void } } } }).__stores.editor.getState();
    st.laden({ ...st.dok, name: 'Langhals', profile: { seite: v.profile.seite, front: v.profile.front, top: v.profile.top } }, null);
  });
  await page.click('[data-view="creation"] [data-bauweise="wirbel"]');
  await warteAufBau(page);
  // Welt → Bildschirm aus den Umrissknoten der Seite
  const paare = await page.evaluate(() => {
    const kn = (window as unknown as { __stores: { editor: { getState(): { dok: { profile: { seite: { knoten: Kn[] } } } } } } }).__stores.editor.getState().dok.profile.seite.knoten;
    return Array.from(document.querySelectorAll('.vp-ober[data-view="seite"] .knoten-punkt')).map((e, i) => {
      const b = e.getBoundingClientRect();
      return { w: kn[i]!.p, s: { x: b.x + b.width / 2, y: b.y + b.height / 2 } };
    });
  });
  const a = paare[0]!;
  const b = paare.reduce((m, q) => (Math.hypot(q.w.x - a.w.x, q.w.y - a.w.y) > Math.hypot(m.w.x - a.w.x, m.w.y - a.w.y) ? q : m));
  const bild = (x: number, y: number) => ({ x: a.s.x + ((x - a.w.x) * (b.s.x - a.s.x)) / (b.w.x - a.w.x), y: a.s.y + ((y - a.w.y) * (b.s.y - a.s.y)) / (b.w.y - a.w.y) });
  const spitze = paare.reduce((m, q) => (q.w.x < m.w.x ? q : m)).w;
  // Maul ab der Kopfunterseite, gut hinter der Schnauzenspitze, nach hinten oben
  await page.click('[data-view="seite"] [data-tab="maul"]');
  for (const q of [bild(spitze.x + 0.06, spitze.y - 0.06), bild(spitze.x + 0.12, spitze.y - 0.01), bild(spitze.x + 0.19, spitze.y + 0.01)]) await page.mouse.click(q.x, q.y);
  await page.keyboard.press('Enter');
  await warteAufBau(page);
  await page.locator('.menueleiste').getByRole('button', { name: 'Fressen', exact: true }).click();
  await warteAufBau(page);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-maulspalt]')).toHaveCount(1);
  const modul = '/src/maul/fressenForm.ts';
  const r = await page.evaluate(async (m) => {
    const ff = (await import(/* @vite-ignore */ m)) as { poseSeite(d: unknown): { knoten: Kn[] }; poseSpaltIndizes(d: unknown): { oben: number; unten: number } | null };
    const d = (window as unknown as { __stores: { editor: { getState(): { dok: unknown } } } }).__stores.editor.getState().dok;
    return { pose: ff.poseSeite(d).knoten, ind: ff.poseSpaltIndizes(d) };
  }, modul);
  expect(r.ind).not.toBeNull();
  const n = r.pose.length;
  const { oben, unten } = r.ind!;
  const kinnSeite = (unten - oben + n) % n === 1 ? 1 : -1;
  const aussenOben = r.pose[(oben - kinnSeite + n) % n]!;
  const aussenUnten = r.pose[(unten + kinnSeite + n) % n]!;
  const o = r.pose[oben]!.p;
  const u = r.pose[unten]!.p;
  // Oberkiefer-Anfang hängt an der Schnauze (vorn), das Kinn am Unterkiefer (hinten), das Kinn liegt tiefer
  expect(aussenOben.p.x).toBeLessThan(o.x);
  expect(aussenUnten.p.x).toBeGreaterThan(u.x);
  expect(u.y).toBeLessThan(o.y - 0.02);
  // keine Delle unterm Kinn: das Stück vom Kinn zum Unterkiefer bleibt über dem Kinn (abzüglich 1 %)
  const [k0, k3] = kinnSeite === 1 ? [r.pose[unten]!, aussenUnten] : [aussenUnten, r.pose[unten]!];
  const c1 = { x: k0.p.x + k0.aus.x, y: k0.p.y + k0.aus.y };
  const c2 = { x: k3.p.x + k3.ein.x, y: k3.p.y + k3.ein.y };
  let tiefst = Infinity;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const s = 1 - t;
    tiefst = Math.min(tiefst, s * s * s * k0.p.y + 3 * s * s * t * c1.y + 3 * s * t * t * c2.y + t * t * t * k3.p.y);
  }
  expect(tiefst).toBeGreaterThan(u.y - 0.01);
  await page.screenshot({ path: path.join(bilder, 'fressen-unterseite.png') });
});
