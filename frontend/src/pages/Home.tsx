import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- ICONS FOR LOGIN MODAL ---
const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
);
const EmailIcon = () => (
  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l9 6 9-6M1 1v14h18V1M1 1h18"/></svg>
);
const FacebookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.415 23.094 10.125 23.991V15.563H7.078V12.073H10.125V9.429C10.125 6.423 11.916 4.761 14.656 4.761C15.97 4.761 17.344 4.996 17.344 4.996V7.948H15.83C14.34 7.948 13.875 8.873 13.875 9.822V12.073H17.203L16.67 15.563H13.875V23.991C19.585 23.094 24 18.1 24 12.073Z" /></svg>
);
const AppleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/></svg>
);
const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-12');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      el.classList.add('opacity-0', 'translate-y-12', 'transition-all', 'duration-1000', 'ease-out');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleLogin = (provider: string) => {
    setLoginStatus('loading');
    setTimeout(() => {
      setLoginStatus('success');
      console.log(`Logged in with ${provider}. Confirmation email sent.`);
    }, 1500);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
    setTimeout(() => setLoginStatus('idle'), 300);
  };

  return (
    <div className="font-sans text-wellness-text bg-wellness-bg selection:bg-calm-sage/20 selection:text-calm-sage overflow-x-hidden">
      
      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-wellness-text/50 backdrop-blur-lg transition-smooth" 
            onClick={handleCloseLogin}
          ></div>
          <div className="relative bg-white w-full max-w-[440px] rounded-[40px] shadow-soft-2xl overflow-hidden animate-scaleIn transform transition-smooth border border-calm-sage/10">
            <div className="p-6 md:p-8">
              
              {loginStatus === 'idle' && (
                <>
                  <div className="flex items-center justify-between mb-8 relative">
                    <div className="w-8"></div>
                    <h2 className="text-[1.35rem] font-bold text-[rgb(61, 72, 72)] font-serif tracking-tight">Log into your account</h2>
                    <button 
                      onClick={handleCloseLogin}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                    >
                      <CloseIcon />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={() => handleLogin('Email')}
                      className="w-full flex items-center justify-center gap-3 bg-[#1e2a3b] hover:bg-[#2c3b52] hover:shadow-lg text-white text-[1.05rem] font-medium py-4 rounded-full transition-all shadow-md active:scale-[0.98]"
                    >
                       <EmailIcon />
                       <span>Sign in with Email</span>
                    </button>

                    <button 
                      onClick={() => handleLogin('Facebook')}
                      className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-[rgb(61, 72, 72)] text-[1.05rem] font-medium py-4 rounded-full transition-all relative active:scale-[0.98]"
                    >
                       <div className="absolute left-6"><FacebookIcon /></div>
                       <span>Sign in with Facebook</span>
                    </button>

                    <button 
                      onClick={() => handleLogin('Apple')}
                      className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-[rgb(61, 72, 72)] text-[1.05rem] font-medium py-4 rounded-full transition-all relative active:scale-[0.98]"
                    >
                       <div className="absolute left-6"><AppleIcon /></div>
                       <span>Sign in with Apple</span>
                    </button>

                     <button 
                      onClick={() => handleLogin('Google')}
                      className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-[rgb(61, 72, 72)] text-[1.05rem] font-medium py-4 rounded-full transition-all relative active:scale-[0.98]"
                    >
                       <div className="absolute left-6"><GoogleIcon /></div>
                       <span>Sign in with Google</span>
                    </button>
                  </div>

                  <p className="mt-8 text-xs text-center text-slate-500 leading-relaxed px-4 opacity-80">
                    By tapping Continue or logging into an existing Manas360 account, you agree to our <a href="#" className="text-[rgb(139, 168, 168)] font-bold hover:underline">Terms</a> and acknowledge that you have read our <a href="#" className="text-[rgb(139, 168, 168)] font-bold hover:underline">Privacy Policy</a>.
                  </p>
                </>
              )}

              {loginStatus === 'loading' && (
                <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-[rgb(157, 173, 190)] rounded-full animate-spin mb-6"></div>
                  <p className="text-lg font-medium text-slate-600">Securely logging you in...</p>
                </div>
              )}

              {loginStatus === 'success' && (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                   <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm animate-breathe">
                     ✅
                   </div>
                   <h2 className="text-[2rem] font-serif font-bold text-[rgb(139, 168, 168)] mb-4">Welcome to Manas360</h2>
                   <p className="text-[rgb(107, 123, 123)] text-lg mb-8 leading-relaxed max-w-xs mx-auto">
                     You have successfully registered! <br/>
                     <span className="font-bold text-[rgb(157, 173, 190)]">A confirmation email has been sent to your inbox.</span>
                   </p>
                   <button 
                     onClick={handleCloseLogin}
                     className="w-full px-10 py-4 rounded-full bg-gradient-to-r from-[rgb(157, 173, 190)] to-[rgb(139, 168, 168)] text-white text-lg font-bold shadow-soft-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                   >
                     Continue to Dashboard
                   </button>
                </div>
              )}
              
            </div>
            
            {loginStatus === 'idle' && (
              <div className="bg-[#F8FAFC] py-5 text-center border-t border-slate-100">
                 <p className="text-[0.95rem] text-slate-600">
                   Don't have an account? <a href="#" className="text-[rgb(139, 168, 168)] font-bold hover:underline">Sign up</a>
                 </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HERO & NAV */}
      <div 
        className="relative w-full min-h-[95vh] flex flex-col"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1468581264429-2548ef9eb732?q=80&w=2560&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#E0F2FE]/50 md:hidden pointer-events-none z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#E0F2FE]/40 via-transparent to-[rgb(253, 252, 248)] pointer-events-none z-0"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.45)_0%,_rgba(255,255,255,0.1)_50%,_transparent_80%)] blur-3xl pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[rgb(253, 252, 248)] via-[rgb(253, 252, 248)]/90 to-transparent pointer-events-none z-0"></div>

        {/* NAVIGATION */}
        <nav className="relative z-50 flex items-center justify-between px-6 md:px-10 py-6 max-w-[1400px] mx-auto w-full">
          <div className="font-serif text-[1.6rem] md:text-[1.8rem] font-bold text-[rgb(139, 168, 168)] tracking-tight cursor-pointer hover:opacity-90 transition-opacity drop-shadow-sm z-50">
            Manas360
          </div>

          <div className="hidden lg:flex items-center gap-6 xl:gap-10 font-medium text-[rgb(139, 168, 168)] text-[1.05rem]">
            <DropdownButton title="Solutions">
              <div className="py-2 px-1 space-y-1">
                <DropdownItem>Wellness Seekers</DropdownItem>
                <DropdownItem>Providers (Therapists & Coaches)</DropdownItem>
                <DropdownItem>Corporates (Employee Wellness)</DropdownItem>
                <DropdownItem>Education (Schools & Institutes)</DropdownItem>
              </div>
            </DropdownButton>

            <DropdownButton title="Resources">
              <div className="py-2 px-1 space-y-1">
                <DropdownItem>Sound Therapy</DropdownItem>
                <DropdownItem>Digital Pet Therapy</DropdownItem>
                <DropdownItem>Virtual Therapist Bot</DropdownItem>
                <DropdownItem>Group Sessions</DropdownItem>
                <DropdownItem>Ayurveda & Herbal</DropdownItem>
              </div>
            </DropdownButton>

            <a href="#" className="px-4 py-2 rounded-full hover:bg-white/40 transition-smooth">About Us</a>
          </div>

          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="text-[rgb(139, 168, 168)] font-bold hover:text-[rgb(157, 173, 190)] transition-colors px-3 py-2 text-[1.05rem]"
            >
              Log In
            </button>
            <button className="text-[rgb(139, 168, 168)] text-2xl hover:scale-110 transition-transform p-2 drop-shadow-sm">🛒</button>
            <button 
              onClick={() => navigate('/assessment')}
              className="px-10 py-3.5 rounded-full bg-gradient-calm text-white font-bold shadow-soft-md hover:shadow-soft-lg hover:-translate-y-0.5 hover:brightness-105 transition-smooth ease-out tracking-wide text-[1.05rem]"
            >
              Get Started
            </button>
          </div>
          
          <div className="lg:hidden flex items-center gap-4 z-50">
             <button 
                onClick={() => setIsLoginOpen(true)}
                className="text-[rgb(139, 168, 168)] font-bold text-[0.95rem] hover:text-[rgb(157, 173, 190)] transition-colors"
              >
                Log In
              </button>
              <button className="text-[rgb(139, 168, 168)] text-xl p-1">🛒</button>
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-[rgb(139, 168, 168)] text-3xl ml-1 focus:outline-none transition-transform duration-300"
                style={{ transform: isMobileMenuOpen ? 'rotate(90deg)' : 'none' }}
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </button>
          </div>
        </nav>

        {/* MOBILE MENU */}
        <div 
          className={`
            fixed inset-0 z-40 bg-[rgb(253, 252, 248)] 
            transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
            lg:hidden flex flex-col
            ${isMobileMenuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}
          `}
        >
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-100/30 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-amber-50/50 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex-1 overflow-y-auto pt-28 px-6 pb-12 relative z-10 flex flex-col">
                <div className="space-y-8 flex-1">
                    <div className="space-y-4">
                        <h4 className="font-serif text-[rgb(139, 168, 168)] text-2xl font-bold opacity-90">Solutions</h4>
                        <div className="pl-4 border-l-2 border-blue-50 space-y-4">
                            <a href="#" className="block text-lg font-medium text-slate-600 hover:text-[rgb(157, 173, 190)]">Wellness Seekers</a>
                            <a href="#" className="block text-lg font-medium text-slate-600 hover:text-[rgb(157, 173, 190)]">Providers</a>
                            <a href="#" className="block text-lg font-medium text-slate-600 hover:text-[rgb(157, 173, 190)]">Corporates</a>
                            <a href="#" className="block text-lg font-medium text-slate-600 hover:text-[rgb(157, 173, 190)]">Education</a>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-serif text-[rgb(139, 168, 168)] text-2xl font-bold opacity-90">Resources</h4>
                        <div className="pl-4 border-l-2 border-blue-50 space-y-4">
                            <a href="#" className="block text-lg font-medium text-slate-600 hover:text-[rgb(157, 173, 190)]">Sound Therapy</a>
                            <a href="#" className="block text-lg font-medium text-slate-600 hover:text-[rgb(157, 173, 190)]">Digital Pet Therapy</a>
                            <a href="#" className="block text-lg font-medium text-slate-600 hover:text-[rgb(157, 173, 190)]">Virtual Bot</a>
                        </div>
                    </div>

                    <div>
                        <a href="#" className="font-serif text-[rgb(139, 168, 168)] text-2xl font-bold opacity-90 block mb-4">About Us</a>
                    </div>
                </div>

                <div className="mt-8">
                     <button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/assessment');
                      }}
                      className="w-full py-5 rounded-full bg-gradient-calm text-white text-xl font-bold shadow-soft-lg active:scale-[0.98] transition-transform"
                    >
                      Get Started
                    </button>
                    <p className="text-center text-slate-400 mt-6 text-sm">© 2024 Manas360 Wellness</p>
                </div>
            </div>
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-20 flex-1 flex flex-col justify-center items-center text-center px-4 max-w-5xl mx-auto pb-24">
          <div className="relative z-10 p-6 md:p-8 rounded-[3rem] md:bg-gradient-to-b md:from-white/5 md:to-white/0 md:backdrop-blur-[2px]">
            <h1 className="font-serif text-[2.8rem] md:text-[clamp(2.8rem,6vw,5.5rem)] font-normal text-[rgb(139, 168, 168)] leading-[1.1] mb-6 md:mb-8 drop-shadow-lg text-balance tracking-tight">
              A Holistic 360° Journey to Greater Mental Wellness
            </h1>
            
            <p className="text-[1.1rem] md:text-[1.4rem] text-[rgb(107, 123, 123)] leading-[1.6] max-w-4xl mx-auto mb-10 md:mb-14 font-medium opacity-90 text-balance drop-shadow-sm md:text-[rgb(107, 123, 123)]">
              Manas360 empowers individuals by connecting them with expert Mental Wellness Master Coaches across Neuro Linguistic Programming (NLP), Meditation–Aatman Engineering, Better Sleep Practices, Healthy Mind Diet coaching, Frequency-Vibes methodologies, and Hyper-Personalized wellness routines.
            </p>

            <button 
              onClick={() => navigate('/assessment')}
              className="w-full md:w-auto px-10 md:px-16 py-5 md:py-6 text-[1.2rem] md:text-[1.3rem] rounded-full bg-gradient-calm text-white font-bold shadow-[0_10px_30px_-5px_rgba(30,89,255,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(30,89,255,0.6)] hover:-translate-y-1 hover:brightness-105 hover:scale-[1.02] transition-smooth ease-out uppercase tracking-wider ring-4 ring-blue-500/10"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* SOLUTIONS GRID */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgb(253, 252, 248)] via-[#F4F9FF] to-[#F0F9FF] pointer-events-none"></div>

        <div className="max-w-[1280px] mx-auto relative z-10">
          <h2 className="reveal-on-scroll font-serif text-[2.8rem] md:text-[3.2rem] text-[rgb(139, 168, 168)] mb-16 text-center tracking-tight">
            Our Solutions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            <SolutionCard 
              title="Wellness Seekers" 
              icon="🧘‍♀️" 
              gradient="bg-gradient-to-br from-[#E0F2FE]/40 to-white" 
              delay="0ms"
            />
            <SolutionCard 
              title="Providers" 
              subtitle="(Therapists & Coaches)" 
              icon="👩‍⚕️" 
              gradient="bg-gradient-to-br from-[#F0FDFA] to-white" 
              delay="100ms"
            />
            <SolutionCard 
              title="Corporates" 
              subtitle="(Employee Wellness)" 
              icon="🏢" 
              gradient="bg-gradient-to-br from-[#EEF2FF] to-white" 
              delay="200ms"
            />
            <SolutionCard 
              title="Education" 
              subtitle="(Schools & Institutes)" 
              icon="🎓" 
              gradient="bg-gradient-to-br from-[#F0F9FF] to-white" 
              delay="300ms"
            />
          </div>
        </div>
      </section>

      {/* BOT & PET */}
      <section className="py-24 px-6 bg-[#F0F9FF] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 relative z-10">
          
          <div className="reveal-on-scroll group bg-gradient-to-br from-white to-[#EBF5FF] rounded-[40px] p-10 md:p-14 flex flex-col justify-between hover:shadow-[0_30px_60px_-15px_rgba(14,165,233,0.15)] transition-all duration-500 border border-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.03)]">
            <div>
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-5xl shadow-[0_10px_30px_-5px_rgba(14,165,233,0.1)] mb-10 group-hover:scale-105 transition-transform duration-300">
                🤖
              </div>
              <h3 className="font-serif text-[2.4rem] text-[rgb(139, 168, 168)] mb-6 leading-tight">Virtual Therapist Bot</h3>
              <p className="text-[#475569] text-[1.15rem] mb-12 leading-relaxed font-light">
                24/7 AI-powered support to help you navigate difficult emotions instantly. Always here, never judging.
              </p>
              
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm max-w-sm mb-12 border border-blue-50/50">
                <div className="flex gap-4 mb-5">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-sm">🤖</div>
                  <div className="bg-[#F1F5F9] px-6 py-4 rounded-2xl rounded-tl-none text-[1rem] text-[#334155] shadow-sm leading-relaxed">
                    How are you feeling today?
                  </div>
                </div>
                <div className="flex gap-4 flex-row-reverse">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex-shrink-0 flex items-center justify-center text-sm">👤</div>
                  <div className="bg-gradient-to-r from-[rgb(157, 173, 190)] to-[#3B82F6] text-white px-6 py-4 rounded-2xl rounded-tr-none text-[1rem] shadow-md leading-relaxed">
                    A bit overwhelmed.
                  </div>
                </div>
              </div>
            </div>
            
            <button className="self-start px-10 py-5 rounded-full bg-white text-[rgb(157, 173, 190)] font-bold text-lg border-2 border-[rgb(157, 173, 190)]/10 hover:border-[rgb(157, 173, 190)] hover:bg-[rgb(157, 173, 190)] hover:text-white transition-smooth shadow-sm hover:shadow-lg">
              Start Chatting Now
            </button>
          </div>

          <div className="reveal-on-scroll group bg-gradient-to-br from-white to-[#FFFBEB] rounded-[40px] p-10 md:p-14 flex flex-col justify-between hover:shadow-[0_30px_60px_-15px_rgba(245,158,11,0.15)] transition-all duration-500 border border-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.03)] [transition-delay:100ms]">
            <div>
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-5xl shadow-[0_10px_30px_-5px_rgba(245,158,11,0.1)] mb-10 group-hover:scale-105 transition-transform duration-300">
                🐕
              </div>
              <h3 className="font-serif text-[2.4rem] text-[rgb(139, 168, 168)] mb-6 leading-tight">Digital Pet Therapy</h3>
              <p className="text-[#475569] text-[1.15rem] mb-12 leading-relaxed font-light">
                Find comfort and unconditional companionship with Fluffy, your emotional support digital pet.
              </p>
              <div className="h-48 flex items-center justify-center mb-10">
                <div className="text-[8rem] filter drop-shadow-2xl hover:scale-110 transition-transform cursor-pointer animate-float duration-[3s]">
                  🐶
                </div>
              </div>
            </div>
             <button className="self-start px-10 py-5 rounded-full bg-white text-[#D97706] font-bold text-lg border-2 border-[#D97706]/10 hover:border-[#D97706] hover:bg-[#D97706] hover:text-white transition-smooth shadow-sm hover:shadow-lg">
              Meet Fluffy
            </button>
          </div>

        </div>
      </section>

      {/* SOUND THERAPY */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#F0F9FF] to-[#F8FAFC]">
        <div className="max-w-[1280px] mx-auto reveal-on-scroll">
          <div className="bg-gradient-to-br from-[#DDEFFD] via-[#F0F8FF] to-white rounded-[50px] p-12 md:p-24 flex flex-col md:flex-row items-center gap-16 border border-white shadow-[0_40px_80px_-20px_rgba(14,165,233,0.15)] group relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/40 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            <div className="flex-1 relative z-10">
              <span className="inline-block px-6 py-2 rounded-full bg-white text-[rgb(139, 168, 168)] text-xs font-bold tracking-[0.2em] uppercase mb-10 shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-blue-50">
                Featured Collection
              </span>
              <h2 className="font-serif text-[3rem] md:text-[4rem] text-[rgb(139, 168, 168)] leading-[1.1] mb-8 tracking-tight">
                Sound Therapy & Binaural Beats
              </h2>
              <p className="text-[1.25rem] text-[#475569] leading-relaxed mb-12 font-light max-w-xl">
                Immerse yourself in Frequency-Vibes methodologies designed to realign your mind. 
                From deep sleep to high focus, tune into the frequency your brain needs.
              </p>
               <button className="flex items-center gap-3 text-[rgb(157, 173, 190)] font-bold text-xl hover:gap-5 transition-all group-hover:text-[rgb(139, 168, 168)]">
                Explore Library <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            <div className="flex-1 flex justify-center relative z-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full border border-blue-200/30 scale-150 animate-[ping_3s_linear_infinite]"></div>
                <div className="absolute inset-0 rounded-full border border-blue-200/20 scale-125"></div>
                
                <div className="w-56 h-56 md:w-72 md:h-72 rounded-full bg-gradient-to-br from-[rgb(157, 173, 190)] to-[rgb(139, 168, 168)] flex items-center justify-center shadow-soft-xl hover:scale-105 transition-transform duration-500 cursor-pointer group hover:shadow-[0_40px_80px_-10px_rgba(30,89,255,0.5)]">
                   <div className="w-0 h-0 border-t-[25px] border-t-transparent border-l-[45px] border-l-white border-b-[25px] border-b-transparent ml-4 group-hover:scale-110 transition-transform"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SUPPORT STATEMENT */}
      <section className="py-32 px-6 bg-gradient-to-b from-[#F8FAFC] to-white text-center border-b border-[#E0F2FE]/50">
        <div className="max-w-5xl mx-auto reveal-on-scroll">
          <h2 className="font-serif text-[2.8rem] md:text-[3.5rem] text-[rgb(139, 168, 168)] mb-10 tracking-tight leading-tight">
            Support for Every State of Mind
          </h2>
          <p className="text-[1.4rem] text-[#475569] leading-relaxed font-light max-w-3xl mx-auto">
            Comprehensive tools ranging from automated AI companions to certified human experts.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 bg-white text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10 reveal-on-scroll">
          <h2 className="font-serif text-[3.2rem] md:text-[4.5rem] text-[rgb(139, 168, 168)] mb-10 leading-[1.1] text-balance tracking-tight">
            Ready to prioritize yourself?
          </h2>
          <p className="text-[1.35rem] text-[#475569] mb-14 font-light leading-relaxed">
            Join thousands who have found balance with Manas360.
            <br />
            <span className="font-semibold text-[rgb(157, 173, 190)]">First assessment is free.</span>
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={() => navigate('/assessment')}
              className="px-20 py-7 rounded-full bg-gradient-calm text-white text-xl font-bold shadow-soft-lg hover:shadow-soft-xl hover:-translate-y-1 hover:brightness-105 transition-smooth ring-4 ring-blue-500/10"
            >
              Start Your Journey
            </button>
            <p className="text-sm text-slate-400 font-medium tracking-wide">No credit card required for basic access.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#F8FAFC] pt-24 pb-12 px-6 border-t border-slate-100">
        <div className="max-w-[1280px] mx-auto text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8 mb-20 text-left">
            <div>
              <h4 className="font-bold text-[rgb(139, 168, 168)] mb-8 text-lg">Manas360</h4>
              <ul className="space-y-4 text-[0.95rem] text-slate-500 font-medium">
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">About Us</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Careers</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Press</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Blog</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[rgb(139, 168, 168)] mb-8 text-lg">Solutions</h4>
              <ul className="space-y-4 text-[0.95rem] text-slate-500 font-medium">
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">For Individuals</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">For Business</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">For Schools</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">For Therapists</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[rgb(139, 168, 168)] mb-8 text-lg">Support</h4>
              <ul className="space-y-4 text-[0.95rem] text-slate-500 font-medium">
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Help Center</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Contact Us</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Accessibility</li>
              </ul>
            </div>
             <div>
              <h4 className="font-bold text-[rgb(139, 168, 168)] mb-8 text-lg">Legal</h4>
              <ul className="space-y-4 text-[0.95rem] text-slate-500 font-medium">
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Terms</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Privacy</li>
                <li className="hover:text-[rgb(157, 173, 190)] cursor-pointer transition-colors">Cookies</li>
              </ul>
            </div>
          </div>
          
          <div className="py-10 border-t border-slate-200">
            <p className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed opacity-80">
              If you're experiencing a life-threatening emergency or crisis, please call 911 or the National Suicide Prevention Lifeline at 988.
            </p>
          </div>
          <div className="text-slate-400 text-xs font-medium tracking-wide">
            © 2024 Manas360 Wellness. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};

const DropdownButton: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="flex items-center gap-1.5 px-4 py-2 rounded-full hover:bg-white/50 transition-smooth focus:outline-none">
        {title} 
        <span className={`text-[0.7rem] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      
      <div 
        className={`
          absolute top-full left-0 w-72 pt-5
          transition-smooth origin-top-left z-50
          ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}
        `}
      >
        <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100/80 p-3 overflow-hidden ring-1 ring-black/5">
           {children}
        </div>
      </div>
    </div>
  );
};

const DropdownItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <a href="#" className="block px-5 py-3 text-[0.95rem] font-medium text-[rgb(107, 123, 123)] hover:bg-sky-50/80 hover:text-[rgb(139, 168, 168)] rounded-xl transition-all duration-200 hover:pl-6">
    {children}
  </a>
);

const SolutionCard: React.FC<{ title: string; subtitle?: string; icon: string; gradient: string; delay?: string }> = ({ title, subtitle, icon, gradient, delay }) => (
  <div 
    className={`
      reveal-on-scroll ${gradient} 
      p-10 rounded-[32px] 
      flex flex-col items-center text-center 
      hover:-translate-y-2 transition-all duration-500 
      cursor-pointer 
      border border-white shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)] 
      hover:shadow-[0_25px_50px_-10px_rgba(14,165,233,0.15)] 
      group
    `}
    style={{ transitionDelay: delay }}
  >
    <div className="text-5xl mb-8 bg-white w-24 h-24 rounded-[24px] flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] group-hover:scale-105 transition-transform duration-300">
      {icon}
    </div>
    <h3 className="font-serif text-[1.6rem] font-bold text-[rgb(139, 168, 168)] mb-2 leading-tight">{title}</h3>
    {subtitle && <p className="text-[1rem] text-[#475569] opacity-80 font-medium">{subtitle}</p>}
  </div>
);
