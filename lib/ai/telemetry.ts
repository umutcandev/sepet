/**
 * Hafif LLM gözlemlenebilirliği. AI SDK'nın `experimental_telemetry`'si bir OTEL
 * toplayıcı olmadan no-op kaldığı için, burada her çağrının LATENCY + TOKEN
 * kullanımını (= maliyet) yapılandırılmış tek satırda logluyoruz. Üretimde log
 * toplayıcı (Vercel/Datadog) bu satırları parse edip latency/token panelleri
 * çıkarabilir.
 *
 * `[ai]` prefix'i grep/aggregate için sabit tutulur. Abort'lar ayrıca işaretlenir
 * — kullanıcı stream'i iptal ettiğinde çağrının gerçekten erken bittiğini ve boşa
 * token yakılmadığını burada görürüz.
 */

export type LlmUsage = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

function isAbort(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  )
}

/**
 * Bir `generateObject`/`generateText` çağrısını sarar; süreyi ölçer ve sonucun
 * `usage` token sayımıyla birlikte loglar. Çağrının dönüş tipini koruduğu için
 * çağıran taraf `{ object, reasoning, usage }`'a normal şekilde erişir.
 */
export async function withLlmCall<T extends { usage: LlmUsage }>(
  label: string,
  modelId: string,
  run: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await run()
    const ms = Date.now() - start
    const u = result.usage
    console.log(
      `[ai] ${label} model=${modelId} ms=${ms} status=ok ` +
        `in=${u?.inputTokens ?? "?"} out=${u?.outputTokens ?? "?"} total=${u?.totalTokens ?? "?"}`,
    )
    return result
  } catch (err) {
    const ms = Date.now() - start
    const status = isAbort(err) ? "aborted" : "error"
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[ai] ${label} model=${modelId} ms=${ms} status=${status} ${message}`)
    throw err
  }
}
