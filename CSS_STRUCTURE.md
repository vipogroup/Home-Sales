# VIPO CSS Architecture

## File Structure

```
/assets/css/
├── theme.css           # Design tokens (colors, spacing, typography, shadows)
├── style-base.css      # Shared components (buttons, forms, cards, modals, layout)
├── style-agent.css     # Agent system visuals (minimal, future-ready)
└── style-shop.css      # Shop system visuals (products, checkout, payments)
```

## 1. theme.css - Design Tokens

**Purpose**: CSS variables and design system tokens  
**Contains**:
- Typography tokens (font-family, sizes, weights)
- Spacing scale (xs to 2xl)
- Border radius scale (sm to pill)
- Color palette (text, success, danger, warning, info)
- Shadow scale (sm, md, lg)
- VIPO-specific design tokens (joinBtnColor, headerBgColor, etc.)

**Dynamic Loading**:  
The server intercepts `GET /assets/theme.css` (in `src/server.js`) and generates CSS variables from database settings. The static file `/assets/css/theme.css` serves as:
1. **Documentation** of available tokens
2. **Fallback** defaults if DB is unavailable
3. **Type reference** for designers/developers

The dynamic endpoint merges DB values with static defaults, ensuring customizable theming per admin settings.

## 2. style-base.css - Shared Components

**Purpose**: Reusable components and utilities used across all pages  
**Contains**:
- Base resets & body
- Buttons (all variants: primary, success, outline, etc.)
- Forms & inputs
- Tables
- Cards & modals
- Layout helpers (flex, grid, spacing, sizing)
- Text helpers (colors, alignment, sizes)
- Login pages (admin + agent shared)
- Spinner animation

**Prefix**: None (these are shared base classes)

## 3. style-agent.css - Agent System

**Purpose**: Agent-specific visual styles  
**Contains**: Currently minimal (agent uses base styles)  
**Future**: Agent-specific UI enhancements with `.agent-` prefix

**Used by**:
- `/agent/login.html`
- `/agent/dashboard.html`

## 4. style-shop.css - Shop System

**Purpose**: Shop-specific visual styles  
**Contains**:
- Shop body & header
- Products grid & cards
- Product detail page (gallery, price section, shipping info)
- Checkout page (all payment methods, installments, delivery options)
- Payment success/cancel pages
- My orders page
- Shop-specific responsive breakpoints

**Prefix**: None currently (shop classes are distinct: `.product-card`, `.checkout-header`, etc.)  
**Future**: Can add `.shop-` prefix if needed for clarity

**Used by**:
- `/shop/index.html`
- `/shop/product.html`
- `/shop/checkout.html`
- `/shop/payment-success.html`
- `/shop/payment-cancel.html`
- `/shop/my-orders.html`

## Load Order

All pages load CSS in this order:

```html
<link rel="stylesheet" href="/assets/css/theme.css"/>        <!-- 1. Tokens -->
<link rel="stylesheet" href="/assets/css/style-base.css"/>   <!-- 2. Base -->
<link rel="stylesheet" href="/assets/css/style-{area}.css"/> <!-- 3. Specific -->
```

Where `{area}` is:
- `agent` for `/agent/*` pages
- `shop` for `/shop/*` pages
- (none for `/admin/*` - uses only base)

## Updated HTML Files

### Admin
- `/admin/dashboard.html` → theme + base
- `/admin/login.html` → theme + base

### Agent
- `/agent/dashboard.html` → theme + base + agent
- `/agent/login.html` → theme + base + agent

### Shop
- `/shop/index.html` → theme + base + shop
- `/shop/product.html` → theme + base + shop
- `/shop/checkout.html` → theme + base + shop
- `/shop/payment-success.html` → theme + base + shop
- `/shop/payment-cancel.html` → theme + base + shop
- `/shop/my-orders.html` → theme + base + shop

## Migration Notes

### Deprecated Files (can be deleted)
- `base.css` → replaced by `theme.css` + `style-base.css`
- `shop.css` → replaced by `style-shop.css`

### Pixel-Perfect Preservation
All visual styles were extracted without modification. The refactor only reorganized files, maintaining:
- Exact pixel dimensions
- Color values
- Spacing
- Animations
- Responsive breakpoints

### Benefits
- **Modularity**: Clear separation of concerns
- **Reusability**: Shared components in one place
- **Maintainability**: Change tokens in theme.css, all pages update
- **Performance**: Only load needed styles per area
- **Scalability**: Easy to add new areas (e.g., `style-reports.css`)
