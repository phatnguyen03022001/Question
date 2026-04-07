# globals.css — Design Guideline (Project Usage)

Tài liệu này mô tả cách sử dụng `app/globals.css` để đảm bảo **design system thống nhất** cho toàn bộ project chat (Next.js App Router + Tailwind + shadcn structure).

---

## 1. Vai trò của `globals.css`

`globals.css` là **design foundation layer** của project:

* Khai báo **design tokens** (color, radius, semantic colors)
* Định nghĩa **dark mode**
* Mapping token → Tailwind utilities
* Tạo **UI utilities dùng chung**
* Chuẩn hóa base style toàn app

Không viết style component-specific tại đây.

---

## 2. Kiến trúc Design System

```
Design Token (CSS Variables)
        ↓
Tailwind Theme Mapping
        ↓
Utility Classes
        ↓
Components (components/*)
        ↓
Pages (app/*)
```

---

## 3. Design Tokens (CSS Variables)

### 3.1 Core Tokens

Định nghĩa trong `:root`

```css
:root {
  --background
  --foreground
  --primary
  --secondary
  --muted
  --accent
  --destructive
  --border
}
```

👉 Đây là **semantic tokens**, không phải màu cố định.

Không dùng:

```tsx
className="bg-blue-500"
```

Luôn dùng:

```tsx
className="bg-primary"
```

---

### 3.2 Semantic Extension

Project bổ sung:

```css
--success
--warning
```

Dùng cho:

* trạng thái user online
* message status
* badge
* notification

Ví dụ:

```tsx
className="bg-success text-white"
```

---

## 4. Tailwind Theme Mapping

Block:

```css
@theme inline {
  --color-background: var(--background);
}
```

### Mục đích

Cho phép Tailwind hiểu CSS variables:

| CSS variable   | Tailwind class    |
| -------------- | ----------------- |
| `--background` | `bg-background`   |
| `--foreground` | `text-foreground` |
| `--primary`    | `bg-primary`      |
| `--border`     | `border-border`   |

---

## 5. Dark Mode System

Dark mode hoạt động qua class:

```html
<html class="dark">
```

Variant:

```css
@custom-variant dark (&:is(.dark *));
```

### Cách dùng

```tsx
<div className="bg-background">
```

→ tự đổi màu khi `.dark` active.

Không viết:

```tsx
dark:bg-black
```

(trừ khi override đặc biệt)

---

## 6. Base Layer

```css
@layer base
```

Áp dụng global normalization:

```css
* {
  @apply border-border outline-ring/50;
}
```

Ý nghĩa:

* mọi border đồng nhất
* focus ring consistent

Body:

```css
body {
  @apply bg-background text-foreground antialiased;
}
```

→ toàn app tự sync theme.

---

## 7. Utility Layer (Quan trọng cho Chat App)

### 7.1 Chat Bubble System

#### Sent Message

```css
.chat-bubble-sent
```

Dùng trong:

```
components/chat/message-item.tsx
```

```tsx
<div className="chat-bubble-sent">
```

Style:

* primary background
* góc phải vuông
* auto dark-mode

---

#### Received Message

```css
.chat-bubble-received
```

```tsx
<div className="chat-bubble-received">
```

---

### 7.2 Scrollbar chuẩn Chat

```css
.custom-scrollbar
```

Dùng cho:

* message list
* conversation list

```tsx
<ScrollArea className="custom-scrollbar">
```

---

## 8. Quy tắc sử dụng trong Project Structure

### ✅ components/ui/*

Chỉ dùng token:

```tsx
bg-card
text-card-foreground
border-border
```

Không hardcode màu.

---

### ✅ components/chat/*

Được phép dùng utilities custom:

```
chat-bubble-*
custom-scrollbar
```

---

### ✅ app/*

Không style trực tiếp.

Page chỉ layout:

```tsx
<ChatContainer />
```

---

## 9. Khi cần thêm màu mới

### Bước 1 — thêm token

```css
:root {
  --info: oklch(...);
}
```

### Bước 2 — map vào theme

```css
@theme inline {
  --color-info: var(--info);
}
```

### Bước 3 — dùng

```tsx
bg-info text-info-foreground
```

---

## 10. Quy tắc bắt buộc (Project Convention)

### ✔ ALWAYS

* dùng semantic colors
* dùng token thay vì màu raw
* reuse utilities
* design qua globals trước, component sau

### ❌ NEVER

* hex color trong component
* inline style color
* duplicate bubble style
* tự tạo scrollbar riêng

---

## 11. Mapping với Structure hiện tại

| Folder            | Vai trò design     |
| ----------------- | ------------------ |
| `app/`            | layout + routing   |
| `components/ui`   | primitive UI       |
| `components/chat` | feature UI         |
| `globals.css`     | design system core |
| `lib/utils.ts`    | class merge (`cn`) |

---

## 12. Flow khi tạo UI mới

```
Need UI
  ↓
Có reusable không?
  ↓ yes → dùng lại
  ↓ no
có pattern global?
  ↓ yes → thêm globals.css utility
  ↓ no → local component style
```

---

## 13. Tóm tắt

`globals.css` trong project này đóng vai trò:

* Design Token Source
* Theme Engine
* Dark Mode Controller
* Shared Utilities Provider
* Visual Consistency Layer

Mọi UI nên phụ thuộc vào đây để tránh design drift khi project scale.

---
