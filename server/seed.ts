import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { users, routes, videos, comments, likes, userProfiles } from "../drizzle/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(connectionString, { ssl: 'require' });
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Starting seeding...");

  // 1. 清理旧数据 (可选，按需开启)
  // console.log("🧹 Cleaning old data...");
  // await db.delete(likes);
  // await db.delete(comments);
  // await db.delete(videos);
  // await db.delete(routes);
  // await db.delete(userProfiles);
  // await db.delete(users);

  // 2. 创建用户
  console.log("👤 Creating users...");
  const insertedUsers = await db.insert(users).values([
    {
      openId: "school98072@gmail.com",
      email: "school98072@gmail.com",
      name: "Master Climber",
      loginMethod: "oauth",
      role: "admin",
    },
    {
      openId: "user_alex_honnold",
      email: "alex@freesolo.com",
      name: "Alex Honnold",
      loginMethod: "oauth",
    },
    {
      openId: "user_janja",
      email: "janja@olympics.com",
      name: "Janja Garnbret",
      loginMethod: "oauth",
    }
  ]).returning();

  const user1 = insertedUsers[0];
  const user2 = insertedUsers[1];
  const user3 = insertedUsers[2];

  // 3. 创建用户档案
  await db.insert(userProfiles).values([
    {
      userId: user1.id,
      bio: "ClimbFlow Creator. Chasing V10s.",
      climbingLevel: "Advanced",
      favoriteGradeSystem: "hueco",
    },
    {
      userId: user2.id,
      bio: "I like climbing without ropes.",
      climbingLevel: "Pro",
      favoriteGradeSystem: "yds",
    }
  ]);

  // 4. 创建路线
  console.log("🧗 Creating routes...");
  const insertedRoutes = await db.insert(routes).values([
    {
      userId: user1.id,
      name: "The Big Island",
      locationName: "Fontainebleau, France",
      latitude: "48.40000000",
      longitude: "2.70000000",
      difficultyGrade: "V15",
      gradeSystem: "hueco",
      tags: ["Crimps", "Power"],
      description: "One of the most famous boulders in the world.",
    },
    {
      userId: user2.id,
      name: "Midnight Lightning",
      locationName: "Yosemite, USA",
      latitude: "37.74550000",
      longitude: "-119.59360000",
      difficultyGrade: "V8",
      gradeSystem: "hueco",
      tags: ["Dyno", "Classic"],
      description: "The most famous boulder problem in the world.",
    },
    {
      userId: user3.id,
      name: "Dreamtime",
      locationName: "Cresciano, Switzerland",
      latitude: "46.28330000",
      longitude: "9.00000000",
      difficultyGrade: "V15",
      gradeSystem: "hueco",
      tags: ["Technical", "Famous"],
    },
    {
      userId: user1.id,
      name: "Rainbow Rocket",
      locationName: "Fontainebleau, France",
      latitude: "48.37000000",
      longitude: "2.65000000",
      difficultyGrade: "V6",
      gradeSystem: "hueco",
      tags: ["Dyno", "Fun"],
    }
  ]).returning();

  // 5. 创建视频 (使用示例 MP4 链接)
  console.log("🎬 Creating videos...");
  const demoVideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; // 示例视频
  const demoThumb = "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80&w=400";

  const insertedVideos = await db.insert(videos).values([
    {
      userId: user1.id,
      routeId: insertedRoutes[0].id,
      title: "The Big Island Full Send",
      description: "Finally did it! My fingers are gone.",
      videoUrl: demoVideoUrl,
      thumbnailUrl: demoThumb,
      views: 1250,
    },
    {
      userId: user2.id,
      routeId: insertedRoutes[1].id,
      title: "Camping at Yosemite",
      description: "Just a quick morning session.",
      videoUrl: demoVideoUrl,
      thumbnailUrl: demoThumb,
      views: 8900,
    },
    {
      userId: user3.id,
      routeId: insertedRoutes[2].id,
      title: "Dreamtime Beta",
      description: "The technical crux is real.",
      videoUrl: demoVideoUrl,
      thumbnailUrl: demoThumb,
      views: 450,
    },
    {
      userId: user1.id,
      routeId: insertedRoutes[3].id,
      title: "Rocket Launch!",
      description: "HUGE DYNO!",
      videoUrl: demoVideoUrl,
      thumbnailUrl: demoThumb,
      views: 320,
    }
  ]).returning();

  // 6. 添加评论和点赞
  console.log("💬 Adding social interactions...");
  await db.insert(comments).values([
    {
      userId: user2.id,
      videoId: insertedVideos[0].id,
      content: "Insane crimp strength! Well done.",
    },
    {
      userId: user3.id,
      videoId: insertedVideos[0].id,
      content: "What shoes are you wearing?",
    },
    {
      userId: user1.id,
      videoId: insertedVideos[1].id,
      content: "Classic! Hope to visit Yosemite next year.",
    }
  ]);

  await db.insert(likes).values([
    { userId: user2.id, videoId: insertedVideos[0].id },
    { userId: user3.id, videoId: insertedVideos[0].id },
    { userId: user1.id, videoId: insertedVideos[1].id },
  ]);

  console.log("✅ Seeding completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
