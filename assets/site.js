// Small game-ish behaviours shared by every page.
(function () {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    // ── Lores mode: the Konami code turns the site into a Game Boy ──
    if (localStorage.getItem("lores") === "1") root.classList.add("gb");
    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let k = 0;
    function toast(text) {
        const t = document.createElement("div");
        t.className = "toast";
        t.textContent = text;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2600);
    }
    window.addEventListener("keydown", (e) => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        k = key === KONAMI[k] ? k + 1 : (key === KONAMI[0] ? 1 : 0);
        if (k === KONAMI.length) {
            k = 0;
            const on = root.classList.toggle("gb");
            localStorage.setItem("lores", on ? "1" : "0");
            document.dispatchEvent(new Event("lores"));
            toast(on ? "LORES MODE ON" : "LORES MODE OFF");
        }
    });

    // ── reveal on scroll ──
    const els = document.querySelectorAll(".rise");
    if (!("IntersectionObserver" in window)) {
        els.forEach((el) => el.classList.add("in"));
    } else {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("in");
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
        els.forEach((el) => obs.observe(el));
    }

    // ── lists are game menus: arrow keys move the cursor, Enter opens ──
    const rows = Array.from(document.querySelectorAll(".index .row"));
    if (rows.length) {
        window.addEventListener("keydown", (e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            if (e.target.closest && e.target.closest("input, textarea, select")) return;
            const i = rows.indexOf(document.activeElement);
            const next = e.key === "ArrowDown" ? (i < 0 ? 0 : Math.min(rows.length - 1, i + 1)) : (i <= 0 ? 0 : i - 1);
            e.preventDefault();
            rows[next].focus();
            rows[next].scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
        });
    }

    // ── an XP bar: how far down the page you've read ──
    const mast = document.querySelector(".masthead");
    if (mast) {
        const bar = document.createElement("div");
        bar.className = "xp";
        bar.setAttribute("aria-hidden", "true");
        mast.appendChild(bar);
        const step = () => {
            const max = document.documentElement.scrollHeight - innerHeight;
            const p = max > 0 ? Math.min(1, scrollY / max) : 0;
            bar.style.setProperty("--xp", (Math.round(p * 40) / 40).toFixed(3));   // 40 chunky steps
        };
        addEventListener("scroll", step, { passive: true });
        addEventListener("resize", step);
        step();
    }

    // ── page changes dissolve in blocks, like an old game between scenes ──
    const B = 32;
    function blocks(cover, done) {
        const c = document.createElement("canvas");
        c.className = "wipe";
        const w = Math.ceil(innerWidth / B), h = Math.ceil(innerHeight / B);
        c.width = w; c.height = h;
        document.body.appendChild(c);
        const ctx = c.getContext("2d");
        const ink = getComputedStyle(root).getPropertyValue("--ink").trim() || "#17140f";
        ctx.fillStyle = ink;
        if (!cover) ctx.fillRect(0, 0, w, h);
        const order = [];
        for (let i = 0; i < w * h; i++) order.push(i);
        for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
        const per = Math.ceil(order.length / 9);
        let n = 0;
        (function tick() {
            for (let m = 0; m < per && n < order.length; m++, n++) {
                const x = order[n] % w, y = (order[n] / w) | 0;
                if (cover) ctx.fillRect(x, y, 1, 1); else ctx.clearRect(x, y, 1, 1);
            }
            if (n < order.length) requestAnimationFrame(tick);
            else if (done) done(c);
        })();
    }
    if (!reduced) {
        if (sessionStorage.getItem("wipe") === "1") {
            sessionStorage.removeItem("wipe");
            blocks(false, (c) => c.remove());
        }
        document.addEventListener("click", (e) => {
            const a = e.target.closest && e.target.closest("a[href]");
            if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (a.target === "_blank" || a.hasAttribute("download")) return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin || url.protocol.startsWith("mailto")) return;
            if (url.pathname === location.pathname && url.hash) return;
            e.preventDefault();
            sessionStorage.setItem("wipe", "1");
            blocks(true, () => { location.href = url.href; });
        });
        addEventListener("pageshow", (e) => { if (e.persisted) document.querySelectorAll(".wipe").forEach((c) => c.remove()); });
    }
})();
