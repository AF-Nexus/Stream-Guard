// Safe stub for the native libsql binary.
// @libsql/client/web uses fetch exclusively and never calls native methods,
// so replacing the native module with this no-op is safe on platforms
// where the prebuilt binary is unavailable (e.g. Render free tier).
module.exports = {};
