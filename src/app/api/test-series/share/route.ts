import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Schema for validating the request body
const shareTestSeriesSchema = z.object({
  testSeriesId: z.string().uuid(),
  recipientEmail: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to share a test series" },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const result = shareTestSeriesSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.format() },
        { status: 400 }
      );
    }

    const { testSeriesId, recipientEmail } = result.data;

    // Check if the test series exists and the current user has permission to share it
    const { data: testSeries, error: testSeriesError } = await supabase
      .from('test_series')
      .select('id, title, creator_id')
      .eq('id', testSeriesId)
      .single();

    if (testSeriesError || !testSeries) {
      return NextResponse.json(
        { error: "Test series not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the creator of the test series
    if (testSeries.creator_id !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to share this test series" },
        { status: 403 }
      );
    }

    // Find recipient user by email
    const { data: recipientUser, error: recipientUserError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', recipientEmail.trim().toLowerCase())
      .single();

    if (recipientUserError || !recipientUser) {
      return NextResponse.json(
        { error: "Recipient user not found or not registered, please register the user and try again" },
        { status: 404 }
      );
    }

    // Check if the test series is already shared with this user
    const { data: existingShare, error: shareError } = await supabase
      .from('test_series_shares')
      .select('*')
      .eq('test_series_id', testSeriesId)
      .eq('shared_with_id', recipientUser.id);

    if (existingShare && existingShare.length > 0) {
      return NextResponse.json(
        { message: "This test series is already shared with this user" },
        { status: 200 }
      );
    }

    // Share the test series with the recipient
    const { error: insertError } = await supabase
      .from('test_series_shares')
      .insert({
        test_series_id: testSeriesId,
        shared_with_id: recipientUser.id,
        shared_by_id: userId
      });

    return NextResponse.json(
      { message: "Test series shared successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sharing test series:", error);
    return NextResponse.json(
      { error: "An error occurred while sharing the test series" },
      { status: 500 }
    );
  }
}
