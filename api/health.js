const { readStoredState } = require("./_lib/store");

module.exports = async (_req, res) => {
  try {
    const snapshot = await readStoredState();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: true,
      service: "workpad-api",
      projectCount: snapshot.state.projects.length,
      teamCount: snapshot.state.teamMembers.length,
      storageMode: snapshot.meta.storageMode,
      persistence: snapshot.meta.persistence,
      updatedAt: snapshot.meta.updatedAt,
    }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      service: "workpad-api",
      message: "健康检查失败。",
      error: error instanceof Error ? error.message : String(error),
    }));
  }
};
