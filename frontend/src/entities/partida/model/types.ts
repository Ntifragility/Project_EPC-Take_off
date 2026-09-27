export interface PartidaRecord {
  id?: string;
  actividad: string;
  /** WBS area code, e.g. "3000". Legacy field `area` kept as alias. */
  wbs: string;
  area: string;
  /** PARTIDA SICME code, e.g. "6.3". Legacy field `item` kept as alias. */
  partidaSicme: string;
  item: string;
  partidaBalance: string;
  forecastDesc: string;
  /** DESCRIPCIÓN BM. Legacy field `descripcion` kept as alias. */
  descripcionBm: string;
  descripcion: string;
  und: string;
  createdAt?: string;
}

export interface SupabasePartidaRecord {
  id?: string;
  actividad: string;
  wbs: string;
  area: string;
  partida_sicme: string;
  item: string;
  partida_balance: string;
  forecast_desc: string;
  descripcion_bm: string;
  descripcion: string;
  und: string;
  created_at?: string;
}

export interface SupabaseTakeoffRecord {
  id?: string;
  partida?: string;
  partida_balance?: string;
  item_group: string;
  material: string;
  plano: string;
  rev: string;
  tag_unico: string;
  tag_plano: string;
  detalle: string;
  descripcion: string;
  cantidad: number | null;
  metrado_ot: string;
  und: string;
  comentarios?: string;
  created_at?: string;
}
