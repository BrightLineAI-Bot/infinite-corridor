// Canonical transport codec shared by production and isolated scratch recovery.
// Importing this module performs no storage, network or Game construction.
import { migrateSave } from './types.js?v=r905-303e02e3e709';
export function serializeSave(save){return JSON.stringify({...save,updatedAt:Date.now()})}
export function deserializeSave(text){return migrateSave(JSON.parse(text))}
