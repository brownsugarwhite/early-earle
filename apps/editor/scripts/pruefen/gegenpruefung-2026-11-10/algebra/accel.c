// Gegenprüfung „Lineare Algebra“: dieselbe Matrix mit einer ausgereiften nativen Bibliothek (Apple Accelerate, dünn besetzte Cholesky-
// Zerlegung mit Superknoten) — als Messpunkt für „natives Modul“. Aufruf: ./accel matrix-<n>.bin
#include <Accelerate/Accelerate.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef int i32;
typedef double f64;
static double jetzt(void) {
  struct timespec t;
  clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec * 1e3 + t.tv_nsec * 1e-6;
}
static int vgl(const void *a, const void *b) {
  double x = *(const double *)a, y = *(const double *)b;
  return x < y ? -1 : x > y;
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
  i32 n = kopf[0], nnzC = kopf[1], nnzL = kopf[2];
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
  (void)Lp;
  (void)Li;
  (void)Lx;
  // x0 steht am Ende der Datei
  f64 *x0 = (f64 *)(buf + len - (long)3 * n * sizeof(f64));
  long *cs = malloc(sizeof(long) * (n + 1));
  for (i32 k = 0; k <= n; k++) cs[k] = Cp[k];
  SparseAttributes_t attr = {0};
  attr.triangle = SparseUpperTriangle;
  attr.kind = SparseSymmetric;
  SparseMatrixStructure st = {.rowCount = n, .columnCount = n, .columnStarts = cs, .rowIndices = Ci, .attributes = attr, .blockSize = 1};
  SparseMatrix_Double A = {.structure = st, .data = Cx};
  printf("\n## %d Punkte (Apple Accelerate, dünn besetzte Cholesky-Zerlegung)\n", n);
  double t[32];
  SparseOpaqueFactorization_Double F;
  int w = 9;
  for (int k = 0; k < w; k++) {
    double a = jetzt();
    F = SparseFactor(SparseFactorizationCholesky, A);
    t[k] = jetzt() - a;
    if (F.status != SparseStatusOK) {
      printf("Status %d\n", F.status);
      return 4;
    }
    if (k + 1 < w) SparseCleanup(F);
  }
  qsort(t, w, sizeof(double), vgl);
  printf("Zerlegen ganz (Ordnung + symbolisch + Werte): Median %.2f ms, Minimum %.2f ms; Faktor %.1f MB (unser L: %.1f MB)\n", t[w / 2], t[0],
         F.symbolicFactorization.factorSize_Double * 8 / 1e6, nnzL * 12 / 1e6);
  for (int k = 0; k < w; k++) {
    double a = jetzt();
    SparseRefactor(A, &F);
    t[k] = jetzt() - a;
  }
  qsort(t, w, sizeof(double), vgl);
  printf("nur Werte neu (gleiches Muster, SparseRefactor): Median %.2f ms, Minimum %.2f ms\n", t[w / 2], t[0]);
  // Lösen, 3 Spalten
  f64 *B = malloc(sizeof(f64) * 3 * n);
  double ts[60];
  double abw = 0;
  for (int rep = 0; rep < 60; rep++) {
    double a = jetzt();
    // Spalten getrennt (spaltenweise dicht), rechte Seite in der Reihenfolge der Matrix (umgeordnet)
    for (i32 j = 0; j < n; j++)
      for (int c = 0; c < 3; c++) B[(long)c * n + j] = rhs[3 * perm[j] + c];
    DenseMatrix_Double X = {.rowCount = n, .columnCount = 3, .columnStride = n, .attributes = {0}, .data = B};
    SparseSolve(F, X);
    ts[rep] = jetzt() - a;
    if (rep == 0)
      for (i32 j = 0; j < n; j++)
        for (int c = 0; c < 3; c++) abw = fmax(abw, fabs(B[(long)c * n + j] - x0[3 * perm[j] + c]));
  }
  qsort(ts, 60, sizeof(double), vgl);
  printf("Lösen 3 Spalten: Median %.2f ms, Minimum %.2f ms; Unterschied zur JavaScript-Lösung %.1e\n", ts[30], ts[0], abw);
  return 0;
}
