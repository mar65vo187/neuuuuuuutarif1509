"use client";

import { CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/portal/ui";

type EmployeeOption = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "berater";
  active: boolean;
};

type RoleOption = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  permissions: Array<{ key: string; description: string }>;
};

type Assignment = { employeeId: number; roleId: number };

export function EnterpriseRoleManager({
  employees,
  roles,
  initialAssignments,
}: {
  employees: EmployeeOption[];
  roles: RoleOption[];
  initialAssignments: Assignment[];
}) {
  const editableEmployees = employees.filter((employee) => employee.role !== "admin");
  const selectableRoles = roles.filter((role) => role.key !== "super_admin");
  const defaultEmployeeId = editableEmployees[0]?.id ?? null;
  const initialMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const assignment of initialAssignments) {
      const list = map.get(assignment.employeeId) ?? [];
      list.push(assignment.roleId);
      map.set(assignment.employeeId, list);
    }
    return map;
  }, [initialAssignments]);

  const saving = useRef(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(defaultEmployeeId);
  const [assignments, setAssignments] = useState<Map<number, number[]>>(() => new Map(initialMap));
  const [draftRoleIds, setDraftRoleIds] = useState<number[]>(() => {
    if (!defaultEmployeeId) return [];
    const assigned = initialMap.get(defaultEmployeeId) ?? [];
    if (assigned.length) return assigned;
    const advisor = selectableRoles.find((role) => role.key === "advisor");
    return advisor ? [advisor.id] : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const assignedRoleIds = selectedEmployeeId ? assignments.get(selectedEmployeeId) ?? [] : [];
  const legacyFallback = Boolean(selectedEmployeeId && assignedRoleIds.length === 0);

  const effectivePermissions = useMemo(() => {
    const keys = new Map<string, string>();
    for (const role of selectableRoles) {
      if (!draftRoleIds.includes(role.id)) continue;
      for (const permission of role.permissions) keys.set(permission.key, permission.description);
    }
    return [...keys.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [draftRoleIds, selectableRoles]);

  function chooseEmployee(id: number) {
    setSelectedEmployeeId(id);
    const assigned = assignments.get(id) ?? [];
    if (assigned.length) {
      setDraftRoleIds(assigned);
    } else {
      const advisor = selectableRoles.find((role) => role.key === "advisor");
      setDraftRoleIds(advisor ? [advisor.id] : []);
    }
    setError("");
    setSuccess("");
  }

  function toggleRole(roleId: number) {
    setDraftRoleIds((current) => current.includes(roleId)
      ? current.filter((id) => id !== roleId)
      : [...current, roleId].slice(0, 10));
    setError("");
    setSuccess("");
  }

  async function save() {
    if (!selectedEmployeeId || saving.current) return;
    if (!draftRoleIds.length) {
      setError("Mindestens eine Enterprise-Rolle muss aktiv bleiben.");
      return;
    }
    const roleKeys = selectableRoles.filter((role) => draftRoleIds.includes(role.id)).map((role) => role.key);
    if (!roleKeys.length) {
      setError("Bitte mindestens eine gültige Rolle auswählen.");
      return;
    }

    saving.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/portal/admin/rbac", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployeeId, roleKeys }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string; roleKeys?: string[] } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Rollen konnten nicht gespeichert werden.");

      const savedRoleIds = selectableRoles.filter((role) => json.roleKeys?.includes(role.key)).map((role) => role.id);
      setAssignments((current) => {
        const next = new Map(current);
        next.set(selectedEmployeeId, savedRoleIds);
        return next;
      });
      setDraftRoleIds(savedRoleIds);
      setSuccess("Enterprise-Rollen wurden gespeichert. Die neuen Rechte gelten bei der nächsten Server-Anfrage sofort.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Rollen konnten nicht gespeichert werden.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-electric-deep"><ShieldCheck className="h-3.5 w-3.5" /> Enterprise RBAC</p>
          <h2 className="mt-1 text-[18px] font-extrabold">Rollen & Rechte</h2>
          <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-steel">
            Enterprise-Rollen steuern Bearbeitungs-, Auftrags-, Reporting- und Verwaltungsrechte. Lead-Sichtbarkeit bleibt separat geschützt: Nicht-Admins sehen weiterhin nur ihre eigenen Leads.
          </p>
        </div>
        <span className="rounded-full border border-line bg-paper px-3 py-1.5 text-[10.5px] font-bold text-steel">{selectableRoles.length} Rollen verfügbar</span>
      </div>

      {editableEmployees.length === 0 ? (
        <div className="mt-5 rounded-xl border border-line bg-paper p-4 text-[12.5px] text-steel">Keine Nicht-Admin-Mitarbeiter vorhanden.</div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
            <div>
              <label className="label">Mitarbeiter
                <select
                  className="field"
                  value={selectedEmployeeId ?? ""}
                  disabled={busy}
                  onChange={(event) => chooseEmployee(Number(event.target.value))}
                >
                  {editableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name} · {employee.active ? "aktiv" : "deaktiviert"}</option>
                  ))}
                </select>
              </label>
              {selectedEmployee && (
                <div className="mt-3 rounded-xl border border-line bg-paper/70 p-3">
                  <p className="text-[12.5px] font-bold">{selectedEmployee.name}</p>
                  <p className="mt-0.5 text-[11px] text-steel">{selectedEmployee.email}</p>
                  {legacyFallback && (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10.5px] leading-relaxed text-amber-800">
                      Noch keine Enterprise-Rolle gespeichert. Bis zum Speichern gilt der sichere Legacy-Beraterstandard. „Advisor“ ist deshalb vorausgewählt.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="label">Enterprise-Rollen</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectableRoles.map((role) => {
                  const checked = draftRoleIds.includes(role.id);
                  return (
                    <label key={role.id} className={"cursor-pointer rounded-xl border p-3 transition " + (checked ? "border-electric bg-electric/[0.06] ring-1 ring-electric/10" : "border-line bg-white hover:border-electric/25")}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={checked} disabled={busy} onChange={() => toggleRole(role.id)} className="mt-0.5 h-4 w-4 accent-electric" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-extrabold">{role.name}</p>
                          <p className="mt-0.5 text-[10.5px] leading-relaxed text-steel">{role.description || role.key}</p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-electric-deep">{role.permissions.length} Rechte</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-paper/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[12.5px] font-extrabold">Effektive Rechte aus der Auswahl</p><p className="text-[10.5px] text-steel">Mehrere Rollen werden additiv zusammengeführt.</p></div>
              <span className="text-[18px] font-extrabold">{effectivePermissions.length}</span>
            </div>
            {effectivePermissions.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {effectivePermissions.map(([key, description]) => (
                  <div key={key} className="rounded-xl border border-line bg-white p-2.5">
                    <p className="text-[10.5px] font-extrabold text-ink">{key}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-steel">{description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11.5px] text-steel">Diese Auswahl gewährt keine zusätzlichen Bearbeitungsrechte.</p>
            )}
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">{error}</p>}
          {success && <p role="status" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {success}</p>}

          <button
            type="button"
            onClick={save}
            disabled={busy || !selectedEmployeeId}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white hover:bg-electric disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Rollen speichern
          </button>
        </>
      )}
    </Card>
  );
}
