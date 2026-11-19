// Canonical transport codec shared by production and isolated scratch recovery.
// Importing this module performs no storage, network or Game construction.
import { migrateSave } from './types.js?v=r1030-47acb64230b5';
export function serializeSave(save){return JSON.stringify({...save,updatedAt:Date.now()})}
export function deserializeSave(text){return migrateSave(JSON.parse(text))}
