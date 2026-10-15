"use client"

import * as React from "react"
import {
  RiBankCardLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiPencilLine,
  RiRefreshLine,
  RiSearchLine,
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { MatchResult } from "@/lib/ai/schemas"

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1)
}

/**
 * Soru eki ünlü uyumuyla: "Yufka mı", "Kaşar peyniri mi", "Un mu", "Süt mü".
 * Ek kelimeden ayrı yazılır; son ünlüye bakılır.
 */
function questionParticle(word: string): string {
  const vowels = word.toLocaleLowerCase("tr-TR").match(/[aeıioöuü]/g)
  switch (vowels?.[vowels.length - 1]) {
    case "e":
    case "i":
      return "mi"
    case "o":
    case "u":
      return "mu"
    case "ö":
    case "ü":
      return "mü"
    default:
      return "mı"
  }
}

/** (eşleşmeler, kalemin sırası, yeni ad) → sepeti o adla yeniden eşleştir. */
export type RetryUnmatched = (
  matches: MatchResult[],
  index: number,
  query: string
) => void

/**
 * Sohbette yalnızca eşleştirilemeyen kalemler listelenir. Eşleşen ürünlerin
 * listesi kaldırıldı: hangi ürünün hangi marketten kaça alınacağı Sepet
 * Özeti'nin dökümünde zaten var. Ama bulunamayan kalemler Sepet Özeti'ne hiç
 * girmez; kaybolmasınlar diye burada duruyorlar.
 *
 * Kart bir çıkmaz sokak değil: kalem için doğrulanmış bir öneri varsa ("Yufka
 * mı demek istedin?") tek dokunuşla, yoksa kullanıcının yazdığı adla sepet
 * yeniden eşleştirilir. `onRetry` yalnızca sohbetin son turunda verilir.
 */
export function UnmatchedProductList({
  matches,
  onRetry,
  disabled,
}: {
  matches: MatchResult[]
  onRetry?: RetryUnmatched
  disabled?: boolean
}) {
  const unmatched = (matches ?? [])
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => m.lookupStatus !== "ok" || !m.bestMatch)
  if (unmatched.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eşleştirilemeyen Ürünler</CardTitle>
      </CardHeader>
      <div className="divide-y">
        {unmatched.map(({ m, index }) => (
          <UnmatchedRow
            key={`${m.searchQuery}-${index}`}
            match={m}
            disabled={disabled}
            onRetry={
              onRetry ? (query) => onRetry(matches, index, query) : undefined
            }
          />
        ))}
      </div>
    </Card>
  )
}

function UnmatchedRow({
  match: m,
  onRetry,
  disabled,
}: {
  match: MatchResult
  onRetry?: (query: string) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const serviceError =
    m.lookupStatus === "api_error" || m.lookupStatus === "api_quota"
  const suggestion = m.suggestedQuery?.trim() || null

  function startEditing() {
    setDraft(m.rawName)
    setEditing(true)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const query = draft.trim()
    if (!query || !onRetry) return
    onRetry(query)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">
          {capitalize(m.rawName)}
        </span>
        {m.lookupStatus === "api_quota" ? (
          <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <RiBankCardLine aria-hidden="true" className="size-3 shrink-0" />
            API kotası tükendi
          </span>
        ) : m.lookupStatus === "api_error" ? (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <RiErrorWarningLine
              aria-hidden="true"
              className="size-3 shrink-0"
            />
            Fiyat servisine ulaşılamadı
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <RiErrorWarningLine
              aria-hidden="true"
              className="size-3 shrink-0"
            />
            Bu adla marketlerde bulamadım
          </span>
        )}
      </div>

      {onRetry &&
        (editing ? (
          <form onSubmit={submit} className="flex items-center gap-1.5">
            <InputGroup className="flex-1">
              <InputGroupInput
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditing(false)
                }}
                placeholder="Ürünün adını yaz"
                aria-label={`${capitalize(m.rawName)} yerine aranacak ad`}
                autoFocus
                // Eski ad seçili gelir: yazmaya başlamak onu değiştirir.
                onFocus={(e) => e.currentTarget.select()}
                disabled={disabled}
                enterKeyHint="search"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="submit"
                  variant="default"
                  disabled={disabled || !draft.trim()}
                >
                  <RiSearchLine data-icon="inline-start" />
                  Ara
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(false)}
              aria-label="Vazgeç"
            >
              <RiCloseLine />
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {serviceError ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onRetry(m.rawName)}
              >
                <RiRefreshLine data-icon="inline-start" />
                Tekrar dene
              </Button>
            ) : (
              <>
                {suggestion && (
                  <Button
                    type="button"
                    variant="chip"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onRetry(suggestion)}
                  >
                    <RiSearchLine data-icon="inline-start" />
                    <span>
                      <span className="font-medium text-foreground">
                        {capitalize(suggestion)}
                      </span>{" "}
                      {questionParticle(suggestion)} demek istedin?
                    </span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={startEditing}
                >
                  <RiPencilLine data-icon="inline-start" />
                  {suggestion ? "Başka bir ad dene" : "Başka bir adla ara"}
                </Button>
              </>
            )}
          </div>
        ))}
    </div>
  )
}
