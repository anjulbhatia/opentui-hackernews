import { useState, useEffect } from "react"
import { useKeyboard } from "@opentui/react"
import { getStories, getItem } from "../lib/fetchnews"
import type { HNItem, StoryType } from "../lib/interface"
import { C } from "../lib/theme"

type View =
  | { page: "list"; storyType: StoryType }
  | { page: "detail"; story: HNItem }

const TABS: { key: StoryType; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "new", label: "New" },
  { key: "best", label: "Best" },
]

function timeAgo(ts: number): string {
  const min = Math.floor((Date.now() / 1000 - ts) / 60)
  if (min < 2) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function domain(url?: string): string {
  if (!url) return ""
  try { return new URL(url).hostname.replace(/^www\./, "") }
  catch { return "" }
}

function strip(html: string): string {
  return html
    .replace(/<p>/g, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
}

function openUrl(url: string) {
  Bun.spawn(["cmd", "/c", "start", "", url])
}

function Comment({ item, depth }: { item: HNItem; depth: number }) {
  const [replies, setReplies] = useState<HNItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!item.kids || item.kids.length === 0 || depth >= 3) { setLoaded(true); return }
    Promise.all(item.kids.map((id) => getItem<HNItem>(id)))
      .then((items) => { setReplies(items.filter((c) => c && c.type === "comment")); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (item.deleted || item.dead) return null

  return (
    <box flexDirection="column" width="100%">
      <box width="100%" flexDirection="column" paddingLeft={depth * 2}>
        <box height={1} gap={1}>
          <text fg={C.orange}>{item.by ?? "anon"}</text>
          <text fg={C.muted}>{item.time ? timeAgo(item.time) : ""}</text>
        </box>
        <box>
          <text fg={C.fg} wrap="word">{item.text ? strip(item.text) : ""}</text>
        </box>
      </box>
      {loaded && replies.map((r) => <Comment key={r.id} item={r} depth={depth + 1} />)}
      {!loaded && depth < 3 && (
        <box height={1} paddingLeft={depth * 2}>
          <text fg={C.muted}>loading...</text>
        </box>
      )}
    </box>
  )
}

function CommentThread({ kids }: { kids: number[] }) {
  const [comments, setComments] = useState<HNItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all(kids.map((id) => getItem<HNItem>(id)))
      .then((items) => { setComments(items.filter((c) => c && c.type === "comment")); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kids.join(",")])

  if (loading) return <box height={1} paddingLeft={1}><text fg={C.muted}>Loading comments...</text></box>
  if (comments.length === 0) return <box height={1} paddingLeft={1}><text fg={C.muted}>No comments</text></box>

  return <box flexDirection="column" width="100%">{comments.map((c) => <Comment key={c.id} item={c} depth={0} />)}</box>
}

export function App() {
  const [view, setView] = useState<View>({ page: "list", storyType: "top" })
  const [stories, setStories] = useState<HNItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cursor, setCursor] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [fullStory, setFullStory] = useState<HNItem | null>(null)
  const [lastFeed, setLastFeed] = useState<StoryType>("top")

  useEffect(() => {
    switchFeed("top")
  }, [])

  function switchFeed(type: StoryType) {
    setLastFeed(type)
    setView({ page: "list", storyType: type })
    setCursor(0)
    setScrollOffset(0)
    setLoading(true)
    setError("")
    getStories(type, 60)
      .then((items) => { setStories(items.filter((s) => s && s.type === "story")); setLoading(false) })
      .catch((e) => { setError("Failed to load stories"); setLoading(false); console.error(e) })
  }

  function openDetail(s: HNItem) {
    setFullStory(null)
    setView({ page: "detail", story: s })
    if (s.text || s.kids) getItem<HNItem>(s.id).then(setFullStory).catch(() => {})
  }

  function goBack() {
    setView({ page: "list", storyType: lastFeed })
    setFullStory(null)
  }

  useKeyboard((key) => {
    if (view.page === "list") {
      if (key.name === "q") process.exit(0)
      if (key.name === "1") switchFeed("top")
      if (key.name === "2") switchFeed("new")
      if (key.name === "3") switchFeed("best")
      if (key.name === "up") {
        setCursor((p) => { const n = Math.max(0, p - 1); if (n < scrollOffset) setScrollOffset(n); return n })
      }
      if (key.name === "down") {
        setCursor((p) => { const n = Math.min(stories.length - 1, p + 1); if (n >= scrollOffset + 20) setScrollOffset(n - 19); return n })
      }
      if (key.name === "enter" || key.name === "return") {
        const s = stories[cursor]; if (s) openDetail(s)
      }
      if (key.name === "o") {
        const s = stories[cursor]; if (s?.url) openUrl(s.url)
      }
    } else {
      if (key.name === "escape") goBack()
      if (key.name === "enter" || key.name === "return" || key.name === "o") {
        if (view.page === "detail" && view.story?.url) openUrl(view.story.url)
      }
    }
  })

  const visible = stories.slice(scrollOffset, scrollOffset + 20)

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={C.bg}>
      <box height={1} backgroundColor={C.orange} width="100%" flexDirection="row">
        <box paddingLeft={1} width={11}>
          <text fg={C.white}><b>HN Feed</b></text>
        </box>
        {TABS.map((tab) => {
          const active = view.page === "list" && view.storyType === tab.key
          return (
            <box
              key={tab.key}
              width={7}
              backgroundColor={active ? C.white : C.orange}
              alignItems="center"
              justifyContent="center"
              onPress={() => switchFeed(tab.key)}
            >
              <text fg={active ? C.orange : C.white}>
                {active ? <b>{tab.label}</b> : tab.label}
              </text>
            </box>
          )
        })}
        <box flexGrow={1} />
        <box paddingRight={1}>
          <text fg={C.white}>
            {view.page === "list"
              ? view.storyType === "top" ? "Top Stories" : view.storyType === "new" ? "New Stories" : "Best Stories"
              : "Story Discussion"}
          </text>
        </box>
      </box>

      <box flexGrow={1} width="100%">
        {view.page === "list" ? (
          loading ? (
            <box width="100%" height="100%" alignItems="center" justifyContent="center">
              <text fg={C.muted}>Loading stories...</text>
            </box>
          ) : error ? (
            <box width="100%" height="100%" alignItems="center" justifyContent="center">
              <text fg={C.orange}>{error}</text>
            </box>
          ) : (
            <scrollbox stickyScroll flexGrow={1} width="100%" paddingLeft={1} paddingRight={1}>
              {visible.map((s, i) => {
                const idx = scrollOffset + i
                const active = idx === cursor
                const rank = idx + 1
                return (
                  <box key={s.id} flexDirection="column" width="100%" onPress={() => openDetail(s)}>
                    <box width="100%" height={1} backgroundColor={active ? C.orange : C.bg} paddingLeft={1}>
                      {active ? (
                        <text fg={C.white}><b>{rank}. {s.title ?? "Untitled"}</b></text>
                      ) : (
                        <box flexDirection="row">
                          <text fg={C.fg}>{rank}. {s.title ?? "Untitled"}</text>
                          {domain(s.url) ? <text fg={C.muted}> ({domain(s.url)})</text> : null}
                        </box>
                      )}
                    </box>
                    <box width="100%" height={1} backgroundColor={active ? C.dimOrange : C.bg} paddingLeft={3}>
                      {active ? (
                        <text fg={C.orange}>
                          {String(s.score ?? 0)} pts by {s.by ?? "anon"} {s.time ? timeAgo(s.time) : ""}  |  {String(s.descendants ?? 0)} comments  |  O: open
                        </text>
                      ) : (
                        <text fg={C.muted}>
                          {String(s.score ?? 0)} pts by {s.by ?? "anon"} {s.time ? timeAgo(s.time) : ""}  |  {String(s.descendants ?? 0)} comments
                        </text>
                      )}
                    </box>
                  </box>
                )
              })}
            </scrollbox>
          )
        ) : (
          <scrollbox stickyScroll flexGrow={1} width="100%" paddingLeft={2} paddingRight={2}>
            <box flexDirection="column" width="100%">
              <box height={1} marginTop={1}>
                <text fg={C.fg}><b>{view.story.title ?? "Untitled"}</b></text>
              </box>
              <box height={1} gap={2}>
                <text fg={C.orange}>{String(fullStory?.score ?? view.story.score ?? 0)} points</text>
                <text fg={C.muted}>by {fullStory?.by ?? view.story.by ?? "anon"}</text>
                <text fg={C.muted}>{timeAgo(fullStory?.time ?? view.story.time ?? 0)}</text>
              </box>
              {view.story.url && (
                <box height={1} gap={1}>
                  <text fg={C.muted}>{view.story.url}</text>
                  <text fg={C.orange}>[Enter/O] open</text>
                </box>
              )}
              {fullStory?.text && (
                <box marginTop={1} marginBottom={1}>
                  <text fg={C.fg} wrap="word">{strip(fullStory.text)}</text>
                </box>
              )}
              <box height={1} marginTop={1}>
                <text fg={C.orange}><b>{String(view.story.descendants ?? 0)} comments</b></text>
              </box>
              {view.story.kids && view.story.kids.length > 0 ? (
                <CommentThread kids={view.story.kids} />
              ) : (
                <box height={1}><text fg={C.muted}>No comments yet</text></box>
              )}
            </box>
          </scrollbox>
        )}
      </box>

      <box height={1} backgroundColor={C.orange} width="100%" paddingLeft={1} paddingRight={1} flexDirection="row" justifyContent="space-between">
        {view.page === "list" ? (
          <text fg={C.white}>[arrows] navigate | [Enter] detail | [O] open article | [1/2/3] feed</text>
        ) : (
          <text fg={C.white}>[Enter/O] open article | [ESC] back</text>
        )}
      </box>
    </box>
  )
}
