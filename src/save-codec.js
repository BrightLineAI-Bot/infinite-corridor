// Canonical transport codec shared by production and isolated scratch recovery.
// Importing this module performs no storage, network or Game construction.
import { migrateSave } from './types.js?v=r948-c8651a95a1b1';
export function serializeSave(save){return JSON.stringify({...save,updatedAt:Date.now()})}
export function deserializeSave(text){return migrateSave(JSON.parse(text))}
