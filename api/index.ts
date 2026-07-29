import { Hono } from "hono"
import { cors } from "hono/cors"

const HN_BASE = "https://hacker-news.firebaseio.com/v0"

const app = new Hono()

app.use("/*", cors())

app.get("/api/topstories", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 30, 100)
  const ids: number[] = await fetch(`${HN_BASE}/topstories.json`).then((r) => r.json())
  const batch = ids.slice(0, limit)
  const items = await Promise.all(batch.map((id) => fetch(`${HN_BASE}/item/${id}.json`).then((r) => r.json())))
  return c.json(items)
})

app.get("/api/newstories", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 30, 100)
  const ids: number[] = await fetch(`${HN_BASE}/newstories.json`).then((r) => r.json())
  const batch = ids.slice(0, limit)
  const items = await Promise.all(batch.map((id) => fetch(`${HN_BASE}/item/${id}.json`).then((r) => r.json())))
  return c.json(items)
})

app.get("/api/beststories", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 30, 100)
  const ids: number[] = await fetch(`${HN_BASE}/beststories.json`).then((r) => r.json())
  const batch = ids.slice(0, limit)
  const items = await Promise.all(batch.map((id) => fetch(`${HN_BASE}/item/${id}.json`).then((r) => r.json())))
  return c.json(items)
})

app.get("/api/item/:id", async (c) => {
  const id = c.req.param("id")
  const item = await fetch(`${HN_BASE}/item/${id}.json`).then((r) => r.json())
  return c.json(item)
})

app.get("/api/health", (c) => c.json({ ok: true }))

export default app
