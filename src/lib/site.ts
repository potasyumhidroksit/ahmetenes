export const site = {
  name: "Ahmet Enes",
  email: "info@ahmetenes.com",
  instagram: "eneswideshut",
  services: {
    sinedexter: {
      base: "https://sinedexter.ahmetenes.com",
      stats: "https://sinedexter.ahmetenes.com/api/stats",
    },
    pulse: {
      base: "https://s.ahmetenes.com",
      status: process.env.PULSE_STATUS_URL || "https://s.ahmetenes.com/api/status",
    },
  },
};
