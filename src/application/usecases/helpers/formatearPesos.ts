/** Formatea centavos a pesos completos: 1500000 -> "$ 1.500.000 COP". */
export function formatearPesos(montoCents: number): string {
  const pesos = Math.round(montoCents / 100);
  return `$ ${pesos.toLocaleString('es-CO')} COP`;
}
