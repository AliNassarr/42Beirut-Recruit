"use client";

import React, { useState, useRef } from "react";
import { useCVStore, normalizeGitHub, normalizeLinkedIn } from "@/lib/store/cv-store";
import { KNOWN_PISCINES, CAMPUS_ROLES } from "@/lib/knowledge-base";
import {
  CheckCircle2,
  Circle,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Info,
  Sparkles,
  UploadCloud,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
  Building2,
  Phone,
  Mail,
  User,
  Github,
  Linkedin,
  Code2,
} from "lucide-react";

export function Step2ProjectSetup() {
  const {
    studentProfile,
    targetRole,
    setTargetRole,
    educationState,
    setEducationState,
    specializationTrack,
    setSpecializationTrack,
    showExperience,
    setShowExperience,
    selectedProjects,
    toggleProjectSelection,
    selectedCampusRoles,
    toggleCampusRole,
    selectedCoursework,
    toggleCoursework,
    setCurrentStep,
    cvData,
    updateContact,
    updateSkills,
    addExperienceItem,
    updateExperienceItem,
    removeExperienceItem,
    addEducationItem,
    updateEducationItem,
    removeEducationItem,
    hydrateFromParsedCV,
    fastFillFromOldCV,
    customProjects,
    addCustomProject,
    removeCustomProject,
    setProjectAnswer,
    userGeminiKey,
    userGroqKey,
  } = useCVStore();

  const [customCourseworkInput, setCustomCourseworkInput] = useState("");
  const [isUploadingOldCV, setIsUploadingOldCV] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  const [hasUniversityDegree, setHasUniversityDegree] = useState(
    cvData.education.some((e) => !e.institution.toLowerCase().includes("42 beirut"))
  );

  // Skill category input states
  const [newLangInput, setNewLangInput] = useState("");
  const [newDevToolInput, setNewDevToolInput] = useState("");
  const [newTechInput, setNewTechInput] = useState("");
  const [newPMInput, setNewPMInput] = useState("");

  const handleAddSkill = (
    category: "languages" | "developerTools" | "technologiesFrameworks" | "projectManagementTools",
    val: string
  ) => {
    if (!val || !val.trim()) return;
    const items = val.split(/[,+]/).map((s) => s.trim()).filter(Boolean);
    const existing = cvData.skills[category] || [];
    const merged = Array.from(new Set([...existing, ...items]));
    updateSkills({ [category]: merged });
  };

  // Custom project builder state
  const [isAddingCustomProject, setIsAddingCustomProject] = useState(false);
  const [customProjName, setCustomProjName] = useState("");
  const [customProjTech, setCustomProjTech] = useState("");
  const [customProjDate, setCustomProjDate] = useState("2026");
  const [customProjNotes, setCustomProjNotes] = useState("");

  const handleSaveCustomProject = () => {
    if (!customProjName.trim()) return;
    const slug = customProjName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    addCustomProject({
      name: customProjName.trim(),
      slug,
      techStack: customProjTech.trim() || "Full-Stack Software Development",
      date: customProjDate.trim() || "2026",
      is42Project: false,
    });
    if (customProjNotes.trim()) {
      setProjectAnswer(slug, "personal-notes", customProjNotes.trim());
    }
    setCustomProjName("");
    setCustomProjTech("");
    setCustomProjDate("2026");
    setCustomProjNotes("");
    setIsAddingCustomProject(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestedRoles = [
    "Backend Developer",
    "Systems / C++ Engineer",
    "Full-Stack Developer",
    "DevOps / Cloud Engineer",
    "Cybersecurity Engineer",
    "General Software Engineering Intern",
  ];

  // Contact validation
  const contact = cvData.contact;
  const isEmailValid = Boolean(contact.email && contact.email.includes("@"));
  const isPhoneValid = Boolean(contact.phoneNumber && contact.phoneNumber.trim().length >= 6);
  const isLinkedinValid = Boolean(contact.linkedinUrl && contact.linkedinUrl.trim().length > 0);
  const isGithubValid = Boolean(contact.githubUrl && contact.githubUrl.trim().length > 0);
  const isNameValid = Boolean(contact.fullName && contact.fullName.trim().length > 0);

  const isContactValid = isNameValid && isEmailValid && isPhoneValid && isLinkedinValid && isGithubValid;

  const handleNext = () => {
    if (!isContactValid) return;
    setCurrentStep("QUESTIONNAIRE");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingOldCV(true);
    setUploadSuccessMsg(null);
    setUploadErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const headers: Record<string, string> = {};
      if (userGeminiKey) headers["x-user-gemini-key"] = userGeminiKey;
      if (userGroqKey) headers["x-user-groq-key"] = userGroqKey;

      const res = await fetch("/api/ai/parse-old-cv", {
        method: "POST",
        headers,
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data) {
        hydrateFromParsedCV(json.data);

        const jobsCount = json.data.experience?.length || json.data.workExperience?.length || 0;
        const eduCount = json.data.education?.length || (json.data.previousUniversity?.institution ? 1 : 0);
        const skillsCount =
          (json.data.skills?.languages?.length || 0) +
          (json.data.skills?.developerTools?.length || 0) +
          (json.data.skills?.technologiesFrameworks?.length || 0) +
          (json.data.skills?.projectManagementTools?.length || 0);
        const projCount = json.data.customProjects?.length || 0;

        if (eduCount > 0) {
          setHasUniversityDegree(true);
        }
        if (jobsCount > 0) {
          setShowExperience(true);
        }

        setUploadSuccessMsg(
          `Successfully imported: ${jobsCount} job${jobsCount !== 1 ? "s" : ""}, ${eduCount} degree${eduCount !== 1 ? "s" : ""}, ${skillsCount} skill${skillsCount !== 1 ? "s" : ""}${
            projCount > 0 ? `, ${projCount} project${projCount !== 1 ? "s" : ""}` : ""
          }, and contact info!`
        );
      } else {
        setUploadErrorMsg(json.error || "Failed to parse previous CV.");
      }
    } catch (err: any) {
      setUploadErrorMsg("Error uploading CV: " + err.message);
    } finally {
      setIsUploadingOldCV(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const validatedProjects = studentProfile?.validatedProjects || [];
  const universityEducations = cvData.education.filter(
    (e) => !e.institution.toLowerCase().includes("42 beirut")
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* ============================================================== */}
      {/* OLD CV FAST-FILL DROPZONE BANNER                               */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Have an old CV? Upload PDF/DOCX to Auto-Fill
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  Fast Fill
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Gemini AI will extract your phone, LinkedIn, GitHub, previous university degrees, and past work experience automatically.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx"
              className="hidden"
              id="cv-file-upload"
            />
            <label
              htmlFor="cv-file-upload"
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                isUploadingOldCV
                  ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
              }`}
            >
              {isUploadingOldCV ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing CV with Gemini...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload PDF or DOCX</span>
                </>
              )}
            </label>
          </div>
        </div>

        {uploadSuccessMsg && (
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {uploadErrorMsg && (
          <div className="mt-3.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{uploadErrorMsg}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. MANDATORY CONTACT INFORMATION SECTION                      */}
      {/* ============================================================== */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              <span>1. Mandatory Contact Information</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                Required for Dr. Wissam CV
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              CEO Dr. Wissam&apos;s template requires a single-line contact strip with your email, phone, LinkedIn, and GitHub.
            </p>
          </div>
          {isContactValid ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Validated
            </span>
          ) : (
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Required fields missing
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={contact.fullName}
                onChange={(e) => updateContact({ fullName: e.target.value })}
                placeholder="e.g., Mohammad Hamdan"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                value={contact.email}
                onChange={(e) => updateContact({ email: e.target.value })}
                placeholder="name@student.42beirut.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={contact.phoneNumber}
                onChange={(e) => updateContact({ phoneNumber: e.target.value })}
                placeholder="e.g., +961 70 123 456 or 123-456-7890"
                className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none ${
                  !isPhoneValid ? "border-amber-500/50" : "border-slate-800 focus:border-cyan-400"
                }`}
              />
            </div>
          </div>

          {/* 42 Level Display (Auto-synced) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              42 Cursus Level (Subtitle)
            </label>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 flex items-center justify-between">
              <span>Subtitle format: <strong>42 Student – Level {contact.level}</strong></span>
              <span className="text-[10px] text-slate-500">Auto from Intra</span>
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              LinkedIn URL or Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Linkedin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={contact.linkedinUrl}
                onChange={(e) => updateContact({ linkedinUrl: e.target.value })}
                onBlur={(e) => updateContact({ linkedinUrl: normalizeLinkedIn(e.target.value) })}
                placeholder="linkedin.com/in/username or username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Normalized preview: {normalizeLinkedIn(contact.linkedinUrl) || "linkedin.com/in/..."}</p>
          </div>

          {/* GitHub */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              GitHub URL or Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Github className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={contact.githubUrl}
                onChange={(e) => updateContact({ githubUrl: e.target.value })}
                onBlur={(e) => updateContact({ githubUrl: normalizeGitHub(e.target.value) })}
                placeholder="github.com/username or username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Normalized preview: {normalizeGitHub(contact.githubUrl) || "github.com/..."}</p>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. 42 EDUCATION MILESTONE & PREVIOUS UNIVERSITY                */}
      {/* ============================================================== */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-cyan-400" />
              <span>2. 42 Education Milestone</span>
            </h2>
            <p className="text-xs text-slate-400">
              Dr. Wissam template renders strictly based on your 42 progress state.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setEducationState("STATE_A_CORE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                educationState === "STATE_A_CORE"
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              State A: In Core
            </button>
            <button
              onClick={() => setEducationState("STATE_B_SPECIALIZATION")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                educationState === "STATE_B_SPECIALIZATION"
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              State B: Specialization
            </button>
            <button
              onClick={() => setEducationState("STATE_C_ALUMNUS")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                educationState === "STATE_C_ALUMNUS"
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              State C: Alumnus
            </button>
          </div>
        </div>

        {/* Specialization Track Input (if State B) */}
        {educationState === "STATE_B_SPECIALIZATION" && (
          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 mb-4">
            <label className="text-xs font-bold text-cyan-300 block mb-1">
              Specialization Track Name
            </label>
            <input
              type="text"
              value={specializationTrack}
              onChange={(e) => setSpecializationTrack(e.target.value)}
              placeholder="e.g., Cybersecurity Track, Web Architecture, Algorithms & AI"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        )}

        {/* Previous University Degree Toggle & Builder */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasUniversityDegree}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasUniversityDegree(checked);
                  if (checked && universityEducations.length === 0) {
                    addEducationItem({
                      institution: "Lebanese University",
                      degree: "Bachelor of Science in Computer Science",
                      startDate: "2019",
                      endDate: "2023",
                    });
                  } else if (!checked) {
                    universityEducations.forEach((u) => removeEducationItem(u.id));
                  }
                }}
                className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Include Prior University Degree (Appears below 42 Beirut in Education section)</span>
            </label>
          </div>

          {hasUniversityDegree && (
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {universityEducations.map((edu) => (
                <div key={edu.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      University / Institution
                    </label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => updateEducationItem(edu.id, { institution: e.target.value })}
                      placeholder="e.g. Lebanese American University"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Degree & Major
                    </label>
                    <input
                      type="text"
                      value={edu.degree || edu.program}
                      onChange={(e) => updateEducationItem(edu.id, { degree: e.target.value, program: e.target.value })}
                      placeholder="e.g. Bachelor in Computer Science"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Years (Start – End)
                      </label>
                      <input
                        type="text"
                        value={`${edu.startDate} – ${edu.endDate || "Present"}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(/[–-]/);
                          updateEducationItem(edu.id, {
                            startDate: parts[0]?.trim() || "2020",
                            endDate: parts[1]?.trim() || "2024",
                          });
                        }}
                        placeholder="2019 – 2023"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <button
                      onClick={() => removeEducationItem(edu.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition"
                      title="Remove degree"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  addEducationItem({
                    institution: "University Name",
                    degree: "Bachelor Degree",
                    startDate: "2020",
                    endDate: "2024",
                  })
                }
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another University Degree
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. TARGET ROLE                                                 */}
      {/* ============================================================== */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <label className="text-sm font-bold text-white block mb-1">
          3. What type of role or internship are you applying for?
        </label>
        <p className="text-xs text-slate-400 mb-3">
          This tunes the AI prompt to highlight the most relevant engineering skills and project aspects for recruiters.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestedRoles.map((role) => (
            <button
              key={role}
              onClick={() => setTargetRole(role)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                targetRole === role
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="Or type a custom role title..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
        />
      </section>

      {/* ============================================================== */}
      {/* 4. WORK EXPERIENCE TOGGLE & BUILDER                            */}
      {/* ============================================================== */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <label className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              <span>4. Prior Work Experience / Internships</span>
            </label>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Dr. Wissam Dynamic Rule:</strong> If you have no work experience yet, toggle this <strong>OFF</strong>.
              The engine will automatically expand your <strong>Selected Projects</strong> section so your CV remains a full, balanced 1-page document without blank space.
            </p>
          </div>
          <button
            onClick={() => {
              const nextState = !showExperience;
              setShowExperience(nextState);
              if (nextState && cvData.experience.length === 0) {
                addExperienceItem({
                  company: "Company Name",
                  role: "Software Engineering Intern",
                  location: "Beirut, Lebanon",
                  startDate: "June 2024",
                  endDate: "August 2024",
                  rawNotes: "Contributed to backend API development, wrote integration tests, and optimized database queries.",
                });
              }
            }}
            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              showExperience ? "bg-cyan-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showExperience ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* WORK EXPERIENCE BUILDER (Active when showExperience is TRUE) */}
        {showExperience && (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">
                Jobs &amp; Internships to Include ({cvData.experience.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  addExperienceItem({
                    company: "Company Name",
                    role: "Software Developer",
                    location: "Beirut, Lebanon",
                    startDate: "2023",
                    endDate: "Present",
                    rawNotes: "",
                  })
                }
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Job / Internship
              </button>
            </div>

            {cvData.experience.map((exp, idx) => (
              <div
                key={exp.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Job #{idx + 1}
                  </span>
                  <button
                    onClick={() => removeExperienceItem(exp.id)}
                    className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperienceItem(exp.id, { company: e.target.value })}
                      placeholder="e.g. Murex, CME, Tech Startup"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Role / Title</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => updateExperienceItem(exp.id, { role: e.target.value })}
                      placeholder="e.g. Backend Developer Intern"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">City, Country</label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) => updateExperienceItem(exp.id, { location: e.target.value })}
                      placeholder="e.g. Beirut, Lebanon"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Dates (Start – End)</label>
                    <input
                      type="text"
                      value={`${exp.startDate} – ${exp.endDate}`}
                      onChange={(e) => {
                        const parts = e.target.value.split(/[–-]/);
                        updateExperienceItem(exp.id, {
                          startDate: parts[0]?.trim() || "2023",
                          endDate: parts[1]?.trim() || "Present",
                        });
                      }}
                      placeholder="June 2024 – August 2024"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    What did you build or work on? (Raw notes for AI bullet generation)
                  </label>
                  <textarea
                    rows={2}
                    value={exp.rawNotes || ""}
                    onChange={(e) => updateExperienceItem(exp.id, { rawNotes: e.target.value })}
                    placeholder="e.g. Developed REST API endpoints using Python and FastAPI. Implemented Redis caching to speed up query responses by 40%."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 5. VALIDATED PROJECT PICKER (WITH REAL DATES & BADGES)          */}
      {/* ============================================================== */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <label className="text-sm font-bold text-white block mb-2">
          5. Choose Projects to Feature on Your CV
        </label>

        {/* GUIDANCE BANNER */}
        <div className="bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-xl mb-4 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold">
            {showExperience
              ? "Please select 3 to 4 Selected Projects (since you have work experience)."
              : "Please select 4 to 6 Selected Projects (to balance the full 1-page layout without work experience)."}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {validatedProjects.map((p) => {
            const isSelected = selectedProjects.some((sp) => sp.slug === p.slug);
            const projectDate = p.date || "2024";

            return (
              <div
                key={p.slug}
                onClick={() =>
                  toggleProjectSelection({
                    name: p.name,
                    slug: p.slug,
                    date: projectDate,
                    is42Project: true,
                  })
                }
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "bg-cyan-500/10 border-cyan-500/60 text-white"
                    : "bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                    {p.name}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                      Mark: {p.finalMark}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>42cursus project</span>
                    <span>&bull;</span>
                    <span className="text-cyan-300 font-medium">{projectDate}</span>
                  </div>
                </div>
                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Custom / External Personal Projects */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Personal &amp; Commercial Projects (e.g. BC Capture, Mobile Apps, Freelance)</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Feature non-42 software, hackathon builds, or mobile apps on your CV.
              </p>
            </div>
            {!isAddingCustomProject && (
              <button
                type="button"
                onClick={() => setIsAddingCustomProject(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Add Personal Project
              </button>
            )}
          </div>

          {/* Form to add a new custom project */}
          {isAddingCustomProject && (
            <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-300">Add Personal / Commercial Project</span>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomProject(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={customProjName}
                    onChange={(e) => setCustomProjName(e.target.value)}
                    placeholder="e.g. BC Capture – Mobile Inventory Scanner"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Completion Date</label>
                  <input
                    type="text"
                    value={customProjDate}
                    onChange={(e) => setCustomProjDate(e.target.value)}
                    placeholder="e.g. 2026 or August 2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  value={customProjTech}
                  onChange={(e) => setCustomProjTech(e.target.value)}
                  placeholder="e.g. Next.js, Supabase, Cloudflare R2, Vision AI, Tailwind CSS"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  What did you build or code? (Personal notes for AI synthesis)
                </label>
                <textarea
                  rows={2}
                  value={customProjNotes}
                  onChange={(e) => setCustomProjNotes(e.target.value)}
                  placeholder="e.g. Built a mobile progressive web app to photograph physical retail stock. Designed non-blocking background uploads to Cloudflare R2 and integrated Vision AI to extract product ingredients."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomProject(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomProject}
                  disabled={!customProjName.trim()}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    customProjName.trim()
                      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Save &amp; Include Project
                </button>
              </div>
            </div>
          )}

          {/* List of Added Custom Projects */}
          {customProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
              {customProjects.map((p) => {
                const isSelected = selectedProjects.some((sp) => sp.slug === p.slug);
                return (
                  <div
                    key={p.slug}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500/60 text-white"
                        : "bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        toggleProjectSelection({
                          name: p.name,
                          slug: p.slug,
                          techStack: p.techStack,
                          date: p.date,
                          is42Project: false,
                        })
                      }
                    >
                      <div className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                        {p.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                          Personal App
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{p.techStack || "Custom Project"}</span>
                        <span>&bull;</span>
                        <span className="text-cyan-300">{p.date || "2026"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <button
                        type="button"
                        onClick={() => removeCustomProject(p.slug)}
                        className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="Remove project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div
                        onClick={() =>
                          toggleProjectSelection({
                            name: p.name,
                            slug: p.slug,
                            techStack: p.techStack,
                            date: p.date,
                            is42Project: false,
                          })
                        }
                        className="cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-400 mt-3 text-right">
          Selected: <strong className="text-cyan-400">{selectedProjects.length}</strong> projects
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. TECHNICAL SKILLS (DR. WISSAM 4 STRICT CATEGORIES)          */}
      {/* ============================================================== */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400" />
              <span>6. Technical Skills</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Dr. Wissam 4 Categories
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracted from your uploaded CV or customized below. These render directly into the 4 strict ATS categories.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Languages */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-cyan-300">
                Languages ({cvData.skills.languages.length})
              </label>
              <span className="text-[10px] text-slate-500">e.g. C, C++, Python, SQL</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-900 border border-slate-800/80 rounded-lg items-center">
              {cvData.skills.languages.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No languages added yet</span>
              ) : (
                cvData.skills.languages.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 text-xs border border-cyan-500/30 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() =>
                        updateSkills({
                          languages: cvData.skills.languages.filter((_, i) => i !== idx),
                        })
                      }
                      className="hover:text-red-400 text-slate-400 font-bold text-sm ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newLangInput}
                onChange={(e) => setNewLangInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill("languages", newLangInput);
                    setNewLangInput("");
                  }
                }}
                placeholder="Add language (press Enter)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => {
                  handleAddSkill("languages", newLangInput);
                  setNewLangInput("");
                }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Developer Tools */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-cyan-300">
                Developer Tools ({cvData.skills.developerTools.length})
              </label>
              <span className="text-[10px] text-slate-500">e.g. Git, Docker, Make, Linux</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-900 border border-slate-800/80 rounded-lg items-center">
              {cvData.skills.developerTools.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No tools added yet</span>
              ) : (
                cvData.skills.developerTools.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 text-xs border border-cyan-500/30 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() =>
                        updateSkills({
                          developerTools: cvData.skills.developerTools.filter((_, i) => i !== idx),
                        })
                      }
                      className="hover:text-red-400 text-slate-400 font-bold text-sm ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newDevToolInput}
                onChange={(e) => setNewDevToolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill("developerTools", newDevToolInput);
                    setNewDevToolInput("");
                  }
                }}
                placeholder="Add tool (press Enter)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => {
                  handleAddSkill("developerTools", newDevToolInput);
                  setNewDevToolInput("");
                }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Technologies / Frameworks */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-cyan-300">
                Technologies / Frameworks ({cvData.skills.technologiesFrameworks.length})
              </label>
              <span className="text-[10px] text-slate-500">e.g. React, Next.js, NGINX, Supabase</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-900 border border-slate-800/80 rounded-lg items-center">
              {cvData.skills.technologiesFrameworks.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No frameworks added yet</span>
              ) : (
                cvData.skills.technologiesFrameworks.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 text-xs border border-cyan-500/30 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() =>
                        updateSkills({
                          technologiesFrameworks: cvData.skills.technologiesFrameworks.filter((_, i) => i !== idx),
                        })
                      }
                      className="hover:text-red-400 text-slate-400 font-bold text-sm ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newTechInput}
                onChange={(e) => setNewTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill("technologiesFrameworks", newTechInput);
                    setNewTechInput("");
                  }
                }}
                placeholder="Add framework (press Enter)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => {
                  handleAddSkill("technologiesFrameworks", newTechInput);
                  setNewTechInput("");
                }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Project Management Tools */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-cyan-300">
                Project Management Tools ({cvData.skills.projectManagementTools.length})
              </label>
              <span className="text-[10px] text-slate-500">e.g. JIRA, Trello, Notion, GitHub Projects</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-900 border border-slate-800/80 rounded-lg items-center">
              {cvData.skills.projectManagementTools.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No PM tools added yet</span>
              ) : (
                cvData.skills.projectManagementTools.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 text-xs border border-cyan-500/30 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() =>
                        updateSkills({
                          projectManagementTools: cvData.skills.projectManagementTools.filter((_, i) => i !== idx),
                        })
                      }
                      className="hover:text-red-400 text-slate-400 font-bold text-sm ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newPMInput}
                onChange={(e) => setNewPMInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill("projectManagementTools", newPMInput);
                    setNewPMInput("");
                  }
                }}
                placeholder="Add PM tool (press Enter)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => {
                  handleAddSkill("projectManagementTools", newPMInput);
                  setNewPMInput("");
                }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. OPTIONAL CAMPUS ACTIVITIES & EXTENSION PISCINES             */}
      {/* ============================================================== */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <label className="text-sm font-bold text-white block mb-1">
          7. Campus Leadership &amp; Specialized Piscines (Optional)
        </label>
        <p className="text-xs text-slate-400 mb-4">
          Add 42 Beirut campus roles and rare annual workshops to demonstrate campus engagement.
        </p>

        {/* Campus Roles */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Campus Roles (Appears under Community Service &amp; Leadership)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CAMPUS_ROLES.map((role) => {
              const roleName = role.internalName;
              const isSelected = selectedCampusRoles.includes(roleName);
              return (
                <button
                  key={roleName}
                  type="button"
                  onClick={() => toggleCampusRole(roleName)}
                  className={`text-left text-xs p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-400 text-cyan-200 font-medium"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-white">{roleName}</div>
                    <div className="text-[10px] text-slate-400">{role.professionalTitle}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Specialized Piscines */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Specialized Coursework &amp; Piscines (Appears under Coursework &amp; Workshops)
          </label>
          <div className="space-y-2 mb-3">
            {KNOWN_PISCINES.map((piscine) => {
              const isSelected = selectedCoursework.includes(piscine);
              return (
                <button
                  key={piscine}
                  type="button"
                  onClick={() => toggleCoursework(piscine)}
                  className={`w-full text-left text-xs p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-400 text-cyan-200 font-medium"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span>{piscine}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customCourseworkInput}
              onChange={(e) => setCustomCourseworkInput(e.target.value)}
              placeholder="Add another workshop, Coursera certificate, or specialized course..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => {
                if (customCourseworkInput.trim()) {
                  toggleCoursework(customCourseworkInput.trim());
                  setCustomCourseworkInput("");
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* BOTTOM ACTION BAR                                              */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <div>
          {!isContactValid && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Please fill all required contact fields (Name, Email, Phone, LinkedIn, GitHub) to proceed.</span>
            </p>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!isContactValid || selectedProjects.length === 0}
          className={`px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-xl ${
            isContactValid && selectedProjects.length > 0
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <span>Continue to Questionnaire</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
