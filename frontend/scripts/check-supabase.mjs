import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try reading .env from frontend/.env or root/.env
let envContent = '';
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
} catch (e) {
  // ignore
}

function getEnvVar(name) {
  if (process.env[name]) return process.env[name];
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_KEY') || getEnvVar('SUPABASE_KEY');

console.log('=============================================');
console.log('🔍 SUPABASE DATABASE DIAGNOSTIC TOOL');
console.log('=============================================');
console.log(`URL: ${supabaseUrl || '❌ NOT SET'}`);
console.log(`KEY: ${supabaseKey ? '✅ PRESENT (' + supabaseKey.slice(0, 10) + '...)' : '❌ NOT SET'}`);

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon-key')) {
  console.error('\n⚠️ Please set valid VITE_SUPABASE_URL and VITE_SUPABASE_KEY in frontend/.env to run this check.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log('\n--- 1. Testing Connection & "main_PAT_table" ---');
  try {
    const { data, error } = await supabase.from('main_PAT_table').select('*').limit(1);
    if (error) {
      console.error('❌ Error querying "main_PAT_table":', error.message);
      if (error.code === '42P01') {
        console.error('👉 The table "main_PAT_table" does NOT exist in the public schema!');
      } else if (error.code === '42501') {
        console.error('👉 Permission Denied: Row Level Security (RLS) is blocking read access for anon key.');
      }
    } else {
      console.log('✅ Successfully connected to "main_PAT_table".');
      console.log(`   Sample records found: ${data.length}`);
      if (data.length > 0) {
        console.log('   Columns detected in record:', Object.keys(data[0]).join(', '));
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error querying main_PAT_table:', err);
  }

  console.log('\n--- 2. Testing Dependent Table "planos_pat_spat" ---');
  try {
    const { data, error } = await supabase.from('planos_pat_spat').select('*').limit(1);
    if (error) {
      console.error('❌ Error querying "planos_pat_spat":', error.message);
      if (error.code === '42P01') {
        console.error('👉 WARNING: "planos_pat_spat" table does not exist!');
        console.error('   Note: The trigger "trg_fill_main_PAT_table" WILL FAIL if this table is missing.');
      }
    } else {
      console.log('✅ Table "planos_pat_spat" exists.');
      if (data.length > 0) {
        console.log('   Columns detected:', Object.keys(data[0]).join(', '));
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error querying planos_pat_spat:', err);
  }

  console.log('\n--- 3. Testing Schema Insert Permissions (Dry-run / Test Record) ---');
  try {
    const testItem = {
      material: 'P',
      plano: 'TEST-PLANO-001',
      rev: '0',
      tag_unico: 'TEST.TAG.01',
      tag_plano: 'TEST01',
      detalle: '151',
      description: 'DIAGNOSTIC TEST ITEM',
      qty: 1,
      metrado_ot: '1',
      unit: 'und',
      notes: 'Diagnostic verification',
      pkg_name: 'TEST PARTIDA'
    };

    const { data, error } = await supabase.from('main_PAT_table').insert([testItem]).select();
    if (error) {
      console.error('❌ Insert test failed:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
    } else {
      console.log('✅ Insert test SUCCEEDED! Row added with ID:', data[0]?.id);
      // Clean up test item
      if (data[0]?.id) {
        await supabase.from('main_PAT_table').delete().eq('id', data[0].id);
        console.log('🧹 Test row cleaned up successfully.');
      }
    }
  } catch (err) {
    console.error('❌ Insert test exception:', err);
  }

  console.log('\n=============================================');
  console.log('🏁 DIAGNOSTICS COMPLETE');
  console.log('=============================================');
}

runDiagnostics();

