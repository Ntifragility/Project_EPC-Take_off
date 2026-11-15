import { supabase, isSupabaseConfigured } from './supabase';

export interface TableCheckResult {
  tableName: string;
  readable: boolean;
  count?: number;
  writable?: boolean;
  error?: string;
  writeError?: string;
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

interface TableProbeSpec {
  tableName: string;
  writePayload: Record<string, string>;
  nonexistentId: string;
}

const TABLE_PROBES: TableProbeSpec[] = [
  {
    tableName: 'takeoff_rules',
    writePayload: { trigger: '__probe__' },
    nonexistentId: '__health_check_nonexistent__'
  },
  {
    tableName: 'detalle_variants',
    writePayload: { area: '__probe__' },
    nonexistentId: '__health_check_nonexistent__'
  },
  {
    tableName: 'main_PAT_table',
    writePayload: { partida: '__probe__' },
    nonexistentId: '00000000-0000-0000-0000-000000000000'
  }
];

function isNetworkBlockError(msg: string): boolean {
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('abort') ||
    msg.includes('SSL') ||
    msg.includes('CERT') ||
    msg.includes('Timeout')
  );
}

/**
 * Executes a live health and diagnostic check against Supabase.
 * Checks reachability, SSL/Firewall interception, table read access, and non-destructive update permissions.
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
      diagnosticTitle: 'Base de Datos no configurada',
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

  // 1. Direct REST ping against an exposed table (avoids false 401 on PostgREST schema root)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const pingRes = await fetch(`${SUPABASE_URL}/rest/v1/takeoff_rules?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    latencyMs = Math.round(performance.now() - startTime);

    if (!pingRes.ok) {
      httpError = `HTTP ${pingRes.status}${pingRes.statusText ? `: ${pingRes.statusText}` : ''}`;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (isNetworkBlockError(errorMsg)) {
      isFirewallBlocked = true;
      httpError = 'Bloqueo de red corporativa / Cortafuegos (SSL Handshake / Conexión abortada)';
    } else {
      httpError = errorMsg;
    }
  }

  // 2. Query read + non-destructive update permissions for each critical table
  const tableChecks: TableCheckResult[] = [];

  if (!isFirewallBlocked && supabase) {
    for (const spec of TABLE_PROBES) {
      const { tableName, writePayload, nonexistentId } = spec;
      let readable = false;
      let count: number | undefined;
      let readError: string | undefined;
      let writable: boolean | undefined;
      let writeError: string | undefined;

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de consulta (3s)')), 3000)
        );
        const queryPromise = supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true });

        const result: any = await Promise.race([queryPromise, timeoutPromise]);
        if (result.error) {
          readError = result.error.message || 'Error en consulta PostgREST';
        } else {
          readable = true;
          count = result.count ?? undefined;
        }
      } catch (tableErr: unknown) {
        const msg = tableErr instanceof Error ? tableErr.message : String(tableErr);
        if (isNetworkBlockError(msg)) isFirewallBlocked = true;
        readError = msg;
      }

      if (readable && !isFirewallBlocked) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout de escritura (3s)')), 3000)
          );
          const updatePromise = supabase
            .from(tableName)
            .update(writePayload)
            .eq('id', nonexistentId);

          const writeRes: any = await Promise.race([updatePromise, timeoutPromise]);
          if (writeRes.error) {
            writable = false;
            writeError = writeRes.error.message || 'Actualización rechazada por RLS o permisos';
          } else {
            writable = true;
          }
        } catch (wErr: unknown) {
          const msg = wErr instanceof Error ? wErr.message : String(wErr);
          if (isNetworkBlockError(msg)) isFirewallBlocked = true;
          writable = false;
          writeError = msg;
        }
      }

      tableChecks.push({
        tableName,
        readable,
        count,
        writable,
        error: readError,
        writeError
      });
    }
  } else {
    for (const spec of TABLE_PROBES) {
      tableChecks.push({
        tableName: spec.tableName,
        readable: false,
        writable: false,
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
        'La red o proxy corporativo está bloqueando las conexiones SSL salientes hacia la Base de Datos. El sistema opera en modo Offline-First (LocalStorage) garantizando que tus reglas y metrados se guarden localmente sin pérdidas.',
      isFirewallBlocked: true,
      tables: tableChecks,
      checkedAt: timestamp
    };
  }

  const allReadable = tableChecks.every(t => t.readable);
  const anyReadable = tableChecks.some(t => t.readable);
  const allWritable = tableChecks.every(t => t.writable !== false);

  if (httpError && !anyReadable) {
    return {
      isConfigured: true,
      endpointUrl: SUPABASE_URL,
      status: 'error',
      latencyMs,
      errorMessage: httpError,
      diagnosticTitle: 'Error de Conexión a Base de Datos',
      diagnosticDetail: `El servidor respondió con un error: ${httpError}. La aplicación utilizará almacenamiento local para preservar tus datos.`,
      isFirewallBlocked: false,
      tables: tableChecks,
      checkedAt: timestamp
    };
  }

  if (allReadable && allWritable) {
    return {
      isConfigured: true,
      endpointUrl: SUPABASE_URL,
      status: 'connected',
      latencyMs,
      diagnosticTitle: 'Base de Datos Conectada y Operativa',
      diagnosticDetail:
        'La conexión HTTPS con la Base de Datos es estable y todas las tablas críticas admiten lectura y actualización sin restricciones.',
      isFirewallBlocked: false,
      tables: tableChecks,
      checkedAt: timestamp
    };
  }

  return {
    isConfigured: true,
    endpointUrl: SUPABASE_URL,
    status: 'error',
    latencyMs,
    errorMessage: !allWritable
      ? 'Una o más tablas rechazan actualizaciones (RLS / permisos)'
      : 'Una o más tablas no están accesibles',
    diagnosticTitle: allReadable ? 'Lectura OK · Actualización Restringida' : 'Conexión Parcial',
    diagnosticDetail: allReadable
      ? 'Las tablas permiten lectura, pero la Base de Datos está rechazando escrituras o actualizaciones en al menos una tabla.'
      : 'La Base de Datos es alcanzable, pero una o más tablas devolvieron errores de acceso.',
    isFirewallBlocked: false,
    tables: tableChecks,
    checkedAt: timestamp
  };
}
