import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { siteGraphLd } from "./jsonld"
import { SITE_URL } from "../site"

type Node = Record<string, unknown>

function graph() {
  const doc = siteGraphLd() as unknown as {
    "@context": string
    "@graph": Node[]
  }
  return doc
}

function nodeOfType(type: string): Node {
  const found = graph()["@graph"].find((n) => n["@type"] === type)
  assert.ok(found, `@graph içinde ${type} düğümü yok`)
  return found
}

describe("siteGraphLd", () => {
  test("üst seviye tek nesnedir: @context + @graph", () => {
    const doc = graph()
    assert.equal(doc["@context"], "https://schema.org")
    assert.ok(Array.isArray(doc["@graph"]))
    // Çıplak dizi biçimine dönülmemeli: naif ayrıştırıcılar üst seviyede
    // @type/name arayıp bulamıyordu, bu testin varlık sebebi bu.
    assert.ok(!Array.isArray(siteGraphLd()))
  })

  test("graf düğümleri kendi @context'ini tekrar etmez", () => {
    for (const node of graph()["@graph"]) {
      assert.ok(
        !("@context" in node),
        `${String(node["@type"])} düğümü gereksiz @context taşıyor`,
      )
    }
  })

  test("Organization kimlik alanlarının hepsini taşır", () => {
    const org = nodeOfType("Organization")
    assert.equal(org.name, "Sepet")
    assert.equal(org.url, SITE_URL)
    assert.equal(typeof org.description, "string")
    assert.ok((org.description as string).length > 0)
    assert.ok(Array.isArray(org.sameAs))
  })

  test("WebSite de ad ve açıklama taşır", () => {
    const site = nodeOfType("WebSite")
    assert.equal(site.name, "Sepet")
    assert.equal(typeof site.description, "string")
    assert.equal(site.inLanguage, "tr-TR")
  })

  test("publisher referansı graf içinde çözülür", () => {
    const org = nodeOfType("Organization")
    const site = nodeOfType("WebSite")
    const publisher = site.publisher as { "@id": string }

    assert.equal(publisher["@id"], org["@id"])
    // @id'ler mutlak URL olmalı ki farklı belgelerden de aynı varlığa işaret etsin.
    assert.ok(String(org["@id"]).startsWith(SITE_URL))
  })
})
