import { createClient } from "@supabase/supabase-js";

// 從環境變數初始化 Supabase 客戶端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 格式化路徑並上傳至 Supabase Storage
 */
export async function storagePut(
  relKey: string,
  data: Buffer | ArrayBuffer | Blob | string,
  contentType: string = "application/octet-stream"
) {
  // 1. 處理路徑：將 "videos/user/123.mp4" 分解為 Bucket名("videos") 與 內部路徑("user/123.mp4")
  const cleanKey = relKey.replace(/^\/+/, "");
  const parts = cleanKey.split("/");
  const bucketName = parts[0];
  const filePath = parts.slice(1).join("/");

  // 2. 執行上傳
  const { data: uploadData, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, data, {
      contentType: contentType,
      upsert: true, // 若檔案已存在則覆蓋
    });

  if (error) {
    throw new Error(`Supabase 上傳失敗: ${error.message}`);
  }

  // 3. 取得公開網址
  // 由於你的 Bucket 已設定為 PUBLIC，直接獲取網址即可供前端播放
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return { key: relKey, url: publicUrl };
}
