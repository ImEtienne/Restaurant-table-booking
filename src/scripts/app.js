"use strict";

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const backToTop = document.querySelector(".bton");
if (backToTop) {
  window.addEventListener("scroll", () => {
    backToTop.style.display = window.scrollY > 200 ? "flex" : "none";
  });

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}

const hamburger = document.querySelector(".hamburger");
const navBar = document.querySelector(".nav-bar");
if (hamburger && navBar) {
  hamburger.addEventListener("click", () => {
    const isOpen = navBar.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", String(isOpen));
    hamburger.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
  });

  navBar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navBar.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "Ouvrir le menu");
    });
  });
}

const header = document.querySelector(".entete");
const logo = document.querySelector("#logo a");

function handleScroll() {
  header.classList.toggle("fixed-header", window.scrollY > 0);
}

if (header) {
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}
if (logo) {
  logo.addEventListener("click", () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}
