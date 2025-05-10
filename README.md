# Run PWA

A Progressive Web App (PWA) for tracking and improving your running experience. Built with modern web standards and designed to work seamlessly on mobile devices.

## Features

- 🏃 Real-time run tracking using Geolocation API
- 📱 Works offline with PWA capabilities
- 📊 Track distance, pace, and route
- 🎯 Set and track running goals
- 📍 View your running history and routes
- 🌙 Dark/Light mode support
- 📱 Mobile-first design

## Tech Stack

- Vanilla JavaScript
- Web Components (using [Shoelace](https://shoelace.style/))
- Browser APIs:
  - Geolocation API
  - Service Workers
  - IndexedDB
  - Web Storage
- PWA features:
  - Offline support
  - Add to home screen
  - Push notifications

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (for development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/run-pwa.git
cd run-pwa
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Development

### Project Structure

```
run-pwa/
├── src/
│   ├── components/     # Web Components
│   ├── services/       # Service Workers and API services
│   ├── utils/         # Utility functions
│   ├── styles/        # CSS styles
│   └── assets/        # Images and other assets
├── public/            # Static files
└── dist/             # Build output
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linter

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Shoelace](https://shoelace.style/) for the Web Components library
- [OpenStreetMap](https://www.openstreetmap.org/) for map data 