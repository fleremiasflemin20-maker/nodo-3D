/* Las listas fijas son las mismas que valida el Worker. */
export { CATEGORIAS, FORMATOS, IMAGENES, LICENCIAS, MAX_ARCHIVO, MAX_ARCHIVOS, MAX_IMAGEN, MAX_IMAGENES, PROGRAMAS, extension } from '../../worker/catalogo.ts'
import { CATEGORIAS, LICENCIAS, PROGRAMAS } from '../../worker/catalogo.ts'

export const nombreCategoria = (id: string) => CATEGORIAS.find((c) => c.id === id)?.nombre ?? id
export const nombrePrograma = (id: string) => PROGRAMAS.find((c) => c.id === id)?.nombre ?? id
export const licencia = (id: string) => LICENCIAS.find((c) => c.id === id)
