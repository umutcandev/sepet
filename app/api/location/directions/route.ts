import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/auth/session"
import { getRoute } from "@/lib/geo/directions"
import { haversineKm } from "@/lib/geo/trip"

export const runtime = "nodejs"

// Başlangıç noktası istemciden alınmaz: kullanıcının kayıtlı konumu. Şubeler
// bu konuma yakın olmalı; uç başka yerler için ORS vekiline dönüşmesin.
const MAX_STOP_KM = 50

const point = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const bodySchema = z.object({
  mode: z.enum(["car", "walk"]),
  stops: z.array(point).min(1).max(10),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }
  const home = user.location
  if (!home) return NextResponse.json({ route: null })

  const { mode, stops } = parsed.data
  if (stops.some((s) => haversineKm(home, s) > MAX_STOP_KM)) {
    return NextResponse.json({ error: "too_far" }, { status: 400 })
  }

  const route = await getRoute(mode, home, stops)
  return NextResponse.json({ route })
}
