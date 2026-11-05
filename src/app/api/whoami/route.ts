import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Solo dice si esta visita tiene sesión de administrador (lo usa el botón “Editar” del sitio público). */
export async function GET() {
  let admin = false;
  try {
    admin = await isAdmin();
  } catch {
    admin = false;
  }
  return Response.json({ admin }, { headers: { "cache-control": "private, no-store" } });
}
