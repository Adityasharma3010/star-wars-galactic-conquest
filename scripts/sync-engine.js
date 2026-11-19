import { cp,mkdir } from 'node:fs/promises';
await mkdir('supabase/functions/galactic-api/_shared/game',{recursive:true});
await cp('src/game','supabase/functions/galactic-api/_shared/game',{recursive:true});
console.log('Shared JavaScript engine copied into the Edge Function.');
