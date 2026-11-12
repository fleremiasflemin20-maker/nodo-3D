-- Nodo 3D: cuentas, creadores, modelos, suscripciones y descargas.
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  correo TEXT NOT NULL UNIQUE,
  clave TEXT NOT NULL,          -- pbkdf2$iteraciones$sal$hash
  nombre TEXT NOT NULL,
  creado INTEGER NOT NULL
);

-- Quien vende sus modelos. Una cuenta es creador cuando tiene fila aquí.
CREATE TABLE IF NOT EXISTS creadores (
  usuario_id TEXT PRIMARY KEY,
  alias TEXT NOT NULL UNIQUE,   -- el de la dirección pública: /#/creador/<alias>
  bio TEXT,
  ciudad TEXT,
  programas TEXT NOT NULL,      -- JSON: ids de worker/catalogo.ts
  whatsapp TEXT,
  pago TEXT NOT NULL,           -- banco y cuenta para la transferencia mensual (solo lo ve el admin)
  acepto INTEGER NOT NULL,      -- cuándo aceptó que sus modelos son de su autoría
  creado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS modelos (
  id TEXT PRIMARY KEY,          -- slug del título + 4 letras
  creador_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  categoria TEXT NOT NULL,
  programas TEXT NOT NULL,      -- JSON
  licencia TEXT NOT NULL,
  imprimible INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL,         -- borrador | revision | publicado | rechazado
  motivo TEXT,                  -- por qué se rechazó
  portada TEXT,                 -- nombre de la imagen principal
  creado INTEGER NOT NULL,
  actualizado INTEGER NOT NULL,
  publicado INTEGER
);
CREATE INDEX IF NOT EXISTS modelos_estado ON modelos (estado, publicado);
CREATE INDEX IF NOT EXISTS modelos_creador ON modelos (creador_id);

CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,       -- SHA-256 del token de la cookie, nunca el token
  usuario_id TEXT NOT NULL,
  expira INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones (usuario_id);

CREATE TABLE IF NOT EXISTS suscripciones (
  usuario_id TEXT PRIMARY KEY,
  proveedor TEXT NOT NULL,      -- 'paypal' | 'manual'
  referencia TEXT,
  estado TEXT NOT NULL,
  vence INTEGER NOT NULL,
  actualizado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS suscripciones_ref ON suscripciones (referencia);

CREATE TABLE IF NOT EXISTS intentos (
  correo TEXT NOT NULL,
  fecha INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS intentos_correo ON intentos (correo, fecha);

-- Cada descarga de un suscriptor. El reparto cuenta una por persona, modelo y mes.
CREATE TABLE IF NOT EXISTS descargas (
  usuario_id TEXT NOT NULL,
  modelo_id TEXT NOT NULL,
  creador_id TEXT NOT NULL,
  archivo TEXT NOT NULL,
  mes TEXT NOT NULL,            -- 'AAAA-MM' en hora de Ecuador
  fecha INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS descargas_mes ON descargas (mes, creador_id);
CREATE INDEX IF NOT EXISTS descargas_modelo ON descargas (modelo_id);
