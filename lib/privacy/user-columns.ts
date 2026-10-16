import { users } from "../db/schema"

// Allowlist: users'a eklenen her sütun burada ya da EXCLUDED'da sınıflandırılmalı (bkz. test).
export const EXPORTED_USER_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  emailVerified: users.emailVerified,
  image: users.image,
  customImage: users.customImage,
  onboardingCompletedAt: users.onboardingCompletedAt,
  locationLat: users.locationLat,
  locationLng: users.locationLng,
  locationDistance: users.locationDistance,
  locationLabel: users.locationLabel,
  selectedDepotIds: users.selectedDepotIds,
  locationUpdatedAt: users.locationUpdatedAt,
  plan: users.plan,
  polarCustomerId: users.polarCustomerId,
  polarSubscriptionId: users.polarSubscriptionId,
  subscriptionStatus: users.subscriptionStatus,
  subscriptionInterval: users.subscriptionInterval,
  subscriptionCurrentPeriodStart: users.subscriptionCurrentPeriodStart,
  subscriptionCurrentPeriodEnd: users.subscriptionCurrentPeriodEnd,
  subscriptionCancelAtPeriodEnd: users.subscriptionCancelAtPeriodEnd,
  archivedAt: users.archivedAt,
  passwordUpdatedAt: users.passwordUpdatedAt,
  totpEnabled: users.totpEnabled,
} as const

export const EXCLUDED_USER_COLUMNS = [
  "passwordHash",
  "totpSecretEnc",
  "totpLastUsedStep",
  "webauthnUserId",
] as const
