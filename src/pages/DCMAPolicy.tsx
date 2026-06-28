import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Seo from '@/components/Seo';

const DCMAPolicy = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Seo
        title="DCMA Policy"
        description="Review the Medmacs DCMA notice process and contact information for copyright concerns."
        canonical="https://medmacs.app/dcma"
      />

      <header className="sticky top-0 z-50 border-b border-primary/15 bg-white/90 backdrop-blur-xl dark:bg-slate-950/90">
        <div className="container mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-black uppercase tracking-[0.28em] text-primary">Medmacs</span>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-primary">Copyright Notice</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">DCMA Policy</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Medmacs provides educational references to support learning and verification. If you believe any referenced
            material available through Medmacs infringes your rights, please contact our legal team with enough detail
            for us to review and respond.
          </p>

          <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="font-black uppercase tracking-wider text-slate-900 dark:text-white">What to include</h2>
              <p className="mt-2">
                Include the copyrighted work claimed to be infringed, the specific Medmacs page or feature where the
                material appears, your contact information, and a statement that the information in your notice is
                accurate.
              </p>
            </section>

            <section>
              <h2 className="font-black uppercase tracking-wider text-slate-900 dark:text-white">Contact</h2>
              <p className="mt-2">
                Send DCMA concerns to{' '}
                <a className="font-bold text-primary underline underline-offset-4" href="mailto:legal@medmacs.app">
                  legal@medmacs.app
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DCMAPolicy;
