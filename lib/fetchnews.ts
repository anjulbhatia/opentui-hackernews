import type { HNItem, StoryType } from "./interface"

const BASE = "http://localhost:3000/api"

export async function getStories(type: StoryType, limit = 60): Promise<HNItem[]> {
  const res = await fetch(`${BASE}/${type}stories?limit=${limit}`)
  if (!res.ok) throw new Error("API error")
  return res.json()
}

export async function getItem<T = HNItem>(id: number): Promise<T> {
  const res = await fetch(`${BASE}/item/${id}`)
  return res.json()
}
