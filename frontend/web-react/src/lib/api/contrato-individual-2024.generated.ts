// ARCHIVO GENERADO — NO EDITAR A MANO.
// Fuente: backend/app/evaluator/contrato_individual.py (CONTRATO_INDIVIDUAL).
// Regenerar: python -X utf8 scripts/gen_contrato_individual.py --regenerar
// Verificar:  python -X utf8 scripts/gen_contrato_individual.py --check

export interface MincienciasIndividualAdaptation2024 {
  modelo: string
  base_normativa: string
  anio_cierre: number
  investigador: {
    id: number
    identificacion: string
    antiguedad_anos: number
  }
  ind_investigador: number
  rango_teorico: number
  posicion_poblacion: {
    puesto: number
    de: number
    percentil: number
  }
  poblacion: {
    id: number
    investigador: string
    ind_investigador: number
  }[]
  indices: Record<string, number>
  terminos_ponderados: Record<string, number>
  ind_clase: Record<string, number>
  maximos_poblacion: Record<string, number>
  maximo_cohe_poblacion: number
  maximo_coop_poblacion: number
  subtipos: {
    codigo: string
    clase: string
    familia: string
    n: number
    periodo: number
    lambda: number
    ancla_subtipo: number | null
    peso_relativo: number
    peso_global: number
    termino: number
  }[]
  cohe: {
    suma_autores: number
    productos: number
    valor: number
  }
  coop: {
    suma_grupos: number
    productos: number
    valor: number
  }
  excluidos: Record<string, number>
  sin_ano: Record<string, number>
  fuera_de_periodo: Record<string, number>
  adaptaciones: string[]
  supuestos: string[]
}
