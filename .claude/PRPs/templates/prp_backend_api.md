# PRP: [Nombre del Endpoint o Servicio Backend]

## Goal
[Descripción detallada de la lógica de negocio, bases de datos o servicios externos a integrar]

## Success Criteria
- [ ] Esquema de base de datos validado (Foreign keys, índices, restricciones).
- [ ] Manejo de errores centralizado con códigos HTTP correctos y logs claros.
- [ ] Seguridad RLS habilitada y verificada (PostgreSQL) o políticas de acceso robustas.
- [ ] Validación estricta de inputs (Zod schemas / Pydantic models).
- [ ] Cobertura de tests unitarios mínima del 80% en la lógica de negocio.

## API Specification
- **Method & Route**: `POST /api/v1/resource`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body (Zod/Pydantic)**:
```typescript
const RequestSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().positive()
})
```
- **Response Body**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "updated_at": "timestamp"
  }
}
```

## Database Design & RLS
- **Tables**: `items` (id, user_id, name, quantity, created_at)
- **Indexes**: `CREATE INDEX idx_items_user_id ON items(user_id);`
- **Security Policies**:
  - `ALTER TABLE items ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY "user_access" ON items USING (auth.uid() = user_id);`

## Implementation Blueprint

### List of Tasks
```yaml
Task 1: Database Migration
  CREATE: migrations/[YYYYMMDDHHMMSS]_create_table.sql
  INJECT: Table creation + RLS policies + index configurations.
  VALIDATE: npx supabase db reset / local test db.

Task 2: Input & Output Schemas
  CREATE: src/api/schemas/[feature]-schema.ts
  VALIDATE: TypeScript typecheck passes.

Task 3: Service Logic & Error Handling
  CREATE: src/api/services/[feature]-service.ts
  INJECT: Explicit try/catch blocks with fallbacks and logging.

Task 4: Route Handler & Endpoint registration
  CREATE: src/api/routes/[feature]-route.ts
  MODIFY: src/api/main.ts (register router)
```

### Validation Loop
```bash
# 1. Ejecutar tests unitarios
npm run test -- src/api/services/[feature]-service.test.ts

# 2. Levantar servidor local
npm run dev

# 3. Testear endpoint con cURL
curl -X POST http://localhost:3000/api/v1/resource \
  -H "Content-Type: application/json" \
  -d '{"id": "valid-uuid", "quantity": 5}'
```
