export function getProvisioningMode({ markerTableExists, markerSource, hasUserTables }) {
  if (markerTableExists && markerSource === "seed-backup-in-progress") return "resume-seed";
  if (markerTableExists) return "already-initialized";
  if (hasUserTables) return "preserve-existing";
  return "seed-fresh";
}
