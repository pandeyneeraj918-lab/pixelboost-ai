'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/* ─── helpers ─────────────────────────────────────────────────── */
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX = 1920;
        if (width > MAX || height > MAX) {
          const r = Math.min(MAX / width, MAX / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
    };
  });
}

/* ─── icons ───────────────────────────────────────────────────── */
const UploadIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const ArrowsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
  </svg>
);
const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const SparkleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
  </svg>
);

/* ─── stats data ──────────────────────────────────────────────── */
const STATS = [
  { value: '4×', label: 'Resolution Boost' },
  { value: 'AI', label: 'Real-ESRGAN Engine' },
  { value: '100%', label: 'Free Forever' },
];

const STEPS = [
  { n: '01', title: 'Upload', desc: 'Drag & drop or tap to select any photo. JPG, PNG, WEBP up to 10 MB.' },
  { n: '02', title: 'AI Enhances', desc: 'Real-ESRGAN AI reconstructs fine details and upscales to 4× resolution.' },
  { n: '03', title: 'Download', desc: 'Slide to compare, then download your crystal-clear enhanced image.' },
];

/* ─── main component ──────────────────────────────────────────── */
export default function Home() {
  const [originalUrl, setOriginalUrl]   = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [enhancedUrl, setEnhancedUrl]   = useState(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [statusMsg, setStatusMsg]       = useState('');
  const [error, setError]               = useState(null);
  const [sliderPos, setSliderPos]       = useState(50);
  const [isDragging, setIsDragging]     = useState(false);
  const [isDragOver, setIsDragOver]     = useState(false);
  const [showShock, setShowShock]       = useState(false);

  const fileInputRef  = useRef(null);
  const containerRef  = useRef(null);
  const pollRef       = useRef(null);

  /* ── file handling ── */
  const handleFile = useCallback((file) => {
    if (!file?.type.startsWith('image/')) { setError('Please select a valid image file (JPG, PNG, WEBP).'); return; }
    if (file.size > 10 * 1024 * 1024)    { setError('File must be under 10 MB.'); return; }
    setError(null);
    setEnhancedUrl(null);
    setOriginalFile(file);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  /* ── enhance flow ── */
  const handleEnhance = async () => {
    if (!originalFile || isLoading) return;
    setIsLoading(true);
    setError(null);
    setProgress(5);
    setStatusMsg('Preparing image…');

    try {
      const base64 = await compressImage(originalFile);
      setProgress(15);
      setStatusMsg('Sending to AI…');

      const startRes = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!startRes.ok) {
        const d = await startRes.json();
        throw new Error(d.error || 'Failed to start enhancement.');
      }

      const { id } = await startRes.json();
      setProgress(25);
      setStatusMsg('AI is reconstructing every pixel…');

      /* poll for result */
      await new Promise((resolve, reject) => {
        let ticks = 0;
        pollRef.current = setInterval(async () => {
          try {
            ticks++;
            const r = await fetch(`/api/enhance?id=${id}`);
            const data = await r.json();

            if (data.status === 'succeeded') {
              clearInterval(pollRef.current);
              setProgress(100);
              setStatusMsg('Done!');
              setTimeout(() => {
                setEnhancedUrl(data.output);
                setIsLoading(false);
                setSliderPos(50);
                setShowShock(true);
                setTimeout(() => setShowShock(false), 4000);
              }, 400);
              resolve();
            } else if (data.status === 'failed') {
              clearInterval(pollRef.current);
              reject(new Error(data.error || 'Enhancement failed.'));
            } else {
              /* still processing — fake progress up to 90 */
              setProgress((p) => Math.min(p + (90 - p) * 0.08, 90));
              if (ticks === 5)  setStatusMsg('Adding fine textures…');
              if (ticks === 10) setStatusMsg('Sharpening edges…');
              if (ticks === 15) setStatusMsg('Finalising 4K output…');
              if (ticks > 60)   { clearInterval(pollRef.current); reject(new Error('Timed out. Please try again.')); }
            }
          } catch (err) {
            clearInterval(pollRef.current);
            reject(err);
          }
        }, 3000);
      });

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  /* ── slider ── */
  const moveSlider = useCallback((clientX) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    setSliderPos(Math.max(2, Math.min(98, ((clientX - left) / width) * 100)));
  }, []);

  useEffect(() => {
    const onMove  = (e) => { if (isDragging) moveSlider(e.clientX); };
    const onTouch = (e) => { if (isDragging) moveSlider(e.touches[0].clientX); };
    const onUp    = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, moveSlider]);

  /* ── download ── */
  const download = async () => {
    if (!enhancedUrl) return;
    try {
      const res  = await fetch(enhancedUrl);
      const blob = await res.blob();
      const a    = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: 'pixelboost-enhanced.png',
      });
      a.click();
    } catch {
      window.open(enhancedUrl, '_blank');
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setOriginalUrl(null);
    setOriginalFile(null);
    setEnhancedUrl(null);
    setError(null);
    setProgress(0);
    setIsLoading(false);
  };

  /* ── render ── */
  return (
    <div className="min-h-screen" style={{ background: '#04050f' }}>

      {/* ── HEADER ── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', background: 'rgba(4,5,15,0.85)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>
              P
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>PixelBoost AI</span>
          </div>
          <span style={{ fontSize: 13, color: '#64748b', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, padding: '4px 12px' }}>
            Powered by Real-ESRGAN
          </span>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ textAlign: 'center', padding: '70px 20px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
        </div>
        <div className="fade-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 30, padding: '6px 16px', fontSize: 13, color: '#a78bfa', marginBottom: 24 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: 'glow-pulse 1.5s ease infinite' }} />
            AI-Powered • Free Forever • No Sign-Up Required
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 20 }}>
            Turn Blurry Photos Into
            <br />
            <span style={{ background: 'linear-gradient(90deg,#a78bfa,#7c3aed,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Jaw-Dropping 4K
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 560, margin: '0 auto 16px', lineHeight: 1.7 }}>
            Upload any image — old, blurry, low-res — and watch AI rebuild it pixel-by-pixel into stunning crystal-clear detail.
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ maxWidth: 600, margin: '0 auto 40px', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
        {STATS.map(s => (
          <div key={s.value} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 8px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, background: 'linear-gradient(90deg,#a78bfa,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN TOOL ── */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px 60px' }}>

        {!originalUrl ? (
          /* ── DROP ZONE ── */
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragOver ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 24,
              padding: '80px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            <div style={{ color: isDragOver ? '#a78bfa' : '#475569', marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
              <UploadIcon />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Drop your image here</h3>
            <p style={{ color: '#64748b', marginBottom: 12 }}>or click to browse your files</p>
            <p style={{ fontSize: 13, color: '#334155' }}>Supports JPG, PNG, WEBP · Max 10 MB</p>
            {isDragOver && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.05)', pointerEvents: 'none' }} />
            )}
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── COMPARISON / PREVIEW ── */}
            {enhancedUrl ? (
              /* Before/After slider */
              <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.35)' }} className="glow-box">
                <div
                  ref={containerRef}
                  onMouseDown={() => setIsDragging(true)}
                  onTouchStart={() => setIsDragging(true)}
                  style={{ position: 'relative', cursor: 'col-resize', userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  {/* Enhanced (right) */}
                  <img src={enhancedUrl} alt="Enhanced" style={{ display: 'block', width: '100%', maxHeight: 580, objectFit: 'contain', background: '#0a0a14' }} />

                  {/* Original (left clip) */}
                  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                    <img src={originalUrl} alt="Original" style={{ display: 'block', width: '100%', maxHeight: 580, objectFit: 'contain', background: '#0a0a14' }} />
                  </div>

                  {/* Divider */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sliderPos}%`, width: 2, background: 'white', boxShadow: '0 0 12px rgba(255,255,255,0.9)', zIndex: 10, pointerEvents: 'none' }}>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#1e1b4b', pointerEvents: 'all', cursor: 'col-resize',
                    }}>
                      <ArrowsIcon />
                    </div>
                  </div>

                  {/* Labels */}
                  <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', zIndex: 20 }}>
                    Original
                  </div>
                  <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(124,58,237,0.7)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, border: '1px solid rgba(167,139,250,0.4)', zIndex: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <SparkleIcon /> Enhanced 4K
                  </div>

                  {/* Drag hint */}
                  <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 14px', fontSize: 11, color: '#94a3b8', zIndex: 20, whiteSpace: 'nowrap' }}>
                    ← drag to compare →
                  </div>
                </div>
              </div>

            ) : (
              /* Original preview */
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0a14', position: 'relative' }}>
                <img src={originalUrl} alt="Original" style={{ display: 'block', width: '100%', maxHeight: 520, objectFit: 'contain' }} />
                <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
                  Original
                </div>
              </div>
            )}

            {/* ── SHOCK BADGE ── */}
            {showShock && (
              <div className="badge-pop" style={{ textAlign: 'center', padding: '16px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16 }}>
                <p style={{ fontSize: 20, fontWeight: 800 }}>✨ Incredible, right?</p>
                <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Drag the slider to see the before/after difference — details that weren't even visible before!</p>
              </div>
            )}

            {/* ── PROGRESS ── */}
            {isLoading && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div className="loader-ring" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>{statusMsg}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)', borderRadius: 6, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#475569' }}>AI is rebuilding your image at 4× resolution — this usually takes 20–60 seconds.</p>
              </div>
            )}

            {/* ── ERROR ── */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '14px 18px', color: '#fca5a5', fontSize: 14 }}>
                <strong>Oops:</strong> {error}
              </div>
            )}

            {/* ── BUTTONS ── */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!isLoading && !enhancedUrl && (
                <button
                  onClick={handleEnhance}
                  className="shimmer-btn"
                  style={{ flex: 1, minWidth: 220, color: '#fff', fontWeight: 800, fontSize: 17, padding: '16px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <SparkleIcon /> Enhance & Add Peak Detail
                </button>
              )}

              {enhancedUrl && (
                <>
                  <button
                    onClick={download}
                    className="shimmer-btn"
                    style={{ flex: 1, minWidth: 220, color: '#fff', fontWeight: 800, fontSize: 16, padding: '16px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <DownloadIcon /> Download Enhanced Image
                  </button>
                  <button
                    onClick={reset}
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontWeight: 600, fontSize: 15, padding: '16px 22px', borderRadius: 14, cursor: 'pointer' }}
                  >
                    Try Another
                  </button>
                </>
              )}

              {!isLoading && (
                <button
                  onClick={reset}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b', padding: '16px 18px', borderRadius: 14, cursor: 'pointer', fontSize: 16 }}
                  title="Remove image"
                >
                  ✕
                </button>
              )}
            </div>

          </div>
        )}
      </main>

      {/* ── HOW IT WORKS ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '60px 20px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '24px 20px', transition: 'border-color 0.2s' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'rgba(124,58,237,0.35)', marginBottom: 12 }}>{s.n}</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '28px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#334155' }}>
          PixelBoost AI — Free Image Enhancement &nbsp;·&nbsp;
          <a href="mailto:gaurav@daewooappliances.in" style={{ color: '#7c3aed', textDecoration: 'none' }}>Contact Admin</a>
        </p>
      </footer>

    </div>
  );
}
