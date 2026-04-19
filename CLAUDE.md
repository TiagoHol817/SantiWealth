# Proyecto WealtHost - Guía de Contexto

- **Stack:** Next.js (App Router), Prisma ORM, TypeScript, Tailwind CSS, ShadcnUI.
- **Objetivo:** Plataforma profesional de gestión de patrimonio neto personal.
- **Datos Clave de Negocio:**
  - **Monedas:** Seguimiento dual en COP (Pesos Colombianos) y USD (Dólares).
  - **Meta Principal:** Alcanzar \$100,000 USD de patrimonio neto.
  - **Activos:** Clasificados en Efectivo, Bolsa, Cripto, Propiedad Raíz.
  - **Pasivos:** Principalmente deuda inmobiliaria.
  - **Deuda Específica (Apartamento Flandes):** Valor Total: \$280M COP. Deuda Restante Actual: \$239M COP.
- **Reglas de Desarrollo:**
  - Usar componentes funcionales y Server Components donde sea posible.
  - Mantener lógica de negocio (cálculos, conversiones) separada de la UI (`src/lib/services` o `src/utils`).
  - Implementar tipos de TypeScript estrictos para todas las entidades financieras.
  - No generar archivos de documentación adicionales (README.md) sin permiso.
