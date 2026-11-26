/* The reading panel on the map.

   Clicking a place opens its page in a panel on the left instead of leaving
   the map. The panel fetches the real page and shows its content, so there
   is only ever one copy of the words. Research articles open inside the panel
   too; the browser toys under /works/<piece>/ need the whole screen, so those
   still open as pages.                                                        */

const SECTION = { "/research/": "Research", "/works/": "Works", "/about/": "About", "/contact/": "Contact" };
const PLACE_OF = { "/research/": "lab", "/works/": "office", "/about/": "head", "/contact/": "house", "/works/talking/": "cinema", "/works/pixel-manifold/": "manifold", "/works/lores/": "easel" };
// pages that are articles (shown as they are), and live pieces (shown as a card: a clip and a "try it" button)
const ARTICLE = /^\/(research\/[^/]+|works\/talking)\/$/;
const PIECE = /^\/works\/[^/]+\/$/;

const inPanel = (url) => {
    if (url.origin !== location.origin) return false;
    const p = url.pathname.replace(/index\.html$/, "");
    return p in SECTION || ARTICLE.test(p) || PIECE.test(p);
};
const sectionOf = (path) => "/" + path.split("/")[1] + "/";

export function createPanel({ world }) {
    const el = document.getElementById("panel");
    const body = el.querySelector(".pb");
    const title = el.querySelector(".panel-title");
    const back = el.querySelector("[data-back]");
    const full = el.querySelector("[data-full]");
    const close = el.querySelector("[data-close]");
    const scoped = document.getElementById("panel-styles");
    const cache = new Map();
    let stack = [];

    const width = () => (el.getBoundingClientRect().width || 0);
    const isOpen = () => document.body.classList.contains("panel-open");

    async function fetchPage(path) {
        if (cache.has(path)) return cache.get(path);
        const res = await fetch(path, { credentials: "same-origin" });
        if (!res.ok) throw new Error(res.status);
        const doc = new DOMParser().parseFromString(await res.text(), "text/html");
        const main = doc.querySelector("main");
        // keep the words, drop the page furniture
        main.querySelectorAll(".head-face, #page-face, .crumb, .page-turn, nav.next, footer, script, .skip").forEach((n) => n.remove());
        main.querySelectorAll(".rise").forEach((n) => n.classList.add("in"));
        const css = Array.from(doc.querySelectorAll("head style")).map((s) => s.textContent).join("\n");
        const h1 = main.querySelector("h1");
        const out = { html: main.innerHTML, css, heading: h1 ? h1.textContent.trim() : "" };
        cache.set(path, out);
        return out;
    }

    // a live piece gets a card built from its row on the Works page
    async function pieceCard(path) {
        const key = "card:" + path;
        if (cache.has(key)) return cache.get(key);
        const res = await fetch("/works/", { credentials: "same-origin" });
        const doc = new DOMParser().parseFromString(await res.text(), "text/html");
        const row = Array.from(doc.querySelectorAll("a.row")).find((a) => a.getAttribute("href") === path || a.dataset.card === path);
        if (!row) throw new Error("no row");
        const t = (sel) => (row.querySelector(sel)?.textContent || "").trim();
        const kind = row.querySelector(".kind")?.firstChild?.textContent.trim() || "";
        const status = t(".status"), esc = (v) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
        const vid = row.dataset.video ? `<figure class="reel"><video src="${row.dataset.video}" poster="${row.dataset.poster || ""}" autoplay muted loop playsinline controls preload="metadata"></video><figcaption class="meta">${esc(row.dataset.caption || "Recorded off the screen, running live.")}</figcaption></figure>` : "";
        const html = `<div class="article-head"><p class="label">Works · ${esc(kind)}</p><h1 class="display"><em>${esc(t(".title"))}</em></h1><p class="dek">${esc(t(".line"))}</p></div>
            ${vid}
            <p class="try-row"><a class="try" href="${row.getAttribute("href")}"${/^https?:/.test(row.getAttribute("href")) ? ' target="_blank" rel="noopener"' : ""}>Try it live &rarr;</a><span class="meta">${esc(status)}. ${/^https?:/.test(row.getAttribute("href")) ? "Opens in a new tab." : "Opens full screen."}</span></p>`;
        const out = { html, css: "", heading: t(".title") };
        cache.set(key, out);
        return out;
    }

    async function show(path, { push = true } = {}) {
        const url = new URL(path, location.href);
        path = url.pathname.replace(/index\.html$/, "");
        if (push) stack.push(path);
        document.body.classList.add("panel-open");
        const sec = sectionOf(path);
        const isArticle = path !== sec;
        const isPiece = !ARTICLE.test(path) && PIECE.test(path);
        title.textContent = SECTION[sec] || "";
        back.hidden = stack.length < 2 && !isArticle;
        back.title = stack.length < 2 ? `Back to ${SECTION[sec]}` : "Back";
        full.href = path;
        el.setAttribute("aria-label", SECTION[sec] || "Panel");
        body.setAttribute("aria-busy", "true");
        world.setInset(width());
        world.lookAt(PLACE_OF[path] || PLACE_OF[sec] || "head", width());
        history.replaceState(null, "", "/?p=" + encodeURIComponent(path));
        try {
            const page = isPiece ? await pieceCard(path) : await fetchPage(path);
            if (stack[stack.length - 1] !== path) return;          // a newer click won
            scoped.textContent = page.css ? `.pb { ${page.css} }` : "";
            body.innerHTML = page.html;
            if (isArticle) title.textContent = page.heading || title.textContent;
            body.scrollTop = 0;
        } catch (e) {
            body.innerHTML = `<p class="pb-err">Couldn't load this here. <a href="${path}">Open the page</a> instead.</p>`;
        }
        body.removeAttribute("aria-busy");
        body.focus({ preventScroll: true });
    }

    function hide() {
        document.body.classList.remove("panel-open");
        stack = [];
        world.setInset(0);
        history.replaceState(null, "", "/");
    }

    back.addEventListener("click", () => {
        if (stack.length > 1) { stack.pop(); show(stack[stack.length - 1], { push: false }); }
        else if (stack.length === 1) { const sec = sectionOf(stack[0]); stack = [sec]; show(sec, { push: false }); }
    });
    close.addEventListener("click", hide);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) hide(); });

    // links inside the panel stay in the panel when they can
    body.addEventListener("click", (e) => {
        const a = e.target.closest("a[href]");
        if (a && a.dataset.card && !e.metaKey && !e.ctrlKey) { e.preventDefault(); e.stopPropagation(); show(a.dataset.card); return; }
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank" || a.classList.contains("try")) return;
        const url = new URL(a.href, location.href);
        if (!inPanel(url)) return;                                  // works pieces, mail, other sites: let them go
        e.preventDefault(); e.stopPropagation();
        show(url.pathname);
    }, true);

    // the places on the map and the travel bar open the panel
    document.querySelectorAll("a.spot, .w-hud a").forEach((a) => {
        a.addEventListener("click", (e) => {
            if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault(); e.stopPropagation();
            show(new URL(a.href).pathname);
        }, true);
    });

    window.addEventListener("resize", () => { if (isOpen()) world.setInset(width()); });

    // open straight to a page: /?p=/research/morphs/
    const start = new URLSearchParams(location.search).get("p");
    if (start && inPanel(new URL(start, location.href))) show(start);

    return { show, hide };
}
