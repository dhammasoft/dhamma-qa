async function fetchJson(file) {
  try {
    const response = await fetch(`content/${file}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${file}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

function renderCards(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items
    .map((item) => `
      <div>
        <h3>${item.title || item.name}</h3>
        <p>${item.description || item.bio || item.quote}</p>
        ${item.author ? `<p class="muted">— ${item.author}</p>` : ""}
        ${item.role ? `<p class="muted">${item.role}</p>` : ""}
      </div>
    `)
    .join("");
}

window.addEventListener("DOMContentLoaded", async () => {
  const services = await fetchJson("services.json");
  const team = await fetchJson("team.json");
  const testimonials = await fetchJson("testimonials.json");

  renderCards(services, "service-list");
  renderCards(team, "team-list");
  renderCards(testimonials, "testimonial-list");
});
