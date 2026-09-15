// Reveal-on-scroll for elements marked .rise. The html.js class is set inline
// in <head> so content is only hidden when this script can show it again.
(function () {
    const els = document.querySelectorAll(".rise");
    if (!("IntersectionObserver" in window)) {
        els.forEach((el) => el.classList.add("in"));
        return;
    }
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("in");
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => obs.observe(el));
})();
