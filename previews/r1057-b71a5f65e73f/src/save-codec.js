// Canonical transport codec shared by production and isolated scratch recovery.
// Importing this module performs no storage, network or Game construction.
import { migrateSave } from './types.js?v=r1057-b71a5f65e73f';
export function serializeSave(save){return JSON.stringify({...save,updatedAt:Date.now()})}
export function deserializeSave(text){return migrateSave(JSON.parse(text))}
