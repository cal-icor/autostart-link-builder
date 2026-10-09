// Combine a fancy-profiles permalink with an nbgitpuller link into one link
// that logs in, fills the spawn form, starts the server on its own, and then
// pulls the repository.
//
// No slugs or option names are typed by hand: they are read out of the
// permalink the hub generated ("Copy Permalink"), so they always match.

const CONFIG_PARAM = "fancy-forms-config";

// The fancy-profiles settings, from a permalink in any of the shapes the hub
// produces: /hub/login?...next=/hub/spawn%23fancy-forms-config=..., or a bare
// /hub/spawn#fancy-forms-config=...
function parsePermalink(permalink) {
  const url = new URL(permalink.trim());
  let fragment = url.hash.replace(/^#/, "");
  if (!fragment.includes(CONFIG_PARAM)) {
    const next = url.searchParams.get("next") || "";
    fragment = next.includes("#") ? next.slice(next.indexOf("#") + 1) : "";
  }
  const raw = new URLSearchParams(fragment).get(CONFIG_PARAM);
  if (!raw) {
    throw new Error("This doesn't look like a fancy-profiles permalink (no fancy-forms-config in it).");
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    throw new Error("The permalink's settings could not be read; copy it again from the hub.");
  }
  return { origin: url.origin, config };
}

// The nbgitpuller target, from a link like
// https://<hub>/hub/user-redirect/git-pull?repo=...&branch=...&urlpath=...
function parseGitPuller(link) {
  const url = new URL(link.trim());
  if (!url.pathname.endsWith("/git-pull")) {
    throw new Error("This doesn't look like an nbgitpuller link (it should go to /hub/user-redirect/git-pull).");
  }
  if (!url.searchParams.get("repo")) {
    throw new Error("The nbgitpuller link has no repo in it.");
  }
  return { origin: url.origin, path: url.pathname + url.search, url };
}

// Characters that encodeURIComponent escapes but the tested links leave as-is.
function encode(value) {
  return encodeURIComponent(value).replace(/%2F/g, "/");
}

function buildAutostartLink(permalink, gitPullLink) {
  const perm = parsePermalink(permalink);
  const pull = parseGitPuller(gitPullLink);
  if (perm.origin !== pull.origin) {
    throw new Error(
      `The two links are for different hubs (${perm.origin} and ${pull.origin}). Use a permalink from the same hub.`
    );
  }

  const config = { ...perm.config, autoStart: "true" };
  const warnings = [];
  if (Object.keys(config).some((k) => /:(binderRepo|binderProvider|ref)$/.test(k))) {
    warnings.push(
      "This profile uses the custom image builder. Autostart can skip itself when the builder needs input, so test the link before sharing it."
    );
  }

  const fragment = new URLSearchParams({ [CONFIG_PARAM]: JSON.stringify(config) }).toString();
  const spawn = `/hub/spawn?next=${encodeURIComponent(pull.path)}#${fragment}`;
  const link = `${perm.origin}/hub/login?next=${encode(spawn)}`;

  return {
    link,
    warnings,
    parts: {
      hub: perm.origin,
      repo: pull.url.searchParams.get("repo"),
      branch: pull.url.searchParams.get("branch") || "(default branch)",
      opens: pull.url.searchParams.get("urlpath") || "(hub default)",
      settings: config,
    },
  };
}

if (typeof module !== "undefined") {
  module.exports = { parsePermalink, parseGitPuller, buildAutostartLink };
}
