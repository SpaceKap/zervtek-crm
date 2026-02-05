# Mobile Document Features & Implementation

## 1. Camera Scanning with Auto-Detection & Crop ✅

### How It Works:

**Yes, we can implement automatic document detection and cropping!**

#### Technology Stack:
- **Browser Camera API** (`navigator.mediaDevices.getUserMedia`)
- **Document Scanner Library**: `react-document-scanner` or `react-scanner-detection`
- **Image Processing**: `react-image-crop` or `react-easy-crop`
- **Edge Detection**: OpenCV.js (via `opencv-js`) or TensorFlow.js

#### Implementation Approach:

```typescript
// Component: DocumentScanner.tsx
1. Access device camera
2. Show live camera preview
3. Detect document edges in real-time (using edge detection)
4. Auto-crop detected document area
5. Allow manual adjustment if needed
6. Process image (enhance, rotate, deskew)
7. Upload to Paperless/CRM
```

#### Libraries to Use:
```bash
npm install react-document-scanner react-image-crop
# OR
npm install react-scanner-detection opencv-js
```

#### Features:
- ✅ Real-time document edge detection
- ✅ Automatic cropping
- ✅ Manual adjustment option
- ✅ Image enhancement (brightness, contrast)
- ✅ Auto-rotation correction
- ✅ Multi-page support
- ✅ Batch scanning

---

## 2. Upload to Paperless First, Then Pick from CRM ✅

### Workflow:

```
1. User uploads/scans document → Paperless-ngx
2. Paperless processes (OCR, tags, metadata)
3. User opens CRM → "Import from Paperless" page
4. CRM fetches documents from Paperless API
5. User selects documents to link to:
   - Inquiry
   - Invoice
   - Customer
   - Vehicle
6. Document metadata synced to CRM
```

### Implementation:

#### API Endpoints:
1. `/api/paperless/documents` - List Paperless documents
2. `/api/paperless/import` - Import selected documents to CRM
3. `/api/paperless/sync` - Sync Paperless metadata

#### UI Components:
- `PaperlessDocumentPicker.tsx` - Browse Paperless documents
- `DocumentLinker.tsx` - Link document to CRM entity
- `PaperlessImportDialog.tsx` - Import dialog

#### Benefits:
- ✅ Paperless handles OCR and processing
- ✅ Documents searchable via Paperless
- ✅ Can link same document to multiple CRM entities
- ✅ Centralized document management

---

## 3. Mobile Kanban Board View 📱

### Current State:
- Desktop: Horizontal scroll with columns side-by-side
- Mobile: Needs optimization (currently uses `overflow-x-auto`)

### Mobile-Optimized Design:

#### Option A: Vertical Stack (Recommended)
```
┌─────────────────┐
│   New (3)       │
│  ┌───────────┐  │
│  │ Card 1    │  │
│  │ Card 2    │  │
│  └───────────┘  │
│   ▼ View All    │
├─────────────────┤
│  Contacted (5)  │
│  ┌───────────┐  │
│  │ Card 1    │  │
│  └───────────┘  │
│   ▼ View All    │
└─────────────────┘
```

#### Option B: Swipeable Tabs
```
[New] [Contacted] [Qualified] ← Swipeable tabs
┌─────────────────┐
│   New (3)       │
│  ┌───────────┐  │
│  │ Card 1    │  │
│  │ Card 2    │  │
│  │ Card 3    │  │
└─────────────────┘
```

#### Option C: Accordion View
```
▼ New (3)
  ┌───────────┐
  │ Card 1    │
  │ Card 2    │
  └───────────┘
▶ Contacted (5)
▶ Qualified (2)
```

### Implementation:

```typescript
// Detect mobile and switch layout
const isMobile = window.innerWidth < 768;

if (isMobile) {
  // Vertical stack layout
  // Swipeable tabs
  // Touch-optimized drag & drop
} else {
  // Current horizontal layout
}
```

---

## 4. Mobile Browser vs Native App 📲

### Current: Mobile Browser (PWA-ready)

**What you have now:**
- Web application accessible via mobile browser
- Responsive design (can be improved)
- Works on iOS/Android browsers

### Option 1: Progressive Web App (PWA) ⭐ Recommended

**What it is:**
- Web app that feels like a native app
- Installable on home screen
- Works offline (with service workers)
- Push notifications
- App-like experience

**Implementation:**
```bash
# Add PWA support
npm install next-pwa
```

**Features:**
- ✅ Install to home screen
- ✅ Offline support
- ✅ App icon
- ✅ Splash screen
- ✅ Full-screen mode
- ✅ No app store needed
- ✅ Works on iOS & Android

**Limitations:**
- ⚠️ Limited iOS PWA support (some features restricted)
- ⚠️ No access to all native APIs

### Option 2: Native App (React Native)

**What it is:**
- True native iOS/Android app
- Full device access
- App store distribution

**Implementation:**
- Would need separate React Native codebase
- Share API/backend with web app
- More development time

**Features:**
- ✅ Full native features
- ✅ Better performance
- ✅ App store distribution
- ✅ Better camera/document scanning

**Limitations:**
- ❌ Separate codebase to maintain
- ❌ Longer development time
- ❌ App store approval process

### Recommendation: **Start with PWA**

1. **Phase 1**: Make web app mobile-responsive
2. **Phase 2**: Add PWA features (installable, offline)
3. **Phase 3**: If needed, consider React Native wrapper

---

## Implementation Priority

### Phase 1: Mobile Optimization (Week 1)
- Add viewport meta tag
- Responsive Kanban board
- Mobile-friendly forms
- Touch-optimized buttons

### Phase 2: Document Scanner (Week 2)
- Camera access
- Document detection
- Auto-crop
- Upload to Paperless

### Phase 3: Paperless Integration (Week 3)
- Paperless API integration
- Import documents from Paperless
- Link to CRM entities

### Phase 4: PWA Features (Week 4)
- Service worker
- Offline support
- Install prompt
- App manifest

---

## Quick Start: Mobile Viewport

Add to `app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: "CRM",
  description: "CRM system for managing customer inquiries",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
}
```

Or add to `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
```
