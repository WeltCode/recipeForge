import { getCurrency } from '../auth'

// Registro de monedas: símbolo + posición + nombre. El backend guarda solo el
// código ISO (CURRENCY_CHOICES en accounts/models.py); aquí resolvemos cómo se
// presenta. Mercados objetivo: España (EUR) + LATAM.
export const CURRENCIES = {
  EUR: { symbol: '€', before: false, name: 'Euro' },
  USD: { symbol: '$', before: true, name: 'Dólar' },
  GBP: { symbol: '£', before: true, name: 'Libra' },
  PEN: { symbol: 'S/', before: true, name: 'Sol peruano' },
  MXN: { symbol: '$', before: true, name: 'Peso mexicano' },
  COP: { symbol: '$', before: true, name: 'Peso colombiano' },
  ARS: { symbol: '$', before: true, name: 'Peso argentino' },
  CLP: { symbol: '$', before: true, name: 'Peso chileno' },
  BRL: { symbol: 'R$', before: true, name: 'Real brasileño' },
}

// Opciones para los <select> de moneda (código → etiqueta legible).
export const CURRENCY_OPTS = Object.entries(CURRENCIES).map(([code, c]) => [code, `${c.name} (${c.symbol})`])

export function currencyMeta(code) {
  return CURRENCIES[code] || CURRENCIES.EUR
}

// Símbolo de la moneda activa del restaurante (o la indicada).
export function currencySymbol(code) {
  return currencyMeta(code || getCurrency()).symbol
}

// Formatea un importe con la moneda activa: "17.99 €", "$17.99", "S/17.99".
export function money(v, code) {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '—'
  const c = currencyMeta(code || getCurrency())
  const n = Number(v).toFixed(2)
  return c.before ? `${c.symbol}${n}` : `${n} ${c.symbol}`
}
