# MANAS360 Landing Page - React Setup Guide

## 📋 Overview

This guide provides complete setup and deployment instructions for the production-ready MANAS360 landing page built with React, TailwindCSS, and React Router.

## 🎯 Quick Start

### 1. **Install Dependencies**

```bash
cd frontend

# Install required packages
npm install react-router-dom react-helmet-async

# Optional: For Framer Motion animations (advanced)
npm install framer-motion
```

### 2. **Update App Router Configuration**

In your main app router configuration (e.g., `src/App.tsx` or `src/main.tsx`):

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LandingPage from './pages/LandingPage';
import AssessmentPage from './pages/AssessmentPage'; // Your assessment page

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          {/* Other routes */}
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
```

### 3. **Import Global Styles**

In your `src/main.tsx` or `src/index.tsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 4. **Verify Tailwind Config**

Ensure your `tailwind.config.ts` has the extended colors and configurations (provided in setup).

---

## 📁 Folder Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── LandingPage.tsx              # Main landing page component
│   │
│   ├── components/
│   │   └── LandingPage/
│   │       ├── index.ts                  # Component exports
│   │       ├── Header.tsx                # Logo and navigation
│   │       ├── HeroSection.tsx           # Main headline and CTA
│   │       ├── TrustBar.tsx              # Trust indicators
│   │       ├── HowItWorks.tsx            # 3-step process
│   │       ├── Testimonial.tsx           # User testimonial
│   │       ├── CtaSection.tsx            # Final CTA
│   │       ├── BackgroundParticles.tsx   # Animated background
│   │       └── CrisisBanner.tsx          # Crisis helpline footer
│   │
│   ├── App.tsx                          # Main app router
│   ├── main.tsx                         # Entry point
│   └── index.css                        # Global styles + Tailwind directives
│
├── tailwind.config.ts                   # Extended Tailwind config
├── package.json                         # Dependencies
└── vite.config.ts                       # Vite configuration
```

---

## 🎨 Component Breakdown

### **Header**
- Logo display with branding
- Navigation link (home)
- Fade-in animation

### **HeroSection**
- Main headline with gradient text
- Subheading
- Primary CTA button with smooth transition
- Trust badges (responsive)
- Breathing animation on headline

### **TrustBar**
- 4 trust indicators (Confidentiality, Licensed, Non-judgment, Speed)
- Glass morphism design
- Intersection observer for fade-in effect
- Grid layout (responsive 2x2 → 1x4)

### **HowItWorks**
- 3-step process cards
- Numbered circles with gradient background
- Hover effects with shadow and transform
- Lazy loading with Intersection Observer

### **Testimonial**
- User quote with opening quotation mark
- Author name and location
- Side padding adjustment for mobile
- Fade-in on scroll

### **CtaSection**
- Final CTA with repeated headline
- Button matching primary CTA
- Extra margin for crisis banner

### **BackgroundParticles**
- 8 floating particles
- Smooth animations at different speeds and delays
- Performance optimized with Intersection Observer
- Pauses when not visible

### **CrisisBanner**
- Fixed footer with crisis helpline
- Gradient background (coral to terracotta)
- Tel: link for direct calling
- Safe area padding for notched devices
- Always visible and accessible

---

## 🎭 Styling System

### Custom Tailwind Classes

```css
.glass              /* Glass morphism: white/50 backdrop-blur rounded-3xl */
.glass-light        /* Lighter glass: white/30 backdrop-blur-20 */
.text-gradient      /* Gradient text using calm-sage to gentle-blue */
.safe-pb            /* Safe padding bottom for notched devices */
.transition-smooth  /* Smooth transition: 300ms ease-in-out */
.transition-smooth-lg /* Long smooth transition: 500ms ease-in-out */
.focus-ring         /* Accessibility focus indicator */
.animate-float      /* Floating particles animation */
.animate-breathe    /* Breathing headline animation */
```

---

## 🔧 Environment Variables

Create a `.env` file in the frontend root:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_ASSESSMENT_URL=/assessment
VITE_CRISIS_NUMBER=1800-599-0019
```

---

## 📱 Responsive Breakpoints

Uses Tailwind's default breakpoints:

- **Mobile**: < 640px (sm)
- **Tablet**: 641px - 1024px (md, lg)
- **Desktop**: > 1024px (xl, 2xl)

All components are mobile-first responsive.

---

## ♿ Accessibility Features

✅ **ARIA Labels**
- Buttons: `aria-label` for descriptive purpose
- Sections: `aria-labelledby` and `aria-label` for context
- Live regions: `aria-live="polite"` for crisis banner

✅ **Semantic HTML**
- `<header>`, `<main>`, `<section>`, `<footer>`
- Proper heading hierarchy (h1 → h2 → h3)

✅ **Keyboard Navigation**
- Focus visible indicators (ring-2 ring-gentle-blue)
- Focusable elements: buttons, links, tel: link
- Logical tab order

✅ **Color Contrast**
- WCAG AA compliant (4.5:1 minimum)
- Text always readable against backgrounds

✅ **Reduced Motion Support**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## 🚀 Production Optimization

### 1. **Code Splitting**

Already implemented via React Router's lazy loading:

```jsx
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
```

### 2. **Image Optimization**

For any images added:
```jsx
<img 
  src="" 
  alt="Descriptive text"
  loading="lazy"
  srcSet="image-mobile.jpg 640w, image-desktop.jpg 1280w"
/>
```

### 3. **CSS Purging**

TailwindCSS automatically purges unused styles in production.

### 4. **Preload Critical Fonts**

In `index.html`:
```html
<link 
  rel="preload" 
  href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=DM+Sans:wght@400;500;700&display=swap" 
  as="style"
/>
```

### 5. **Bundle Analysis**

```bash
npm install --save-dev vite-plugin-visualizer

# In vite.config.ts
import { visualizer } from "vite-plugin-visualizer";

export default {
  plugins: [visualizer()],
}

# Build and analyze
npm run build
```

### 6. **Performance Metrics**

Monitor with:
- Web Vitals (LCP, FID, CLS)
- Lighthouse audit
- Performance tab in DevTools

---

## 🧪 Testing Setup

### Unit Tests (Vitest + React Testing Library)

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event
```

Example test for HeroSection:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('renders main headline', () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    expect(screen.getByText(/You're not alone/i)).toBeInTheDocument();
  });

  it('navigates on CTA click', async () => {
    render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    const button = screen.getByRole('button', /60-second/i);
    await userEvent.click(button);
    // Assert navigation occurred
  });
});
```

---

## 🌐 SEO Optimization

✅ **Meta Tags**
- Title, description, keywords
- Open Graph tags for social sharing
- Twitter Card tags

✅ **Structured Data**
- JSON-LD for Organization schema
- Health & Beauty Business schema
- Crisis support contact information

✅ **Sitemap**

Create `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://manas360.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

✅ **Robots.txt**

Create `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://manas360.com/sitemap.xml
```

---

## 🐛 Debugging

### 1. **React DevTools**

```bash
npm install --save-dev @react-devtools/shell
```

### 2. **Component Tree Inspection**

```jsx
import { Profiler } from 'react';

<Profiler id="LandingPage" onRender={(...args) => console.log(args)}>
  <LandingPage />
</Profiler>
```

### 3. **Network Tab**

- Monitor API calls
- Check asset loading
- Verify compression

---

## 📦 Build and Deployment

### Build for Production

```bash
npm run build

# Output: dist/
# - Minified and optimized React code
# - CSS purged and optimized
# - Assets hashed for cache busting
```

### Deploy Options

#### **Vercel** (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### **Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### **Docker**

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## ⚡ Performance Optimization Tips

### 1. **Image Lazy Loading**

Use Intersection Observer:
```jsx
const [isVisible, setIsVisible] = useState(false);
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    setIsVisible(entry.isIntersecting);
  });
  observer.observe(ref.current);
}, []);
```

### 2. **Animation Performance**

- Use `transform` and `opacity` for animations
- Avoid animating `width`, `height`, or `position`
- Use `will-change` sparingly

```css
.animated {
  will-change: transform, opacity;
  animation: fadeInUp 1s ease-out;
}
```

### 3. **Reduce Bundle Size**

```bash
# Analyze bundle
npm run build --analyze

# Remove unused dependencies
npm prune
```

### 4. **Caching Strategy**

```jsx
// Cache API responses
const cache = new Map();

const fetchData = async (url) => {
  if (cache.has(url)) return cache.get(url);
  const data = await fetch(url).then(r => r.json());
  cache.set(url, data);
  return data;
};
```

---

## 🎥 Optional: Framer Motion Integration

For advanced animations:

```bash
npm install framer-motion
```

Example:

```jsx
import { motion } from 'framer-motion';

export const AnimatedHero = () => (
  <motion.h1
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
  >
    You're not alone
  </motion.h1>
);
```

---

## 📝 Maintenance Checklist

- [ ] Update dependencies monthly: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Monitor performance metrics
- [ ] Check accessibility: `npm run a11y`
- [ ] Test on mobile devices
- [ ] Validate SEO: Use Lighthouse
- [ ] Update meta tags for campaigns
- [ ] Monitor error logs in production

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Animations not working | Check `prefers-reduced-motion` setting |
| Tailwind classes not applying | Run `npm run build:css` |
| Crisis banner off-screen | Check `safe-pb` class and bottom prop |
| SEO meta tags missing | Verify `react-helmet-async` provider wrapping |
| CTA button not navigating | Check React Router setup and `/assessment` route |
| Images not loading | Check image paths and alt text |

---

## 📞 Support & Resources

- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [React Router Documentation](https://reactrouter.com)
- [React Helmet](https://github.com/nfl/react-helmet)
- [Web Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)

---

**Happy coding! 🎉**

For updates and latest best practices, visit the [MANAS360 Documentation](https://docs.manas360.com).
