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
    navBar.classList.toggle("active");
  });
}

const header = document.querySelector(".entete");
const hamburgerLines = document.querySelectorAll(".hamburger .line");
const logo = document.querySelector("#logo a");
const navLinks = document.querySelectorAll(".nav-bar .nav-links a");

function setNavColor(color) {
  navLinks.forEach((link) => {
    link.style.color = color;
  });
  hamburgerLines.forEach((line) => {
    line.style.backgroundColor = color;
  });
}

function handleScroll() {
  if (!header) return;

  if (window.scrollY > 0) {
    header.classList.add("fixed-header");
    const color = window.scrollY > 550 ? "#333" : "#fff";
    setNavColor(color);
    if (logo) logo.style.color = color;
  } else {
    header.classList.remove("fixed-header");
  }
}

if (header) window.addEventListener("scroll", handleScroll);
if (logo) {
  logo.addEventListener("click", () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}
