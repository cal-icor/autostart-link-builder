// node test.js
const assert = require("assert");
const { buildAutostartLink } = require("./builder.js");

const hub = "https://gpu-demo.cloudbank.2i2c.cloud";

// What "Copy Permalink" produces (fancy-profiles 0.7.0 always writes autoStart "false").
const settings = { profile: "cpu-only", image: "00-base", autoStart: "false" };
const permalink = `${hub}/hub/login?next=/hub/spawn%23${new URLSearchParams({
  "fancy-forms-config": JSON.stringify(settings),
})}`;

// What the nbgitpuller Chrome extension produces (generator.js: generateRegularUrl).
const pull = new URL(hub);
pull.searchParams.set("repo", "https://github.com/ucb-dsus-adopters/materials-fds-v2");
pull.searchParams.set("branch", "main");
pull.pathname += "hub/user-redirect/git-pull";
pull.searchParams.set("urlpath", "lab/tree/materials-fds-v2");

// The link Sean tested on gpu-demo on 2026-10-09 ("link B").
const tested =
  "https://gpu-demo.cloudbank.2i2c.cloud/hub/login?next=/hub/spawn%3Fnext%3D%252Fhub%252Fuser-redirect%252Fgit-pull%253Frepo%253Dhttps%25253A%25252F%25252Fgithub.com%25252Fucb-dsus-adopters%25252Fmaterials-fds-v2%2526branch%253Dmain%2526urlpath%253Dlab%25252Ftree%25252Fmaterials-fds-v2%23fancy-forms-config%3D%257B%2522profile%2522%253A%2522cpu-only%2522%252C%2522image%2522%253A%252200-base%2522%252C%2522autoStart%2522%253A%2522true%2522%257D";

const out = buildAutostartLink(permalink, pull.toString());

// Decode both the same way the hub does and compare what they mean, since the
// extension orders query params differently from the hand-built link.
function meaning(link) {
  const spawn = new URL(link).searchParams.get("next");
  const [path, frag] = spawn.split("#");
  const pullPath = new URL("https://x" + path).searchParams.get("next");
  const p = new URL("https://x" + pullPath);
  return {
    spawnPath: path.split("?")[0],
    pullPath: p.pathname,
    repo: p.searchParams.get("repo"),
    branch: p.searchParams.get("branch"),
    urlpath: p.searchParams.get("urlpath"),
    settings: JSON.parse(new URLSearchParams(frag).get("fancy-forms-config")),
  };
}
assert.deepStrictEqual(meaning(out.link), meaning(tested));
assert.strictEqual(out.parts.settings.autoStart, "true");
console.log("ok  matches the tested gpu-demo link");

// A bare spawn permalink works too.
const bare = `${hub}/hub/spawn#${new URLSearchParams({ "fancy-forms-config": JSON.stringify(settings) })}`;
assert.deepStrictEqual(meaning(buildAutostartLink(bare, pull.toString()).link), meaning(tested));
console.log("ok  bare /hub/spawn# permalink");

// Mismatched hubs, a non-permalink, and a non-git-pull link are refused.
assert.throws(() => buildAutostartLink(permalink.replace("gpu-demo", "maine"), pull.toString()), /different hubs/);
assert.throws(() => buildAutostartLink(`${hub}/hub/spawn`, pull.toString()), /permalink/);
assert.throws(() => buildAutostartLink(permalink, `${hub}/hub/spawn`), /nbgitpuller/);
console.log("ok  refuses mismatched hubs and wrong inputs");

// Image-builder profiles get a warning.
const builder = { profile: "x", "image:binderRepo": "org/repo", autoStart: "false" };
const bp = `${hub}/hub/spawn#${new URLSearchParams({ "fancy-forms-config": JSON.stringify(builder) })}`;
assert.strictEqual(buildAutostartLink(bp, pull.toString()).warnings.length, 1);
console.log("ok  warns on image-builder profiles");
