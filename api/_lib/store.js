const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createDefaultState } = require("./demo-state");

const BLOB_PATHNAME = "workpad/state.json";

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeState(rawState) {
  const seed = createDefaultState();
  const state = rawState && typeof rawState === "object" ? rawState : {};
  return {
    version: 1,
    projects: Array.isArray(state.projects) && state.projects.length ? state.projects : seed.projects,
    teamMembers: Array.isArray(state.teamMembers) && state.teamMembers.length ? state.teamMembers : seed.teamMembers,
    permissionRows: Array.isArray(state.permissionRows) && state.permissionRows.length ? state.permissionRows : seed.permissionRows,
    partners: Array.isArray(state.partners) && state.partners.length ? state.partners : seed.partners,
    workflowConfig: Array.isArray(state.workflowConfig) && state.workflowConfig.length ? state.workflowConfig : seed.workflowConfig,
    currentUserId: state.currentUserId || seed.currentUserId,
    wecomInbox: Array.isArray(state.wecomInbox) ? state.wecomInbox.slice(0, 200) : [],
  };
}

function resolveLocalFile() {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      storageMode: "vercel-tmp",
      persistence: "ephemeral",
      filePath: path.join(os.tmpdir(), "workpad-state.json"),
    };
  }
  return {
    storageMode: "local-file",
    persistence: "persistent",
    filePath: path.join(process.cwd(), "data", "workpad-state.json"),
  };
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readLocalFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return "";
    throw error;
  }
}

async function writeLocalFile(filePath, content) {
  await ensureDir(filePath);
  const tempPath = `${filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

async function readBlobText() {
  const { get } = await import("@vercel/blob");
  const result = await get(BLOB_PATHNAME, { access: "private" });
  if (!result || !result.stream) return "";
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  return buffer.toString("utf8");
}

async function writeBlobText(content) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, content, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    allowOverwrite: true,
  });
}

async function readStoredState() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const raw = await readBlobText();
    if (!raw) {
      const seed = createDefaultState();
      await writeBlobText(JSON.stringify(seed, null, 2));
      return {
        state: seed,
        meta: {
          storageMode: "vercel-blob",
          persistence: "persistent",
          updatedAt: nowIso(),
        },
      };
    }
    return {
      state: normalizeState(JSON.parse(raw)),
      meta: {
        storageMode: "vercel-blob",
        persistence: "persistent",
        updatedAt: nowIso(),
      },
    };
  }

  const { storageMode, persistence, filePath } = resolveLocalFile();
  const raw = await readLocalFile(filePath);
  if (!raw) {
    const seed = createDefaultState();
    await writeLocalFile(filePath, JSON.stringify(seed, null, 2));
    return {
      state: seed,
      meta: { storageMode, persistence, updatedAt: nowIso() },
    };
  }
  return {
    state: normalizeState(JSON.parse(raw)),
    meta: { storageMode, persistence, updatedAt: nowIso() },
  };
}

async function writeStoredState(nextState) {
  const normalized = normalizeState(clone(nextState));
  const content = JSON.stringify(normalized, null, 2);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlobText(content);
    return {
      state: normalized,
      meta: {
        storageMode: "vercel-blob",
        persistence: "persistent",
        updatedAt: nowIso(),
      },
    };
  }

  const { storageMode, persistence, filePath } = resolveLocalFile();
  await writeLocalFile(filePath, content);
  return {
    state: normalized,
    meta: { storageMode, persistence, updatedAt: nowIso() },
  };
}

async function resetStoredState() {
  return writeStoredState(createDefaultState());
}

module.exports = {
  readStoredState,
  writeStoredState,
  resetStoredState,
  normalizeState,
};
