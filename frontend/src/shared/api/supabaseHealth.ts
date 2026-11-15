import { supabase, isSupabaseConfigured } from './supabase';

export interface TableCheckResult {
  tableName: string;
  readable: boolean;
  count?: number;
  writable?: boolean;
  error?: string;
}

export interface SupabaseHealthReport {
  isConfigured: boolean;
  endpointUrl: string;
  status: 'connected' | 'network_blocked' | 'error' | 'not_configured';
  latencyMs: number | null;
  errorMessage?: string;
  diagnosticTitle: string;
  diagnosticDetail: string;
  isFirewallBlocked: boolean;
  tables: TableCheckResult[];
  checkedAt: string;
}

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://bnjnvtbwfhmkryogebak.supabase.co';

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuam52dGJ3Zmhta3J5b2dlYmFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTU2ODEsImV4cCI6MjA5NTU5MTY4MX0.3f6gNxExATIHy-UnFCQN0LAcIXJLDQNxQmKkHNBoBVI';

/**
 * Executes a live health and diagnostic check against Supabase.
 * Checks reachability, SSL/Firewall interception, and table read permissions.
 * Never throws; always returns a structured SupabaseHealthReport.
 */
export async function testSupabaseHealth(): Promise<SupabaseHealthReport> {
  const timestamp = new Date().toLocaleTimeString();

  if (!isSupabaseConfigured() || !supabase) {
    return {
      isConfigured: false,
      endpointUrl: SUPABASE_URL || 'No configurado',
      status: 'not_configured',
      latencyMs: null,
      diagnosticTitle: 'Supabase no configurado',
      diagnosticDetail: 'Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_KEY en la configuración del entorno.',
      isFirewallBlocked: false,
      tables: [],
      checkedAt: timestamp
    };
  }

  const startTime = performance.now();
  let latencyMs: number | null = null;
  let isFirewallBlocked = false;
  let httpError: string | null = null;

  // 1. Direct fetch test to REST root with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const pingRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    latencyMs = Math.round(performance.now() - startTime);

    if (!pingRes.ok && pingRes.status !== 404) {
      httpError = `HTTP ${pingRes.status}: ${pingRes.statusText}`;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Typical corporate proxy / firewall SSL handshake intercept signs:
    if (
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('NetworkError') ||
      errorMsg.includes('abort') ||
      errorMsg.includes('SSL') ||
      errorMsg.includes('CERT')
    ) {
      isFirewallBlocked = true;
      httpError = 'Bloqueo de red corporativa / Cortafuegos (SSL Handshake / Conexión abortada)';
    } else {
      httpError = errorMsg;
    }
  }

  // 2. Query each critical table
  const tableChecks: TableCheckResult[] = [];
  const tablesToTest = ['takeoff_rules', 'detalle_variants', 'main_PAT_table'];

  if (!isFirewallBlocked && supabase) {
    for (const tbl of tablesToTest) {
      try {
        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de consulta (3s)')), 3000)
        );

        const queryPromise = supabase
          .from(tbl)
          .select('id', { count: 'exact', head: true });

        const result: any = await Promise.race([queryPromise, timeoutPromise]);

        if (result.error) {
          tableChecks.push({
            tableName: tbl,
            readable: false,
            error: result.error.message || 'Error en consulta PostgREST'
          });
        } else {
          tableChecks.push({
            tableName: tbl,
            readable: true,
            count: result.count ?? undefined
          });
        }
      } catch (tableErr: unknown) {
        const msg = tableErr instanceof Error ? tableErr.message : String(tableErr);
        if (msg.includes('Timeout') || msg.includes('Failed to fetch')) {
          isFirewallBlocked = true;
        }
        tableChecks.push({
          tableName: tbl,
          readable: false,
          error: msg
        });
      }
    }
  } else {
    for (const tbl of tablesToTest) {
      tableChecks.push({
        tableName: tbl,
        readable: false,
        error: isFirewallBlocked
          ? 'No accesible debido al bloqueo de red corporativo'
          : httpError || 'No probado'
      });
    }
  }

  if (isFirewallBlocked) {
    return {
      isConfigured: true,
      endpointUrl: SUPABASE_URL,
      status: 'network_blocked',
      latencyMs: null,
      errorMessage: httpError || 'Bloqueo de red detectado',
      diagnosticTitle: 'Bloqueado por Red Corporativa / Firewall',
      diagnosticDetail:
        'La red o proxy corporativo está bloqueando las conexiones SSL salientes hacia *.supabase.co (error TLS alert 40 o conexión interceptada). El sistema opera de manera 100% autónoma en modo Offline (LocalStorage) garantizando que tus reglas y metrados se guarden localmente sin pérdidas.',
      isFirewallBlocked: true,
      tables: tableChecks,
      checkedAt: timestamp
    };
  }

  if (httpError) {
    return {
      isConfigured: true,
      endpointUrl: SUPABASE_URL,
      status: 'error',
      latencyMs,
      errorMessage: httpError,
      diagnosticTitle: 'Error de Conexión a Supabase',
      diagnosticDetail: `El servidor respondió con un error: ${httpError}. La aplicación utilizará almacenamiento local para preservar tus datos.`,
      isFirewallBlocked: false,
      tables: tableChecks,
      checkedAt: timestamp
    };
  }

  const allReadable = tableChecks.every(t => t.readable);

  return {
    isConfigured: true,
    endpointUrl: SUPABASE_URL,
    status: allReadable ? 'connected' : 'error',
    latencyMs,
    diagnosticTitle: allReadable ? 'Supabase Conectado y Operativo' : 'Conexión Parcial',
    diagnosticDetail: allReadable
      ? 'La conexión con Supabase es estable y todas las tablas críticas están accesibles.'
      : 'Supabase es alcanzable pero una o más tablas devolvieron errores de lectura o permisos.',
    isFirewallBlocked: false,
    tables: tableChecks,
    checkedAt: timestamp
  };
}
