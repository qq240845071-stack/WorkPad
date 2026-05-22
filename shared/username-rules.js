(function initWorkpadUsername(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.WorkpadUsername = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorkpadUsername() {
  const DEFAULT_INITIAL_PASSWORD = "111111";

  const NAME_PINYIN_OVERRIDES = {
    周雯: "zhouwen",
    许畅: "xuchang",
    王黎: "wangli",
    刘珂: "liuke",
    陈敏: "chenmin",
    孙妍: "sunyan",
    贾涛: "jiatao",
    张莹: "zhangying",
    王勇: "wangyong",
    周丽梅: "zhoulimei",
    周立梅: "zhoulimei",
    温泉: "wenquan",
    王百万: "wangbaiwan",
  };

  const HAN_PINYIN = {
    陈: "chen",
    畅: "chang",
    贾: "jia",
    珂: "ke",
    黎: "li",
    丽: "li",
    立: "li",
    刘: "liu",
    梅: "mei",
    敏: "min",
    孙: "sun",
    涛: "tao",
    王: "wang",
    温: "wen",
    雯: "wen",
    泉: "quan",
    许: "xu",
    妍: "yan",
    勇: "yong",
    张: "zhang",
    周: "zhou",
    百: "bai",
    莹: "ying",
    万: "wan",
  };

  function textValue(value) {
    return String(value ?? "").trim();
  }

  function normalizeUsername(value) {
    return textValue(value).toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32);
  }

  function usernameFromName(name, fallback = "") {
    const raw = textValue(name).replace(/[·\s。,.，、_-]+/g, "");
    if (NAME_PINYIN_OVERRIDES[raw]) return NAME_PINYIN_OVERRIDES[raw];
    const converted = Array.from(raw).map((char) => {
      if (/^[a-z0-9]$/i.test(char)) return char.toLowerCase();
      return HAN_PINYIN[char] || "";
    }).join("");
    return normalizeUsername(converted) || normalizeUsername(fallback);
  }

  function defaultUsername(member = {}, index = 0) {
    const generated = usernameFromName(member.name);
    if (generated) return generated;
    const id = textValue(member.id).replace(/^user-/, "");
    if (/^[a-z0-9._-]{2,}$/i.test(id)) return id.toLowerCase();
    return `user${index + 1}`;
  }

  function makeUniqueUsername(baseUsername, isTaken) {
    const base = normalizeUsername(baseUsername) || "user";
    let candidate = base;
    let suffix = 2;
    while (isTaken(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function withGeneratedUsernames(members = []) {
    const used = new Set();
    return (Array.isArray(members) ? members : []).map((member, index) => {
      const username = makeUniqueUsername(defaultUsername(member, index), (candidate) => used.has(candidate));
      used.add(username);
      return { ...member, username };
    });
  }

  function previewUsernameForMember(members = [], draft = {}, currentId = "") {
    if (!textValue(draft.name)) return "";
    const sourceMembers = (Array.isArray(members) ? members : []).map((member) => ({ ...member }));
    const normalizedCurrentId = textValue(currentId);
    let targetIndex = sourceMembers.findIndex((member) => textValue(member.id) === normalizedCurrentId);
    if (targetIndex >= 0) {
      sourceMembers[targetIndex] = {
        ...sourceMembers[targetIndex],
        ...draft,
        id: sourceMembers[targetIndex].id || normalizedCurrentId || draft.id || "__draft__",
      };
    } else {
      targetIndex = sourceMembers.length;
      sourceMembers.push({ ...draft, id: draft.id || normalizedCurrentId || "__draft__" });
    }
    return withGeneratedUsernames(sourceMembers)[targetIndex]?.username || "";
  }

  return {
    DEFAULT_INITIAL_PASSWORD,
    defaultUsername,
    normalizeUsername,
    previewUsernameForMember,
    usernameFromName,
    withGeneratedUsernames,
  };
});
