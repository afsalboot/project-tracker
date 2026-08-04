"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, MessageSquareText, Quote, Send, Star } from "lucide-react";
import { toast } from "sonner";
import FieldError from "@/components/ui/FieldError";
import { feedbackSchema, getFieldErrors } from "@/lib/validations";

const emptyForm = {
  name: "",
  email: "",
  context: "",
  message: "",
  rating: 5,
  website: "",
};

export default function LandingFeedback() {
  const [testimonials, setTestimonials] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }

  useEffect(() => {
    fetch("/api/feedback", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => result.success && setTestimonials(result.data.testimonials || []));
  }, []);

  async function submit(event) {
    event.preventDefault();
    const validation = getFieldErrors(feedbackSchema, form);
    if (!validation.data) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSending(true);
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const result = await response.json();
    setSending(false);
    if (!response.ok) {
      setErrors({ ...(result.errors || {}), form: result.message });
      return toast.error(result.message);
    }
    setForm(emptyForm);
    setSubmitted(true);
    toast.success(result.message);
  }

  return (
    <>
      <section className="overflow-hidden border-t border-neutral-200 bg-[#edf4f0] pb-12 pt-16 sm:pb-14 sm:pt-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-emerald-800">From focused teams</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Work feels better when it stays clear.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Real experiences from people keeping projects, tasks, and teams moving.</p></div>
            <a className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800" href="#share-feedback">Share your experience <ArrowRight size={15} /></a>
          </div>
        </div>
        {testimonials.length ? (
          <div className="testimonial-mask mt-10">
            <div className="testimonial-track">
              {[...testimonials, ...testimonials].map((item, index) => (
                <Testimonial
                  item={item}
                  visualIndex={index % testimonials.length}
                  key={`${item._id}-${index}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 text-sm text-neutral-600">Community experiences will appear here. You can be the first to share yours.</div>
          </div>
        )}
      </section>

      <section id="share-feedback" className="bg-gradient-to-b from-[#edf4f0] via-white to-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12 lg:pb-24 lg:pt-16">
          <div>
            <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MessageSquareText size={20} /></span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[.22em] text-emerald-800">Your experience</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">How does Project 1 Workspace feel in your day-to-day work?</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-neutral-600">Tell us what feels clear, what saves you time, and where the experience could feel better.</p>
            <div className="mt-7 space-y-3 text-sm text-neutral-600">
              <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-700" />Your email is never shown publicly.</p>
              <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-700" />Share what works well and what could feel easier.</p>
            </div>
          </div>

          {submitted ? (
            <div className="grid min-h-96 place-items-center rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center">
              <div><span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-700 text-white"><CheckCircle2 size={25} /></span><h3 className="mt-5 text-xl font-semibold">Thank you for sharing.</h3><p className="mt-2 text-sm text-neutral-600">Your experience has been shared with our team.</p><button className="mt-6 text-sm font-semibold text-emerald-800" onClick={() => setSubmitted(false)}>Share another experience</button></div>
            </div>
          ) : (
            <form className="relative grid gap-5 rounded-[2rem] border border-neutral-200 bg-[#f8faf9] p-5 shadow-[0_24px_70px_-50px_rgba(15,55,42,.45)] sm:grid-cols-2 sm:p-7" onSubmit={submit}>
              <label><span className="label">Name</span><input className="field" aria-invalid={Boolean(errors.name)} autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} /><FieldError message={errors.name} /></label>
              <label><span className="label">Email</span><input className="field" aria-invalid={Boolean(errors.email)} type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /><FieldError message={errors.email} /></label>
              <label className="sm:col-span-2"><span className="label">Role or organization <span className="font-normal text-neutral-400">(optional)</span></span><input className="field" aria-invalid={Boolean(errors.context)} placeholder="Project lead at Northstar" value={form.context} onChange={(event) => updateField("context", event.target.value)} /><FieldError message={errors.context} /></label>
              <fieldset className="sm:col-span-2">
                <legend className="label">Your rating</legend>
                <div className="flex gap-1.5" aria-label={`${form.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((rating) => <button aria-label={`${rating} star${rating === 1 ? "" : "s"}`} aria-pressed={form.rating === rating} className={`grid size-10 place-items-center rounded-xl border transition ${rating <= form.rating ? "border-amber-200 bg-amber-50 text-amber-500" : "border-neutral-200 bg-white text-neutral-300"}`} key={rating} onClick={() => updateField("rating", rating)} type="button"><Star size={18} fill={rating <= form.rating ? "currentColor" : "none"} /></button>)}
                </div>
                <FieldError message={errors.rating} />
              </fieldset>
              <label className="sm:col-span-2"><span className="label">Your feedback</span><textarea className="field min-h-36" aria-invalid={Boolean(errors.message)} placeholder="What has improved, and what should we change next?" value={form.message} onChange={(event) => updateField("message", event.target.value)} /><FieldError message={errors.message} /><span className="mt-1 block text-right text-xs text-neutral-400">{form.message.length}/1200</span></label>
              <label className="absolute -left-[9999px]" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} /></label>
              <div className="sm:col-span-2"><FieldError message={errors.form} className="mb-3 text-right" /><div className="sm:flex sm:justify-end"><button className="btn btn-primary w-full sm:w-auto" disabled={sending}><Send size={16} />{sending ? "Sending..." : "Submit feedback"}</button></div></div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

const testimonialTones = [
  {
    card: "border-[#275948] bg-[#123c30] text-white shadow-[0_24px_60px_-34px_rgba(15,55,42,.8)]",
    glow: "bg-emerald-300/10",
    quote: "border-white/10 bg-white/10 text-emerald-200",
    stars: "border-white/10 bg-white/[.07] text-amber-300",
    body: "text-emerald-50",
    meta: "text-emerald-100/60",
    avatar: "bg-emerald-200 text-emerald-950",
  },
  {
    card: "border-[#cfe2d8] bg-[#f8fcfa] text-neutral-950 shadow-[0_24px_60px_-38px_rgba(15,55,42,.55)]",
    glow: "bg-emerald-200/40",
    quote: "border-emerald-900/10 bg-emerald-100 text-emerald-800",
    stars: "border-amber-200/70 bg-amber-50 text-amber-500",
    body: "text-neutral-700",
    meta: "text-neutral-500",
    avatar: "bg-[#174c3b] text-white",
  },
];

function Testimonial({ item, visualIndex }) {
  const tone = testimonialTones[visualIndex % testimonialTones.length];
  const initials = item.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article className={`group relative isolate flex min-h-[278px] w-[min(86vw,390px)] shrink-0 flex-col overflow-hidden rounded-[1.75rem] border p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7 ${tone.card}`}>
      <span className={`pointer-events-none absolute -right-16 -top-20 -z-10 size-52 rounded-full ${tone.glow}`} />
      <span className="pointer-events-none absolute bottom-5 right-6 -z-10 font-serif text-[7rem] font-bold leading-none opacity-[.035]">“</span>

      <div className="flex items-center justify-between gap-4">
        <span className={`grid size-12 place-items-center rounded-2xl border ${tone.quote}`}>
          <Quote fill="currentColor" size={22} strokeWidth={1.8} />
        </span>
        <span className={`flex items-center gap-1 rounded-full border px-3 py-2 ${tone.stars}`} aria-label={`${item.rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              fill={index < item.rating ? "currentColor" : "none"}
              className={index < item.rating ? "" : "opacity-30"}
              size={13}
              key={index}
            />
          ))}
        </span>
      </div>

      <blockquote className={`mt-6 line-clamp-4 text-[17px] font-medium leading-7 tracking-[-.012em] ${tone.body}`}>
        {item.message}
      </blockquote>

      <footer className="mt-auto flex items-center gap-3 pt-7">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold ring-4 ring-current/5 ${tone.avatar}`}>
          {initials || "U"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          {item.context && <p className={`mt-0.5 truncate text-xs ${tone.meta}`}>{item.context}</p>}
        </div>
      </footer>
    </article>
  );
}
