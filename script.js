/* =========================================================
   BâtirPlus – Interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  /* ---------- Stockage sécurisé ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }
  };

  /* ---------- Année du footer ---------- */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Ombre du header au scroll ---------- */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const burger = $("#burger");
  const nav = $("#nav");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    burger.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
    document.body.classList.toggle("no-scroll", open);
    burger.style.position = open ? "relative" : "";
    burger.style.zIndex = open ? "80" : "";
  };
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$(".nav__link[href], .dropdown__menu a", nav).forEach((a) =>
    a.addEventListener("click", () => setMenu(false))
  );

  /* ---------- Dropdowns (Produits / Langue) ---------- */
  const dropdowns = $$(".dropdown");
  dropdowns.forEach((dd) => {
    const trigger = $(":scope > button", dd);
    if (!trigger) return;
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !dd.classList.contains("is-open");
      dropdowns.forEach((d) => {
        d.classList.remove("is-open");
        const t = $(":scope > button", d);
        if (t) t.setAttribute("aria-expanded", "false");
      });
      dd.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
    });
  });
  document.addEventListener("click", () => dropdowns.forEach((d) => d.classList.remove("is-open")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { dropdowns.forEach((d) => d.classList.remove("is-open")); setMenu(false); }
  });

  // Sélecteur de langue (démonstration)
  $$("[data-lang]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const label = $(".lang__btn strong");
      label.textContent = btn.dataset.lang;
      toast(btn.dataset.lang === "FR" ? "Langue : Français" : "Language: English (demo)");
    })
  );

  /* ---------- Lien actif au scroll ---------- */
  const links = $$(".nav__link[href^='#']");
  const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id));
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Panier ---------- */
  const cartBadge = $("#cartCount");
  let cart = Number(store.get("bp-cart", 0)) || 0;
  const renderCart = (animate) => {
    cartBadge.textContent = cart;
    if (animate) {
      cartBadge.classList.remove("bump");
      void cartBadge.offsetWidth;
      cartBadge.classList.add("bump");
    }
  };
  renderCart(false);

  $$(".product .add").forEach((btn) =>
    btn.addEventListener("click", () => {
      cart += 1;
      store.set("bp-cart", cart);
      renderCart(true);
      const name = btn.closest(".product").dataset.name;
      toast(`${name} ajouté au panier`);
    })
  );

  /* ---------- Favoris ---------- */
  const wishHeader = $("#wishHeader");
  let wishes = new Set(store.get("bp-wishes", []));
  const renderWishes = () => {
    $$(".product").forEach((p) => $(".product__wish", p).classList.toggle("is-active", wishes.has(p.dataset.name)));
    wishHeader.classList.toggle("is-active", wishes.size > 0);
  };
  renderWishes();

  $$(".product__wish").forEach((btn) =>
    btn.addEventListener("click", () => {
      const name = btn.closest(".product").dataset.name;
      if (wishes.has(name)) { wishes.delete(name); toast("Retiré des favoris"); }
      else { wishes.add(name); toast("Ajouté aux favoris"); }
      store.set("bp-wishes", [...wishes]);
      renderWishes();
    })
  );
  wishHeader.addEventListener("click", () =>
    toast(wishes.size ? `${wishes.size} produit(s) en favoris` : "Vous n'avez pas encore de favoris")
  );

  /* ---------- Slider produits ---------- */
  const slider = $("#slider");
  const prev = $("#prev");
  const next = $("#next");
  const updateArrows = () => {
    const max = slider.scrollWidth - slider.clientWidth - 2;
    prev.disabled = slider.scrollLeft <= 2;
    next.disabled = slider.scrollLeft >= max;
  };
  const step = () => {
    const card = $(".product:not([hidden])", slider);
    return card ? card.getBoundingClientRect().width + 16 : slider.clientWidth;
  };
  prev.addEventListener("click", () => slider.scrollBy({ left: -step(), behavior: "smooth" }));
  next.addEventListener("click", () => slider.scrollBy({ left: step(), behavior: "smooth" }));
  slider.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  updateArrows();

  /* ---------- Recherche (filtre des produits) ---------- */
  const empty = $("#empty");
  const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const runSearch = (query) => {
    const q = normalize(query.trim());
    let visible = 0;
    $$(".product", slider).forEach((p) => {
      const match = !q || normalize(p.dataset.name).includes(q);
      p.hidden = !match;
      if (match) visible += 1;
    });
    empty.hidden = visible !== 0;
    slider.scrollTo({ left: 0 });
    updateArrows();
    $("#produits").scrollIntoView({ behavior: "smooth" });
    if (q) toast(visible ? `${visible} produit(s) trouvé(s)` : "Aucun résultat");
  };
  ["#headerSearch", "#heroSearch"].forEach((sel) => {
    const form = $(sel);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = $("input", form).value;
      // Synchronise les deux champs
      $$("#headerSearch input, #heroSearch input").forEach((i) => (i.value = value));
      runSearch(value);
    });
  });

  /* ---------- Newsletter ---------- */
  const newsForm = $("#newsletter");
  const newsMsg = $("#newsMsg");
  newsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("input", newsForm);
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    newsMsg.className = "news__msg " + (ok ? "ok" : "err");
    newsMsg.textContent = ok ? "Merci ! Vous êtes bien inscrit(e)." : "Veuillez saisir une adresse email valide.";
    if (ok) newsForm.reset();
  });

  /* ---------- Animations d'apparition ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const i = reveals.indexOf(en.target);
          en.target.style.transitionDelay = `${(i % 6) * 70}ms`;
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Images manquantes ---------- */
  $$("img").forEach((img) => {
    const hide = () => img.classList.add("is-broken");
    img.addEventListener("error", hide);
    if (img.complete && img.naturalWidth === 0) hide();
  });
})();
