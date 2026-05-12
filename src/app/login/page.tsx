'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Droplets, Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft, Waves, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      } else if (result?.ok) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .login-page * {
          font-family: 'Noto Sans Thai', 'Outfit', sans-serif;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(1deg); }
          75% { transform: translateY(8px) rotate(-1deg); }
        }

        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.2; }
          100% { transform: scale(0.8); opacity: 0.6; }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes wave-drift {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25px) translateY(-8px); }
          100% { transform: translateX(0) translateY(0); }
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes bubble-rise {
          0% { transform: translateY(100%) scale(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.2; }
          100% { transform: translateY(-20%) scale(1); opacity: 0; }
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.15), 0 0 60px rgba(56, 189, 248, 0.05); }
          50% { box-shadow: 0 0 40px rgba(56, 189, 248, 0.25), 0 0 80px rgba(56, 189, 248, 0.1); }
        }

        @keyframes slide-up {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .login-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .login-float { animation: float 6s ease-in-out infinite; }
        .login-float-delay { animation: float 7s ease-in-out infinite 1s; }
        .login-float-delay-2 { animation: float 8s ease-in-out infinite 2s; }

        .login-bubble {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(125, 211, 252, 0.4), rgba(56, 189, 248, 0.1));
          animation: bubble-rise linear infinite;
        }

        .login-input-glow:focus {
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15), 0 0 20px rgba(14, 165, 233, 0.08);
        }

        .login-btn-shimmer {
          position: relative;
          overflow: hidden;
        }
        .login-btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        .login-btn-shimmer:hover::after {
          left: 100%;
        }
      `}</style>

      <div className="login-page relative min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #020617 0%, #0c1929 30%, #0a1628 60%, #020617 100%)' }}>

        {/* === Animated Background Layer === */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full login-float" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-[15%] -right-[10%] w-[45%] h-[45%] rounded-full login-float-delay" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)' }} />
          <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full login-float-delay-2" style={{ background: 'radial-gradient(circle, rgba(2,132,199,0.08) 0%, transparent 70%)' }} />

          {/* Animated SVG wave patterns */}
          <svg className="absolute bottom-0 left-0 w-full h-[40%] opacity-[0.06]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ animation: 'wave-drift 8s ease-in-out infinite' }}>
            <path fill="currentColor" className="text-sky-400" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-full h-[35%] opacity-[0.04]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ animation: 'wave-drift 10s ease-in-out infinite 2s' }}>
            <path fill="currentColor" className="text-cyan-400" d="M0,224L48,208C96,192,192,160,288,165.3C384,171,480,213,576,218.7C672,224,768,192,864,165.3C960,139,1056,117,1152,128C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>

          {/* Floating bubbles */}
          <div className="login-bubble" style={{ width: '6px', height: '6px', left: '10%', bottom: '-10%', animationDuration: '12s', animationDelay: '0s' }} />
          <div className="login-bubble" style={{ width: '4px', height: '4px', left: '25%', bottom: '-10%', animationDuration: '15s', animationDelay: '3s' }} />
          <div className="login-bubble" style={{ width: '8px', height: '8px', left: '45%', bottom: '-10%', animationDuration: '10s', animationDelay: '1s' }} />
          <div className="login-bubble" style={{ width: '5px', height: '5px', left: '65%', bottom: '-10%', animationDuration: '14s', animationDelay: '5s' }} />
          <div className="login-bubble" style={{ width: '3px', height: '3px', left: '80%', bottom: '-10%', animationDuration: '11s', animationDelay: '2s' }} />
          <div className="login-bubble" style={{ width: '7px', height: '7px', left: '90%', bottom: '-10%', animationDuration: '13s', animationDelay: '4s' }} />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(rgba(125,211,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        {/* === LEFT PANEL - Decorative (Hidden on mobile) === */}
        <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12">
          <div
            className="relative z-10 w-full max-w-lg"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateX(0)' : 'translateX(-40px)',
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s'
            }}
          >
            {/* Main illustration area */}
            <div className="relative">
              {/* Glowing ring */}
              <div className="absolute inset-0 m-auto w-72 h-72 rounded-full login-float" style={{
                background: 'conic-gradient(from 0deg, rgba(14,165,233,0.15), rgba(56,189,248,0.05), rgba(2,132,199,0.15), rgba(56,189,248,0.05), rgba(14,165,233,0.15))',
                filter: 'blur(40px)'
              }} />

              {/* Central icon composition */}
              <div className="relative flex flex-col items-center">
                {/* Water drop cluster */}
                <div className="relative w-48 h-48 mb-8">
                  {/* Main droplet */}
                  <div className="absolute inset-0 m-auto w-32 h-32 rounded-[40%_60%_60%_40%/60%_40%_60%_40%] login-float" style={{
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.3) 0%, rgba(56,189,248,0.15) 50%, rgba(125,211,252,0.1) 100%)',
                    border: '1px solid rgba(125,211,252,0.15)',
                    backdropFilter: 'blur(20px)',
                    animation: 'float 6s ease-in-out infinite, glow-pulse 4s ease-in-out infinite'
                  }}>
                    <Droplets className="absolute inset-0 m-auto w-14 h-14 text-sky-300/80" />
                  </div>
                  {/* Orbiting smaller drops */}
                  <div className="absolute top-2 right-4 w-10 h-10 rounded-full login-float-delay" style={{
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(125,211,252,0.1))',
                    border: '1px solid rgba(125,211,252,0.1)'
                  }} />
                  <div className="absolute bottom-4 left-2 w-7 h-7 rounded-full login-float-delay-2" style={{
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(56,189,248,0.08))',
                    border: '1px solid rgba(125,211,252,0.08)'
                  }} />
                  <div className="absolute top-1/2 -right-2 w-5 h-5 rounded-full login-float" style={{
                    background: 'linear-gradient(135deg, rgba(2,132,199,0.3), rgba(56,189,248,0.1))',
                    animationDelay: '3s'
                  }} />
                </div>

                {/* Brand text */}
                <h2 className="text-4xl font-extrabold tracking-tight text-white/95 text-center mb-3" style={{ fontFamily: "'Outfit', 'Noto Sans Thai', sans-serif" }}>
                  ระบบจัดการน้ำประปา
                </h2>
                <p className="text-sky-300/60 text-lg text-center max-w-sm font-light leading-relaxed">
                  บริหารจัดการระบบน้ำประปาหมู่บ้าน<br />อย่างมีประสิทธิภาพและโปร่งใส
                </p>

                {/* Feature pills */}
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                  {[
                    { icon: Waves, text: 'บันทึกมิเตอร์' },
                    { icon: ShieldCheck, text: 'ปลอดภัย' },
                    { icon: Droplets, text: 'จัดการบิล' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                      style={{
                        background: 'rgba(14,165,233,0.08)',
                        border: '1px solid rgba(56,189,248,0.12)',
                        color: 'rgba(125,211,252,0.7)',
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.6 + i * 0.15}s`
                      }}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Decorative vertical divider */}
          <div className="absolute right-0 top-[15%] bottom-[15%] w-px" style={{
            background: 'linear-gradient(to bottom, transparent, rgba(56,189,248,0.15), rgba(14,165,233,0.08), transparent)'
          }} />
        </div>

        {/* === RIGHT PANEL - Login Form === */}
        <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 relative z-10">
          <div className="w-full max-w-[420px]">

            {/* Mobile Logo */}
            <div
              className="lg:hidden text-center mb-10"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s'
              }}
            >
              <Link href="/" className="inline-flex flex-col items-center gap-3 group">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 duration-500" style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                  boxShadow: '0 20px 50px -15px rgba(14,165,233,0.4)'
                }}>
                  <Droplets className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white">ระบบจัดการน้ำ</h1>
                  <p className="text-sky-400/50 text-sm font-medium mt-0.5">Village Water Management</p>
                </div>
              </Link>
            </div>

            {/* Login heading (desktop) */}
            <div
              className="hidden lg:block mb-8"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s'
              }}
            >
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2" style={{ fontFamily: "'Outfit', 'Noto Sans Thai', sans-serif" }}>
                เข้าสู่ระบบ
              </h1>
              <p className="text-slate-400/80 font-medium">
                เข้าสู่ระบบเพื่อจัดการข้อมูลหมู่บ้าน
              </p>
            </div>

            {/* Login Card */}
            <div
              className="relative overflow-hidden rounded-3xl login-shimmer"
              style={{
                background: 'linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.5) 100%)',
                border: '1px solid rgba(56,189,248,0.08)',
                backdropFilter: 'blur(40px)',
                boxShadow: '0 25px 80px -20px rgba(0,0,0,0.5), 0 0 40px rgba(14,165,233,0.04)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s'
              }}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.5), rgba(56,189,248,0.3), transparent)'
              }} />

              <div className="p-7 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error message */}
                  {error && (
                    <div
                      className="flex items-center gap-3 rounded-xl p-4 text-sm font-semibold"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        color: '#fca5a5',
                        animation: 'slide-up 0.4s ease-out'
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" style={{ boxShadow: '0 0 8px rgba(239,68,68,0.5)' }} />
                      {error}
                    </div>
                  )}

                  {/* Email field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-[0.15em] ml-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      อีเมลผู้ใช้งาน
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: 'rgba(100,116,139,0.6)' }}>
                        <Mail className="h-[18px] w-[18px] group-focus-within:text-sky-400 transition-colors duration-300" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input-glow w-full h-[52px] rounded-xl pl-11 pr-4 text-white text-[15px] outline-none transition-all duration-300 placeholder:text-slate-600"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-xs font-bold uppercase tracking-[0.15em] ml-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      รหัสผ่าน
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: 'rgba(100,116,139,0.6)' }}>
                        <Lock className="h-[18px] w-[18px] group-focus-within:text-sky-400 transition-colors duration-300" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input-glow w-full h-[52px] rounded-xl pl-11 pr-12 text-white text-[15px] outline-none transition-all duration-300 placeholder:text-slate-600"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all duration-200 hover:bg-white/5"
                        style={{ color: 'rgba(148,163,184,0.5)' }}
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="login-btn-shimmer group relative w-full h-[52px] rounded-xl font-bold text-[15px] tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #0284c7 100%)',
                        backgroundSize: '200% 200%',
                        animation: 'gradient-shift 4s ease infinite',
                        color: 'white',
                        boxShadow: '0 10px 40px -10px rgba(14,165,233,0.4), 0 0 0 1px rgba(56,189,248,0.1) inset',
                        letterSpacing: '0.02em'
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          กำลังดำเนินการ...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          เข้าสู่ระบบ
                          <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Bottom link */}
                <div className="mt-7 pt-5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 group"
                    style={{ color: 'rgba(148,163,184,0.5)' }}
                  >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    <span className="group-hover:text-sky-400/70 transition-colors duration-300">กลับหน้าหลัก</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div
              className="flex items-center justify-center gap-6 mt-8"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(15px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s'
              }}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'rgba(100,116,139,0.4)' }}>
                <ShieldCheck className="w-3.5 h-3.5" />
                เข้ารหัส SSL
              </div>
              <div className="w-px h-3" style={{ background: 'rgba(100,116,139,0.15)' }} />
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'rgba(100,116,139,0.4)' }}>
                <Lock className="w-3.5 h-3.5" />
                ข้อมูลปลอดภัย
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
