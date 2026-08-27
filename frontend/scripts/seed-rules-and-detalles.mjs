import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Load environment variables
const envPath = path.resolve(__dirname, '../.env');
let envContent = '';
try {
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
} catch (e) {
  console.error('No se pudo leer el archivo .env:', e);
}

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL o VITE_SUPABASE_KEY no definidos en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Helper to transpile TS files to temp JS
function transpileTsToJs(srcFile, tempFile, exportsStr) {
  const tsPath = path.resolve(__dirname, '../src/data', srcFile);
  let content = fs.readFileSync(tsPath, 'utf8');

  // Slice out functions from detalleVariants.ts
  if (srcFile === 'detalleVariants.ts') {
    // 1. Remove helper functions
    const startIndex = content.indexOf('export function detalleEntriesByArea');
    const endIndex = content.indexOf('export interface BarraPotVariantItem');
    if (startIndex !== -1 && endIndex !== -1) {
      content = content.substring(0, startIndex) + content.substring(endIndex);
    }
    // 2. Remove updateDynamicVariants which is appended at the end
    const updateIndex = content.indexOf('export function updateDynamicVariants');
    if (updateIndex !== -1) {
      content = content.substring(0, updateIndex);
    }
  }

  const lines = content.split(/\r?\n/);
  const processedLines = [];
  let inInterface = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Skip import lines
    if (trimmed.startsWith('import ')) {
      continue;
    }

    // Skip interface declarations
    if (trimmed.startsWith('export interface ') || trimmed.startsWith('interface ')) {
      inInterface = true;
      continue;
    }

    if (inInterface) {
      if (trimmed === '}' || trimmed.startsWith('}')) {
        inInterface = false;
      }
      continue;
    }

    // Process type annotations on declaration lines: e.g. "export const NAME: TYPE = VALUE"
    const constMatch = line.match(/^export\s+const\s+([A-Za-z0-9_]+)\s*:\s*([^=]+)\s*=\s*(.*)$/);
    if (constMatch) {
      processedLines.push(`const ${constMatch[1]} = ${constMatch[3]}`);
    } else {
      const cleanLine = line.replace(/export\s+const/g, 'const');
      processedLines.push(cleanLine);
    }
  }

  let finalJsContent = processedLines.join('\n');
  // Append standard ES Module exports at the end
  finalJsContent += `\nexport { ${exportsStr} };`;

  const tempPath = path.resolve(__dirname, tempFile);
  fs.writeFileSync(tempPath, finalJsContent, 'utf8');
  return tempPath;
}

async function runSeed() {
  console.log('🌱 INICIANDO CARGA DE DATOS A SUPABASE...');

  // Transpile data files
  const tempRulesPath = transpileTsToJs('seedRules.ts', 'temp-rules.js', 'SEED_RULES, SEED_CANALIZADO_RULES');
  const tempVariantsPath = transpileTsToJs('detalleVariants.ts', 'temp-variants.js', 'DETALLE_VARIANTS_BY_AREA, BARRA_POT_VARIANTS_HUMEDA, BARRA_INST_VARIANTS_HUMEDA');

  try {
    // Import transpiled files dynamically
    const { SEED_RULES, SEED_CANALIZADO_RULES } = await import('./temp-rules.js');
    const { DETALLE_VARIANTS_BY_AREA, BARRA_POT_VARIANTS_HUMEDA, BARRA_INST_VARIANTS_HUMEDA } = await import('./temp-variants.js');

    // --- A. SEED RULES ---
    console.log('\n--- A. Poblando "takeoff_rules" ---');
    const rulesPayload = [];

    // Process PAT rules
    SEED_RULES.forEach((r, idx) => {
      rulesPayload.push({
        id: r.id,
        section: 'pat',
        trigger: r.trigger,
        subitems: r.subitems,
        order_index: idx
      });
    });

    // Process Canalizado rules
    SEED_CANALIZADO_RULES.forEach((r, idx) => {
      rulesPayload.push({
        id: r.id,
        section: 'canalizado',
        trigger: r.trigger,
        subitems: r.subitems,
        order_index: idx
      });
    });

    console.log(`Payload listo con ${rulesPayload.length} reglas.`);

    // Upsert rules to Supabase
    for (const rule of rulesPayload) {
      const { error } = await supabase.from('takeoff_rules').upsert(rule);
      if (error) {
        console.error(`❌ Error al subir regla ${rule.id}:`, error.message);
      } else {
        console.log(`✅ Regla guardada: [${rule.section.toUpperCase()}] ${rule.trigger}`);
      }
    }

    // --- B. SEED DETALLE VARIANTS ---
    console.log('\n--- B. Poblando "detalle_variants" ---');
    const variantsPayload = [];

    // 1. Process standard variants (AREA SECA and AREA HUEMDA)
    for (const [areaName, codeMap] of Object.entries(DETALLE_VARIANTS_BY_AREA)) {
      const dbArea = areaName === 'AREA HUEMDA' ? 'AREA HUMEDA' : areaName; // Standardize name to AREA HUMEDA in DB
      for (const [code, items] of Object.entries(codeMap)) {
        variantsPayload.push({
          id: `${dbArea.replace(/\s+/g, '_')}_${code.replace(/\//g, '_')}`,
          area: dbArea,
          category: 'CABLE_2_0',
          detalle_code: code,
          items: items
        });
      }
    }

    // 2. Process BARRA POT (AREA HUMEDA) variants
    for (const [code, items] of Object.entries(BARRA_POT_VARIANTS_HUMEDA)) {
      variantsPayload.push({
        id: `HUMEDA_POT_${code.replace(/\//g, '_')}`,
        area: 'AREA HUMEDA',
        category: 'BARRA_POT',
        detalle_code: code,
        items: items
      });
    }

    // 3. Process BARRA INST (AREA HUMEDA) variants
    for (const [code, items] of Object.entries(BARRA_INST_VARIANTS_HUMEDA)) {
      variantsPayload.push({
        id: `HUMEDA_INST_${code.replace(/\//g, '_')}`,
        area: 'AREA HUMEDA',
        category: 'BARRA_INST',
        detalle_code: code,
        items: items
      });
    }

    console.log(`Payload listo con ${variantsPayload.length} variantes de detalles.`);

    // Upsert detalle variants to Supabase
    for (const variant of variantsPayload) {
      const { error } = await supabase.from('detalle_variants').upsert(variant);
      if (error) {
        console.error(`❌ Error al subir variante ${variant.id}:`, error.message);
      } else {
        console.log(`✅ Variante guardada: [${variant.area}] [${variant.category}] Code: ${variant.detalle_code}`);
      }
    }

    console.log('\n🚀 DATOS DE REGLAS Y DETALLES POBLADOS EN SUPABASE CORRECTAMENTE!');

  } catch (err) {
    console.error('❌ Error fatal en el seeding:', err);
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(tempRulesPath)) fs.unlinkSync(tempRulesPath);
      if (fs.existsSync(tempVariantsPath)) fs.unlinkSync(tempVariantsPath);
      console.log('🧹 Limpieza de archivos temporales completada.');
    } catch (e) {
      console.error('Error de limpieza:', e);
    }
  }
}

runSeed();

