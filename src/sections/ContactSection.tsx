import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Mail, Send } from 'lucide-react';
import type { ContactMessage } from '../types/portfolio';

interface ContactSectionProps {
  email: string;
  onSubmitMessage: (
    msg: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>
  ) => Promise<{ ok: boolean; error?: string }>;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export function ContactSection({ email, onSubmitMessage }: ContactSectionProps) {
  const [fullName, setFullName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedOk, setSubmittedOk] = useState(false);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      nextErrors.fullName = 'Please enter your full name (at least 2 characters).';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!senderEmail.trim() || !emailPattern.test(senderEmail.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!subject.trim() || subject.trim().length < 3) {
      nextErrors.subject = 'Please enter a subject (at least 3 characters).';
    }
    if (!message.trim() || message.trim().length < 10) {
      nextErrors.message = 'Please enter a message of at least 10 characters.';
    }
    return nextErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmittedOk(false);
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmitMessage({
      fullName: fullName.trim(),
      email: senderEmail.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setSubmittedOk(false);
      setSubmitError(
        result.error ??
          `Unable to save message right now. You can reach out directly at ${email}.`
      );
      return;
    }

    setErrors({});
    setFullName('');
    setSenderEmail('');
    setSubject('');
    setMessage('');
    setSubmittedOk(true);
  };

  return (
    <section id="contact" className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <p className="text-xs font-mono text-[#00D9FF] mb-2">Get in Touch</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight [text-wrap:balance]">
                Contact Avadhesh Sahani
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                Open to entry-level Data Analyst opportunities, analytics projects, and
                technical discussions around Power BI, SQL, PostgreSQL, Excel, and Python.
              </p>
            </div>

            <div className="rounded-xl bg-[#101B30] border border-slate-800/80 p-5 space-y-2">
              <p className="text-xs font-mono text-slate-400">Direct Email</p>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2.5 text-base font-medium text-white hover:text-[#00D9FF] transition-colors break-all"
              >
                <Mail className="w-5 h-5 text-[#078BFF] shrink-0" />
                <span>{email}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-2xl bg-[#101B30] border border-slate-800/80 p-6 sm:p-8 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="contact-full-name"
                    className="block text-sm font-medium text-slate-200 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="contact-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 text-sm text-white bg-[#080D1A] border border-slate-700 rounded-lg focus:outline-none focus:border-[#00D9FF] transition-colors"
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-rose-400">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-sm font-medium text-slate-200 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => {
                      setSenderEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    placeholder="you@company.com"
                    className="w-full px-3.5 py-2.5 text-sm text-white bg-[#080D1A] border border-slate-700 rounded-lg focus:outline-none focus:border-[#00D9FF] transition-colors"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-rose-400">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (errors.subject) setErrors((p) => ({ ...p, subject: undefined }));
                  }}
                  placeholder="Data Analyst opportunity or inquiry"
                  className="w-full px-3.5 py-2.5 text-sm text-white bg-[#080D1A] border border-slate-700 rounded-lg focus:outline-none focus:border-[#00D9FF] transition-colors"
                />
                {errors.subject && (
                  <p className="mt-1.5 text-xs text-rose-400">{errors.subject}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errors.message) setErrors((p) => ({ ...p, message: undefined }));
                  }}
                  placeholder="Write your message here..."
                  className="w-full px-3.5 py-2.5 text-sm text-white bg-[#080D1A] border border-slate-700 rounded-lg focus:outline-none focus:border-[#00D9FF] transition-colors resize-y"
                />
                {errors.message && (
                  <p className="mt-1.5 text-xs text-rose-400">{errors.message}</p>
                )}
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {submittedOk && (
                <div
                  role="status"
                  className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-sm text-emerald-200"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Message submitted successfully.</p>
                    <p className="text-xs text-emerald-300/90 mt-1">
                      Your message has been saved for Avadhesh Sahani to review. You can
                      also email <span className="font-mono underline">{email}</span>{' '}
                      directly.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#078BFF] hover:bg-[#078BFF]/90 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
