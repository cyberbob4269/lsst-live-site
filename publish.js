(function () {
  const API = "http://127.0.0.1:8767";
  const bridge = document.getElementById("bridge-status");
  const connectBtn = document.getElementById("connect-btn");
  const creatorCard = document.getElementById("creator-card");
  const creatorAvatar = document.getElementById("creator-avatar");
  const creatorName = document.getElementById("creator-name");
  const creatorHandle = document.getElementById("creator-handle");
  const privacy = document.getElementById("privacy");
  const publishBtn = document.getElementById("publish-btn");
  const publishStatus = document.getElementById("publish-status");

  async function api(path, options) {
    const res = await fetch(API + path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function setBridge(ok, msg) {
    bridge.textContent = msg;
    bridge.className = "status " + (ok ? "ok" : "err");
  }

  async function loadCreator() {
    const data = await api("/api/tiktok/me");
    const c = data.data || {};
    creatorCard.classList.add("visible");
    creatorAvatar.src = c.creator_avatar_url || "";
    creatorAvatar.alt = c.creator_nickname || "TikTok creator";
    creatorName.textContent = c.creator_nickname || "Connected";
    creatorHandle.textContent = c.creator_username ? "@" + c.creator_username : "";
    privacy.innerHTML = '<option value="">— select privacy —</option>';
    (c.privacy_level_options || []).forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt.replace(/_/g, " ").toLowerCase();
      privacy.appendChild(o);
    });
    publishBtn.disabled = false;
  }

  async function init() {
    try {
      const health = await api("/api/tiktok/health");
      if (!health.has_client_key) {
        setBridge(false, "Local bridge is running but TIKTOK_CLIENT_KEY is missing in .env");
        return;
      }
      setBridge(true, "Local publish bridge connected.");
      const cfg = await api("/api/tiktok/config");
      connectBtn.href = cfg.authorize_url;
      connectBtn.classList.remove("disabled");
      connectBtn.removeAttribute("aria-disabled");
      sessionStorage.setItem("tiktok_oauth_state", cfg.state);
      if (health.has_token) await loadCreator();
    } catch (e) {
      setBridge(false, "Start cosmic_tiktok_server.py on this PC, then reload.");
    }
  }

  publishBtn.addEventListener("click", async () => {
    const file = document.getElementById("video").files[0];
    const title = document.getElementById("title").value.trim();
    const level = privacy.value;
    if (!file) { publishStatus.textContent = "Choose a video file."; return; }
    if (!title) { publishStatus.textContent = "Enter a caption."; return; }
    if (!level) { publishStatus.textContent = "Select a privacy level."; return; }
    publishBtn.disabled = true;
    publishStatus.textContent = "Uploading via Content Posting API…";
    const form = new FormData();
    form.append("video", file);
    form.append("title", title);
    form.append("privacy_level", level);
    if (document.getElementById("disable-comment").checked) form.append("disable_comment", "1");
    try {
      const result = await api("/api/tiktok/publish", { method: "POST", body: form });
      const status = (result.data && result.data.status) || "submitted";
      publishStatus.className = "status ok";
      publishStatus.textContent = "Publish status: " + status;
    } catch (e) {
      publishStatus.className = "status err";
      publishStatus.textContent = e.message || String(e);
    } finally {
      publishBtn.disabled = false;
    }
  });

  if (new URLSearchParams(location.search).get("connected") === "1") {
    loadCreator().catch(() => {});
  }
  init();
})();
