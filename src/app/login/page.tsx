'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import '@/styles/login.css';

export default function LoginPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.href = '/dashboard';
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let mouseX = -9999;
    let mouseY = -9999;
    let animationId = 0;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      hue: number;
    };

    const particles: Particle[] = [];
    const particleCount = window.matchMedia('(max-width: 768px)').matches ? 25 : 60;
    const connectionDistance = 120;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function createParticle(): Particle {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(Math.random() * 0.3 + 0.1),
        r: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.5 + 0.15,
        hue: Math.random() > 0.7 ? 200 : 142,
      };
    }

    function init() {
      resize();
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) particles.push(createParticle());
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.12;
            ctx.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (const particle of particles) {
        const mdx = particle.x - mouseX;
        const mdy = particle.y - mouseY;
        const mouseDistance = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mouseDistance < 100 && mouseDistance > 0) {
          const force = ((100 - mouseDistance) / 100) * 0.8;
          particle.vx += (mdx / mouseDistance) * force;
          particle.vy += (mdy / mouseDistance) * force;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        particle.vy -= 0.002;

        if (particle.y < -10) {
          particle.y = height + 10;
          particle.x = Math.random() * width;
        }
        if (particle.y > height + 10) particle.y = -10;
        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.r * 3);
        gradient.addColorStop(0, `hsla(${particle.hue}, 80%, 60%, ${particle.alpha})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 80%, 60%, 0)`);
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.r * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `hsla(${particle.hue}, 90%, 75%, ${particle.alpha * 1.5})`;
        ctx.arc(particle.x, particle.y, particle.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    function handleMouseMove(event: MouseEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }

    function handleMouseLeave() {
      mouseX = -9999;
      mouseY = -9999;
    }

    init();
    draw();

    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <main className="login-page">
      <canvas ref={canvasRef} id="particleCanvas" />

      <div className="bg-orb bg-orb--green" />
      <div className="bg-orb bg-orb--blue" />
      <div className="bg-orb bg-orb--purple" />

      <span className="float-badge float-badge--1">Crédito</span>
      <span className="float-badge float-badge--2">Processos</span>
      <span className="float-badge float-badge--3">Análise</span>

      <div className="login-wrapper">
        <section className="login-card" aria-label="Login do sistema">
          <div className="logo-container">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" aria-label="Ícone do sistema">
                <path d="M5 20l14-10" />
                <path d="M5 10l14 10" />
                <path d="M7 16c0 3 2.5 4 5 4s5-1 5-4c0-2.5-2-4-5-4s-5 1.5-5 4z" />
                <circle cx="9" cy="15" r="1" />
                <circle cx="15" cy="15" r="1" />
                <path d="M8 18c2 1 4 1 6 0" />
                <path d="M7 6c0-1.5 2-3 5-3s5 1.5 5 3v2.5c0 2-2 3.5-5 3.5s-5-1.5-5-3.5V6z" />
                <circle cx="12" cy="3" r="1" />
              </svg>
            </div>
          </div>

          <h1 className="login-title">Sistema de Crédito</h1>
          <p className="login-subtitle">Faça login para acessar o painel do seu perfil.</p>

          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            <div className="field-group">
              <label className="field-label" htmlFor="email">E-mail</label>
              <div className="field-input-wrap">
                <input
                  className="field-input"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Digite seu e-mail"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <svg className="field-icon" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">Senha</label>
              <div className="field-input-wrap">
                <input
                  className="field-input"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Digite sua senha"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <svg className="field-icon" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            <button className={`submit-btn ${loading ? 'loading' : ''}`} type="submit" disabled={loading}>
              <span className="btn-loading">
                <span className="spinner" />
                <span className="btn-text">{loading ? 'Entrando...' : 'Entrar'}</span>
              </span>
            </button>

            <div className="error-box" aria-live="polite">{error}</div>
          </form>

          <div className="card-hint">
            Acesso seguro via <code>Supabase Auth</code>
          </div>
        </section>
      </div>
    </main>
  );
}
