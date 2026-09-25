// Cifra y descifra los tokens de Spotify antes de guardarlos en Supabase.
// AES-256-GCM: rápido, seguro y con verificación de integridad (detecta
// manipulación). La clave vive SOLO en el .env del servidor, nunca en el repo.
// CommonJS a propósito: el backend (index.js) usa require().
const crypto = require('crypto');

const FORMATO_CLAVE = /^[0-9a-fA-F]{64}$/;

// La clave se lee al primer uso (no al importar) para fallar con un mensaje
// claro en vez de reventar el arranque por una clave ausente o malformada.
let claveCache = null;
function obtenerClave() {
    if (!claveCache) {
        const valor = process.env.TOKEN_ENCRYPTION_KEY || '';
        if (!FORMATO_CLAVE.test(valor)) {
            throw new Error(
                'TOKEN_ENCRYPTION_KEY debe ser un hex de 64 caracteres (32 bytes). Ver .env.example para generarla.'
            );
        }
        claveCache = Buffer.from(valor, 'hex');
    }
    return claveCache;
}

function cifrarToken(textoPlano) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', obtenerClave(), iv);
    const cifrado = Buffer.concat([cipher.update(textoPlano, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${cifrado.toString('base64')}`;
}

function descifrarToken(textoCifrado) {
    const partes = String(textoCifrado).split(':');
    if (partes.length !== 3) throw new Error('Formato de token cifrado inválido.');
    const [ivB64, authTagB64, dataB64] = partes;
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        obtenerClave(),
        Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const descifrado = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
    ]);
    return descifrado.toString('utf8');
}

// Compatibilidad con filas guardadas en texto plano antes del cifrado: si no
// descifra, se usa el valor tal cual (al renovar ya queda guardado cifrado).
function descifrarTokenSeguro(valor) {
    if (!valor) return valor;
    try {
        return descifrarToken(valor);
    } catch {
        return valor;
    }
}

module.exports = { cifrarToken, descifrarToken, descifrarTokenSeguro };
