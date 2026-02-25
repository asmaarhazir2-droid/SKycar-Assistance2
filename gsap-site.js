(function () {
  function animateEntry() {
    if (!window.gsap) {
      return;
    }

    const targets = document.querySelectorAll(
      ".card, .assign-box, .tracking-box, .mission-box, .driver-box, .type-box, .payment-box"
    );

    if (targets.length > 0) {
      window.gsap.fromTo(
        targets,
        { opacity: 0, y: 24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: "power2.out", stagger: 0.08 }
      );
    }

    const headings = document.querySelectorAll("h1, h2");
    if (headings.length > 0) {
      window.gsap.fromTo(
        headings,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.05 }
      );
    }
  }

  function bindButtons() {
    if (!window.gsap) {
      return;
    }

    const buttons = document.querySelectorAll("button, .db-button, .export-btn, .save-btn");
    buttons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        window.gsap.to(button, { scale: 1.03, duration: 0.14, ease: "power1.out" });
      });

      button.addEventListener("mouseleave", () => {
        window.gsap.to(button, { scale: 1, duration: 0.14, ease: "power1.out" });
      });

      button.addEventListener("mousedown", () => {
        window.gsap.to(button, { scale: 0.97, duration: 0.08, ease: "power1.out" });
      });

      button.addEventListener("mouseup", () => {
        window.gsap.to(button, { scale: 1.03, duration: 0.08, ease: "power1.out" });
      });
    });
  }

  function bindInputs() {
    if (!window.gsap) {
      return;
    }

    const inputs = document.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.addEventListener("focus", () => {
        window.gsap.to(input, { y: -1, duration: 0.12, ease: "power1.out" });
      });

      input.addEventListener("blur", () => {
        window.gsap.to(input, { y: 0, duration: 0.12, ease: "power1.out" });
      });
    });
  }

  function bindViewAnimations() {
    if (!window.gsap) {
      return;
    }

    const views = document.querySelectorAll(".view");

    views.forEach((view) => {
      const observer = new MutationObserver(() => {
        if (!view.classList.contains("hidden")) {
          window.gsap.fromTo(
            view,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
          );
        }
      });

      observer.observe(view, { attributes: true, attributeFilter: ["class"] });
    });
  }

  function bindTableRowsAnimation() {
    if (!window.gsap) {
      return;
    }

    const tableBody = document.getElementById("trackingTableBody");
    if (!tableBody) {
      return;
    }

    const rowObserver = new MutationObserver(() => {
      const rows = tableBody.querySelectorAll("tr");
      if (rows.length === 0) {
        return;
      }

      window.gsap.fromTo(
        rows,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power1.out", stagger: 0.02 }
      );
    });

    rowObserver.observe(tableBody, { childList: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    animateEntry();
    bindButtons();
    bindInputs();
    bindViewAnimations();
    bindTableRowsAnimation();
  });
})();
