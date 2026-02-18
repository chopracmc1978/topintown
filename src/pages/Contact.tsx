import { useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useSubmitContactMessage } from '@/hooks/useContactMessages';
import CaptchaWidget from '@/components/contact/CaptchaWidget';
import { useLocation } from '@/contexts/LocationContext';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message must be less than 2000 characters'),
});

const Contact = () => {
  const { locations } = useLocation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const submitMessage = useSubmitContactMessage();

  const handleCaptchaVerify = useCallback((isValid: boolean) => {
    setCaptchaValid(isValid);
    if (isValid && errors.captcha) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.captcha;
        return next;
      });
    }
  }, [errors.captcha]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!captchaValid) {
      setErrors((prev) => ({ ...prev, captcha: 'Please enter the captcha code correctly' }));
      return;
    }
    setSending(true);
    try {
      await submitMessage.mutateAsync(result.data as { name: string; email: string; subject: string; message: string });
      toast.success('Message sent! We will get back to you within 24 hours.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setErrors({});
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero Banner */}
        <section className="relative h-[280px] md:h-[350px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1920&q=60"
              alt="Pizza background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
          <h1 className="relative z-10 font-serif text-4xl md:text-6xl font-bold text-white text-center">
            Contact Us
          </h1>
        </section>

        {/* Get In Touch */}
        <section className="py-14 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Get In Touch
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl">
              Got a question? Want to tell us something? Send us a message to find your answers. Response time within 24 hrs.
            </p>

            {/* Contact Info Cards */}
            <div className="grid sm:grid-cols-3 gap-6 mb-14">
              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6" style={{ color: 'hsl(203, 85%, 45%)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Address</h3>
                  {locations.map((loc) => (
                    <p key={loc.id} className="text-muted-foreground text-sm mt-1">{loc.address}</p>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                  <Mail className="w-6 h-6" style={{ color: 'hsl(203, 85%, 45%)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Email Address</h3>
                  <a
                    href="mailto:topintownpizza@hotmail.com"
                    className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                  >
                    topintownpizza@hotmail.com
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                  <Phone className="w-6 h-6" style={{ color: 'hsl(203, 85%, 45%)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Call Us</h3>
                  {locations.map((loc) => (
                    <p key={loc.id} className="text-muted-foreground text-sm">
                      {loc.shortName}: {loc.phone}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="max-w-xl mx-auto">
              <div className="bg-card rounded-xl p-8 shadow-card">
                <h3 className="font-serif text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
                  Send Us A Message
                </h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Your Name</label>
                    <Input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      maxLength={100}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                    <Input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      maxLength={255}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
                    <Input
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="How can we help?"
                      maxLength={200}
                      className={errors.subject ? 'border-destructive' : ''}
                    />
                    {errors.subject && <p className="text-destructive text-xs mt-1">{errors.subject}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
                    <Textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Write your message here..."
                      rows={5}
                      maxLength={2000}
                      className={errors.message ? 'border-destructive' : ''}
                    />
                    {errors.message && <p className="text-destructive text-xs mt-1">{errors.message}</p>}
                  </div>
                  {/* Captcha - only visible when message has content */}
                  {form.message.trim().length > 0 && (
                    <div>
                      <CaptchaWidget onVerify={handleCaptchaVerify} error={errors.captcha} />
                      {errors.captcha && <p className="text-destructive text-xs mt-1">{errors.captcha}</p>}
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-full"
                    size="lg"
                  >
                    {sending ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
