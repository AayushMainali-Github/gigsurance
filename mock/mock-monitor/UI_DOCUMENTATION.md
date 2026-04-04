# Gigsurance Mock Monitor UI Documentation

## Overview

This document describes the current UI system implemented for `mock-monitor`.

The redesign work so far has focused on presentation only:

- no business logic changes
- no routing changes
- no API contract changes
- no state-management changes
- no file/folder structure changes for product code

The current direction is:

- Apple-inspired minimalism
- modern SaaS dashboard styling
- clean light surfaces
- restrained semantic color
- strong readability for dense monitoring views

## Design Goals

The implemented UI aims to make the monitor feel:

- more premium
- more visually structured
- more readable under dense data conditions
- more consistent across pages
- more colorful without becoming loud

The dashboard should feel calm and modern, while still making operational states easy to scan.

## Global Theme

The shared theme is defined in [styles.css](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/styles.css).

### Core neutrals

- Page background: `#F8FAFC`
- Primary surface: `#FFFFFF`
- Secondary surface: `#F1F5F9`
- Border/divider: `#E5E7EB`

### Typography colors

- Primary text: `#0F172A`
- Secondary text: `#475569`
- Muted text: `#94A3B8`

### Semantic accents

- Primary / drivers / core selection: `#2563EB`
- Success / cities / healthy network: `#10B981`
- Warning / weather / timing pressure: `#F59E0B`
- Danger / AQI / alerts: `#EF4444`
- Info / platform / supporting highlight: `#06B6D4`
- Premium accent / chart support: `#7C3AED`

### Tint usage

Low-opacity color tokens are used for:

- badge backgrounds
- selected states
- subtle card emphasis
- table chips
- chart shells
- note blocks
- progress/bar rows

This keeps the UI colorful but still clean.

## Typography System

The global font stack is:

- `Inter`
- `system-ui`
- `sans-serif`

The approved weight range used in the UI is:

- `400`
- `500`
- `600`
- `800`

### Type hierarchy

- Page titles: `1.875rem`, `800`
- Section headings: `1rem`, `600`
- Eyebrow labels: `0.7rem`, `600`, uppercase, tracked
- Body text: `0.875rem`, `400`
- Metric values: `2rem`, `800`
- Muted meta text: `0.75rem`, `400`

## Surface System

The current surface treatment is intentionally structured and sharp.

### Cards and panels

- White background
- `1px` border using `--border-color`
- Soft shadow
- Square geometry
- `24px` standard panel padding

### Nested surfaces

Nested UI blocks such as note items, chart shells, popup items, and row cards use:

- the same border color
- lighter tinted/secondary backgrounds
- square geometry
- tighter internal padding

### Removed accents

The following were intentionally removed from the redesign:

- left accent rails
- colorful strip borders on cards
- boxed utility clutter in the sidebar header
- overly bubbly card radius

## Layout and Spacing

### Main page shell

- Sidebar + content split layout
- Main content padding: `32px 36px`
- Shared vertical section rhythm: `24px`
- Shared grid gap: `20px`

### Grid behavior

The monitor uses consistent grid alignment for:

- metric cards
- page panels
- chart/table combinations
- map + supporting panels

The current intent is a tighter collage-like alignment:

- minimal dead space
- equalized card stretching
- no random card offsets
- consistent panel heights inside grid rows where possible

## Sidebar

The sidebar was simplified to feel more premium and less like a utility panel.

### Current brand block

- `MM` monogram block
- `Gigsurance mock-monitor` title
- `Monitoring Workspace` subtitle

### Changes already made

- removed the old `INTERFACE REFRESH` panel
- removed the green live status dot
- simplified the header composition
- kept navigation functionality intact

### Navigation styling

- white sidebar background
- subtle right border
- simple active state tint
- clean hover treatment
- grouped navigation separation using dividers

## Headings and Title Treatment

The heading system has been simplified further.

### Current rule

- headings should read as typography first
- no rectangular or square heading boxes
- no boxed icon containers for section titles

### Applied changes

- the top eyebrow label is now plain text styling without a boxed chip
- section-title icons remain, but without a boxed background

## Shared Components

### `StatCard`

File:
[StatCard.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/StatCard.jsx)

Current behavior:

- context-aware icon selection based on title
- semantic icon badge tint
- stronger metric hierarchy
- subtle top-surface tint for visual lift
- selective accent emphasis on major numbers

### `PanelTable`

File:
[PanelTable.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/PanelTable.jsx)

Current behavior:

- consistent panel shell
- icon + title panel header
- muted row-count meta pill
- soft indigo-tinted header row
- structured primary vs secondary cell styling
- numeric right alignment
- badge rendering for tiers/categories/status/type
- metric chips for severity/risk/disruption/AQI values

### `SparkBarList`

File:
[SparkBarList.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/SparkBarList.jsx)

Current behavior:

- panelized distribution lists
- subtle row card treatment
- semantic progress bar fill
- stronger value alignment
- formatted display labels

### `ChartPanel`

File:
[ChartPanel.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/ChartPanel.jsx)

Current behavior:

- shared chart shell
- light neutral/tinted chart container
- section title with icon
- unified chart spacing and height rhythm

### `FilterBar`

File:
[FilterBar.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/layout/FilterBar.jsx)

Current behavior:

- shared white card shell
- global monitor filters for city, platform, and state
- iconized labels
- clean select controls
- reset action aligned with the shared theme

## Label and Capitalization Rules

Display formatting is handled at render level where needed so underlying data values remain unchanged.

File:
[format.js](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/lib/utils/format.js)

### Current formatting rules

- `tier1` becomes `Tier 1`
- `tier2` becomes `Tier 2`
- `tier3` becomes `Tier 3`
- underscore-separated values are converted into readable words
- labels are title-cased for display where appropriate

This ensures consistency without modifying source data.

## Page Coverage

The UI system has been applied across these monitor routes:

- Overview
- Delivery Ops
- Weather
- AQI
- Platforms
- Cities
- Drivers
- Live Orders
- Analytics
- Maps
- Alerts

## Page-Level Notes

### Overview

- refined hero/header structure
- clearer summary hierarchy
- cleaner monitor tables and distributions

### Delivery Ops

- normalized panel spacing
- improved table readability
- consistent fleet/ops presentation

### Weather

- warning color language aligned to weather semantics
- clearer surface hierarchy for operational conditions

### AQI

- danger/red semantics aligned to AQI severity
- improved high-risk readability

### Platforms

- info/cyan semantics applied where platform data is highlighted
- cleaner panel rhythm

### Cities

- success/green semantics used for city/network context
- consistent city-level drilldown styling

### Drivers

- driver-focused blue semantic emphasis
- charts updated to use refined light styling

### Live Orders

- note blocks standardized
- live/pending/complete states use consistent chips

### Analytics

- chart colors updated to the refined semantic palette
- tooltips follow the light premium theme

### Maps

- map shell aligned to the shared panel system
- map popups redesigned as structured mini-surfaces
- semantic marker coloring aligned to the dashboard palette
- prior functional issue caused by `Map` naming conflict has been corrected

### Alerts

- alert-related chips and containers use danger/warning semantics
- note/panel styling follows the same shared surface system

## Charts

Charts were updated to avoid flat grayscale rendering while staying restrained.

### Current chart principles

- white/light shells
- soft grid/border colors
- high-contrast text
- semantic accent usage
- no heavy or flashy gradients

### Current chart accent mapping

- Drivers / core lines: blue
- Weather / duration pressure: amber
- AQI / risk pressure: red where applicable
- Platform/info support: cyan
- Secondary premium highlight: purple

## Tables and Dense Data

Tables were refined for monitoring use cases.

### Current table rules

- soft tinted header row
- subtle dividers
- readable row density
- quiet hover feedback
- badge-first treatment for categorical values
- stronger alignment for numerics

This is intended to make dense data easier to scan quickly.

## Maps

The map page required both UI and functional cleanup.

### Functional fix already applied

The Lucide `Map` icon import had conflicted with JavaScript’s native `Map` constructor. That was fixed by renaming the icon import to `MapIcon` in the map page.

### Visual changes

- aligned the map frame to shared panel styling
- structured popup cards
- cleaned mode switch appearance
- aligned semantic colors with the rest of the dashboard

## Current Visual Rules

These are the current rules to preserve in future UI work:

- keep neutral backgrounds dominant
- use accent colors sparingly
- no heavy accent bars on cards
- no random category colors
- no boxed heading treatments
- preserve square/sharp surface geometry
- prefer shared component styling over page-specific one-offs
- keep display formatting at render level if values are dynamic

## Files Most Relevant to the Current UI

### Global styling and layout

- [styles.css](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/styles.css)
- [AppShell.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/layout/AppShell.jsx)
- [FilterBar.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/layout/FilterBar.jsx)

### Shared UI primitives

- [StatCard.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/StatCard.jsx)
- [PanelTable.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/PanelTable.jsx)
- [SparkBarList.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/SparkBarList.jsx)
- [ChartPanel.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/components/ChartPanel.jsx)
- [format.js](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/lib/utils/format.js)

### Pages with special UI handling

- [AnalyticsPage.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/analytics/AnalyticsPage.jsx)
- [DriversPage.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/drivers/DriversPage.jsx)
- [MapsPage.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/maps/MapsPage.jsx)
- [AlertsPage.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/alerts/AlertsPage.jsx)
- [LivePage.jsx](/C:/Users/prabi/Documents/GuideWire/Code/gigsurance/mock/mock-monitor/src/features/live/LivePage.jsx)

## Suggested Next UI Steps

If the monitor gets another design pass, the highest-value next refinements would be:

- unify icon usage more deliberately per route
- tune per-page density for very large tables
- improve empty/loading states visually
- refine map legend and overlay controls
- add a documented component token sheet for future contributors
