export interface PartidaRecord {
  id?: string;
  actividad: string;
  area: string;
  item: string;
  forecastDesc: string;
  descripcion: string;
  und: string;
  createdAt?: string;
}

export interface SupabasePartidaRecord {
  id?: string;
  actividad: string;
  area: string;
  item: string;
  forecast_desc: string;
  descripcion: string;
  und: string;
  created_at?: string;
}

export interface SupabaseTakeoffRecord {
  id?: string;
  partida?: string;
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
