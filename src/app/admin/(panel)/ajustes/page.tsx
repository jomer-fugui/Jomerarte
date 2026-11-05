import Link from "next/link";
import { passwordFromEnv } from "@/lib/auth";
import { getCustomSections, getSettings, type CustomSection } from "@/lib/data";
import { SETTINGS_GROUPS, type SettingField } from "@/lib/defaults";
import { siteLabel } from "@/lib/hosts";
import { getCurrentSite } from "@/lib/site";
import { MediaInput } from "@/components/admin/MediaInput";
import { HoursEditor } from "@/components/admin/HoursEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { changePasswordAction, saveSettingsAction } from "../../actions";

export const dynamic = "force-dynamic";

const PW: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Contraseña actualizada." },
  wrong: { ok: false, text: "La contraseña actual no es correcta." },
  short: { ok: false, text: "La nueva contraseña debe tener al menos 6 caracteres." },
  match: { ok: false, text: "Las contraseñas nuevas no coinciden." },
  env: { ok: false, text: "La contraseña está definida en la variable de entorno ADMIN_PASSWORD." },
};

function FieldInput({ field, value, pages }: { field: SettingField; value: string; pages: CustomSection[] }) {
  switch (field.type) {
    case "textarea":
      return <textarea name={field.key} defaultValue={value} rows={4} className="input" />;
    case "image":
      return <MediaInput name={field.key} defaultValue={value} accept="image/*" />;
    case "page":
      return (
        <select name={field.key} defaultValue={value} className="input">
          <option value="">Ninguna: solo la portada y las tarjetas de las páginas</option>
          {pages.map((c) => (
            <option key={c.item.id} value={String(c.item.id)}>
              {c.item.title || c.item.slug} ({c.type.label})
            </option>
          ))}
        </select>
      );
    case "select":
      return (
        <select name={field.key} defaultValue={value} className="input">
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "hours":
      return <HoursEditor name={field.key} defaultValue={value} />;
    case "color":
      return (
        <input
          type="color"
          name={field.key}
          defaultValue={/^#[0-9a-f]{6}$/i.test(value) ? value : "#b3121f"}
          className="h-11 w-24 cursor-pointer rounded-lg border border-white/10 bg-zinc-950 p-1"
        />
      );
    default:
      return (
        <input
          type={field.type === "url" ? "url" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
          name={field.key}
          defaultValue={value}
          className="input"
        />
      );
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; pw?: string; error?: string }>;
}) {
  const [settings, site, { ok, pw, error }] = await Promise.all([getSettings(), getCurrentSite(), searchParams]);
  const pages = site.isMain ? [] : await getCustomSections();
  const scope = site.isMain ? "main" : "sub";
  const groups = SETTINGS_GROUPS.filter((g) => !g.only || g.only === scope)
    .map((g) => ({ ...g, fields: g.fields.filter((f) => !f.only || f.only === scope) }))
    .filter((g) => g.fields.length > 0);
  const pwMsg = pw ? PW[pw] : undefined;
  const envPw = passwordFromEnv();

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">Ajustes</span>
      </nav>
      <div>
        <h1 className="font-display text-3xl font-bold break-words text-white uppercase">Ajustes de {settings.siteName}</h1>
        <p className="mt-1 text-zinc-400">
          <strong className="text-zinc-200">{siteLabel(site.slug)}</strong> ·{" "}
          {site.isMain
            ? "Sitio principal: logo, colores, textos de la portada, contacto, redes sociales y tiendas externas."
            : "Estos ajustes solo cambian este subdominio: su nombre, logo, colores, portada, descripción, contacto y redes."}
        </p>
      </div>

      {ok && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Ajustes guardados en {siteLabel(site.slug)}.
        </div>
      )}
      {error === "site" && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          No se guardó nada: cambiaste de sitio en otra pestaña. Revisa los datos y vuelve a guardar.
        </div>
      )}

      <form action={saveSettingsAction} className="space-y-6">
        <input type="hidden" name="__site" value={site.slug} />
        {groups.map((g) => (
          <section key={g.title} id={g.id} className="card scroll-mt-24 space-y-5 p-6">
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">{g.title}</h2>
              {g.description && <p className="text-sm text-zinc-500">{g.description}</p>}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {g.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === "textarea" || field.type === "image" || field.type === "page" || field.type === "hours" ? "md:col-span-2" : ""}
                >
                  <label className="label">{field.label}</label>
                  <FieldInput field={field} value={settings[field.key]} pages={pages} />
                  {field.hint && <p className="mt-1.5 text-xs text-zinc-500">{field.hint}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="sticky bottom-4 z-10 flex justify-end">
          <SubmitButton className="px-8 py-3 shadow-2xl">Guardar ajustes</SubmitButton>
        </div>
      </form>

      <section id="seguridad" className="card space-y-5 p-6">
        <div>
          <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Seguridad</h2>
          <p className="text-sm text-zinc-500">La contraseña del panel es la misma para todos tus sitios.</p>
        </div>
        {pwMsg && (
          <div
            className={
              pwMsg.ok
                ? "rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200"
                : "rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200"
            }
          >
            {pwMsg.text}
          </div>
        )}
        {envPw ? (
          <p className="text-sm text-zinc-400">La contraseña se administra con la variable de entorno ADMIN_PASSWORD.</p>
        ) : (
          <form action={changePasswordAction} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label">Contraseña actual</label>
              <input type="password" name="current" required autoComplete="current-password" className="input" />
            </div>
            <div>
              <label className="label">Nueva contraseña</label>
              <input type="password" name="next" required minLength={6} autoComplete="new-password" className="input" />
            </div>
            <div>
              <label className="label">Repite la nueva</label>
              <input type="password" name="confirm" required minLength={6} autoComplete="new-password" className="input" />
            </div>
            <div className="md:col-span-3">
              <SubmitButton>Cambiar contraseña</SubmitButton>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
