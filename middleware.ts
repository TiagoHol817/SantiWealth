// Next.js 16 with src/ directory resolves middleware from src/middleware.ts.
// This root file re-exports so both resolution paths work correctly.
export { middleware, config } from './src/middleware'
