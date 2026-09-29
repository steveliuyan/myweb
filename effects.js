/* ==========================================================
   effects.js —— 全站动效（无第三方依赖）
   - 滚动进场 / 时间线绘制
   - 卡片 3D 倾斜 + 跟随光斑
   - 鼠标光晕、磁吸按钮
   - 顶部阅读进度条、极光背景
   - 点击水波纹 + 火花
   - 打字机副标题、技能条计数
   所有动效在 prefers-reduced-motion 下自动关闭或降级。
   ========================================================== */
(function () {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // 告诉页面内联脚本：技能条动画由这里接管
    window.FX_SKILLS = true;

    const REVEAL_SELECTOR = [
        '.contact-item',
        '.qrcode-item',
        '.skill',
        '.info-item',
        '.tag',
        '.course-item',
        '.responsibilities li',
        '.social-links a',
        '.philosophy-content p'
    ].join(',');

    const CARD_SELECTOR = [
        '.profile-card',
        '.info-details',
        '.design-philosophy',
        '.education-card',
        '.courses-section',
        '.timeline-content',
        '.future-experience',
        '.contact-info-card',
        '.contact-form-card'
    ].join(',');

    // 表单卡片只加光斑，不倾斜（打字时卡片乱动体验不好）
    const NO_TILT_SELECTOR = '.contact-form-card';

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    /* ---------- 入场动画收尾 ----------
       .fade-in 使用 animation-fill-mode: forwards，结束后会一直锁住 transform，
       导致卡片的 hover 上浮、倾斜全部失效。这里在动画结束后把类名摘掉。
       首屏以下的 .fade-in 直接改成滚动进场，避免在看不见的地方播完。 */
    function prepareFadeIns() {
        const converted = [];
        const fold = window.innerHeight * 0.92;

        document.querySelectorAll('.fade-in').forEach(el => {
            const inNav = el.closest('nav');
            const rect = el.getBoundingClientRect();

            if (!reducedMotion && !inNav && rect.top > fold && !el.closest('.fx-reveal')) {
                el.classList.remove('fade-in', 'delay-1', 'delay-2', 'delay-3', 'delay-4');
                el.classList.add('fx-reveal');
                converted.push(el);
                return;
            }

            // logo 上还挂着无限循环的流光动画，不能摘
            if (el.classList.contains('logo')) return;

            el.addEventListener('animationend', function handler(event) {
                if (event.target !== el || event.animationName !== 'fadeIn') return;
                el.removeEventListener('animationend', handler);
                el.classList.remove('fade-in', 'delay-1', 'delay-2', 'delay-3', 'delay-4');
                el.style.opacity = '';
                el.style.animationPlayState = '';
            });
        });

        return converted;
    }

    /* ---------- 滚动进场 ---------- */
    function initReveal(converted) {
        if (reducedMotion || !('IntersectionObserver' in window)) return;

        const targets = new Set(converted);
        document.querySelectorAll(REVEAL_SELECTOR).forEach(el => {
            if (el.closest('nav')) return;
            targets.add(el);
        });

        targets.forEach(el => el.classList.add('fx-reveal'));

        const line = document.querySelector('.timeline-line');
        if (line) line.classList.add('fx-line');

        const observer = new IntersectionObserver(entries => {
            let order = 0;
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                observer.unobserve(el);
                el.style.setProperty('--fx-delay', Math.min(order, 6) * 70 + 'ms');
                order += 1;
                el.classList.add('is-visible');

                // 进场结束后移除，把 transition 还给元素自己的 hover 效果
                if (el.classList.contains('fx-reveal')) {
                    setTimeout(() => {
                        el.classList.remove('fx-reveal', 'is-visible');
                        el.style.removeProperty('--fx-delay');
                    }, 1300);
                }
            });
        }, { threshold: 0.12 });

        targets.forEach(el => observer.observe(el));
        if (line) observer.observe(line);
    }

    /* ---------- 技能条：进入视口才开始涨，数字同步计数 ---------- */
    function initSkills() {
        const bars = document.querySelectorAll('.skill-progress[data-width]');
        if (!bars.length) return;

        function play(bar, delay) {
            const target = parseFloat(bar.dataset.width) || 0;
            const skill = bar.closest('.skill');
            const label = skill ? skill.querySelector('.skill-title span:last-child') : null;

            if (reducedMotion) {
                bar.style.width = target + '%';
                return;
            }

            setTimeout(() => {
                bar.style.width = target + '%';
                if (!label) return;
                const duration = 1600;
                const start = performance.now();
                (function tick(now) {
                    const t = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - t, 4);
                    label.textContent = Math.round(target * eased) + '%';
                    if (t < 1) requestAnimationFrame(tick);
                })(start);
            }, delay);
        }

        if (reducedMotion || !('IntersectionObserver' in window)) {
            bars.forEach(bar => play(bar, 0));
            return;
        }

        bars.forEach(bar => {
            const skill = bar.closest('.skill');
            const label = skill ? skill.querySelector('.skill-title span:last-child') : null;
            if (label) label.textContent = '0%';
        });

        const observer = new IntersectionObserver(entries => {
            let order = 0;
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                play(entry.target, 250 + order * 140);
                order += 1;
            });
        }, { threshold: 0.6 });

        bars.forEach(bar => observer.observe(bar));
    }

    /* ---------- 打字机副标题 ---------- */
    function initTyping() {
        document.querySelectorAll('[data-fx-typing]').forEach(el => {
            const words = el.dataset.fxTyping.split('|').map(s => s.trim()).filter(Boolean);
            if (!words.length) return;

            el.setAttribute('aria-label', words.join('，'));
            if (reducedMotion || words.length < 2) return;

            el.classList.add('fx-typing');
            let wordIndex = 0;
            let charIndex = words[0].length;
            let deleting = true;

            function step() {
                const word = words[wordIndex];
                if (deleting) {
                    charIndex -= 1;
                    el.textContent = word.slice(0, charIndex);
                    if (charIndex <= 0) {
                        deleting = false;
                        wordIndex = (wordIndex + 1) % words.length;
                        return setTimeout(step, 350);
                    }
                    return setTimeout(step, 55);
                }

                const next = words[wordIndex];
                charIndex += 1;
                el.textContent = next.slice(0, charIndex);
                if (charIndex >= next.length) {
                    deleting = true;
                    return setTimeout(step, 2400);
                }
                return setTimeout(step, 120);
            }

            // 首次先完整展示原文字，再开始轮换
            setTimeout(step, 2800);
        });
    }

    /* ---------- 极光背景 / 进度条 / 鼠标光晕 ---------- */
    function initAmbient() {
        const aurora = document.createElement('div');
        aurora.className = 'fx-aurora';
        aurora.setAttribute('aria-hidden', 'true');
        aurora.innerHTML = '<span></span><span></span><span></span>';
        document.body.prepend(aurora);

        const bar = document.createElement('div');
        bar.className = 'fx-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);

        let ticking = false;
        function updateProgress() {
            ticking = false;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const ratio = max > 40 ? Math.min(window.scrollY / max, 1) : 0;
            bar.style.transform = 'scaleX(' + ratio + ')';
        }
        function requestProgress() {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateProgress);
            }
        }
        window.addEventListener('scroll', requestProgress, { passive: true });
        window.addEventListener('resize', requestProgress);
        updateProgress();

        if (!finePointer || reducedMotion) return;

        const glow = document.createElement('div');
        glow.className = 'fx-cursor-glow';
        glow.setAttribute('aria-hidden', 'true');
        document.body.appendChild(glow);

        let tx = window.innerWidth / 2;
        let ty = window.innerHeight / 2;
        let cx = tx;
        let cy = ty;
        let running = false;

        function loop() {
            cx += (tx - cx) * 0.14;
            cy += (ty - cy) * 0.14;
            glow.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
            if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) {
                requestAnimationFrame(loop);
            } else {
                running = false;
            }
        }

        document.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            tx = e.clientX;
            ty = e.clientY;
            glow.classList.add('is-on');
            if (!running) {
                running = true;
                requestAnimationFrame(loop);
            }
        }, { passive: true });

        document.documentElement.addEventListener('mouseleave', () => glow.classList.remove('is-on'));
    }

    /* ---------- 卡片倾斜 + 光斑 ---------- */
    function initCards() {
        const cards = document.querySelectorAll(CARD_SELECTOR);
        cards.forEach(card => {
            card.classList.add('fx-spot');
            const style = getComputedStyle(card);
            if (style.position === 'static') card.classList.add('fx-spot-pos');
            // 已经用了 ::before 的卡片（例如设计理念左侧色条）只加描边光，不加内部柔光
            const before = getComputedStyle(card, '::before').content;
            if (!before || before === 'none') card.classList.add('fx-spot-fill');
        });

        if (!finePointer) return;

        cards.forEach(card => {
            const canTilt = !reducedMotion && !card.matches(NO_TILT_SELECTOR);
            let rect = null;
            let frame = 0;
            let lastEvent = null;

            function apply() {
                frame = 0;
                if (!rect || !lastEvent) return;
                const px = (lastEvent.clientX - rect.left) / rect.width;
                const py = (lastEvent.clientY - rect.top) / rect.height;
                card.style.setProperty('--fx-x', (px * 100).toFixed(2) + '%');
                card.style.setProperty('--fx-y', (py * 100).toFixed(2) + '%');
                if (!canTilt) return;
                const max = rect.width > 520 ? 2.5 : 4;
                const rx = (0.5 - py) * max * 2;
                const ry = (px - 0.5) * max * 2;
                card.style.transform = 'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
                    ry.toFixed(2) + 'deg) translateY(-6px)';
            }

            card.addEventListener('pointerenter', e => {
                if (e.pointerType !== 'mouse') return;
                rect = card.getBoundingClientRect();
                if (canTilt) card.classList.add('fx-tilting');
            });

            card.addEventListener('pointermove', e => {
                if (e.pointerType !== 'mouse') return;
                if (!rect) rect = card.getBoundingClientRect();
                lastEvent = e;
                if (!frame) frame = requestAnimationFrame(apply);
            });

            card.addEventListener('pointerleave', () => {
                rect = null;
                lastEvent = null;
                if (frame) cancelAnimationFrame(frame);
                frame = 0;
                card.classList.remove('fx-tilting');
                card.style.transform = '';
            });

            // 滚动后缓存的位置会过期
            window.addEventListener('scroll', () => {
                if (rect) rect = card.getBoundingClientRect();
            }, { passive: true });
        });
    }

    /* ---------- 磁吸按钮（用独立的 translate 属性，不覆盖原有 hover transform） ---------- */
    function initMagnetic() {
        if (!finePointer || reducedMotion) return;

        document.querySelectorAll('.social-links a, .back-to-top, .resume-download-btn, .submit-btn, .btn').forEach(el => {
            let tx = 0;
            let ty = 0;
            let cx = 0;
            let cy = 0;
            let running = false;

            function loop() {
                cx += (tx - cx) * 0.2;
                cy += (ty - cy) * 0.2;
                el.style.translate = cx.toFixed(2) + 'px ' + cy.toFixed(2) + 'px';
                if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
                    requestAnimationFrame(loop);
                } else {
                    running = false;
                    if (tx === 0 && ty === 0) el.style.translate = '';
                }
            }

            function kick() {
                if (!running) {
                    running = true;
                    requestAnimationFrame(loop);
                }
            }

            el.addEventListener('pointermove', e => {
                if (e.pointerType !== 'mouse') return;
                const rect = el.getBoundingClientRect();
                // 减去当前位移，得到元素的原始中心
                const centerX = rect.left + rect.width / 2 - cx;
                const centerY = rect.top + rect.height / 2 - cy;
                tx = (e.clientX - centerX) * 0.3;
                ty = (e.clientY - centerY) * 0.3;
                kick();
            });

            el.addEventListener('pointerleave', () => {
                tx = 0;
                ty = 0;
                kick();
            });
        });
    }

    /* ---------- 水波纹 ---------- */
    const RIPPLE_SELECTOR = [
        '.contact-item',
        '.qrcode-item',
        '.copy-mini',
        '.copy-btn',
        '.submit-btn',
        '.resume-download-btn',
        '.dev-modal-button',
        '.social-links a',
        '.back-to-top',
        '.btn',
        'nav a'
    ].join(',');

    function spawnRipple(e) {
        if (reducedMotion || e.button > 0) return;
        const host = e.target.closest(RIPPLE_SELECTOR);
        if (!host) return;

        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        host.classList.add('fx-ripple-host');

        const rect = host.getBoundingClientRect();
        const size = Math.hypot(rect.width, rect.height) * 2;
        const ripple = document.createElement('span');
        ripple.className = 'fx-ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
        ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
        host.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    /* ---------- 点击火花 ---------- */
    let sparkCanvas = null;
    let sparkCtx = null;
    let sparks = [];
    let sparkRunning = false;
    const SPARK_COLORS = ['#4facfe', '#00f2fe', '#7c8cff', '#f472b6', '#facc15'];

    function resizeSparks() {
        if (!sparkCanvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        sparkCanvas.width = Math.floor(window.innerWidth * dpr);
        sparkCanvas.height = Math.floor(window.innerHeight * dpr);
        sparkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawSparks(now) {
        sparkCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        sparks = sparks.filter(s => {
            const t = (now - s.born) / s.life;
            if (t >= 1) return false;
            const ease = 1 - Math.pow(1 - t, 3);
            const r1 = 6 + ease * s.dist;
            const r2 = r1 + (1 - t) * 10;
            sparkCtx.globalAlpha = 1 - t;
            sparkCtx.strokeStyle = s.color;
            sparkCtx.lineWidth = 2;
            sparkCtx.lineCap = 'round';
            sparkCtx.beginPath();
            sparkCtx.moveTo(s.x + Math.cos(s.angle) * r1, s.y + Math.sin(s.angle) * r1);
            sparkCtx.lineTo(s.x + Math.cos(s.angle) * r2, s.y + Math.sin(s.angle) * r2);
            sparkCtx.stroke();
            return true;
        });
        sparkCtx.globalAlpha = 1;

        if (sparks.length) {
            requestAnimationFrame(drawSparks);
        } else {
            sparkRunning = false;
            sparkCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    function spawnSparks(e) {
        // detail === 0 表示键盘触发的 click，不放火花
        if (reducedMotion || e.detail === 0) return;
        if (e.target.closest('input, textarea, select, label')) return;
        emitSparks(e.clientX, e.clientY, 8, 1);
    }

    function emitSparks(x, y, count, scale) {
        if (!sparkCanvas) {
            sparkCanvas = document.createElement('canvas');
            sparkCanvas.className = 'fx-sparks';
            sparkCanvas.setAttribute('aria-hidden', 'true');
            document.body.appendChild(sparkCanvas);
            sparkCtx = sparkCanvas.getContext('2d');
            if (!sparkCtx) return;
            resizeSparks();
            window.addEventListener('resize', resizeSparks);
        }

        if (!sparkCtx) return;

        const now = performance.now();
        const offset = Math.random() * Math.PI;
        for (let i = 0; i < count; i += 1) {
            sparks.push({
                x,
                y,
                angle: offset + (Math.PI * 2 * i) / count,
                dist: (18 + Math.random() * 14) * scale,
                life: (420 + Math.random() * 120) * Math.sqrt(scale),
                born: now,
                color: SPARK_COLORS[i % SPARK_COLORS.length]
            });
        }

        if (!sparkRunning) {
            sparkRunning = true;
            requestAnimationFrame(drawSparks);
        }
    }

    /* ==================== 触屏专属 ==================== */

    /* ---------- 按压反馈：按住下沉 + 卡片在手指处亮起 ---------- */
    const PRESS_SELECTOR = RIPPLE_SELECTOR + ',.info-item,.course-item,.tag';

    function initPress() {
        let pressed = null;
        let card = null;
        let timer = 0;
        let pressId = 0;

        function release() {
            clearTimeout(timer);
            timer = 0;
            if (pressed) pressed.classList.remove('is-pressed');
            if (card) card.classList.remove('is-touched');
            pressed = null;
            card = null;
        }

        document.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse') return;
            release();
            pressId += 1;
            const target = e.target.closest(PRESS_SELECTOR);
            const spot = e.target.closest('.fx-spot');
            if (!target && !spot) return;

            // 稍等一下再按下，手指只是在滑动页面时不会误触发
            timer = setTimeout(() => {
                timer = 0;
                if (spot) {
                    const rect = spot.getBoundingClientRect();
                    spot.style.setProperty('--fx-x', (e.clientX - rect.left) + 'px');
                    spot.style.setProperty('--fx-y', (e.clientY - rect.top) + 'px');
                    spot.classList.add('is-touched');
                    card = spot;
                }
                if (target && !reducedMotion) {
                    target.classList.add('fx-press', 'is-pressed');
                    pressed = target;
                }
            }, 60);
        }, { passive: true });

        document.addEventListener('pointerup', e => {
            if (e.pointerType === 'mouse') return;
            // 轻点很快时计时器还没触发：让它照常按下，稍后再弹回
            const id = pressId;
            setTimeout(() => { if (id === pressId) release(); }, timer ? 160 : 90);
        }, { passive: true });
        // 手指开始滑动页面时浏览器会发 pointercancel
        document.addEventListener('pointercancel', release, { passive: true });
    }

    /* ---------- 陀螺仪视差 + 摇一摇 ---------- */
    function celebrate() {
        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

        const avatar = document.querySelector('.profile-img');
        if (typeof window.FXCelebrate === 'function' && avatar) {
            const r = avatar.getBoundingClientRect();
            const visible = r.bottom > 0 && r.top < window.innerHeight;
            window.FXCelebrate(visible ? r.left + r.width / 2 : window.innerWidth / 2,
                visible ? r.top + r.height / 2 : window.innerHeight * 0.4);
            return;
        }

        if (reducedMotion) return;
        for (let i = 0; i < 6; i += 1) {
            setTimeout(() => {
                emitSparks(window.innerWidth * (0.2 + Math.random() * 0.6),
                    window.innerHeight * (0.2 + Math.random() * 0.5), 14, 2.6);
            }, i * 160);
        }
    }

    function initMotion() {
        const hasOrientation = 'DeviceOrientationEvent' in window;
        const hasMotion = 'DeviceMotionEvent' in window;
        if (finePointer || (!hasOrientation && !hasMotion)) return;

        const root = document.documentElement;
        let baseX = null;
        let baseY = null;
        let tx = 0;
        let ty = 0;
        let cx = 0;
        let cy = 0;
        let running = false;

        function loop() {
            cx += (tx - cx) * 0.08;
            cy += (ty - cy) * 0.08;
            root.style.setProperty('--fx-tilt-x', cx.toFixed(2) + 'px');
            root.style.setProperty('--fx-tilt-y', cy.toFixed(2) + 'px');
            if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
                requestAnimationFrame(loop);
            } else {
                running = false;
            }
        }

        function onOrientation(e) {
            if (e.beta == null || e.gamma == null) return;
            const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
            // 横屏时两个轴互换
            let x = e.gamma;
            let y = e.beta;
            if (angle === 90) { x = e.beta; y = -e.gamma; }
            if (angle === -90 || angle === 270) { x = -e.beta; y = e.gamma; }

            // 以"平时拿手机的角度"为中心，并缓慢跟随，换姿势后会自动回正
            if (baseX === null) { baseX = x; baseY = y; }
            baseX += (x - baseX) * 0.01;
            baseY += (y - baseY) * 0.01;

            const clamp = v => Math.max(-1, Math.min(1, v));
            tx = -clamp((x - baseX) / 25) * 22;
            ty = -clamp((y - baseY) / 25) * 22;
            if (!running) {
                running = true;
                requestAnimationFrame(loop);
            }
        }

        let last = null;
        let peaks = 0;
        let peakTimer = 0;
        let cooldown = 0;
        function onMotion(e) {
            const a = e.accelerationIncludingGravity;
            if (!a || a.x == null) return;
            if (last) {
                const dx = Math.abs(a.x - last.x);
                const dy = Math.abs(a.y - last.y);
                const dz = Math.abs(a.z - last.z);
                const strong = [dx, dy, dz].filter(d => d > 13).length >= 2;
                const now = Date.now();
                if (strong && now > cooldown) {
                    peaks += 1;
                    clearTimeout(peakTimer);
                    peakTimer = setTimeout(() => { peaks = 0; }, 600);
                    if (peaks >= 3) {
                        peaks = 0;
                        cooldown = now + 4000;
                        celebrate();
                    }
                }
            }
            last = { x: a.x, y: a.y, z: a.z };
        }

        function start() {
            if (hasOrientation && !reducedMotion) window.addEventListener('deviceorientation', onOrientation, { passive: true });
            if (hasMotion) window.addEventListener('devicemotion', onMotion, { passive: true });
        }

        // iOS 13+ 需要用户点一下后申请权限（且必须是 https）
        const needsPermission = (hasOrientation && typeof DeviceOrientationEvent.requestPermission === 'function') ||
            (hasMotion && typeof DeviceMotionEvent.requestPermission === 'function');

        if (!needsPermission) {
            start();
            return;
        }
        if (!window.isSecureContext) return;

        function ask(e) {
            // 点链接、按钮、输入框时不弹权限框，免得打断操作
            if (e.target.closest('a, button, input, textarea, select, label, [data-copy]')) return;
            document.removeEventListener('click', ask, true);
            const requests = [];
            if (hasMotion && DeviceMotionEvent.requestPermission) requests.push(DeviceMotionEvent.requestPermission());
            if (hasOrientation && DeviceOrientationEvent.requestPermission) requests.push(DeviceOrientationEvent.requestPermission());
            Promise.all(requests.map(p => p.catch(() => 'denied'))).then(results => {
                if (results.some(r => r === 'granted')) start();
            });
        }
        document.addEventListener('click', ask, true);
    }

    /* ---------- 手机菜单遮罩 ---------- */
    function initNavBackdrop() {
        const nav = document.getElementById('mainNav');
        if (!nav || !nav.parentNode) return;

        const backdrop = document.createElement('div');
        backdrop.className = 'fx-nav-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        nav.parentNode.insertBefore(backdrop, nav);

        const sync = () => backdrop.classList.toggle('is-on', nav.classList.contains('active'));
        new MutationObserver(sync).observe(nav, { attributes: true, attributeFilter: ['class'] });
        sync();
        // 点遮罩 = 点菜单外部，页面原有的"点外部关闭菜单"逻辑会处理
    }

    /* ---------- 主题切换：圆形扩散（theme.js 会调用） ---------- */
    window.FXThemeTransition = function (apply, x, y) {
        if (reducedMotion || typeof document.startViewTransition !== 'function') {
            apply();
            return;
        }
        const root = document.documentElement;
        const cx = typeof x === 'number' ? x : window.innerWidth / 2;
        const cy = typeof y === 'number' ? y : window.innerHeight / 2;
        const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
        root.style.setProperty('--fx-vt-x', cx + 'px');
        root.style.setProperty('--fx-vt-y', cy + 'px');
        root.style.setProperty('--fx-vt-r', radius + 'px');
        root.classList.add('fx-theme-switching');

        const transition = document.startViewTransition(apply);
        transition.finished.finally(() => root.classList.remove('fx-theme-switching'));
    };

    /* ---------- 启动 ---------- */
    onReady(() => {
        const converted = prepareFadeIns();
        initReveal(converted);
        initSkills();
        initTyping();
        initAmbient();
        initCards();
        initMagnetic();
        initPress();
        initMotion();
        initNavBackdrop();

        // 捕获阶段监听，页面里有些点击处理会 stopPropagation
        document.addEventListener('pointerdown', spawnRipple, true);
        document.addEventListener('click', spawnSparks, true);
    });
})();
