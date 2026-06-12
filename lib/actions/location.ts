"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db, users } from "@/lib/db"

const saveLocationSchema = z.object({
  lat: z.number().refine(Number.isFinite, "geçersiz enlem").min(-90).max(90),
  lng: z.number().refine(Number.isFinite, "geçersiz boylam").min(-180).max(180),
  distance: z.number().int().min(1).max(10),
  label: z.string().max(300).nullable(),
  depotIds: z.array(z.string().max(64)).max(500),
})

export type SaveLocationInput = z.infer<typeof saveLocationSchema>

/**
 * Kullanıcının haritada seçtiği konumu, mesafe yarıçapını ve dahil edilecek
 * market şubelerini kalıcı yazar. completeOnboarding ile aynı kalıp. numeric
 * kolonlar string olarak yazılır (Drizzle numeric mode).
 */
export async function saveUserLocation(
  input: SaveLocationInput,
): Promise<{ ok: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false }

  const parsed = saveLocationSchema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const { lat, lng, distance, label, depotIds } = parsed.data

  await db
    .update(users)
    .set({
      locationLat: String(lat),
      locationLng: String(lng),
      locationDistance: distance,
      locationLabel: label,
      selectedDepotIds: depotIds,
      locationUpdatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id))

  return { ok: true }
}
