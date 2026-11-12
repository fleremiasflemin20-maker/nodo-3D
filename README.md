# Nodo 3D

Mercado de modelos 3D hechos por creadores de Ecuador. Es un proyecto hermano de la Biblioteca Flemin 3D, con su propio sitio.

- **Compradores:** se suscriben por **4.99 USD al mes** y descargan todo el catálogo.
- **Creadores:** publican gratis. Cada mes se reparte el **60 %** de lo recaudado entre ellos, según las descargas de sus modelos (una por persona y modelo al mes).
- **Administrador:** revisa cada modelo antes de publicarlo, activa a mano las suscripciones pagadas por transferencia o Deuna, y ve cuánto le toca a cada creador.

Corre en Cloudflare igual que la Biblioteca: la web es estática (React + Vite + Tailwind), un Worker atiende `/api/*`, las cuentas y los modelos están en una base D1 y los archivos en un almacén R2 privado. Las cuentas, sesiones y la suscripción con PayPal vienen del Club Flemin.

## Qué hay

| Página | Dirección | Para quién |
| --- | --- | --- |
| Portada | `#/` | Todos |
| Explorar (búsqueda, categoría, programa) | `#/explorar` | Todos |
| Ficha de modelo, con fotos, archivos y licencia | `#/modelo/<id>` | Todos (descargar: suscriptores) |
| Perfil público de un creador | `#/creador/<alias>` | Todos |
| Planes y pago | `#/planes` | Todos |
| Hacerse creador | `#/vender` | Con cuenta |
| Panel del creador: sus modelos y descargas por mes | `#/panel` | Creadores |
| Subir o editar un modelo | `#/panel/modelo/<id>` | Creadores |
| Revisión, cuentas y reparto del mes | `#/admin` | Administrador |
| Términos y licencias | `#/terminos` | Todos |

**Cómo publica un creador:**
1. Llena los datos del modelo.
2. Sube los archivos (STL, 3MF, OBJ, STEP, Blend, F3D, DWG, ZIP…, hasta 95 MB cada uno) y las fotos.
3. Lo envía a revisión.
4. El administrador lo aprueba o lo rechaza con un motivo.

Si un creador cambia un modelo que ya estaba publicado, vuelve a revisión.

**Cómo se reparte el dinero:** en `#/admin` → *Reparto del mes* escribes cuánto se recaudó de verdad. Si lo dejas vacío, se estima con los suscriptores activos × 4.99. La tabla te dice cuánto pagarle a cada creador, con sus datos bancarios. Los centavos siempre cuadran con la bolsa del 60 %.

## Ponerlo en línea (una sola vez)

Desde la PC, con la sesión de `wrangler` ya iniciada (la misma de la Biblioteca):

```bash
git clone https://github.com/fleremiasflemin20-maker/nodo-3D.git
cd nodo-3D
npm ci
npm run preparar     # crea la base D1 "nodo-3d" y el almacén R2 "nodo-3d-archivos"
git add wrangler.jsonc && git commit -m "Id de la base D1" && git push
npm run desplegar
```

Queda publicado en `https://nodo-3d.<tu-subdominio>.workers.dev`. Para un dominio propio (por ejemplo `nodo3d.ec`), se agrega en Cloudflare → Workers → nodo-3d → Dominios.

**Para actualizar después:** `git pull`, `npm ci` y `npm run desplegar`.

## Ajustes (wrangler.jsonc → vars)

| Variable | Qué es |
| --- | --- |
| `PRECIO` | Precio mensual que muestra la web (`4.99`) |
| `PORCENTAJE_CREADORES` | Parte que se reparte entre creadores (`60`) |
| `ADMIN_CORREOS` | Correos que ven el panel de administrador |
| `WHATSAPP` | Número para pagos manuales |
| `PAYPAL_CLIENT_ID`, `PAYPAL_PLAN_ID`, `PAYPAL_ENTORNO` | PayPal, cuando se configure. El secreto va con `npx wrangler secret put PAYPAL_SECRETO`, y el webhook apunta a `/api/paypal/webhook` |

Mientras PayPal no esté configurado, el botón de pago abre WhatsApp. Cuando llega el pago, lo activas en `#/admin` → *Cuentas y suscripciones* con 31 días.

## Probar en local

```bash
npm ci
echo 'ADMIN_CORREOS="tu@correo.com"' > .dev.vars   # para entrar como admin en local
npm run local                                      # http://localhost:8787
npm test                                           # contraseñas, suscripción, reparto, ids
```
