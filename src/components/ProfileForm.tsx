"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { studentProfileSchema, StudentProfileInput } from "@/lib/validations/student";
import { Student, Gender, getAbsoluteSemester } from "@/types/database";
import {
  MALE_HOSTELS,
  FEMALE_HOSTELS,
  getHostelsForGender,
  getMessNameForHostel,
} from "@/lib/constants/hostels";
import {
  User,
  Building,
  GraduationCap,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Camera,
  Upload,
  X,
  IdCard,
  RotateCcw,
  Sparkles,
  Utensils,
  Info,
} from "lucide-react";

interface ProfileFormProps {
  initialStudent?: Partial<Student> | null;
  onSuccess?: () => void;
  isEditMode?: boolean;
}

export function ProfileForm({
  initialStudent,
  onSuccess,
  isEditMode = false,
}: ProfileFormProps) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Photo state
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialStudent?.photo_url || null
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Native Camera Modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultGender: Gender = (initialStudent?.gender as Gender) || "Male";
  const defaultHostel = initialStudent?.hostel || (defaultGender === "Male" ? MALE_HOSTELS[0] : FEMALE_HOSTELS[0]);

  const [formData, setFormData] = useState<StudentProfileInput>({
    name: initialStudent?.name || "",
    student_id: initialStudent?.student_id || "",
    gender: defaultGender,
    hostel: defaultHostel,
    course: initialStudent?.course || "",
    year: initialStudent?.year || 1,
    semester: initialStudent?.semester || 1,
    photo_url: initialStudent?.photo_url || "",
  });

  // Automatically derived mess name from selected hostel
  const derivedMessName = getMessNameForHostel(formData.hostel) || "Mess 1";

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // ----------------------------------------------------------------
  // GENDER & HOSTEL SELECTION LOGIC
  // ----------------------------------------------------------------
  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGender = e.target.value as Gender;
    const availableHostels = getHostelsForGender(newGender);
    setFormData((prev) => ({
      ...prev,
      gender: newGender,
      hostel: availableHostels[0],
    }));

    if (fieldErrors.gender || fieldErrors.hostel) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.gender;
        delete next.hostel;
        return next;
      });
    }
  };

  const availableHostelOptions = getHostelsForGender(formData.gender);

  // ----------------------------------------------------------------
  // CAMERA HANDLING (getUserMedia API)
  // ----------------------------------------------------------------
  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraError(null);
    setCapturedBlobUrl(null);
    setCapturedFile(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Camera access is not supported by your browser. Please use 'Upload From Device' instead."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera access in your browser settings or use 'Upload From Device'."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError(
          "No camera device was detected on your system. Please use 'Upload From Device'."
        );
      } else {
        setCameraError(
          `Unable to open camera: ${err.message || "Unknown error"}. Please use 'Upload From Device'.`
        );
      }
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    setCameraError(null);
  };

  const capturePhotoFromStream = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `student_camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        setCapturedBlobUrl(url);
        setCapturedFile(file);
        stopCameraStream();
      },
      "image/jpeg",
      0.92
    );
  };

  const retakeCameraPhoto = () => {
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  const confirmCapturedPhoto = () => {
    if (capturedFile && capturedBlobUrl) {
      setSelectedPhotoFile(capturedFile);
      setPhotoPreview(capturedBlobUrl);
      setFormData((prev) => ({ ...prev, photo_url: capturedBlobUrl }));
      if (fieldErrors.photo_url) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.photo_url;
          return next;
        });
      }
    }
    closeCameraModal();
  };

  // ----------------------------------------------------------------
  // FILE UPLOAD HANDLER
  // ----------------------------------------------------------------
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Photo file size must be less than 5MB.");
      return;
    }

    setErrorMsg(null);
    setSelectedPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setFormData((prev) => ({ ...prev, photo_url: objectUrl }));

    if (fieldErrors.photo_url) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.photo_url;
        return next;
      });
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhotoFile(null);
    setPhotoPreview(null);
    setFormData((prev) => ({ ...prev, photo_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "year" || name === "semester" ? Number(value) : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});

    // Check mandatory photo
    if (!photoPreview && !selectedPhotoFile) {
      setFieldErrors((prev) => ({
        ...prev,
        photo_url: ["Student photo is mandatory for identity verification."],
      }));
      setErrorMsg("Please capture or upload a student photo before saving.");
      return;
    }

    // Client-side Zod validation
    const validationResult = studentProfileSchema.safeParse(formData);
    if (!validationResult.success) {
      setFieldErrors(validationResult.error.flatten().fieldErrors);
      setErrorMsg("Please fill in all mandatory fields correctly.");
      return;
    }

    try {
      setSubmitting(true);

      let finalPhotoUrl = formData.photo_url;

      // Upload photo file if newly selected/captured
      if (selectedPhotoFile) {
        setUploadingPhoto(true);
        const photoFormData = new FormData();
        photoFormData.append("photo", selectedPhotoFile);

        const uploadRes = await fetch("/api/student/photo-upload", {
          method: "POST",
          body: photoFormData,
        });

        const uploadData = await uploadRes.json();
        setUploadingPhoto(false);

        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Failed to upload photo to storage.");
        }

        finalPhotoUrl = uploadData.photoUrl;
      }

      // Save Student Profile (assigned_mess_id is derived server-side)
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validationResult.data,
          photo_url: finalPhotoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        throw new Error(data.error || "Failed to save profile.");
      }

      setSuccessMsg("Student profile saved successfully! Redirecting to QR generation...");
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          router.push("/dashboard/qr");
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
    }
  };

  const absoluteSem = getAbsoluteSemester(formData.year, formData.semester);

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm"
      >
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Hidden File Input for Device Gallery / File Picker */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        {/* SECTION 1: PHOTO UPLOAD */}
        <div className="p-4 sm:p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
            Student Photo *
          </label>
          <p className="text-xs text-gray-600">
            A clear passport-style student photograph is required for identity verification at mess counters.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
            {/* Photo Preview Thumbnail */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-blue-200 bg-white overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0">
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Student Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-center p-2 text-gray-400">
                  <Camera className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                  <span className="text-[10px] block font-medium">No Photo</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-600" />
                  Upload From Device
                </button>
              </div>

              {selectedPhotoFile && (
                <div className="text-xs text-gray-600 font-mono flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓ Selected:</span>
                  <span className="truncate max-w-[220px]">{selectedPhotoFile.name}</span>
                  <span>({(selectedPhotoFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}

              {fieldErrors.photo_url && (
                <p className="text-xs text-rose-600 font-medium">
                  {fieldErrors.photo_url[0]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: IDENTITY FIELDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.name
                    ? "border-rose-400 focus:ring-rose-300"
                    : "border-gray-300 focus:ring-blue-500/20 focus:border-blue-600"
                }`}
                required
              />
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Canonical Student ID (Single Unique Identifier) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Student ID *
            </label>
            <div className="relative">
              <IdCard className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                placeholder="e.g. 21MCMS01 or UHY123456"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.student_id
                    ? "border-rose-400 focus:ring-rose-300"
                    : "border-gray-300 focus:ring-blue-500/20 focus:border-blue-600"
                }`}
                required
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Single university student identification number.
            </p>
            {fieldErrors.student_id && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.student_id[0]}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Gender *
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleGenderChange}
              disabled={isEditMode}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                isEditMode
                  ? "bg-gray-100 border-gray-200 cursor-not-allowed text-gray-600"
                  : "bg-white border-gray-300 focus:ring-blue-500/20 focus:border-blue-600"
              }`}
              required
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {fieldErrors.gender && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.gender[0]}</p>
            )}
          </div>

          {/* Hostel Name (Dynamic based on selected Gender) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Hostel *
              </label>
              <span className="text-[11px] text-gray-500 font-medium">
                {formData.gender === "Male" ? "14 Male Hostels" : "10 Female Hostels"}
              </span>
            </div>
            <div className="relative">
              <select
                name="hostel"
                value={formData.hostel}
                onChange={handleChange}
                disabled={isEditMode}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                  isEditMode
                    ? "bg-gray-100 border-gray-200 cursor-not-allowed text-gray-600"
                    : "bg-white border-gray-300 focus:ring-blue-500/20 focus:border-blue-600"
                }`}
                required
              >
                {availableHostelOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.hostel && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.hostel[0]}</p>
            )}
          </div>

          {/* Course / Program */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Course / Program *
            </label>
            <div className="relative">
              <GraduationCap className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="e.g. MCA / M.Tech Computer Science"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.course
                    ? "border-rose-400 focus:ring-rose-300"
                    : "border-gray-300 focus:ring-blue-500/20 focus:border-blue-600"
                }`}
                required
              />
            </div>
            {fieldErrors.course && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.course[0]}</p>
            )}
          </div>

          {/* Year of Study */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Year of Study *
            </label>
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              required
            >
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
              <option value={5}>5th Year</option>
            </select>
            {fieldErrors.year && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.year[0]}</p>
            )}
          </div>

          {/* Semester (Dynamically Semester 1 or Semester 2 within the Year) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Semester *
              </label>
              <span className="text-[11px] text-blue-600 font-semibold font-mono">
                (Absolute: Semester {absoluteSem})
              </span>
            </div>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              required
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
            {fieldErrors.semester && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.semester[0]}</p>
            )}
          </div>

          {/* INFORMATIONAL DISPLAY: AUTOMATICALLY DERIVED ASSIGNED MESS */}
          <div className="md:col-span-2">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900">
                  <Utensils className="w-4 h-4 text-blue-600" />
                  <span>Assigned Mess</span>
                </div>
                <p className="text-xs text-gray-600">
                  Automatically determined by university allocation for <span className="font-semibold text-gray-900">{formData.hostel}</span> (2 hostels per mess facility):
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm flex-shrink-0">
                <span className="text-xs text-gray-500 font-medium">Assigned Dining:</span>
                <span className="text-sm font-extrabold text-blue-700 font-mono">
                  {derivedMessName}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting || uploadingPhoto}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {submitting || uploadingPhoto ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadingPhoto ? "Uploading Photo..." : "Saving Profile..."}
              </>
            ) : (
              "Save Mandatory Profile"
            )}
          </button>
        </div>
      </form>

      {/* ---------------------------------------------------------------- */}
      {/* INTERACTIVE NATIVE CAMERA MODAL (getUserMedia) */}
      {/* ---------------------------------------------------------------- */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Capture Student Photo</h3>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Viewfinder or Preview */}
            <div className="p-6 space-y-4">
              {cameraError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-center">
                  <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
                  <p className="text-xs text-rose-800 font-medium">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCameraModal();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4" />
                    Upload From Device Instead
                  </button>
                </div>
              ) : capturedBlobUrl ? (
                /* Captured Frame Preview */
                <div className="space-y-4">
                  <div className="relative w-64 h-64 mx-auto rounded-2xl overflow-hidden border-4 border-emerald-500 shadow-md bg-black">
                    <img
                      src={capturedBlobUrl}
                      alt="Captured Frame"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <CheckCircle2 className="w-3 h-3" />
                      Captured
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-500">
                    Verify that your face is clearly visible and centered.
                  </p>

                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      type="button"
                      onClick={retakeCameraPhoto}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={confirmCapturedPhoto}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Use This Photo
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Camera Stream Viewfinder */
                <div className="space-y-4">
                  <div className="relative w-64 h-64 mx-auto rounded-2xl overflow-hidden border-4 border-blue-500 shadow-md bg-black flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Circular Headshot Guide */}
                    <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-full pointer-events-none" />
                  </div>
                  <p className="text-center text-xs text-gray-500">
                    Position your face within the frame and click Capture.
                  </p>

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={capturePhotoFromStream}
                      className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-4 border-white shadow-xl flex items-center justify-center text-white transition-all transform hover:scale-105"
                      title="Capture Photo"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
