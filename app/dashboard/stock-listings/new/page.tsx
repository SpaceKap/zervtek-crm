"use client";

import { useState, useEffect, useRef } from "react";
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

const STATUS_OPTIONS = ["Available", "Reserved", "Sold"];
const MAX_PHOTOS = 10;

export default function NewStockListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catalog, setCatalog] = useState<{ makes: string[]; modelsByMake: Record<string, string[]> }>({
    makes: [],
    modelsByMake: {},
  });
  const [form, setForm] = useState({
    stockId: "",
    status: "Available",
    fobPrice: "",
    currency: "JPY",
    brand: "",
    model: "",
    grade: "",
    year: "",
    mileage: "",
    transmission: "",
    extColor: "",
    fuel: "",
    drive: "",
    doors: "",
    engine: "",
    score: "",
    equipment: "",
    seoTitle: "",
    metaDescription: "",
    description: "",
    tag: "Stock Listing",
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/stock-listings/catalog")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCatalog(json.data);
      })
      .catch(() => {});
  }, []);

  const models = form.brand ? catalog.modelsByMake[form.brand] || [] : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const remaining = MAX_PHOTOS - photoUrls.length
    if (remaining <= 0) return
    setUploading(true)
    try {
      const toUpload = Array.from(files).slice(0, remaining)
      for (const file of toUpload) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("context", "stock-listing")
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) throw new Error("Upload failed")
        const data = await res.json()
        setPhotoUrls((prev) => [...prev, data.url])
      }
    } catch (err) {
      alert("Failed to upload one or more photos")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.stockId.trim()) {
      alert("Stock ID is required")
      return
    }
    const fob = parseFloat(form.fobPrice)
    if (isNaN(fob) || fob < 0) {
      alert("FOB Price must be a valid number")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/stock-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: form.stockId.trim(),
          status: form.status,
          fobPrice: fob,
          currency: form.currency,
          brand: form.brand || null,
          model: form.model || null,
          grade: form.grade || null,
          year: form.year ? parseInt(form.year, 10) : null,
          mileage: form.mileage ? parseInt(form.mileage, 10) : null,
          transmission: form.transmission || null,
          extColor: form.extColor || null,
          fuel: form.fuel || null,
          drive: form.drive || null,
          doors: form.doors ? parseInt(form.doors, 10) : null,
          engine: form.engine || null,
          score: form.score || null,
          equipment: form.equipment || null,
          photoUrls,
          seoTitle: form.seoTitle || undefined,
          metaDescription: form.metaDescription || undefined,
          description: form.description || undefined,
          tag: form.tag,
        }),
      })
      if (res.status === 409) {
        const j = await res.json()
        alert(j.error?.message || "Stock ID already exists")
        return
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error?.message || "Failed to create")
        return
      }
      const json = await res.json()
      router.push(`/dashboard/stock-listings/${json.data.id}/edit`)
    } catch (err) {
      alert("Failed to create stock listing")
    } finally {
      setLoading(false)
    }
  }

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
                <Label>Stock ID *</Label>
                <Input
                  value={form.stockId}
                  onChange={(e) => setForm((p) => ({ ...p, stockId: e.target.value }))}
                  placeholder="e.g. 972596870"
                  required
                />
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
                  type="number"
                  min={0}
                  value={form.fobPrice}
                  onChange={(e) => setForm((p) => ({ ...p, fobPrice: e.target.value }))}
                  placeholder="230000"
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
                <Input
                  type="number"
                  min={1990}
                  max={2030}
                  value={form.year}
                  onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                  placeholder="2009"
                />
              </div>
              <div>
                <Label>Mileage (km)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.mileage}
                  onChange={(e) => setForm((p) => ({ ...p, mileage: e.target.value }))}
                  placeholder="186000"
                />
              </div>
              <div>
                <Label>Transmission</Label>
                <Input
                  value={form.transmission}
                  onChange={(e) => setForm((p) => ({ ...p, transmission: e.target.value }))}
                  placeholder="FAT"
                />
              </div>
              <div>
                <Label>Ext. color</Label>
                <Input
                  value={form.extColor}
                  onChange={(e) => setForm((p) => ({ ...p, extColor: e.target.value }))}
                  placeholder="BLACK"
                />
              </div>
              <div>
                <Label>Fuel</Label>
                <Input
                  value={form.fuel}
                  onChange={(e) => setForm((p) => ({ ...p, fuel: e.target.value }))}
                  placeholder="gasoline"
                />
              </div>
              <div>
                <Label>Drive</Label>
                <Input
                  value={form.drive}
                  onChange={(e) => setForm((p) => ({ ...p, drive: e.target.value }))}
                  placeholder="2WD"
                />
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
                <Input
                  value={form.score}
                  onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))}
                  placeholder="R"
                />
              </div>
            </div>
            <div>
              <Label>Equipment</Label>
              <Input
                value={form.equipment}
                onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))}
                placeholder="AC PS SR"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos (up to {MAX_PHOTOS})</CardTitle>
            <p className="text-sm text-muted-foreground">Images are compressed to reduce size.</p>
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
                  className="h-24 w-32 border border-dashed rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                >
                  {uploading ? "Uploading…" : "+ Add"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO (optional)</CardTitle>
            <p className="text-sm text-muted-foreground">Leave blank to auto-generate with AI.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>SEO title</Label>
              <Input
                value={form.seoTitle}
                onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <Label>Meta description</Label>
              <Input
                value={form.metaDescription}
                onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Auto-generated if empty"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
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
