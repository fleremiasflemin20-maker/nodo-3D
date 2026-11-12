/*
 * Las listas fijas de Nodo 3D: categorías, programas, formatos y licencias.
 * Las usan la web (para pintar filtros y formularios) y el Worker (para
 * guardar solo valores conocidos).
 */

export const CATEGORIAS = [
  { id: 'mecanica', nombre: 'Mecánica y repuestos' },
  { id: 'arquitectura', nombre: 'Arquitectura y maquetas' },
  { id: 'herramientas', nombre: 'Herramientas y utilidades' },
  { id: 'hogar', nombre: 'Hogar y oficina' },
  { id: 'personajes', nombre: 'Personajes y figuras' },
  { id: 'vehiculos', nombre: 'Vehículos' },
  { id: 'electronica', nombre: 'Electrónica y cajas' },
  { id: 'joyeria', nombre: 'Joyería y accesorios' },
  { id: 'escenarios', nombre: 'Escenarios y juegos de mesa' },
  { id: 'educacion', nombre: 'Educación y ciencia' },
] as const

/** Programas con los que se hizo el modelo. Solo se nombran para filtrar: Nodo 3D no tiene relación con sus marcas. */
export const PROGRAMAS = [
  { id: 'blender', nombre: 'Blender' },
  { id: 'fusion', nombre: 'Fusion' },
  { id: 'autocad', nombre: 'AutoCAD' },
  { id: 'solidworks', nombre: 'SolidWorks' },
  { id: 'freecad', nombre: 'FreeCAD' },
  { id: 'onshape', nombre: 'Onshape' },
  { id: 'sketchup', nombre: 'SketchUp' },
  { id: 'rhino', nombre: 'Rhino' },
  { id: 'zbrush', nombre: 'ZBrush' },
  { id: 'tinkercad', nombre: 'Tinkercad' },
  { id: 'otro', nombre: 'Otro' },
] as const

export const LICENCIAS = [
  { id: 'personal', nombre: 'Uso personal', detalle: 'Se puede imprimir y modificar para uso propio. No se puede vender ni compartir el archivo.' },
  { id: 'impresiones', nombre: 'Venta de impresiones', detalle: 'Además del uso personal, se pueden vender las piezas impresas. El archivo no se comparte.' },
  { id: 'cc-by-nc', nombre: 'CC BY-NC 4.0', detalle: 'Creative Commons: se comparte citando al autor, sin fines comerciales.' },
  { id: 'cc-by', nombre: 'CC BY 4.0', detalle: 'Creative Commons: cualquier uso, citando al autor.' },
] as const

/** Archivos de modelo que se aceptan, con su tipo para la descarga. */
export const FORMATOS: Record<string, string> = {
  stl: 'model/stl',
  '3mf': 'model/3mf',
  obj: 'model/obj',
  ply: 'application/octet-stream',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  fbx: 'application/octet-stream',
  blend: 'application/octet-stream',
  step: 'model/step',
  stp: 'model/step',
  iges: 'model/iges',
  igs: 'model/iges',
  f3d: 'application/octet-stream',
  f3z: 'application/octet-stream',
  dwg: 'image/vnd.dwg',
  dxf: 'image/vnd.dxf',
  skp: 'application/octet-stream',
  '3dm': 'application/octet-stream',
  fcstd: 'application/octet-stream',
  zip: 'application/zip',
  pdf: 'application/pdf',
}

export const IMAGENES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Cloudflare corta las peticiones de más de 100 MB en el plan gratuito. */
export const MAX_ARCHIVO = 95 * 1024 * 1024
export const MAX_IMAGEN = 8 * 1024 * 1024
export const MAX_ARCHIVOS = 20
export const MAX_IMAGENES = 8

export const extension = (nombre: string) => nombre.split('.').pop()?.toLowerCase() ?? ''
