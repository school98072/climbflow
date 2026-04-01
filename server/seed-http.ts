import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// CRITICAL: Use Service Role Key to bypass RLS during seeding
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("🌱 Starting seeding via HTTP API (Service Role)...");

  // 1. Create Users
  console.log("👤 Creating users...");
  const { data: insertedUsers, error: userError } = await supabase.from("users").upsert([
    {
      open_id: "school98072@gmail.com",
      email: "school98072@gmail.com",
      name: "Master Climber",
      login_method: "oauth",
      role: "admin",
    },
    {
      open_id: "user_alex_honnold",
      email: "alex@freesolo.com",
      name: "Alex Honnold",
      login_method: "oauth",
      role: "user",
    },
    {
      open_id: "user_janja",
      email: "janja@olympics.com",
      name: "Janja Garnbret",
      login_method: "oauth",
      role: "user",
    }
  ], { onConflict: 'open_id' }).select();

  if (userError) {
    console.error("❌ User creation failed:", userError);
    return;
  }

  const user1 = insertedUsers.find(u => u.open_id === "school98072@gmail.com");
  const user2 = insertedUsers.find(u => u.open_id === "user_alex_honnold");
  const user3 = insertedUsers.find(u => u.open_id === "user_janja");

  // 2. Create User Profiles
  console.log("📄 Creating user profiles...");
  await supabase.from("user_profiles").upsert([
    {
      user_id: user1.id,
      bio: "ClimbFlow Creator. Chasing V10s.",
      climbing_level: "Advanced",
      favorite_grade_system: "hueco",
    },
    {
      user_id: user2.id,
      bio: "I like climbing without ropes.",
      climbing_level: "Pro",
      favorite_grade_system: "yds",
    }
  ], { onConflict: 'user_id' });

  // 3. Create Routes
  console.log("🧗 Creating routes...");
  const { data: insertedRoutes, error: routeError } = await supabase.from("routes").upsert([
    {
      user_id: user1.id,
      name: "The Big Island",
      location_name: "Fontainebleau, France",
      latitude: 48.4,
      longitude: 2.7,
      difficulty_grade: "V15",
      grade_system: "hueco",
      tags: ["Crimps", "Power"],
      description: "One of the most famous boulders in the world.",
    },
    {
      user_id: user2.id,
      name: "Midnight Lightning",
      location_name: "Yosemite, USA",
      latitude: 37.7455,
      longitude: -119.5936,
      difficulty_grade: "V8",
      grade_system: "hueco",
      tags: ["Dyno", "Classic"],
      description: "The most famous boulder problem in the world.",
    }
  ], { onConflict: 'name' }).select();

  if (routeError) {
    // If it still fails due to no unique constraint, fall back to simple insert
    if (routeError.code === '42P10') {
       console.log("⚠️ No unique constraint on 'name', falling back to insert...");
       const { data: retryRoutes, error: retryError } = await supabase.from("routes").insert([
        {
          user_id: user1.id,
          name: "The Big Island",
          location_name: "Fontainebleau, France",
          latitude: 48.4,
          longitude: 2.7,
          difficulty_grade: "V15",
          grade_system: "hueco",
          tags: ["Crimps", "Power"],
          description: "One of the most famous boulders in the world.",
        },
        {
          user_id: user2.id,
          name: "Midnight Lightning",
          location_name: "Yosemite, USA",
          latitude: 37.7455,
          longitude: -119.5936,
          difficulty_grade: "V8",
          grade_system: "hueco",
          tags: ["Dyno", "Classic"],
          description: "The most famous boulder problem in the world.",
        }
      ]).select();
      if (retryError) {
        console.error("❌ Route insert failed:", retryError);
        return;
      }
      // Continue with insertedRoutes from retry
      processVideos(user1, user2, retryRoutes);
    } else {
      console.error("❌ Route creation failed:", routeError);
      return;
    }
  } else {
    processVideos(user1, user2, insertedRoutes);
  }
}

async function processVideos(user1: any, user2: any, routes: any[]) {
  // 4. Create Videos
  console.log("🎬 Creating videos...");
  const demoVideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
  const demoThumb = "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80&w=400";

  const { error: videoError } = await supabase.from("videos").upsert([
    {
      user_id: user1.id,
      route_id: routes[0].id,
      title: "The Big Island Full Send",
      description: "Finally did it!",
      video_url: demoVideoUrl,
      thumbnail_url: demoThumb,
      views: 1250,
    },
    {
      user_id: user2.id,
      route_id: routes[1].id,
      title: "Midnight Send",
      description: "Classic climb.",
      video_url: demoVideoUrl,
      thumbnail_url: demoThumb,
      views: 8900,
    }
  ], { onConflict: 'title' });

  if (videoError) {
    if (videoError.code === '42P10') {
      await supabase.from("videos").insert([
        {
          user_id: user1.id,
          route_id: routes[0].id,
          title: "The Big Island Full Send",
          description: "Finally did it!",
          video_url: demoVideoUrl,
          thumbnail_url: demoThumb,
          views: 1250,
        },
        {
          user_id: user2.id,
          route_id: routes[1].id,
          title: "Midnight Send",
          description: "Classic climb.",
          video_url: demoVideoUrl,
          thumbnail_url: demoThumb,
          views: 8900,
        }
      ]);
    } else {
      console.error("❌ Video creation failed:", videoError);
      return;
    }
  }

  console.log("✅ Seeding via HTTP (Service Role) completed successfully!");
}

seed();
