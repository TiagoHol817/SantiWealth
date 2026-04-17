# 🚀 Arquitectura: Versión Pública (Startup)

## 📋 Resumen Ejecutivo

**Producto**: App de Finanzas Personales  
**Modelo**: Freemium (gratis con features premium)  
**Target**: Usuarios hispanohablantes que buscan control financiero simple y visual  
**Tech Stack**: Next.js 14+, Supabase, TypeScript, Tailwind CSS

---

## 🎯 Modelo de Negocio: Freemium

### **Free Tier** (Gratis)
✅ Dashboard básico de patrimonio  
✅ Hasta 3 cuentas bancarias  
✅ Transacciones ilimitadas  
✅ Categorización manual  
✅ Gráficos básicos (30 días)  
✅ Exportar CSV  

### **Premium Tier** ($9.99/mes o $99/año)
✨ Cuentas ilimitadas  
✨ Inversiones en tiempo real (Yahoo Finance API)  
✨ Criptomonedas con tracking  
✨ Gráficos avanzados (90+ días, múltiples vistas)  
✨ Reportes PDF profesionales  
✨ Multi-moneda con TRM automática  
✨ Categorización automática con IA  
✨ Metas financieras y proyecciones  
✨ Alertas personalizadas  
✨ Soporte prioritario  

---

## 🏗️ Diferencias: Versión Personal vs Pública

### **Eliminar de la versión pública:**
❌ Referencias específicas (ej: "Flandes", nombres personales)  
❌ Datos hardcodeados específicos de un usuario  
❌ Tipos de cuenta muy específicos (CDT - hacer genérico como "Inversión fija")  
❌ Configuraciones pre-establecidas  

### **Agregar a la versión pública:**
✅ Sistema de autenticación multi-usuario (Supabase Auth)  
✅ Onboarding interactivo para nuevos usuarios  
✅ Row Level Security (RLS) en todas las tablas  
✅ Configuración de preferencias por usuario  
✅ Soporte para múltiples idiomas (español/inglés)  
✅ Landing page y marketing  
✅ Sistema de suscripciones (Stripe)  
✅ Panel de administración  

---

## 🗄️ Arquitectura de Base de Datos (Supabase)

### **Tablas principales (con RLS):**

```sql
-- Usuarios (manejado por Supabase Auth)
auth.users

-- Perfiles de usuario
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  full_name TEXT,
  email TEXT,
  subscription_tier TEXT DEFAULT 'free', -- 'free' | 'premium'
  subscription_ends_at TIMESTAMP,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Cuentas (con límite por tier)
accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'bank' | 'cash' | 'investment' | 'crypto' | 'liability'
  currency TEXT DEFAULT 'COP',
  current_balance DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW()
)

-- Transacciones
transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  account_id UUID REFERENCES accounts,
  type TEXT NOT NULL, -- 'income' | 'expense' | 'transfer'
  category TEXT,
  amount DECIMAL(15,2),
  currency TEXT DEFAULT 'COP',
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Inversiones (solo premium)
investments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  ticker TEXT NOT NULL,
  shares DECIMAL(15,8),
  avg_cost DECIMAL(15,4),
  type TEXT, -- 'stock' | 'crypto'
  created_at TIMESTAMP DEFAULT NOW()
)

-- Historial de patrimonio
patrimony_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  net_worth_cop DECIMAL(15,2),
  total_banks DECIMAL(15,2),
  total_stocks DECIMAL(15,2),
  total_crypto DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
)

-- Suscripciones (Stripe)
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT, -- 'active' | 'canceled' | 'past_due'
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### **RLS Policies (crítico para seguridad):**

```sql
-- Ejemplo: Solo el usuario puede ver sus propias cuentas
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Aplicar similar para todas las tablas
```

---

## 🔐 Prioridad 1: Autenticación y Seguridad

### **Features críticos:**
1. **Supabase Auth** - Email/password + Google OAuth
2. **Row Level Security (RLS)** - Aislamiento total de datos entre usuarios
3. **Rate limiting** - Prevenir abuso de API
4. **Encriptación** - Datos sensibles en reposo
5. **2FA opcional** (premium)
6. **Session management** - Expiración y refresh tokens

### **Flujo de registro:**
```
1. Usuario visita landing page
2. Click en "Empezar gratis"
3. Registro con email + contraseña (o Google)
4. Verificación de email
5. Onboarding interactivo (paso a paso)
6. Acceso al dashboard con datos de ejemplo
```

---

## 🎓 Prioridad 2: Onboarding y Tutorial

### **Wizard inicial (5 pasos):**

**Paso 1: Bienvenida**
- Explicar la propuesta de valor
- Mostrar screenshot del dashboard

**Paso 2: Primera cuenta**
- "Agrega tu cuenta principal"
- Formulario simple: Nombre, Tipo, Saldo actual

**Paso 3: Primera transacción**
- "Registra un gasto reciente"
- Formulario: Monto, Categoría, Descripción

**Paso 4: Tour del dashboard**
- Tooltips interactivos explicando cada sección
- "Aquí ves tu patrimonio", "Aquí tus transacciones", etc.

**Paso 5: Invitación a Premium**
- Mostrar features premium
- CTA: "Probar 14 días gratis" o "Seguir con Free"

### **Datos de ejemplo (demo mode):**
Para que el usuario vea la app "viva" al registrarse:
- 2 cuentas pre-cargadas (bancaria + efectivo)
- 10 transacciones de ejemplo del mes
- Gráfico con evolución simulada

---

## ⚙️ Prioridad 3: Panel de Admin

### **Features del admin:**
- Ver usuarios registrados y tier
- Métricas de conversión (free → premium)
- Gestionar suscripciones manualmente
- Ver uso de features por usuario
- Logs de errores y soporte

---

## 📊 Métricas Clave (KPIs)

### **Adquisición:**
- Visitantes únicos al landing
- Tasa de conversión (visitante → registro)
- Fuente de tráfico

### **Activación:**
- % que completan onboarding
- % que agregan 2+ cuentas
- % que registran 5+ transacciones

### **Retención:**
- DAU / MAU (Daily/Monthly Active Users)
- Usuarios activos por semana
- Churn rate

### **Revenue:**
- Tasa de conversión free → premium
- MRR (Monthly Recurring Revenue)
- LTV (Lifetime Value)
- CAC (Customer Acquisition Cost)

---

## 🎨 Mejoras de UX para la versión pública

### **Gráficos (implementados):**
✅ `PatrimonyChart` - 3 modos de visualización  
✅ `AssetPieChart` - Interactivo con hover states  
✅ Tooltips informativos  
✅ Rangos de tiempo (7d, 30d, 90d, todo)  
✅ Estadísticas en tiempo real  

### **Próximas mejoras:**
- Animaciones suaves al cargar datos
- Skeleton loaders mientras carga
- Estados vacíos informativos ("Aún no tienes transacciones")
- Dark mode / Light mode toggle
- Responsive mobile-first

---

## 📱 Roadmap de Desarrollo

### **Fase 1: MVP Público (4-6 semanas)**
Semana 1-2: Autenticación + RLS + Migraciones de DB  
Semana 3: Onboarding wizard  
Semana 4: Límites por tier (free vs premium)  
Semana 5: Landing page + marketing copy  
Semana 6: Testing + bug fixes  

### **Fase 2: Monetización (2-3 semanas)**
- Integración con Stripe
- Checkout flow
- Webhook de suscripciones
- Panel de facturación

### **Fase 3: Features Premium (4 semanas)**
- Inversiones en tiempo real
- Criptomonedas
- Reportes PDF
- Categorización con IA

### **Fase 4: Growth (continuo)**
- SEO optimization
- Content marketing (blog)
- Referral program
- Integraciones (Plaid, bancos)

---

## 🚀 Go-to-Market Strategy

### **Pre-lanzamiento:**
1. Beta cerrada con 20-50 usuarios
2. Recoger feedback y iterar
3. Caso de estudio: "Cómo Juan ahorró $500 en 2 meses"

### **Lanzamiento:**
1. Product Hunt launch
2. Post en r/personalfinance (Reddit)
3. Anuncios en grupos de Facebook/Telegram de finanzas
4. Outreach a influencers de fintech

### **Post-lanzamiento:**
1. Crear contenido educativo (blog, YouTube)
2. Email marketing (nurture sequence)
3. A/B testing en landing page
4. Programas de referidos

---

## 💡 Diferenciadores vs Competencia

**Competidores**: Fintonic, Mint, YNAB, Wallet by BudgetBakers

**Nuestras ventajas:**
✨ Diseño moderno y minimalista (no sobrecargado)  
✨ Enfoque en patrimonio neto (no solo gastos)  
✨ Inversiones + cripto en un solo lugar  
✨ Proyecciones visuales (ej: pago de deudas)  
✨ Datos locales (TRM para Colombia)  
✨ Sin vender datos a terceros (privacy-first)  
✨ Freemium generoso (no paywall agresivo)  

---

## 📝 Notas Técnicas

### **Performance:**
- Server-side rendering (SSR) para SEO
- Lazy loading de gráficos pesados
- Cache de API calls (TRM, precios de inversiones)
- CDN para assets estáticos

### **Seguridad:**
- OWASP Top 10 compliance
- Penetration testing antes de lanzar
- Bug bounty program (opcional)
- GDPR compliance (aunque no es EU)

### **Observabilidad:**
- Sentry para error tracking
- Vercel Analytics
- PostHog para product analytics
- Logs estructurados (Pino)

---

## ✅ Checklist de Lanzamiento

**Pre-requisitos:**
- [ ] Base de datos con RLS configurado
- [ ] Autenticación funcionando (email + Google)
- [ ] Onboarding wizard completo
- [ ] Landing page publicada
- [ ] Términos de servicio y política de privacidad
- [ ] Email transaccional configurado (SendGrid/Resend)
- [ ] Sistema de suscripciones (Stripe test mode)
- [ ] Tests E2E para flujos críticos
- [ ] Monitoreo de errores (Sentry)
- [ ] Backup automático de DB

**Marketing:**
- [ ] Copy del landing optimizado para conversión
- [ ] Screenshots y demo video
- [ ] Perfiles en redes sociales
- [ ] Google Analytics / PostHog configurado
- [ ] Email de bienvenida automatizado

---

## 🎯 Próximos Pasos Inmediatos

1. **Implementar gráficos mejorados** en versión personal (hecho ✅)
2. **Crear repositorio separado** para versión pública
3. **Configurar Supabase proyecto nuevo** con RLS
4. **Diseñar landing page** (Figma o directamente en código)
5. **Implementar sistema de auth** (Supabase Auth)

---

**Última actualización**: Abril 2026  
**Versión**: 1.0  
**Autor**: Tu nombre / Startup
