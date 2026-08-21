import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No photo file provided." }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a JPEG, PNG, or WebP photo." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Photo file size exceeds the 5MB limit. Please select a smaller photo." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/photo_${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use admin/service role client to ensure bucket storage succeeds reliably
    const adminDb = createAdminClient();

    // Ensure bucket exists
    await adminDb.storage.createBucket("student-photos", { public: false }).catch(() => {});

    const { data: uploadData, error: uploadError } = await adminDb.storage
      .from("student-photos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Photo upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Generate a signed URL for display (1 year expiration)
    const { data: signedUrlData, error: signedError } = await adminDb.storage
      .from("student-photos")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    const publicOrSignedUrl = signedUrlData?.signedUrl || filePath;

    return NextResponse.json({
      success: true,
      filePath,
      photoUrl: publicOrSignedUrl,
      message: "Photo uploaded successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during photo upload." },
      { status: 500 }
    );
  }
}
