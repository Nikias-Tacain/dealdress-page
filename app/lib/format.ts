export const toARS = (n: number) =>
  `$${new Intl.NumberFormat("es-AR").format(Math.max(0, Math.round(n)))}`;
