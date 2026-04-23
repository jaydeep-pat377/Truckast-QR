// Buffer must be global before fast-text-encoding loads,
// otherwise TextDecoder rejects 'latin1' (needed by jsPDF).
// Using require() to guarantee execution order (import is hoisted).
const { Buffer } = require('buffer');
global.Buffer = global.Buffer || Buffer;
require('fast-text-encoding');
