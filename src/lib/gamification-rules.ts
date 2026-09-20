export const EMPLOYEE_RACE_RULES = {
  qualifiedLead: 1,
  b2bLeadBonus: 2,
  b2cClose: 2,
  b2bClose: 4,
} as const;

export const REFERRAL_AVATAR_KEYS = ["rocket", "bolt", "star", "compass", "crown", "spark"] as const;

export const REFERRAL_AVATARS = [
  { key: "rocket", label: "Rakete", symbol: "🚀" },
  { key: "bolt", label: "Blitz", symbol: "⚡" },
  { key: "star", label: "Stern", symbol: "⭐" },
  { key: "compass", label: "Kompass", symbol: "🧭" },
  { key: "crown", label: "Krone", symbol: "👑" },
  { key: "spark", label: "Funke", symbol: "✨" },
] as const;

export type ReferralAvatarKey = (typeof REFERRAL_AVATAR_KEYS)[number];
