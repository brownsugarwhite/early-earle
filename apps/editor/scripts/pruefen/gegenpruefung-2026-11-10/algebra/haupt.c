// Gegenprüfung „Lineare Algebra“: Messrahmen für kern.c (nativ). Aufruf: ./kern-nativ matrix-<n>.bin
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef int i32;
typedef double f64;
i32 chol(i32 n, const i32 *Cp, const i32 *Ci, const f64 *Cx, i32 *Lp, i32 *Li, f64 *Lx, i32 *eltern, i32 *vorfahr, i32 *merk, i32 *anzahl, i32 *frei, i32 *muster,
         i32 *pfad, f64 *x);
void loesen_k(i32 n, const i32 *Lp, const i32 *Li, const f64 *Lx, f64 *B, i32 k);
void loesen3(i32 n, const i32 *Lp, const i32 *Li, const f64 *Lx, f64 *b0, f64 *b1, f64 *b2);
void loesen_super(i32 anzahl, const i32 *j0, const i32 *s, const i32 *r, const i32 *oD, const i32 *oR, const i32 *oZ, const i32 *zeilen, const f64 *werte, f64 *b0,
                  f64 *b1, f64 *b2, f64 *y);

static double jetzt(void) {
  struct timespec t;
  clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec * 1e3 + t.tv_nsec * 1e-6;
}
static int vgl(const void *a, const void *b) {
  double x = *(const double *)a, y = *(const double *)b;
  return x < y ? -1 : x > y;
}
static void bericht(const char *name, double *t, int w, double abw) {
  qsort(t, w, sizeof(double), vgl);
  printf("| %s | %.2f | %.2f | %.1e |\n", name, t[w / 2], t[0], abw);
}

int main(int argc, char **argv) {
  FILE *f = fopen(argv[1], "rb");
  if (!f) return 1;
  fseek(f, 0, SEEK_END);
  long len = ftell(f);
  fseek(f, 0, SEEK_SET);
  char *buf = malloc(len);
  if (fread(buf, 1, len, f) != (size_t)len) return 2;
  fclose(f);
  i32 *kopf = (i32 *)buf;
  i32 n = kopf[0], nnzC = kopf[1], nnzL = kopf[2], nS = kopf[3], nW = kopf[4], nZ = kopf[5];
  long o = 24;
#define TEIL(typ, name, anz) \
  typ *name = (typ *)(buf + o); \
  o += (long)(anz) * sizeof(typ); \
  o += (8 - o % 8) % 8;
  TEIL(i32, Cp, n + 1)
  TEIL(i32, Ci, nnzC)
  TEIL(f64, Cx, nnzC)
  TEIL(i32, Lp, n + 1)
  TEIL(i32, Li, nnzL)
  TEIL(f64, Lx, nnzL)
  TEIL(i32, perm, n)
  TEIL(f64, rhs, 3 * n)
  TEIL(i32, j0, nS)
  TEIL(i32, s, nS)
  TEIL(i32, r, nS)
  TEIL(i32, oD, nS)
  TEIL(i32, oR, nS)
  TEIL(i32, oZ, nS)
  TEIL(i32, zeilen, nZ)
  TEIL(f64, werte, nW)
  TEIL(f64, x0, 3 * n)
  (void)nZ;
  if (o != len) {
    printf("Länge passt nicht: %ld gegen %ld\n", o, len);
    return 3;
  }
  printf("\n## %d Punkte, nnz(L) %d (nativ, clang)\n", n, nnzL);
  // Zerlegen
  i32 *Lp2 = malloc(sizeof(i32) * (n + 1)), *Li2 = malloc(sizeof(i32) * nnzL);
  f64 *Lx2 = malloc(sizeof(f64) * nnzL);
  i32 *w = malloc(sizeof(i32) * 7 * n);
  f64 *x = malloc(sizeof(f64) * n);
  double t[64];
  for (int k = 0; k < 9; k++) {
    double a = jetzt();
    i32 e = chol(n, Cp, Ci, Cx, Lp2, Li2, Lx2, w, w + n, w + 2 * n, w + 3 * n, w + 4 * n, w + 5 * n, w + 6 * n, x);
    t[k] = jetzt() - a;
    if (e != nnzL) printf("chol: %d statt %d\n", e, nnzL);
  }
  double dl = 0;
  for (i32 p = 0; p < nnzL; p++) dl = fmax(dl, fabs(Lx2[p] - Lx[p]));
  printf("| Kern | Median ms | Minimum ms | Unterschied zu JavaScript |\n| --- | --- | --- | --- |\n");
  bericht("Zerlegen (Baum + Muster + Werte)", t, 9, dl);
  // Lösen
  f64 *B = malloc(sizeof(f64) * 3 * n), *b0 = malloc(sizeof(f64) * n), *b1 = malloc(sizeof(f64) * n), *b2 = malloc(sizeof(f64) * n), *out = malloc(sizeof(f64) * 3 * n);
  f64 y[3 * 64];
  double tk[60], t3[60], ts[60];
  double ak = 0, a3 = 0, as = 0;
  for (int rep = 0; rep < 60; rep++) {
    double a = jetzt();
    for (i32 j = 0; j < n; j++)
      for (int c = 0; c < 3; c++) B[3 * j + c] = rhs[3 * perm[j] + c];
    loesen_k(n, Lp, Li, Lx, B, 3);
    for (i32 j = 0; j < n; j++)
      for (int c = 0; c < 3; c++) out[3 * perm[j] + c] = B[3 * j + c];
    tk[rep] = jetzt() - a;
    if (rep == 0)
      for (i32 i = 0; i < 3 * n; i++) ak = fmax(ak, fabs(out[i] - x0[i]));
    a = jetzt();
    for (i32 j = 0; j < n; j++) {
      i32 v = perm[j];
      b0[j] = rhs[3 * v];
      b1[j] = rhs[3 * v + 1];
      b2[j] = rhs[3 * v + 2];
    }
    loesen3(n, Lp, Li, Lx, b0, b1, b2);
    for (i32 j = 0; j < n; j++) {
      i32 v = perm[j];
      out[3 * v] = b0[j];
      out[3 * v + 1] = b1[j];
      out[3 * v + 2] = b2[j];
    }
    t3[rep] = jetzt() - a;
    if (rep == 0)
      for (i32 i = 0; i < 3 * n; i++) a3 = fmax(a3, fabs(out[i] - x0[i]));
    a = jetzt();
    for (i32 j = 0; j < n; j++) {
      i32 v = perm[j];
      b0[j] = rhs[3 * v];
      b1[j] = rhs[3 * v + 1];
      b2[j] = rhs[3 * v + 2];
    }
    loesen_super(nS, j0, s, r, oD, oR, oZ, zeilen, werte, b0, b1, b2, y);
    for (i32 j = 0; j < n; j++) {
      i32 v = perm[j];
      out[3 * v] = b0[j];
      out[3 * v + 1] = b1[j];
      out[3 * v + 2] = b2[j];
    }
    ts[rep] = jetzt() - a;
    if (rep == 0)
      for (i32 i = 0; i < 3 * n; i++) as = fmax(as, fabs(out[i] - x0[i]));
  }
  bericht("Lösen 3 Spalten, wie der Code heute (Schleife über c)", tk, 60, ak);
  bericht("Lösen 3 Spalten, ausgeschrieben, getrennte Felder", t3, 60, a3);
  bericht("Lösen 3 Spalten, Superknoten", ts, 60, as);
  return 0;
}
