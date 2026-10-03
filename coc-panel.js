// ===================================================================
// COC 七版人物面板模块
// ===================================================================

const COC_STANDARD_SKILLS = [
  { name: "侦查", base: 25 },
  { name: "聆听", base: 20 },
  { name: "心理学", base: 10 },
  { name: "急救", base: 30 },
  { name: "潜行", base: 20 },
  { name: "图书馆使用", base: 20 },
  { name: "话术", base: 5 },
  { name: "恐吓", base: 15 },
  { name: "说服", base: 10 },
  { name: "闪避", base: 25 },
  { name: "撬锁", base: 1 },
  { name: "格斗", base: 25 },
  { name: "射击", base: 20 },
  { name: "医学", base: 1 },
  { name: "神秘学", base: 5 },
  { name: "信用评级", base: 0 },
  { name: "魅惑", base: 15 },
  { name: "攀爬", base: 20 },
  { name: "跳跃", base: 20 },
  { name: "投掷", base: 20 },
  { name: "游泳", base: 20 },
  { name: "追踪", base: 10 },
  { name: "妙手", base: 10 },
  { name: "伪装", base: 5 },
  { name: "汽车驾驶", base: 20 },
  { name: "骑术", base: 5 },
  { name: "机械维修", base: 10 },
  { name: "电气维修", base: 10 },
  { name: "计算机使用", base: 5 },
  { name: "会计", base: 5 },
  { name: "估价", base: 5 },
  { name: "人类学", base: 1 },
  { name: "考古学", base: 1 },
  { name: "历史", base: 5 },
  { name: "法律", base: 5 },
  { name: "自然学", base: 10 },
  { name: "领航", base: 10 },
  { name: "生存", base: 10 },
  { name: "科学", base: 1 },
  { name: "电子学", base: 1 },
  { name: "重型机械", base: 1 },
  { name: "精神分析", base: 1 },
  { name: "克苏鲁神话", base: 0 }
];

const DEFAULT_COC_SKILLS = {};
COC_STANDARD_SKILLS.forEach(s => {
  DEFAULT_COC_SKILLS[s.name] = s.base;
});
window.DEFAULT_COC_SKILLS = DEFAULT_COC_SKILLS;

function getSkillBaseValue(skillName, stats = {}) {
  if (skillName === "闪避") {
    const dex = parseInt(stats.dex, 10);
    return !isNaN(dex) ? Math.floor(dex / 2) : 25;
  }
  const found = COC_STANDARD_SKILLS.find(s => s.name === skillName);
  return found ? found.base : 0;
}

function getDefaultCocData() {
  const defaultStats = {
    str: 50,
    dex: 50,
    con: 50,
    pow: 50,
    siz: 50,
    edu: 50,
    app: 50,
    int: 50,
    luk: 50
  };

  const defaultSkills = {};
  COC_STANDARD_SKILLS.forEach(s => {
    defaultSkills[s.name] = s.name === "闪避" ? Math.floor(defaultStats.dex / 2) : s.base;
  });

  return {
    stats: defaultStats,
    calculated: {
      hp: 10,
      maxHp: 10,
      mp: 10,
      maxMp: 10,
      san: 50,
      maxSan: 99,
      db: "0",
      build: 0
    },
    skills: defaultSkills,
    customSkills: [],
    totalPoints: 0
  };
}

function calculateCocStats(stats, prevCalc = {}) {
  const str = parseInt(stats.str, 10) || 0;
  const dex = parseInt(stats.dex, 10) || 0;
  const con = parseInt(stats.con, 10) || 0;
  const pow = parseInt(stats.pow, 10) || 0;
  const siz = parseInt(stats.siz, 10) || 0;

  const maxHp = Math.max(1, Math.floor((con + siz) / 10));
  const maxMp = Math.max(0, Math.floor(pow / 5));
  const maxSan = 99;

  let hp = typeof prevCalc.hp === "number" ? Math.min(prevCalc.hp, maxHp) : maxHp;
  let mp = typeof prevCalc.mp === "number" ? Math.min(prevCalc.mp, maxMp) : maxMp;
  let san = typeof prevCalc.san === "number" ? Math.min(prevCalc.san, maxSan) : Math.min(pow, maxSan);

  const totalStrSiz = str + siz;
  let db = "0";
  let build = 0;

  if (totalStrSiz <= 64) {
    db = "-2";
    build = -2;
  } else if (totalStrSiz <= 84) {
    db = "-1";
    build = -1;
  } else if (totalStrSiz <= 124) {
    db = "0";
    build = 0;
  } else if (totalStrSiz <= 164) {
    db = "+1D4";
    build = 1;
  } else if (totalStrSiz <= 204) {
    db = "+1D6";
    build = 2;
  } else if (totalStrSiz <= 284) {
    db = "+2D6";
    build = 3;
  } else if (totalStrSiz <= 364) {
    db = "+3D6";
    build = 4;
  } else {
    const extra = Math.floor((totalStrSiz - 365) / 80) + 1;
    db = `+${4 + extra}D6`;
    build = 5 + extra;
  }

  return {
    hp,
    maxHp,
    mp,
    maxMp,
    san,
    maxSan,
    db,
    build
  };
}

class CocPanel {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.data = getDefaultCocData();
    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="coc-panel-wrapper">
        <div class="coc-panel-header">
          <span class="coc-panel-title">面板</span>
          <span class="coc-total-badge">总加点数: <span class="coc-top-points">0</span></span>
        </div>

        <div class="coc-section-label">属性</div>
        <div class="coc-stats-grid">
          <div class="coc-stat-item"><label>力量</label><input type="number" class="coc-stat-input" data-stat="str" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>敏捷</label><input type="number" class="coc-stat-input" data-stat="dex" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>体质</label><input type="number" class="coc-stat-input" data-stat="con" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>意志</label><input type="number" class="coc-stat-input" data-stat="pow" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>体型</label><input type="number" class="coc-stat-input" data-stat="siz" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>教育</label><input type="number" class="coc-stat-input" data-stat="edu" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>外貌</label><input type="number" class="coc-stat-input" data-stat="app" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>智力</label><input type="number" class="coc-stat-input" data-stat="int" value="50" min="0" max="999"></div>
          <div class="coc-stat-item"><label>幸运</label><input type="number" class="coc-stat-input" data-stat="luk" value="50" min="0" max="999"></div>
        </div>

        <div class="coc-section-label">数值</div>
        <div class="coc-values-grid">
          <div class="coc-value-item">
            <div class="coc-value-label">HP</div>
            <div class="coc-value-num coc-val-hp">10/10</div>
          </div>
          <div class="coc-value-item">
            <div class="coc-value-label">MP</div>
            <div class="coc-value-num coc-val-mp">10/10</div>
          </div>
          <div class="coc-value-item">
            <div class="coc-value-label">SAN</div>
            <div class="coc-value-num coc-val-san">50/99</div>
          </div>
          <div class="coc-value-item">
            <div class="coc-value-label">DB</div>
            <div class="coc-value-num coc-val-db">0</div>
          </div>
        </div>

        <button type="button" class="moe-btn-secondary coc-open-skills-modal-btn" style="width: 100%; margin: 6px 0;">技能面板</button>
      </div>
    `;

    this.updateCalculatedUI();
    this.updateTotalPoints();
  }

  bindEvents() {
    this.container.querySelectorAll(".coc-stat-input").forEach(input => {
      input.addEventListener("input", () => {
        const stat = input.dataset.stat;
        this.data.stats[stat] = parseInt(input.value, 10) || 0;
        this.data.calculated = calculateCocStats(this.data.stats, this.data.calculated);
        this.updateCalculatedUI();

        // 敏捷变化时，若闪避没有加点，更新闪避初始值
        if (stat === "dex") {
          const dodgeBase = Math.floor(this.data.stats.dex / 2);
          const currentDodge = this.data.skills["闪避"];
          const prevBase = getSkillBaseValue("闪避", { dex: 50 });
          if (typeof currentDodge === "undefined" || currentDodge === prevBase) {
            this.data.skills["闪避"] = dodgeBase;
          }
        }
      });
    });

    const openBtn = this.container.querySelector(".coc-open-skills-modal-btn");
    if (openBtn) {
      openBtn.addEventListener("click", (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        openCocSkillsModal(this);
      });
    }
  }

  updateCalculatedUI() {
    const calc = this.data.calculated || calculateCocStats(this.data.stats);
    const hpEl = this.container.querySelector(".coc-val-hp");
    const mpEl = this.container.querySelector(".coc-val-mp");
    const sanEl = this.container.querySelector(".coc-val-san");
    const dbEl = this.container.querySelector(".coc-val-db");

    if (hpEl) hpEl.textContent = `${calc.hp}/${calc.maxHp}`;
    if (mpEl) mpEl.textContent = `${calc.mp}/${calc.maxMp}`;
    if (sanEl) sanEl.textContent = `${calc.san}/${calc.maxSan}`;
    if (dbEl) dbEl.textContent = `${calc.db}`;
  }

  updateTotalPoints() {
    let total = 0;
    if (this.data.skills) {
      Object.entries(this.data.skills).forEach(([name, val]) => {
        const base = getSkillBaseValue(name, this.data.stats);
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > base) {
          total += (num - base);
        }
      });
    }
    this.data.totalPoints = total;

    const topPoints = this.container.querySelector(".coc-top-points");
    if (topPoints) topPoints.textContent = total;
  }

  setData(data) {
    const defaultData = getDefaultCocData();
    if (!data) {
      this.data = defaultData;
    } else {
      this.data = {
        stats: { ...defaultData.stats, ...(data.stats || {}) },
        calculated: { ...defaultData.calculated, ...(data.calculated || {}) },
        skills: { ...defaultData.skills, ...(data.skills || {}) },
        customSkills: Array.isArray(data.customSkills) ? [...data.customSkills] : [],
        totalPoints: data.totalPoints || 0
      };
    }

    this.container.querySelectorAll(".coc-stat-input").forEach(input => {
      const stat = input.dataset.stat;
      input.value = this.data.stats[stat] || 50;
    });

    this.data.calculated = calculateCocStats(this.data.stats, this.data.calculated);
    this.updateCalculatedUI();
    this.updateTotalPoints();
  }

  getData() {
    this.container.querySelectorAll(".coc-stat-input").forEach(input => {
      const stat = input.dataset.stat;
      this.data.stats[stat] = parseInt(input.value, 10) || 0;
    });
    this.data.calculated = calculateCocStats(this.data.stats, this.data.calculated);
    this.updateTotalPoints();
    return JSON.parse(JSON.stringify(this.data));
  }

  save() {
    if (typeof this.options.onSave === "function") {
      this.options.onSave(this.getData());
    }
  }
}

// ===================================================================
// 独立技能面板模态窗口管理器
// ===================================================================

let currentActiveCocPanel = null;

function getStoredCocPresets() {
  try {
    const raw = localStorage.getItem("coc_skill_presets");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
  }
  const defaultSkills = (typeof getDefaultCocData === "function") ? getDefaultCocData().skills : (DEFAULT_COC_SKILLS || {});
  return [
    {
      id: "preset_coc_default",
      name: "标准预设",
      skills: { ...defaultSkills },
      customSkills: []
    }
  ];
}

function saveStoredCocPresets(presets) {
  try {
    localStorage.setItem("coc_skill_presets", JSON.stringify(presets));
  } catch (e) {
    console.error("保存预设失败:", e);
  }
}

function loadCocModalPresetsList(selectedId = "") {
  const select = document.getElementById("coc-modal-preset-select");
  if (!select) return;
  const presets = getStoredCocPresets();
  const currentId = selectedId || localStorage.getItem("coc_active_skill_preset_id") || (presets[0] ? presets[0].id : "");
  select.innerHTML = presets.map(p => `<option value="${p.id}" ${p.id === currentId ? "selected" : ""}>${p.name}</option>`).join("");
  if (currentId) {
    select.value = currentId;
    localStorage.setItem("coc_active_skill_preset_id", currentId);
  }
}

function updateCocModalTotalPoints() {
  if (!currentActiveCocPanel) return;
  let total = 0;
  const grid = document.getElementById("coc-modal-skills-grid");
  if (grid) {
    grid.querySelectorAll(".coc-skill-item").forEach(item => {
      if (item.classList.contains("coc-add-skill-card")) return;
      const name = item.dataset.skill;
      const base = parseInt(item.dataset.base, 10) || 0;
      const valInput = item.querySelector(".coc-skill-val");
      if (!valInput) return;
      const num = parseInt(valInput.value, 10);
      if (!isNaN(num) && num > base) {
        total += (num - base);
      }
    });
  }

  currentActiveCocPanel.data.totalPoints = total;
  const display1 = document.getElementById("coc-modal-total-display");
  const display2 = document.getElementById("coc-modal-footer-points");
  if (display1) display1.textContent = total;
  if (display2) display2.textContent = total;
  currentActiveCocPanel.updateTotalPoints();
}

function renderCocModalSkillsGrid() {
  if (!currentActiveCocPanel) return;
  const grid = document.getElementById("coc-modal-skills-grid");
  if (!grid) return;

  const data = currentActiveCocPanel.data;
  const stats = data.stats || {};

  let items = [];
  COC_STANDARD_SKILLS.forEach(s => {
    const base = s.name === "闪避" ? Math.floor((stats.dex || 50) / 2) : s.base;
    const currentVal = typeof data.skills[s.name] !== "undefined" ? data.skills[s.name] : base;
    items.push({ name: s.name, base: base, val: currentVal, isCustom: false });
  });

  if (Array.isArray(data.customSkills)) {
    data.customSkills.forEach(name => {
      if (!items.find(it => it.name === name)) {
        const currentVal = typeof data.skills[name] !== "undefined" ? data.skills[name] : 0;
        items.push({ name: name, base: 0, val: currentVal, isCustom: true });
      }
    });
  }

  let html = items.map(item => {
    return `
      <div class="coc-skill-item" data-skill="${item.name}" data-base="${item.base}">
        <span class="coc-skill-name" title="${item.name}">${item.name}${item.isCustom ? " *" : ""}</span>
        <div class="coc-skill-actions">
          <input type="number" class="coc-skill-val" value="${item.val}" min="${item.base}" max="999">
          <button type="button" class="moe-btn-mini coc-skill-sub5-btn">-5</button>
          <button type="button" class="moe-btn-mini coc-skill-add5-btn">+5</button>
          <button type="button" class="moe-btn-mini coc-skill-reset-btn" title="重置"><svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
        </div>
      </div>
    `;
  }).join("");

  html += `
    <div class="coc-skill-item coc-add-skill-card">
      <span class="coc-skill-name" style="color: var(--accent-color); font-weight: 600; text-align: center; margin: 0; width: 100%;">+ 添加</span>
    </div>
  `;

  grid.innerHTML = html;
  updateCocModalTotalPoints();
}

function openCocSkillsModal(cocPanelInstance) {
  if (!cocPanelInstance) return;
  currentActiveCocPanel = cocPanelInstance;
  const modal = document.getElementById("coc-skills-modal");
  if (!modal) return;

  if (!currentActiveCocPanel.data) {
    currentActiveCocPanel.data = getDefaultCocData();
  }

  if (!currentActiveCocPanel.data.skills || typeof currentActiveCocPanel.data.skills !== "object" || Object.keys(currentActiveCocPanel.data.skills).length === 0) {
    const def = getDefaultCocData();
    currentActiveCocPanel.data.skills = { ...def.skills, ...(currentActiveCocPanel.data.skills || {}) };
  }

  try {
    renderCocModalSkillsGrid();
    loadCocModalPresetsList();
  } catch (err) {
    console.error("渲染技能面板出错:", err);
  }

  modal.classList.add("visible");
}

function closeCocSkillsModal() {
  const modal = document.getElementById("coc-skills-modal");
  if (modal) {
    modal.classList.remove("visible");
  }
  if (currentActiveCocPanel && typeof currentActiveCocPanel.updateTotalPoints === "function") {
    currentActiveCocPanel.updateTotalPoints();
  }
}

// 绑定技能模态框的所有交互事件
function initCocSkillsModalEvents() {
  const modal = document.getElementById("coc-skills-modal");
  if (!modal) return;

  const content = modal.querySelector(".coc-skills-modal-content");
  if (content) {
    content.onclick = (e) => e.stopPropagation();
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeCocSkillsModal();
    }
  };

  const closeBtn = document.getElementById("close-coc-skills-modal-btn");
  const cancelBtn = document.getElementById("cancel-coc-skills-modal-btn");
  const saveBtn = document.getElementById("save-coc-skills-modal-btn");

  if (closeBtn) closeBtn.onclick = closeCocSkillsModal;
  if (cancelBtn) cancelBtn.onclick = closeCocSkillsModal;

  if (saveBtn) {
    saveBtn.onclick = () => {
      if (currentActiveCocPanel) {
        // 同步所有输入框的值到当前面板对象
        const grid = document.getElementById("coc-modal-skills-grid");
        if (grid) {
          grid.querySelectorAll(".coc-skill-item").forEach(item => {
            if (item.classList.contains("coc-add-skill-card")) return;
            const name = item.dataset.skill;
            const valInput = item.querySelector(".coc-skill-val");
            if (valInput) {
              currentActiveCocPanel.data.skills[name] = parseInt(valInput.value, 10) || 0;
            }
          });
        }
        currentActiveCocPanel.save();
        const origText = saveBtn.textContent;
        saveBtn.textContent = "已保存";
        setTimeout(() => {
          saveBtn.textContent = origText;
        }, 1000);
      }
    };
  }

  const grid = document.getElementById("coc-modal-skills-grid");
  if (grid) {
    grid.addEventListener("click", async (e) => {
      if (e.target.closest(".coc-add-skill-card") || e.target.classList.contains("coc-modal-add-end-btn")) {
        let name = null;
        if (typeof window.showCustomPrompt === "function") {
          name = await window.showCustomPrompt("添加技能", "请输入技能名称...", "", "text");
        } else {
          name = prompt("请输入技能名称:");
        }
        if (!name || !name.trim()) return;
        const trimmed = name.trim();
        if (!currentActiveCocPanel.data.customSkills) currentActiveCocPanel.data.customSkills = [];
        if (!currentActiveCocPanel.data.customSkills.includes(trimmed)) {
          currentActiveCocPanel.data.customSkills.push(trimmed);
        }
        if (typeof currentActiveCocPanel.data.skills[trimmed] === "undefined") {
          currentActiveCocPanel.data.skills[trimmed] = 0;
        }
        renderCocModalSkillsGrid();
        return;
      }

      const item = e.target.closest(".coc-skill-item");
      if (!item || !currentActiveCocPanel) return;
      const skillName = item.dataset.skill;
      const base = parseInt(item.dataset.base, 10) || 0;
      const valInput = item.querySelector(".coc-skill-val");
      if (!valInput) return;

      if (e.target.closest(".coc-skill-add5-btn")) {
        let currentVal = parseInt(valInput.value, 10) || base;
        currentVal += 5;
        valInput.value = currentVal;
        currentActiveCocPanel.data.skills[skillName] = currentVal;
        updateCocModalTotalPoints();
      } else if (e.target.closest(".coc-skill-sub5-btn")) {
        let currentVal = parseInt(valInput.value, 10) || base;
        currentVal = Math.max(base, currentVal - 5);
        valInput.value = currentVal;
        currentActiveCocPanel.data.skills[skillName] = currentVal;
        updateCocModalTotalPoints();
      } else if (e.target.closest(".coc-skill-reset-btn")) {
        valInput.value = base;
        currentActiveCocPanel.data.skills[skillName] = base;
        updateCocModalTotalPoints();
      }
    });

    grid.addEventListener("input", (e) => {
      if (e.target.classList.contains("coc-skill-val") && currentActiveCocPanel) {
        const item = e.target.closest(".coc-skill-item");
        if (!item || item.classList.contains("coc-add-skill-card")) return;
        const skillName = item.dataset.skill;
        currentActiveCocPanel.data.skills[skillName] = parseInt(e.target.value, 10) || 0;
        updateCocModalTotalPoints();
      }
    });
  }

  // 全部重置按钮
  const resetAllBtn = document.getElementById("coc-modal-reset-all-btn");
  if (resetAllBtn) {
    resetAllBtn.onclick = () => {
      if (!currentActiveCocPanel) return;
      const stats = currentActiveCocPanel.data.stats || {};
      const grid = document.getElementById("coc-modal-skills-grid");
      if (grid) {
        grid.querySelectorAll(".coc-skill-item").forEach(item => {
          if (item.classList.contains("coc-add-skill-card")) return;
          const name = item.dataset.skill;
          const base = getSkillBaseValue(name, stats);
          const valInput = item.querySelector(".coc-skill-val");
          if (valInput) valInput.value = base;
          currentActiveCocPanel.data.skills[name] = base;
        });
      }
      updateCocModalTotalPoints();
    };
  }

  // 保存预设
  const savePresetBtn = document.getElementById("coc-modal-save-preset-btn");
  if (savePresetBtn) {
    savePresetBtn.onclick = async () => {
      if (!currentActiveCocPanel) return;
      let presetName = null;
      if (typeof window.showCustomPrompt === "function") {
        presetName = await window.showCustomPrompt("新建预设", "请输入预设方案名称...", "", "text");
      } else {
        presetName = prompt("请输入预设方案名称:");
      }
      if (!presetName || !presetName.trim()) return;
      const trimmed = presetName.trim();
      const presets = getStoredCocPresets();
      const newPreset = {
        id: "coc_preset_" + Date.now(),
        name: trimmed,
        skills: { ...currentActiveCocPanel.data.skills },
        customSkills: [...(currentActiveCocPanel.data.customSkills || [])]
      };
      presets.push(newPreset);
      saveStoredCocPresets(presets);
      loadCocModalPresetsList(newPreset.id);
      if (typeof window.showCustomAlert === "function") {
        await window.showCustomAlert("提示", "预设保存成功");
      } else {
        alert("预设保存成功");
      }
    };
  }

  // 选择预设立即套用
  const presetSelect = document.getElementById("coc-modal-preset-select");
  if (presetSelect) {
    presetSelect.onchange = () => {
      const presetId = presetSelect.value;
      if (!presetId) return;
      localStorage.setItem("coc_active_skill_preset_id", presetId);
      if (!currentActiveCocPanel) return;
      const presets = getStoredCocPresets();
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;

      if (Array.isArray(preset.customSkills)) {
        if (!currentActiveCocPanel.data.customSkills) currentActiveCocPanel.data.customSkills = [];
        preset.customSkills.forEach(c => {
          if (!currentActiveCocPanel.data.customSkills.includes(c)) {
            currentActiveCocPanel.data.customSkills.push(c);
          }
        });
      }

      currentActiveCocPanel.data.skills = { ...preset.skills };
      renderCocModalSkillsGrid();
    };
  }

  // 删除预设
  const delPresetBtn = document.getElementById("coc-modal-del-preset-btn");
  if (delPresetBtn) {
    delPresetBtn.onclick = async () => {
      const select = document.getElementById("coc-modal-preset-select");
      const presetId = select ? select.value : "";
      if (!presetId) {
        if (typeof window.showCustomAlert === "function") {
          await window.showCustomAlert("提示", "请选择要删除的预设");
        } else {
          alert("请选择要删除的预设");
        }
        return;
      }
      let presets = getStoredCocPresets();
      presets = presets.filter(p => p.id !== presetId);
      saveStoredCocPresets(presets);
      loadCocModalPresetsList();
      if (typeof window.showCustomAlert === "function") {
        await window.showCustomAlert("提示", "预设已删除");
      } else {
        alert("预设已删除");
      }
    };
  }
}

// 页面就绪后初始化事件
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCocSkillsModalEvents);
} else {
  initCocSkillsModalEvents();
}

window.CocPanel = CocPanel;
window.createCocPanel = function(containerId, options = {}) {
  return new CocPanel(containerId, options);
};

// 提取AI提示词中的HP/MP/SAN状态摘要，不包含技能
window.getCocPromptStatus = function(cocData) {
  if (!cocData || !cocData.calculated) return "";
  const c = cocData.calculated;
  return `HP: ${c.hp}/${c.maxHp}, MP: ${c.mp}/${c.maxMp}, SAN: ${c.san}/${c.maxSan}`;
};
