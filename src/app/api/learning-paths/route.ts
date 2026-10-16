import { NextResponse } from "next/server";
import { z } from "zod";
import { ownedPath, pathError, pathSession } from "@/lib/learning-paths/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { supabase, user } = await pathSession();
    const { data, error } = await supabase
      .from("learning_paths")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return pathError(error);
  }
}
// All creation goes through validated, server-side AI generation.
export { POST } from "./generate/route";
export async function PUT(request: Request) {
  try {
    const { supabase, user } = await pathSession();
    const { id, updates } = z
      .object({
        id: z.string().uuid(),
        updates: z
          .object({ title: z.string().trim().min(3).max(200) })
          .strict(),
      })
      .parse(await request.json());
    await ownedPath(supabase, user.id, id);
    const { data, error } = await supabase
      .from("learning_paths")
      .update({ title: updates.title, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return pathError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await pathSession();
    const id = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("id"));
    await ownedPath(supabase, user.id, id);
    const { error } = await supabase
      .from("learning_paths")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return pathError(error);
  }
}
