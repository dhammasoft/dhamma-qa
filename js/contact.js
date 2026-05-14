document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");

  if (!form || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Sending message...";

    const data = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
    };

    try {
      // Replace this URL with your actual form endpoint when ready.
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      status.textContent = "Message sent successfully. We will contact you soon.";
      form.reset();
    } catch (error) {
      status.textContent = "Unable to send message right now. Please try again later.";
      console.error(error);
    }
  });
});
