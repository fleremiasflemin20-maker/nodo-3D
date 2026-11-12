/*
 * Lo propio de Nodo 3D sin Cloudflare: ids de modelos, alias, el mes en
 * Ecuador y el reparto del dinero entre creadores.
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aliasValido, deLista, idDeTitulo, idValido, mesEcuador, parrafos, repartir } from '../worker/logica.ts'
import { PROGRAMAS } from '../worker/catalogo.ts'

test('el id de un modelo sale del título, sin tildes, y siempre es válido', () => {
  const id = idDeTitulo('Engranaje helicoidal ñandú 20T — versión 2', new Uint8Array([0, 1, 2, 3]))
  assert.equal(id, 'engranaje-helicoidal-nandu-20t-version-2-abcd')
  assert.ok(idValido(id))
  assert.ok(idValido(idDeTitulo('¡¡¡!!!')), 'un título sin letras también da un id válido')
  assert.ok(idValido(idDeTitulo('x'.repeat(200))))
  assert.notEqual(idDeTitulo('Bisagra'), idDeTitulo('Bisagra'), 'dos modelos con el mismo título no chocan')
})

test('alias de creador', () => {
  assert.ok(aliasValido('modelos-quito'))
  assert.ok(aliasValido('abc'))
  assert.ok(!aliasValido('ab'))
  assert.ok(!aliasValido('-quito'))
  assert.ok(!aliasValido('quito-'))
  assert.ok(!aliasValido('dos--guiones'))
  assert.ok(!aliasValido('Mayus'))
  assert.ok(!aliasValido('con espacio'))
})

test('el mes se cuenta en hora de Ecuador', () => {
  // 1 de diciembre a las 03:00 UTC todavía es 30 de noviembre en Quito.
  assert.equal(mesEcuador(Date.parse('2026-12-01T03:00:00Z')), '2026-11')
  assert.equal(mesEcuador(Date.parse('2026-12-01T05:00:00Z')), '2026-12')
})

test('solo se guardan programas conocidos, sin repetir', () => {
  assert.deepEqual(deLista(['blender', 'blender', 'photoshop', 3, 'fusion'], PROGRAMAS), ['blender', 'fusion'])
  assert.deepEqual(deLista('blender', PROGRAMAS), [])
})

test('las descripciones conservan párrafos pero no huecos enormes', () => {
  assert.equal(parrafos('  Hola\r\n\n\n\n\nmundo   bonito ', 100), 'Hola\n\nmundo bonito')
})

test('reparto: el 60 % se divide según descargas y cuadra al centavo', () => {
  const r = repartir(100 * 4.99, 60, [
    { creador: 'a', descargas: 120 },
    { creador: 'b', descargas: 30 },
    { creador: 'c', descargas: 1 },
  ])
  assert.equal(r.bolsa, 299.4)
  assert.equal(r.total, 151)
  const suma = r.pagos.reduce((s, p) => s + Math.round(p.monto * 100), 0)
  assert.equal(suma, 29940, 'la suma de los pagos es exactamente la bolsa')
  assert.equal(r.pagos[0].creador, 'a')
  assert.ok(Math.abs(r.pagos[0].monto - 237.93) <= 0.01)
  assert.ok(r.pagos[2].monto > 0)
})

test('reparto sin descargas o sin dinero no paga a nadie', () => {
  assert.deepEqual(repartir(500, 60, []).pagos, [])
  assert.equal(repartir(0, 60, [{ creador: 'a', descargas: 9 }]).pagos[0].monto, 0)
  assert.equal(repartir(500, 60, [{ creador: 'a', descargas: 0 }]).pagos[0].monto, 0)
})
