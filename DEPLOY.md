# Desplegar SoftID (Vercel + Railway)

El código ya está preparado y committeado localmente (`git log` tiene el commit inicial).
Faltan los pasos que solo vos podés hacer porque requieren tu login en GitHub /
Railway / Vercel. Andá copiando y pegando las siguientes secciones, en orden.

## 1. Crear el repo en GitHub y subir el código

1. Entrá a https://github.com/new
2. Nombre sugerido: `softid-erp` (o el que prefieras). Dejalo **privado**.
3. NO marques "Add a README" ni ".gitignore" (ya los tenemos).
4. Click "Create repository". GitHub te va a mostrar una URL tipo
   `https://github.com/tu-usuario/softid-erp.git`.
5. En tu terminal, parado en `/Users/rodrigorodriguez/Desktop/RJRA`:

```bash
git remote add origin https://github.com/TU-USUARIO/softid-erp.git
git branch -M main
git push -u origin main
```

   La primera vez te va a pedir loguearte a GitHub (se abre el navegador, o te
   pide un Personal Access Token si usás HTTPS). Seguí las instrucciones que te
   muestre la terminal/VS Code.

## 2. Backend en Railway

1. Entrá a https://railway.app y logueate con tu cuenta de GitHub.
2. "New Project" → "Deploy from GitHub repo" → elegí `softid-erp`.
3. Railway va a detectar que es un proyecto Node y usar `railway.json` (ya
   incluido) para el build/start — no hace falta tocar nada ahí.
4. Andá a la pestaña **Variables** del servicio y cargá:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la misma cadena de conexión de Neon que ya usás en tu `.env` local |
   | `JWT_SECRET` | el mismo valor que tenés en tu `.env` local |
   | `JWT_EXPIRES_IN` | `12h` (o el valor que tengas) |

   (Copialos directo de tu archivo `.env` local — nunca los subimos a GitHub.)

5. Click "Deploy". Cuando termine, andá a **Settings → Networking** y generá
   un dominio público (botón "Generate Domain"). Vas a obtener algo como
   `https://softid-erp-production.up.railway.app`. **Guardá esa URL.**

## 3. Frontend en Vercel

1. Entrá a https://vercel.com y logueate con tu cuenta de GitHub.
2. "Add New" → "Project" → elegí el repo `softid-erp`.
3. En "Configure Project":
   - **Root Directory**: click "Edit" y elegí `frontend`.
   - Framework Preset: Vercel debería detectar "Vite" solo.
4. Antes de desplegar, abrí "Environment Variables" y agregá:

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | la URL de Railway del paso 2 (sin `/api` al final, ej. `https://softid-erp-production.up.railway.app`) |

5. Click "Deploy". Cuando termine te da una URL pública, ej.
   `https://softid-erp.vercel.app`. **Esa es tu app.**

## 4. (Opcional pero recomendado) Restringir el CORS del backend

Volvé a Railway → Variables del backend → agregá:

| Variable | Valor |
|---|---|
| `FRONTEND_URL` | la URL de Vercel del paso 3 (ej. `https://softid-erp.vercel.app`) |

Esto hace que el backend solo acepte pedidos desde tu frontend desplegado en
vez de cualquier origen. Railway redeploya solo al guardar la variable.

## 5. Probar

Entrá a la URL de Vercel y logueate con el mismo usuario que usás en local
(`admin@rjra.com.py` / tu contraseña) — es la misma base de datos de Neon, así
que todos los datos (clientes, comprobantes, etc.) ya están ahí.

---

### Notas

- Cada `git push` a `main` redespliega automáticamente tanto Railway como
  Vercel (ambos quedan conectados al repo).
- Si en el futuro cambiás el schema de Prisma y corrés una migración nueva
  localmente (`prisma migrate dev`), el `railway.json` ya corre
  `prisma migrate deploy` antes de arrancar el backend, así que la próxima vez
  que hagas push se aplica sola en producción.
- Las variables de entorno (`.env`, `DATABASE_URL`, `JWT_SECRET`) nunca se
  suben a GitHub — están en `.gitignore`. Se cargan a mano en Railway/Vercel
  como hiciste arriba.
