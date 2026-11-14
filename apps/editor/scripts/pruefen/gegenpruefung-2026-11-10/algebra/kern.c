// Gegenprüfung „Lineare Algebra“: dieselben Rechenkerne wie in JavaScript (a4-kern.ts), in C — für den Vergleich nativ und als WebAssembly.
// Keine Bibliotheken, keine globalen Daten: alle Felder kommen als Zeiger (so lässt sich die Objektdatei auch ohne Linker als Modul laden).
typedef int i32;
typedef double f64;

// Zerlegen wie zerlegung.ts 210–280 (Baum, Muster, Werte). Arbeitsfelder vom Aufrufer: eltern, vorfahr, merk, anzahl, frei, muster, pfad (je n), x (n).
// Rückgabe: nnz(L) oder −1 − Zeile, wenn nicht positiv definit.
__attribute__((noinline)) i32 chol(i32 n, const i32 *Cp, const i32 *Ci, const f64 *Cx, i32 *Lp, i32 *Li, f64 *Lx, i32 *eltern, i32 *vorfahr, i32 *merk, i32 *anzahl,
                                   i32 *frei, i32 *muster, i32 *pfad, f64 *x) {
  for (i32 k = 0; k < n; k++) {
    eltern[k] = -1;
    vorfahr[k] = -1;
    merk[k] = -1;
    anzahl[k] = 1;
    x[k] = 0;
  }
  for (i32 k = 0; k < n; k++)
    for (i32 p = Cp[k]; p < Cp[k + 1] - 1; p++) {
      i32 i = Ci[p];
      while (i != -1 && i < k) {
        i32 weiter = vorfahr[i];
        vorfahr[i] = k;
        if (weiter == -1) eltern[i] = k;
        i = weiter;
      }
    }
  for (i32 k = 0; k < n; k++) {
    merk[k] = k;
    for (i32 p = Cp[k]; p < Cp[k + 1] - 1; p++) {
      i32 i = Ci[p];
      while (merk[i] != k) {
        anzahl[i]++;
        merk[i] = k;
        i = eltern[i];
      }
    }
  }
  Lp[0] = 0;
  for (i32 j = 0; j < n; j++) {
    Lp[j + 1] = Lp[j] + anzahl[j];
    frei[j] = Lp[j];
    merk[j] = -1;
  }
  for (i32 k = 0; k < n; k++) {
    i32 oben = n;
    merk[k] = k;
    for (i32 p = Cp[k]; p < Cp[k + 1]; p++) {
      i32 i = Ci[p];
      x[i] = Cx[p];
      if (i == k) continue;
      i32 len = 0;
      while (merk[i] != k) {
        pfad[len++] = i;
        merk[i] = k;
        i = eltern[i];
      }
      while (len > 0) muster[--oben] = pfad[--len];
    }
    f64 d = x[k];
    x[k] = 0;
    for (; oben < n; oben++) {
      i32 i = muster[oben];
      f64 lki = x[i] / Lx[Lp[i]];
      x[i] = 0;
      i32 ende = frei[i];
      for (i32 p = Lp[i] + 1; p < ende; p++) x[Li[p]] -= Lx[p] * lki;
      d -= lki * lki;
      frei[i] = ende + 1;
      Li[ende] = k;
      Lx[ende] = lki;
    }
    if (!(d > 0)) return -1 - k;
    i32 p = frei[k];
    frei[k] = p + 1;
    Li[p] = k;
    Lx[p] = __builtin_sqrt(d);
  }
  return Lp[n];
}

// wie der Code heute: k Spalten verschachtelt in einem Feld, innere Schleife über c (zerlegung.ts 289–310)
__attribute__((noinline)) void loesen_k(i32 n, const i32 *Lp, const i32 *Li, const f64 *Lx, f64 *B, i32 k) {
  for (i32 j = 0; j < n; j++) {
    f64 d = Lx[Lp[j]];
    i32 bj = k * j;
    for (i32 c = 0; c < k; c++) B[bj + c] = B[bj + c] / d;
    for (i32 p = Lp[j] + 1; p < Lp[j + 1]; p++) {
      f64 l = Lx[p];
      i32 bi = k * Li[p];
      for (i32 c = 0; c < k; c++) B[bi + c] = B[bi + c] - l * B[bj + c];
    }
  }
  for (i32 j = n - 1; j >= 0; j--) {
    i32 bj = k * j;
    for (i32 p = Lp[j] + 1; p < Lp[j + 1]; p++) {
      f64 l = Lx[p];
      i32 bi = k * Li[p];
      for (i32 c = 0; c < k; c++) B[bj + c] = B[bj + c] - l * B[bi + c];
    }
    f64 d = Lx[Lp[j]];
    for (i32 c = 0; c < k; c++) B[bj + c] = B[bj + c] / d;
  }
}

// drei Spalten ausgeschrieben, getrennte Felder (a4-kern.ts loesen3)
__attribute__((noinline)) void loesen3(i32 n, const i32 *Lp, const i32 *Li, const f64 *Lx, f64 *b0, f64 *b1, f64 *b2) {
  for (i32 j = 0; j < n; j++) {
    i32 a = Lp[j], e = Lp[j + 1];
    f64 d = 1 / Lx[a];
    f64 y0 = b0[j] * d, y1 = b1[j] * d, y2 = b2[j] * d;
    b0[j] = y0;
    b1[j] = y1;
    b2[j] = y2;
    for (i32 p = a + 1; p < e; p++) {
      f64 l = Lx[p];
      i32 i = Li[p];
      b0[i] -= l * y0;
      b1[i] -= l * y1;
      b2[i] -= l * y2;
    }
  }
  for (i32 j = n - 1; j >= 0; j--) {
    i32 a = Lp[j], e = Lp[j + 1];
    f64 s0 = b0[j], s1 = b1[j], s2 = b2[j];
    for (i32 p = a + 1; p < e; p++) {
      f64 l = Lx[p];
      i32 i = Li[p];
      s0 -= l * b0[i];
      s1 -= l * b1[i];
      s2 -= l * b2[i];
    }
    f64 d = 1 / Lx[a];
    b0[j] = s0 * d;
    b1[j] = s1 * d;
    b2[j] = s2 * d;
  }
}

// Superknoten (a4-kern.ts loesenSuper), y: Arbeitsfeld 3 · größte Breite
__attribute__((noinline)) void loesen_super(i32 anzahl, const i32 *j0, const i32 *s, const i32 *r, const i32 *oD, const i32 *oR, const i32 *oZ, const i32 *zeilen,
                                            const f64 *werte, f64 *b0, f64 *b1, f64 *b2, f64 *y) {
  for (i32 k = 0; k < anzahl; k++) {
    i32 a = j0[k], sk = s[k], rk = r[k];
    const f64 *D = werte + oD[k];
    for (i32 q = 0; q < sk; q++) {
      f64 t0 = b0[a + q], t1 = b1[a + q], t2 = b2[a + q];
      const f64 *z = D + q * sk;
      for (i32 c = 0; c < q; c++) {
        f64 l = z[c];
        t0 -= l * y[3 * c];
        t1 -= l * y[3 * c + 1];
        t2 -= l * y[3 * c + 2];
      }
      f64 d = 1 / z[q];
      t0 *= d;
      t1 *= d;
      t2 *= d;
      y[3 * q] = t0;
      y[3 * q + 1] = t1;
      y[3 * q + 2] = t2;
      b0[a + q] = t0;
      b1[a + q] = t1;
      b2[a + q] = t2;
    }
    const f64 *R = werte + oR[k];
    const i32 *Z = zeilen + oZ[k];
    for (i32 q = 0; q < rk; q++) {
      const f64 *z = R + q * sk;
      f64 t0 = 0, t1 = 0, t2 = 0;
      for (i32 c = 0; c < sk; c++) {
        f64 l = z[c];
        t0 += l * y[3 * c];
        t1 += l * y[3 * c + 1];
        t2 += l * y[3 * c + 2];
      }
      i32 i = Z[q];
      b0[i] -= t0;
      b1[i] -= t1;
      b2[i] -= t2;
    }
  }
  for (i32 k = anzahl - 1; k >= 0; k--) {
    i32 a = j0[k], sk = s[k], rk = r[k];
    const f64 *D = werte + oD[k];
    const f64 *R = werte + oR[k];
    const i32 *Z = zeilen + oZ[k];
    for (i32 c = 0; c < sk; c++) {
      y[3 * c] = b0[a + c];
      y[3 * c + 1] = b1[a + c];
      y[3 * c + 2] = b2[a + c];
    }
    for (i32 q = 0; q < rk; q++) {
      i32 i = Z[q];
      f64 x0 = b0[i], x1 = b1[i], x2 = b2[i];
      const f64 *z = R + q * sk;
      for (i32 c = 0; c < sk; c++) {
        f64 l = z[c];
        y[3 * c] -= l * x0;
        y[3 * c + 1] -= l * x1;
        y[3 * c + 2] -= l * x2;
      }
    }
    for (i32 q = sk - 1; q >= 0; q--) {
      const f64 *z = D + q * sk;
      f64 d = 1 / z[q];
      f64 x0 = y[3 * q] * d, x1 = y[3 * q + 1] * d, x2 = y[3 * q + 2] * d;
      b0[a + q] = x0;
      b1[a + q] = x1;
      b2[a + q] = x2;
      for (i32 c = 0; c < q; c++) {
        f64 l = z[c];
        y[3 * c] -= l * x0;
        y[3 * c + 1] -= l * x1;
        y[3 * c + 2] -= l * x2;
      }
    }
  }
}
