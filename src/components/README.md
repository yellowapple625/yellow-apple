# 🧩 Components Directory

Reusable UI components used across multiple pages.

## Layout Components

| File | Description |
|------|-------------|
| `Sidebar.jsx` | Main navigation sidebar with collapsible toggle |

## Styles

| File | Description |
|------|-------------|
| `AdminStyles.css` | Admin panel styling (yellow/gold theme) |
| `AiCoachChat.css` | AI chat interface styling |
| `DailyTrackerStyles.css` | Daily tracker page styling |
| `HydrationStyles.css` | Water tracking UI styling |

## Component Architecture

```
Sidebar.jsx
├── Uses: lucide-react icons
├── Uses: UserProfileContext (for user data)
├── Features:
│   ├── Collapsible sidebar with localStorage persistence
│   ├── Navigation links to all pages
│   ├── User profile section
│   ├── Membership badge display
│   └── Logout functionality
```
