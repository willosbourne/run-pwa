# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production using Vite
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint on src/**/*.js files
- `npm run test` - Run Jest tests

## Architecture Overview

This is a Progressive Web App (PWA) for tracking running workouts, built with vanilla JavaScript and Web Components.

### Core Architecture
- **Vanilla JavaScript**: No framework dependencies, uses native Web APIs
- **Web Components**: Custom elements for UI components using Shadow DOM
- **PWA Features**: Service worker for offline support, manifest for app-like experience
- **Shoelace**: Web components library used for UI elements (loaded via CDN)

### Key Components
- `workout-instructions` - Parses and displays workout instructions
- `workout-timer` - Handles workout timing and step progression with wake lock support
- `location-tracker` - Tracks GPS location and calculates distances during workouts
- `silent-audio` - Manages audio playback for workout cues

### Data Flow
1. `workout-instructions` component parses workout data and emits `workoutParsed` event
2. `workout-timer` receives workout steps and manages timing/progression
3. `location-tracker` monitors GPS during active workouts
4. All components communicate via custom events

### Browser APIs Used
- **Geolocation API**: For GPS tracking during runs
- **Wake Lock API**: Prevents screen from sleeping during workouts
- **Service Workers**: For PWA offline functionality and caching
- **IndexedDB**: Planned for storing workout data (currently TODO in app.js:35)

### File Structure
- `src/app.js` - Main app initialization and event coordination
- `src/components/` - Web Components for UI
- `src/services/` - Service worker registration
- `src/styles/` - CSS stylesheets
- `public/sw.js` - Service worker with cache-first strategy
- `index.html` - Entry point with component registration

### Service Worker Strategy
Uses cache-first strategy with network fallback. Caches static assets and provides offline navigation support.

## Development Notes

- Components use Shadow DOM for style encapsulation
- Event-driven architecture between components
- Mobile-first design with PWA capabilities
- Uses CSS custom properties for theming
- Geolocation permission handling built into app initialization