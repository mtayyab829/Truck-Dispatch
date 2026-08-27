"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  FileImage,
  File,
  Download,
  Filter,
} from "lucide-react";
import { api, apiFileUrl, fetchFileObjectUrl } from "@/lib/api";
import { formatDate } from "@/lib/fleet";
import { money, statusLabel } from "@/lib/loads";
import { cn } from "@/lib/utils";

type LoadSummary = {
  id: string;
  loadNumber: string;
  pickupCity: string;
  pickupState: string | null;
  deliveryCity: string;
  deliveryState: string | null;
  pickupDateTime: string | null;
  deliveryDateTime: string | null;
  rate: number;
  loadStatus: string;
  commodity: string | null;
  equipment: string | null;
  miles: number | null;
  driver: { id: string; name: string } | null;
  truck: { id: string; unitNumber: string } | null;
};

type Doc = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  docType: string;
  entityType: string;
  entityId: string;
  expiryDate: string | null;
  createdAt: string | null;
  expiringSoon: boolean;
  expired: boolean;
  load: LoadSummary | null;
};

const DOC_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "POD", label: "POD" },
  { value: "BOL", label: "BOL" },
  { value: "RATE_CONFIRMATION", label: "Rate confirmation" },
  { value: "OTHER", label: "Other" },
] as const;

function routeLabel(load: LoadSummary) {
  const from = [load.pickupCity, load.pickupState].filter(Boolean).join(", ");
  const to = [load.deliveryCity, load.deliveryState].filter(Boolean).join(", ");
  return `${from} → ${to}`;
}

function isImageMime(mime: string | null, fileName: string) {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(fileName);
}

function isPdfMime(mime: string | null, fileName: string) {
  if (mime === "application/pdf") return true;
  return /\.pdf$/i.test(fileName);
}

/** Cloudinary can render PDF page 1 as a JPG thumbnail. */
function previewImageUrl(
  fileUrl: string,
  mimeType: string | null,
  fileName: string
): string | null {
  if (isImageMime(mimeType, fileName)) return fileUrl;
  if (
    isPdfMime(mimeType, fileName) &&
    /^https?:\/\//i.test(fileUrl) &&
    fileUrl.includes("/upload/")
  ) {
    return fileUrl.replace("/upload/", "/upload/f_jpg,pg_1,w_400,c_limit/");
  }
  return null;
}

function DocThumb({ doc }: { doc: Doc }) {
  const likelyImage = isImageMime(doc.mimeType, doc.fileName);
  const likelyPdf = isPdfMime(doc.mimeType, doc.fileName);
  const remotePreview = previewImageUrl(doc.fileUrl, doc.mimeType, doc.fileName);
  const [src, setSrc] = useState<string | null>(remotePreview);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (remotePreview) {
      setSrc(remotePreview);
      setFailed(false);
      return;
    }
    if (!likelyImage) return;
    let revoke: (() => void) | undefined;
    let cancelled = false;
    void fetchFileObjectUrl(doc.fileUrl)
      .then((r) => {
        if (cancelled) {
          r.revoke();
          return;
        }
        revoke = r.revoke;
        setSrc(r.url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      revoke?.();
    };
  }, [doc.fileUrl, likelyImage, remotePreview]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-32 w-full object-cover bg-slate-100"
        onError={() => {
          setFailed(true);
          setSrc(null);
        }}
      />
    );
  }

  return (
    <div className="flex h-32 w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400">
      {likelyPdf ? (
        <FileText className="h-8 w-8" />
      ) : likelyImage ? (
        <FileImage className="h-8 w-8" />
      ) : (
        <File className="h-8 w-8" />
      )}
      <span className="text-[10px] uppercase tracking-wide">
        {doc.docType.replace(/_/g, " ")}
      </span>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    void api<{ documents: Doc[] }>("/api/documents")
      .then((r) => setDocuments(r.documents))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return documents;
    return documents.filter((d) => d.docType === filter);
  }, [documents, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="mt-1 text-slate-600">
            Files with linked load details. Upload from a load page.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {loading
            ? "Loading…"
            : `${filtered.length} file${filtered.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        {DOC_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition",
              filter === f.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading documents…</p>
      ) : !filtered.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-slate-700">No documents yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Open a load and upload a POD, BOL, or rate confirmation.
          </p>
          <Link
            href="/loads"
            className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline"
          >
            Go to loads
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <article
              key={d.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <DocThumb doc={d} />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {d.fileName}
                    </p>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
                      {d.docType.replace(/_/g, " ")}
                      {d.createdAt ? ` · ${formatDate(d.createdAt)}` : ""}
                    </p>
                  </div>
                  <a
                    href={apiFileUrl(d.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-amber-700 hover:text-amber-800"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>

                {d.load ? (
                  <div className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800">
                        {d.load.loadNumber}
                      </p>
                      <Link
                        href={`/loads/${d.load.id}`}
                        className="inline-flex items-center gap-1 text-amber-700 hover:underline"
                      >
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    <p>{statusLabel(d.load.loadStatus)}</p>
                    <p className="truncate">{routeLabel(d.load)}</p>
                    <p>
                      {money(d.load.rate)}
                      {d.load.driver ? ` · ${d.load.driver.name}` : ""}
                      {d.load.truck ? ` · ${d.load.truck.unitNumber}` : ""}
                    </p>
                    <p className="text-slate-400">
                      Pickup {formatDate(d.load.pickupDateTime)} · Delivery{" "}
                      {formatDate(d.load.deliveryDateTime)}
                    </p>
                  </div>
                ) : (
                  <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                    {d.entityType} · no load details
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
