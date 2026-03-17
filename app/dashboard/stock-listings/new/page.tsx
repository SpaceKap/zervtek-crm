"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STOCK_LISTING_YEARS,
  FUEL_OPTIONS,
  TRANSMISSION_OPTIONS,
  DRIVE_OPTIONS,
  EQUIPMENT_OPTIONS,
  SCORE_OPTIONS,
  COLOR_OPTIONS,
  formatNumberWithCommas,
  parseFormattedNumber,
  generateStaticSeoClient,
} from "@/lib/stock-listing-constants";

const STATUS_OPTIONS = ["Available", "Reserved", "Sold"];
const MAX_PHOTOS = 10;

export default function NewStockListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [catalog, setCatalog] = useState<{ makes: string[]; modelsByMake: Record<string, string[]> }>({
    makes: [],
    modelsByMake: {},
  });
  const [form, setForm] = useState({
    status: "Available",
    fobPriceDisplay: "",
    currency: "JPY",
    brand: "",
    model: "",
    grade: "",
    year: "",
    mileageDisplay: "",
    transmission: "",
    extColor: "",
    fuel: "",
    drive: "",
    doors: "",
    engine: "",
    score: "",
    equipmentTags: [] as string[],
    seoTitle: "",
    metaDescription: "",
    description: "",
    tag: "Stock Listing",
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/stock-listings/catalog")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCatalog(json.data);
      })
      .catch(() => {});
  }, []);

  const models = form.brand ? catalog.modelsByMake[form.brand] || [] : [];

  useEffect(() => {
    if (form.brand && form.model && form.year) {
      const seo = generateStaticSeoClient({
        brand: form.brand,
        model: form.model,
        year: form.year ? parseInt(form.year, 10) : null,
      });
      if (seo) {
        setForm((p) => ({
          ...p,
          seoTitle: p.seoTitle || seo.seoTitle,
          metaDescription: p.metaDescription || seo.metaDescription,
        }));
      }
    }
  }, [form.brand, form.model, form.year]);

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const remaining = MAX_PHOTOS - photoUrls.length;
      if (remaining <= 0) return;
      setUploading(true);
      try {
        const toUpload = Array.from(files).slice(0, remaining);
        for (const file of toUpload) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("context", "stock-listing");
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          setPhotoUrls((prev) => [...prev, data.url]);
        }
      } catch (err) {
        alert("Failed to upload one or more photos");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [photoUrls.length]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleEquipment = (tag: string) => {
    setForm((p) => ({
      ...p,
      equipmentTags: p.equipmentTags.includes(tag)
        ? p.equipmentTags.filter((t) => t !== tag)
        : [...p.equipmentTags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fob = parseFormattedNumber(form.fobPriceDisplay);
    if (fob === null || fob < 0) {
      alert("FOB Price must be a valid number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stock-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: "",
          status: form.status,
          fobPrice: fob,
          currency: form.currency,
          brand: form.brand || null,
          model: form.model || null,
          grade: form.grade || null,
          year: form.year ? parseInt(form.year, 10) : null,
          mileage: form.mileageDisplay ? parseFormattedNumber(form.mileageDisplay) ?? null : null,
          transmission: form.transmission || null,
          extColor: form.extColor || null,
          fuel: form.fuel || null,
          drive: form.drive || null,
          doors: form.doors ? parseInt(form.doors, 10) : null,
          engine: form.engine || null,
          score: form.score || null,
          equipment: form.equipmentTags.length ? form.equipmentTags.join(", ") : null,
          photoUrls,
          seoTitle: form.seoTitle || undefined,
          metaDescription: form.metaDescription || undefined,
          description: form.description || undefined,
          tag: form.tag,
        }),
      });
      if (res.status === 409) {
        const j = await res.json();
        alert(j.error?.message || "Stock ID already exists");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error?.message || "Failed to create");
        return;
      }
      await res.json();
      router.push("/dashboard/stock-listings");
    } catch (err) {
      alert("Failed to create stock listing");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    setGeneratingDesc(true);
    try {
      const res = await fetch("/api/stock-listings/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: form.brand || undefined,
          model: form.model || undefined,
          grade: form.grade || undefined,
          year: form.year ? parseInt(form.year, 10) : null,
          mileage: form.mileageDisplay ? parseFormattedNumber(form.mileageDisplay) ?? null : null,
          transmission: form.transmission || undefined,
          extColor: form.extColor || undefined,
          fuel: form.fuel || undefined,
          drive: form.drive || undefined,
          doors: form.doors ? parseInt(form.doors, 10) : null,
          engine: form.engine || undefined,
          score: form.score || undefined,
          equipment: form.equipmentTags.length ? form.equipmentTags.join(", ") : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error?.message || "Could not generate description");
        return;
      }
      const json = await res.json();
      setForm((p) => ({ ...p, description: json.data?.description ?? "" }));
    } catch (err) {
      alert("Failed to generate description");
    } finally {
      setGeneratingDesc(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/stock-listings"
          className="text-muted-foreground hover:text-foreground"
        >
          ← Stock cars
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Add stock car</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Stock ID</Label>
                <p className="text-sm text-muted-foreground">Auto-generated</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>FOB Price (¥)</Label>
                <Input
                  value={form.fobPriceDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (raw === "" || /^\d+$/.test(raw)) {
                      const n = raw === "" ? "" : formatNumberWithCommas(raw);
                      setForm((p) => ({ ...p, fobPriceDisplay: n }));
                    }
                  }}
                  placeholder="1,230,000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle specs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Brand (Make)</Label>
                <Select
                  value={form.brand}
                  onValueChange={(v) => setForm((p) => ({ ...p, brand: v, model: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.makes.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Select
                  value={form.model}
                  onValueChange={(v) => setForm((p) => ({ ...p, model: v }))}
                  disabled={!form.brand}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade</Label>
                <Input
                  value={form.grade}
                  onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                  placeholder="G"
                />
              </div>
              <div>
                <Label>Year</Label>
                <Select
                  value={form.year}
                  onValueChange={(v) => setForm((p) => ({ ...p, year: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_LISTING_YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mileage (km)</Label>
                <Input
                  value={form.mileageDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (raw === "" || /^\d+$/.test(raw)) {
                      setForm((p) => ({ ...p, mileageDisplay: raw === "" ? "" : formatNumberWithCommas(raw) }));
                    }
                  }}
                  placeholder="186,000"
                />
              </div>
              <div>
                <Label>Transmission</Label>
                <Select
                  value={form.transmission}
                  onValueChange={(v) => setForm((p) => ({ ...p, transmission: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSION_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ext. color</Label>
                <Select
                  value={form.extColor || undefined}
                  onValueChange={(v) => setForm((p) => ({ ...p, extColor: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fuel</Label>
                <Select
                  value={form.fuel}
                  onValueChange={(v) => setForm((p) => ({ ...p, fuel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Drive</Label>
                <Select
                  value={form.drive}
                  onValueChange={(v) => setForm((p) => ({ ...p, drive: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRIVE_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Doors</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.doors}
                  onChange={(e) => setForm((p) => ({ ...p, doors: e.target.value }))}
                  placeholder="5"
                />
              </div>
              <div>
                <Label>Engine</Label>
                <Input
                  value={form.engine}
                  onChange={(e) => setForm((p) => ({ ...p, engine: e.target.value }))}
                  placeholder="1300cc"
                />
              </div>
              <div>
                <Label>Score</Label>
                <Select
                  value={form.score || undefined}
                  onValueChange={(v) => setForm((p) => ({ ...p, score: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Equipment</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EQUIPMENT_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleEquipment(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.equipmentTags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-input hover:bg-muted"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos (up to {MAX_PHOTOS})</CardTitle>
            <p className="text-sm text-muted-foreground">Drag and drop or click to upload. Images are compressed.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
            >
              <div className="flex flex-wrap gap-3">
                {photoUrls.map((url, i) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="h-24 w-32 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white w-6 h-6 flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photoUrls.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-24 w-32 border border-dashed rounded flex flex-col items-center justify-center text-muted-foreground hover:bg-muted gap-1 text-center"
                  >
                    <span className="material-symbols-outlined text-2xl block">add_photo_alternate</span>
                    <span className="block">{uploading ? "Uploading…" : "Upload"}</span>
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
            <p className="text-sm text-muted-foreground">
              Title and meta are generated from make, model and year (Import … from Japan | ZervTek). Edit if needed.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>SEO title</Label>
              <Input
                value={form.seoTitle}
                onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                placeholder="Auto-generated from make, model, year"
              />
            </div>
            <div>
              <Label>Meta description</Label>
              <Input
                value={form.metaDescription}
                onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
                placeholder="Auto-generated"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Label>Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDesc}
                >
                  {generatingDesc ? "Generating…" : "Generate with AI"}
                </Button>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Leave empty or click Generate with AI"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create stock listing"}
          </Button>
          <Link href="/dashboard/stock-listings">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
