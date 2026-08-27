"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type SearchResult = { type: string; id: string; label: string; href: string };
type Note = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  readAt: string | null;
};

export function TopBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [openNotes, setOpenNotes] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api<{ notifications: Note[]; unread: number }>("/api/notifications")
      .then((r) => {
        setNotes(r.notifications);
        setUnread(r.unread);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      void api<{ results: SearchResult[] }>(
        `/api/search?q=${encodeURIComponent(q.trim())}`
      ).then((r) => {
        setResults(r.results);
        setOpenSearch(true);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) {
        setOpenSearch(false);
        setOpenNotes(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={boxRef}
      className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8"
    >
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpenSearch(true)}
          placeholder="Search loads, drivers, trucks, invoices…"
          className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        {openSearch && results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setOpenSearch(false);
                    setQ("");
                    router.push(r.href);
                  }}
                >
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                    {r.type}
                  </span>
                  <span className="truncate">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative ml-auto">
        <button
          type="button"
          className="relative rounded-md border border-slate-200 p-2 hover:bg-slate-50"
          onClick={() => setOpenNotes((v) => !v)}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-slate-700" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
        {openNotes && (
          <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-semibold">Notifications</p>
              <button
                type="button"
                className="text-xs text-amber-700 hover:underline"
                onClick={() =>
                  void api("/api/notifications/read-all", { method: "POST" }).then(() => {
                    setUnread(0);
                    setNotes((n) => n.map((x) => ({ ...x, readAt: new Date().toISOString() })));
                  })
                }
              >
                Mark all read
              </button>
            </div>
            <ul className="max-h-80 overflow-auto">
              {notes.slice(0, 20).map((n) => (
                <li key={n.id} className="border-b border-slate-50">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => {
                        void api(`/api/notifications/${n.id}/read`, { method: "POST" });
                        setOpenNotes(false);
                      }}
                    >
                      <p className={n.readAt ? "text-slate-500" : "font-medium text-slate-900"}>
                        {n.message}
                      </p>
                    </Link>
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-600">{n.message}</p>
                  )}
                </li>
              ))}
              {!notes.length && (
                <li className="px-3 py-6 text-center text-sm text-slate-400">
                  No notifications
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
