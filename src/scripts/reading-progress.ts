// Yazi sayfasinin ustundeki okuma ilerleme cubugu.
const bar = document.querySelector<HTMLElement>("[data-reading-progress]");
if (bar) {
  let scheduled = false;
  const update = () => {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    bar.style.transform = `scaleX(${progress})`;
    scheduled = false;
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  new ResizeObserver(schedule).observe(document.body);
  update();
}

export {};
