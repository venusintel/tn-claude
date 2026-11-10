(function () {
    "use strict";

    const root = document.documentElement;
    root.classList.add("js");
    const content = document.getElementById("content");
    const cards = Array.from(content.querySelectorAll(".card"));

    const COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
    const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

    /* ===== Theme (light / dark) ===== */
    function storageGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }

    /* เริ่มต้นด้วย Light Theme เสมอ เว้นแต่ผู้ใช้เคยกดเลือกธีมมืดไว้เอง */
    const THEME_KEY = "ts-theme";
    const savedTheme = storageGet(THEME_KEY);
    root.setAttribute("data-theme", savedTheme === "dark" ? "dark" : "light");

    document.getElementById("theme-toggle").addEventListener("click", function () {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        storageSet(THEME_KEY, next);
    });

    /* ===== Colour accent + step number per card ===== */
    const ACCENTS = [
        ["#6366f1", "#a855f7"], /* indigo → purple */
        ["#0ea5e9", "#22d3ee"], /* sky → cyan */
        ["#10b981", "#84cc16"], /* emerald → lime */
        ["#f59e0b", "#f97316"], /* amber → orange */
        ["#ec4899", "#f43f5e"], /* pink → rose */
        ["#8b5cf6", "#06b6d4"]  /* violet → cyan */
    ];

    function pad(n) { return n < 10 ? "0" + n : String(n); }

    cards.forEach(function (card, i) {
        const pair = ACCENTS[i % ACCENTS.length];
        card.style.setProperty("--accent", pair[0]);
        card.style.setProperty("--accent-2", pair[1]);

        const heading = card.querySelector("h3");
        if (!heading) return;
        const badge = document.createElement("span");
        badge.className = "step-num";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = pad(i + 1);
        heading.insertBefore(badge, heading.firstChild);
    });

    /* ===== Toast ===== */
    const toast = document.getElementById("toast");
    let toastTimer;
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1600);
    }

    /* ===== Clipboard ===== */
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand("copy") ? resolve() : reject();
            } catch (e) {
                reject(e);
            } finally {
                document.body.removeChild(ta);
            }
        });
    }

    function makeCopyButton(getText) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-btn";
        btn.innerHTML = COPY_ICON + "<span>Copy</span>";
        btn.setAttribute("aria-label", "คัดลอก");
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            copyText(getText()).then(function () {
                btn.classList.add("copied");
                btn.innerHTML = CHECK_ICON + "<span>Copied</span>";
                showToast("คัดลอกแล้ว");
                setTimeout(function () {
                    btn.classList.remove("copied");
                    btn.innerHTML = COPY_ICON + "<span>Copy</span>";
                }, 1500);
            }).catch(function () {
                showToast("คัดลอกไม่สำเร็จ");
            });
        });
        return btn;
    }

    /* Copy buttons for code blocks */
    content.querySelectorAll("pre").forEach(function (pre) {
        const wrap = document.createElement("div");
        wrap.className = "code-wrap";
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);
        wrap.appendChild(makeCopyButton(function () { return pre.textContent; }));
    });

    /* Copy buttons for links */
    content.querySelectorAll("a.link").forEach(function (a) {
        const row = document.createElement("div");
        row.className = "link-row";
        a.parentNode.insertBefore(row, a);
        row.appendChild(a);
        row.appendChild(makeCopyButton(function () { return a.textContent.trim(); }));
    });

    /* ===== Table of contents ===== */
    const tocList = document.getElementById("toc-list");
    const tocLinks = new Map();

    function slugify(text, index) {
        const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        return (slug || "section") + "-" + (index + 1);
    }

    cards.forEach(function (card, i) {
        const heading = card.querySelector("h3");
        if (!heading) return;
        const badge = heading.querySelector(".step-num");
        const title = Array.from(heading.childNodes)
            .filter(function (n) { return n !== badge; })
            .map(function (n) { return n.textContent; })
            .join("").trim();
        card.id = card.id || slugify(title, i);

        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#" + card.id;
        a.style.setProperty("--accent", card.style.getPropertyValue("--accent"));
        const num = document.createElement("span");
        num.className = "toc-num";
        num.textContent = badge ? badge.textContent : pad(i + 1);
        a.appendChild(num);
        a.appendChild(document.createTextNode(title));
        li.appendChild(a);
        tocList.appendChild(li);
        tocLinks.set(card, a);
    });

    /* Scrollspy */
    if ("IntersectionObserver" in window) {
        const spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                tocLinks.forEach(function (link) { link.classList.remove("active"); });
                const link = tocLinks.get(entry.target);
                if (link) {
                    link.classList.add("active");
                    link.scrollIntoView({ block: "nearest" });
                }
            });
        }, { rootMargin: "-90px 0px -65% 0px" });
        cards.forEach(function (card) { spy.observe(card); });

        /* Reveal on scroll */
        const reveal = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    reveal.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05 });
        cards.forEach(function (card) { reveal.observe(card); });
    } else {
        cards.forEach(function (card) { card.classList.add("visible"); });
    }

    /* ===== Search ===== */
    const search = document.getElementById("search");
    const noResults = document.getElementById("no-results");

    search.addEventListener("input", function () {
        const q = search.value.trim().toLowerCase();
        let shown = 0;
        cards.forEach(function (card) {
            const match = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
            card.hidden = !match;
            const link = tocLinks.get(card);
            if (link) link.parentElement.hidden = !match;
            if (match) {
                shown++;
                card.classList.add("visible");
            }
        });
        noResults.hidden = shown !== 0;
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "/" && document.activeElement !== search) {
            e.preventDefault();
            search.focus();
        } else if (e.key === "Escape" && document.activeElement === search) {
            search.value = "";
            search.dispatchEvent(new Event("input"));
            search.blur();
        }
    });

    /* ===== Back to top ===== */
    const toTop = document.getElementById("to-top");
    window.addEventListener("scroll", function () {
        toTop.classList.toggle("show", window.scrollY > 400);
    }, { passive: true });
    toTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
})();
