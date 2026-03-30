# ClimbFlow - Climbing Community Social App MVP

ClimbFlow is a mobile-first social platform designed for climbers to share climbing videos, discover routes, and learn from the community. The MVP features a vertical full-screen video feed (similar to Reels), route discovery with search/filter, and interactive map integration.

## 🎯 Features

### Core MVP Features

**Authentication & User System**
- Email-based user registration and login
- User profiles with climbing level and preferred grade system
- Secure session management

**Video Upload Module**
- Support for MP4 and MOV video formats
- Route information capture: name, location (name + coordinates), difficulty grade, tags
- Support for both Hueco (V0-V17) and YDS (5.8-5.15) grading systems
- Tag system for climbing styles (Dyno, Crimps, Slopers, etc.)

**Vertical Video Feed (Reels-style)**
- Full-screen immersive video browsing
- Vertical swipe navigation (mobile) and scroll (desktop)
- Video cards displaying route information and difficulty grades
- Ghost-style action buttons (bookmark, like, comment, share)
- Progress bar indicator showing position in feed
- Desktop sidebar showing video queue

**Search & Filter**
- Search routes by location name
- Filter by difficulty grade (both grading systems)
- Combined search/filter functionality
- Grid-based results display

**Map Integration**
- Leaflet-based interactive map
- Route markers with location information
- Route list sidebar for easy navigation
- Responsive map layout for mobile and desktop

**Route Bookmarking**
- Save favorite routes to personal collection
- Quick bookmark toggle from video feed

### PWA & Mobile Optimization
- Progressive Web App (PWA) configuration
- Mobile-first responsive design
- iOS Safari compatibility
- Android Chrome optimization
- Standalone app mode support
- Offline-ready architecture

## 🛠️ Tech Stack

**Frontend**
- Next.js with App Router (React 19)
- Tailwind CSS 4 for styling
- Lucide React for icons
- React Leaflet for maps
- Leaflet for mapping library
- shadcn/ui components
- Wouter for client-side routing

**Backend**
- Express.js 4
- tRPC 11 for type-safe API
- Drizzle ORM for database operations
- MySQL/TiDB database

**Authentication**
- Manus OAuth integration
- Session-based auth with JWT

**Storage**
- Supabase Storage for video files (future integration)
- Database for metadata

## 📋 Prerequisites

- Node.js 22.13.0 or higher
- pnpm 10.4.1 or higher
- MySQL/TiDB database
- (Optional) Supabase account for storage

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/climbflow.git
cd climbflow
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/climbflow

# OAuth
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT
JWT_SECRET=your_jwt_secret_key

# Owner Info
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Your Name

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_api_key

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

### 4. Setup Database

The application uses Drizzle ORM for database management. The schema has been pre-configured with the following tables:

- `users` - User accounts and authentication
- `userProfiles` - Extended user profile information
- `routes` - Climbing route information with coordinates
- `videos` - Video metadata and URLs
- `bookmarks` - User bookmarked routes

To apply the database schema:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Or manually execute the SQL migration from `drizzle/0001_greedy_komodo.sql`.

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### 6. Build for Production

```bash
pnpm build
pnpm start
```

## 📁 Project Structure

```
climbflow/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   ├── Home.tsx      # Landing page
│   │   │   ├── Login.tsx     # Login page
│   │   │   ├── Signup.tsx    # Registration page
│   │   │   ├── VideoFeed.tsx # Main video feed (Reels-style)
│   │   │   ├── UploadVideo.tsx # Video upload form
│   │   │   ├── Explore.tsx   # Search and filter page
│   │   │   └── MapView.tsx   # Interactive map view
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utilities and helpers
│   │   ├── App.tsx           # Main app component with routing
│   │   └── main.tsx          # React entry point
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   └── favicon.ico       # App icon
│   └── index.html            # HTML template
│
├── server/                    # Backend Express application
│   ├── routers.ts            # tRPC route definitions
│   ├── db.ts                 # Database query helpers
│   ├── auth.logout.test.ts   # Example test file
│   └── _core/                # Framework internals
│
├── drizzle/                   # Database schema and migrations
│   ├── schema.ts             # Database schema definitions
│   └── 0001_greedy_komodo.sql # Migration SQL
│
├── shared/                    # Shared types and constants
├── storage/                   # S3 storage helpers
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── README.md                 # This file
```

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `openId` - OAuth identifier
- `name` - User display name
- `email` - User email
- `loginMethod` - Authentication method
- `role` - User role (user/admin)
- `createdAt`, `updatedAt`, `lastSignedIn` - Timestamps

### User Profiles Table
- `id` - Primary key
- `userId` - Foreign key to users
- `bio` - User biography
- `avatarUrl` - Profile picture URL
- `climbingLevel` - Skill level (Beginner/Intermediate/Advanced/Expert)
- `favoriteGradeSystem` - Preferred grading system (hueco/yds)

### Routes Table
- `id` - Primary key
- `userId` - Route creator
- `name` - Route name
- `locationName` - Location name
- `latitude`, `longitude` - Coordinates (decimal format)
- `difficultyGrade` - Grade (e.g., V5, 5.10a)
- `gradeSystem` - System used (hueco/yds)
- `tags` - JSON array of tags
- `description` - Route description

### Videos Table
- `id` - Primary key
- `userId` - Video uploader
- `routeId` - Associated route
- `title` - Video title
- `description` - Video description
- `videoUrl` - Storage URL
- `thumbnailUrl` - Thumbnail image URL
- `duration` - Video length in seconds
- `views` - View count

### Bookmarks Table
- `id` - Primary key
- `userId` - Bookmarking user
- `routeId` - Bookmarked route
- `videoId` - Optional associated video

## 🧪 Testing

Run the test suite:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test --watch
```

## 📱 Mobile Optimization

ClimbFlow is optimized for mobile devices with the following features:

- **Responsive Design**: Mobile-first approach with breakpoints for tablet and desktop
- **Touch-Friendly**: Large tap targets and swipe navigation
- **PWA Support**: Install as native app on iOS and Android
- **Offline Ready**: Service worker configuration for offline access
- **Performance**: Optimized video streaming and lazy loading

### iOS Installation
1. Open ClimbFlow in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Name the app and tap "Add"

### Android Installation
1. Open ClimbFlow in Chrome
2. Tap the menu (three dots)
3. Select "Install app" or "Add to Home screen"
4. Confirm installation

## 🔐 Security Considerations

- All API endpoints require authentication via tRPC
- Protected procedures use `protectedProcedure` for user-only access
- Environment variables are never exposed to the client
- OAuth integration handles secure authentication
- Database queries use parameterized statements via Drizzle ORM

## 📚 API Documentation

### Routes

**Create Route**
```typescript
trpc.routes.create.mutate({
  name: "The Crimper",
  locationName: "Fontainebleau, France",
  latitude: 48.4,
  longitude: 2.7,
  difficultyGrade: "V5",
  gradeSystem: "hueco",
  tags: ["Dyno", "Crimps"],
  description: "A challenging route with dynamic moves"
})
```

**Search Routes**
```typescript
trpc.routes.search.useQuery({
  locationName: "Fontainebleau",
  difficultyGrade: "V5",
  gradeSystem: "hueco"
})
```

### Videos

**Upload Video**
```typescript
trpc.videos.create.mutate({
  routeId: 1,
  title: "First V5 Send!",
  description: "Finally sent The Crimper!",
  videoUrl: "https://storage.url/video.mp4",
  duration: 45
})
```

**Get All Videos**
```typescript
trpc.videos.getAll.useQuery({ limit: 20, offset: 0 })
```

**Increment Views**
```typescript
trpc.videos.incrementViews.mutate({ videoId: 1 })
```

### Bookmarks

**Add Bookmark**
```typescript
trpc.bookmarks.add.mutate({ routeId: 1 })
```

**Remove Bookmark**
```typescript
trpc.bookmarks.remove.mutate({ routeId: 1 })
```

**Check if Bookmarked**
```typescript
trpc.bookmarks.isBookmarked.useQuery({ routeId: 1 })
```

## 🚧 Future Enhancements

See [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md) for detailed specifications on advanced features planned for future releases, including:

- AI-powered beta point detection
- Dynamic difficulty progress tracking
- Real-time social interactions (likes, comments)
- User following and notifications
- Advanced analytics and statistics
- Video recommendation engine

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the development team.

## 🙏 Acknowledgments

- Built with React, Tailwind CSS, and modern web technologies
- Inspired by Xiaohongshu and Instagram Reels
- Designed for the climbing community

---

**Happy climbing! 🧗‍♂️**
