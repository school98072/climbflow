# ClimbFlow MVP - Development Tracker

## Core Features

### Authentication & User System
- [x] Setup Auth with email login (Manus OAuth)
- [x] Create user registration page (Signup.tsx)
- [x] Create user login page (Login.tsx)
- [x] Implement logout functionality (integrated with auth router)
- [x] Add user profile data model (userProfiles table)

### Video Upload Module
- [x] Create video upload form component (UploadVideo.tsx)
- [x] Implement MP4/MOV file validation
- [x] Add route name input field
- [x] Add location name and coordinates input
- [x] Add difficulty grade selector (V0-V17 and 5.8-5.15)
- [x] Add tags/keywords input (Dyno, Crimps, etc.)
- [x] Implement video upload to Manus S3 Storage (storagePut)
- [x] Create upload progress indicator
- [x] Add form validation and error handling

### Video Feed (Reels-style)
- [x] Create vertical full-screen video feed component (VideoFeed.tsx)
- [x] Implement swipe/scroll navigation between videos
- [x] Add video card with route information display
- [x] Display difficulty grade on video card
- [x] Implement video playback controls
- [x] Add progress bar indicator (vertical on right side)
- [x] Create action buttons overlay (transparent ghost-style)
- [x] Implement route-list bookmark feature

### Search & Filter Functionality
- [x] Create search bar component (Explore.tsx)
- [x] Implement location-based filtering
- [x] Implement difficulty-based filtering
- [x] Add combined search/filter logic
- [x] Create filter UI with difficulty grades
- [x] Implement search results display

### Map Integration
- [x] Install and configure Leaflet
- [x] Create map component for route locations (MapView.tsx)
- [x] Implement route markers with grade-colored icons
- [x] Add map view page with auto-fit bounds
- [x] Link map to video feed (navigation)

### Database Schema
- [x] Design users table schema
- [x] Design videos table schema
- [x] Design routes table schema
- [x] Design bookmarks table schema
- [x] Create SQL migration script (0001_greedy_komodo.sql)
- [x] Setup database relationships and constraints

### PWA & Mobile Optimization
- [x] Configure manifest.json for PWA
- [x] Add service worker configuration (index.html)
- [x] Implement mobile-first responsive design
- [x] Optimize for iOS Safari (viewport-fit, meta tags)
- [x] Optimize for Android Chrome (PWA meta tags)
- [ ] Test on mobile browsers (manual testing needed)
- [x] Add app icon and splash screen (manifest icons)

### Testing
- [x] Auth tests (auth.me, auth.logout)
- [x] Routes tests (getAll, search, create)
- [x] Videos tests (getAll, create, uploadFile, incrementViews)
- [x] Bookmarks tests (add, remove, getMyBookmarks, isBookmarked)
- [x] Profile tests (getMe, updateProfile)
- [x] All 24 tests passing

### Documentation & Deployment
- [x] Create comprehensive README.md
- [x] Document environment variables
- [x] Document project startup process
- [x] Create ADVANCED_FEATURES.md for future enhancements
- [x] Create GitHub repository (school98072/climbflow)
- [x] Push code to GitHub

## Implementation Status

MVP Core Features: 100% Complete
- Database schema and migrations: ✅ Complete
- Backend API (tRPC routers): ✅ Complete
- Frontend UI components: ✅ Complete
- Routing and navigation: ✅ Complete
- PWA configuration: ✅ Complete
- Documentation: ✅ Complete
- Tests: ✅ 24/24 passing

Remaining Tasks:
- [ ] Mobile browser testing and optimization (manual)
- [ ] Production deployment

## Notes
- Authentication uses Manus OAuth (one-click login, no email/password form needed)
- Video upload uses Manus S3 Storage (storagePut) for reliable CDN delivery
- Database schema is production-ready with proper relationships
- PWA configuration enables native app experience on mobile
- Advanced features documented in ADVANCED_FEATURES.md for future development

## Bug Fixes

- [ ] Fix Select.Item empty value error (replace all `value=""` with `"all"` or `"none"`)
- [ ] Fix video upload JSON parse error (API returning HTML instead of JSON)

## Bug Fixes & Deployment

- [x] Fix Select.Item empty value error (Explore.tsx: changed `value=""` to `value="all"`, updated filter logic)
- [x] Fix video upload JSON parse error (replaced base64/JSON with multipart/form-data via /api/upload/video, added multer middleware, raised body limit to 200mb)
- [x] Deploy to permanent URL via webdev deploy (https://climbflow-meaosjuz.manus.space)

## Fix HTTP 413 Upload Error

- [x] Add backend upload token endpoint (videos.getUploadToken) returning forge API uploadUrl + apiKey
- [x] Update UploadVideo.tsx to use XHR direct upload to forge.manus.ai (bypasses Cloud Run 32MB limit, supports up to 500MB with real progress tracking)
- [x] Updated Vitest tests: replaced uploadFile tests with getUploadToken tests (24/24 passing)
- [x] Redeploy as permanent public site (https://climbflow-meaosjuz.manus.space)

## Supabase Migration & Upload Fix

- [x] Execute SQL Schema on Supabase (users, routes, videos, bookmarks, user_profiles tables) - 25/25 statements OK
- [x] Create Supabase Storage 'videos' bucket (public) and 'thumbnails' bucket
- [x] Set Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [x] Remove multer (ESM incompatibility), clean up server/_core/index.ts
- [x] Update backend routers: videos.getSupabaseUploadToken returns Supabase signed upload URL (PUT method)
- [x] Update frontend UploadVideo.tsx: use XHR PUT to Supabase signed URL (bypasses Cloud Run 32MB limit)
- [x] Update Vitest tests: 30/30 passing (added Supabase mock, new getSupabaseUploadToken tests)
- [ ] Save checkpoint, redeploy as Public, push to GitHub
