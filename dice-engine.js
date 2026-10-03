// ===================================================================
// 骰子指令引擎与天气池模块 (COC 7th Edition Dice Engine & Weather Pool)
// ===================================================================

const DEFAULT_DICE_TEMPLATES = {
  roll: "{角色名} 骰出了: {表达式}={结果}",
  check: "{角色名} 进行 {技能} 检定：D100={结果}/{技能数值} [{成功等级}]",
  st: "{角色名} 修改属性成功：{变更列表}",
  sc: "{角色名} 的理智检定：D100={结果}/{SAN} [{成功等级}] 理智变化: {旧SAN}→{新SAN}",
  growth: "{角色名} 进行 {技能} 成长检定：D100={结果}/{技能数值} [{成功等级}]",
  ti: "{角色名} 突发临时疯狂症状：{疯狂症状}",
  secret: "这是暗骰，结果仅 KP 可见",
  hp: "{角色名} 的 HP 变化: {旧HP}→{新HP}",
  coc: "{角色名} 生成了一组 COC7 属性",
  coc5: "{角色名} 生成了 5 组 COC7 属性"
};

// COC 七版规则书完整条文
const COC7_RULEBOOK_COMMAND_DOCS = [
  {
    key: "roll",
    name: "普通投掷",
    syntax: ".r 或 .r xdy 或 .r xdy±n",
    vars: "{角色名}、{表达式}、{结果}",
    desc: `投掷与掷骰规则（Rolling the Dice）：
在克苏鲁的呼唤第七版规则中，投掷骰子用于决定行动结果以及不可预测的事件。
骰子的表示方式为标准多面骰记法：XdY。其中X代表投掷骰子的枚数，Y代表骰子的面数。例如1D100代表一枚百面骰（结果为1至100），2D6代表两枚六面骰之和（结果为2至12），1D3代表一枚三面骰（取六面骰结果除以二并向上取整）。
当投掷带有修正值时，记为XdY+n或XdY-n，修正值直接累加或扣减于总点数之上。
当玩家未指定具体面数直接输入.r时，系统默认执行标准百面骰投掷（1D100）。`
  },
  {
    key: "check",
    name: "技能检定",
    syntax: ".ra 技能名 或 .ra 技能名 b 或 .ra 技能名 p",
    vars: "{角色名}、{技能}、{结果}、{技能数值}、{成功等级}",
    desc: `技能与属性检定（Skill and Characteristic Rolls）：
进行检定时，调查员投掷1D100并将结果与该技能或属性的当前数值进行比对，以确定行动是否成功以及成功的等级：
【大成功（Critical Success）】：掷出01点。无论难度如何，必然成功，且往往带来额外的绝佳收益；
【极难成功（Extreme Success）】：掷出的点数小于或等于目标技能数值的五分之一（技能值/5向下取整）。达成超乎寻常的卓越成果；
【困难成功（Hard Success）】：掷出的点数小于或等于目标技能数值的二分之一（技能值/2向下取整）。在更严苛的挑战中依然达成目标；
【常规成功（Regular Success）】：掷出的点数小于或等于目标技能数值（但大于二分之一值）。完成预期行动；
【失败（Failure）】：掷出的点数大于目标技能数值（且未达到大失败范围）。行动未达预期；
【大失败（Fumble）】：当技能数值低于50时，掷出96至100点均为大失败；当技能数值达到或超过50时，仅掷出100点为大失败。必然失败并可能招致灾难性的副作用。
奖励骰与惩罚骰（Bonus and Penalty Dice）：
当情况对调查员极为有利或极其不利时使用。除常规掷出个位骰与十位骰外，额外投掷一个或多个十位数骰子。奖励骰在所有十位骰中选取最小值与个位结合；惩罚骰在所有十位骰中选取最大值与个位结合。`
  },
  {
    key: "st",
    name: "属性修改",
    syntax: ".st 属性/技能 数值 或 .st hp/mp/san±n",
    vars: "{角色名}、{变更列表}",
    desc: `属性与技能录入修改指令（Set Characteristic & Skill Values）：
允许玩家快速录入或修改角色面板中的属性、生命（HP）、理智（SAN）、魔法（MP）以及各项技能数值。
支持批量录入（如 .st 力量60敏捷70）、运算调整（如 .st hp+5 或 .st san-3），操作完成后自动同步回写至角色数据面板。`
  },
  {
    key: "sc",
    name: "理智检定",
    syntax: ".sc 成功损失/失败损失（如 .sc 0/1d6 或 .sc 1/1d10）",
    vars: "{角色名}、{结果}、{SAN}、{成功等级}、{旧SAN}、{新SAN}",
    desc: `理智检定规则（Sanity Rolls & Sanity Losses）：
当调查员遭遇怪诞、惊悚、超越人类常理的恐怖生物或残酷情景时，守秘人将要求进行理智检定（Sanity Check，简称SC）。
调查员掷1D100，将其与当前理智值（Sanity Point，简称SAN）对比：
- 掷骰结果小于或等于当前理智值：检定成功。调查员保持心理镇定，仅扣除斜杠前方的成功损失数值（通常为0或较少数值）；
- 掷骰结果大于当前理智值：检定失败。调查员受到精神创伤，扣除斜杠后方的失败损失数值（例如1D6、1D10等骰子点数）；
- 掷出01为大成功，承受该情景所允许的最低损失；掷出100（或96-100）为大失败，直接承受最大可能损失；
- 数据回写：理智损失立即从人物卡理智值中扣除，并实时保存至角色面板。若单次理智损失达到5点或以上，可能立即诱发短期临时疯狂。`
  },
  {
    key: "coc",
    name: "属性生成",
    syntax: ".coc",
    vars: "{角色名}",
    desc: `调查员属性决定（Determining Characteristics）：
第七版《克苏鲁的呼唤》调查员属性由标准投掷公式计算：
力量（STR）：3D6×5，代表身体纯粹肌肉力量与物理破坏潜能；
敏捷（DEX）：3D6×5，代表身体反应速度、敏捷度与手眼协调能力；
体质（CON）：3D6×5，代表健康状况、抗病耐受力与生命力韧性；
意志（POW）：3D6×5，代表精神力量、意志坚定程度与魔法潜能；
体型（SIZ）：(2D6+6)×5，代表身高、体重与体格骨架大小；
教育（EDU）：(2D6+6)×5，代表受正规教育年限与所掌握的常识渊博度；
外貌（APP）：3D6×5，代表相貌面容、身体吸引力与个人魅力气场；
智力（INT）：(2D6+6)×5，代表分析推理能力、直觉洞察与灵感敏锐度；
幸运（LUK）：3D6×5，代表命运的青睐程度。
属性总和计算：前八项主要属性之和为核心点数，含幸运为全属性总点数。生成后气泡内附带选择并导入按钮，可一键写回当前玩家的人物卡并重算衍生数值。`
  },
  {
    key: "coc5",
    name: "多组生成",
    syntax: ".coc5",
    vars: "{角色名}",
    desc: `多方案属性生成（Alternative Method - Creating Multiple Sets）：
为给予玩家多样的角色构思空间，允许一次性生成五组符合七版标准公式的完整属性方案。
每组方案均独立结算力量、敏捷、体质、意志、体型、教育、外貌、智力、幸运及合计点数。
玩家可审视五组方案的特点与偏向，在聊天窗口中点击任意方案对应的选择按钮，即可精确导入该方案数值并实时刷新人物面板。`
  },
  {
    key: "growth",
    name: "成长检定",
    syntax: ".en 技能名",
    vars: "{角色名}、{技能}、{结果}、{技能数值}、{成功等级}",
    desc: `技能成长与发展（Skill Improvement / Development Phase）：
在模组或章节结案阶段，调查员对其在调查期间成功使用并获得标记的技能进行成长检定。
调查员针对该技能投掷1D100：
- 掷出点数大于该技能当前值（或掷出96-100点）：检定成功。表明调查员在实践中总结并获得了新领悟，立即掷1D10，并将所得点数（1至10点）增加至该技能当前值上；
- 掷出点数小于或等于该技能当前值：检定失败。调查员未能从过去的经验中获得显著提升，技能值保持不变；
- 技能成长后立即写回人物面板并持久化保存。`
  },
  {
    key: "ti",
    name: "疯狂发作",
    syntax: ".ti",
    vars: "{角色名}、{疯狂症状}",
    desc: `临时性疯狂与症状表（Temporary Insanity Summary）：
调查员在一轮时间内损失达到或超过5点理智值，且理智检定失败时陷入临时疯狂。
发作状态分为两阶段：第一阶段为即时发作（Bout of Madness，持续1D10轮），调查员失去自主行动控制权；随后进入潜在疯狂期。
即时发作由系统或KP投掷1D10在短期临时疯狂症状表中随机决定症状（包括：1.失忆、2.假性残疾、3.暴力倾向、4.偏执妄想、5.人格分裂、6.恐惧症、7.躁狂症、8.昏厥、9.歇斯底里、10.惊恐发作）。`
  },
  {
    key: "secret",
    name: "暗骰投掷",
    syntax: ".rh 技能名 或 .rh 表达式",
    vars: "{角色名}",
    desc: `暗骰与盲掷（Hidden Rolls & Secret Rolls）：
当守秘人（KP）需要判定某些调查员无法确切知晓成败与否的情报获取（例如暗中聆听、侦查潜行敌人、心理学解读动机或潜意识感知）时进行暗骰。
暗掷结果不向调查员公开具体投掷点数与技能数值，防止产生场外元游戏决策，保持剧情的未知与悬疑氛围。`
  },
  {
    key: "hp",
    name: "生命调整",
    syntax: ".hp ±点数（如 .hp -3 或 .hp +2）",
    vars: "{角色名}、{旧HP}、{新HP}",
    desc: `生命值与伤害规则（Hit Points and Damage）：
调查员的生命值上限（Maximum HP）等于（体质CON+体型SIZ）除以10，向下取整。
当遭受武器攻击、跌落、火焰、毒素或重击时，扣除相应生命值；接受急救（First Aid）或医学（Medicine）成功治疗时恢复生命值。
生命值下限为0点，上限不可超过最大生命值。指令直接调整调查员人物面板的当前生命值并自动回写持久化。`
  }
];

// 现实气候天数换算的默认天气池
const DEFAULT_WEATHER_POOLS = [
  {
    id: "weather_temperate",
    name: "温带气候",
    items: [
      { name: "晴天", rate: 36, note: "温和宜人，阳光明媚，视野开阔" },
      { name: "多云", rate: 25, note: "云层较厚，微风习习，体感舒适" },
      { name: "小雨", rate: 15, note: "细雨绵绵，空气湿润，地面潮湿" },
      { name: "阴天", rate: 11, note: "天色阴沉，光线灰暗，压抑沉闷" },
      { name: "雷阵雨", rate: 8, note: "雷声阵阵，阵雨滂沱，伴有短时大风" },
      { name: "大风", rate: 5, note: "狂风呼啸，树枝摇晃，气温骤降" }
    ]
  },
  {
    id: "weather_tropical",
    name: "热带气候",
    items: [
      { name: "艳阳高照", rate: 41, note: "烈日炎炎，气温极高，闷热难耐" },
      { name: "热带暴雨", rate: 30, note: "午后骤起倾盆大雨，雨势凶猛，水汽弥漫" },
      { name: "湿热多云", rate: 19, note: "云层厚重，空气湿度极高，体感黏热" },
      { name: "台风大风", rate: 10, note: "强风肆虐，暴雨交加，海浪汹涌" }
    ]
  },
  {
    id: "weather_frigid",
    name: "寒带气候",
    items: [
      { name: "暴风雪", rate: 30, note: "大雪纷飞，狂风卷雪，能见度极低，极度严寒" },
      { name: "小雪", rate: 25, note: "轻雪飘落，寒风料峭，积雪皑皑" },
      { name: "晴冷", rate: 21, note: "天空湛蓝但寒风刺骨，气温极低，滴水成冰" },
      { name: "阴沉大风", rate: 15, note: "天色昏暗，极地寒风呼啸，体感极冷" },
      { name: "冻雨", rate: 9, note: "冰冷雨丝接触地面即凝结成冰，道路极滑" }
    ]
  }
];

// 短期临时疯狂症状表
const COC_SHORT_TERM_INSANITY = [
  "失忆：调查员发现自己记忆出现断层，不记得自己是谁或身在何处，持续1D10轮。",
  "假性残疾：调查员身体机能突发心因性丧失，例如暂时失明、失聪或肢体瘫痪，持续1D10轮。",
  "暴力倾向：调查员被愤怒支配，爆发无法遏制的暴力行为，向周围最近的目标发动无差别的物理攻击，持续1D10轮。",
  "偏执妄想：调查员陷入极端的多疑与被害妄想，认为同伴在谋害自己，拒绝一切帮助，持续1D10轮。",
  "人格分裂：调查员潜意识分裂出另一重人格，通常与原性格截然相反，持续1D10轮。",
  "恐惧症：调查员突发严重的特定恐惧症，如幽闭恐惧、黑暗恐惧或怪物恐惧，本能地尖叫逃离恐惧源，持续1D10轮。",
  "躁狂症：调查员陷入无法自控的情绪亢奋或狂躁，可能狂笑、手舞足蹈或进行无意义的重复举动，持续1D10轮。",
  "昏厥：调查员受惊过度直接瘫倒休克，昏迷不醒，持续1D10轮后苏醒。",
  "歇斯底里：调查员情绪彻底崩溃，嚎啕大哭、大喊大叫、身体剧烈颤抖，无法进行连贯行动，持续1D10轮。",
  "惊恐发作：调查员陷入濒死般的强烈恐惧，呼吸急促心悸，只能本能地抱头逃窜或蜷缩在角落，持续1D10轮。"
];

// 获取已存储的指令预设
function getStoredDicePresets() {
  try {
    const raw = localStorage.getItem("coc_dice_presets");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("读取骰子预设失败:", e);
  }
  return [
    {
      id: "preset_default",
      name: "标准规则播报",
      templates: { ...DEFAULT_DICE_TEMPLATES }
    }
  ];
}

function saveStoredDicePresets(presets) {
  try {
    localStorage.setItem("coc_dice_presets", JSON.stringify(presets));
  } catch (e) {
    console.error("保存骰子预设失败:", e);
  }
}

function getActiveDicePreset() {
  const presets = getStoredDicePresets();
  const activeId = localStorage.getItem("coc_active_dice_preset_id");
  const found = presets.find(p => p.id === activeId);
  return found || presets[0] || { id: "preset_default", name: "标准规则播报", templates: { ...DEFAULT_DICE_TEMPLATES } };
}

// 获取天气池预设
function getStoredWeatherPools() {
  try {
    const raw = localStorage.getItem("coc_weather_pools");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("读取天气池预设失败:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_WEATHER_POOLS));
}

function saveStoredWeatherPools(pools) {
  try {
    localStorage.setItem("coc_weather_pools", JSON.stringify(pools));
  } catch (e) {
    console.error("保存天气池预设失败:", e);
  }
}

function getActiveWeatherPool() {
  const pools = getStoredWeatherPools();
  const activeId = localStorage.getItem("coc_active_weather_pool_id");
  const found = pools.find(p => p.id === activeId);
  return found || pools[0];
}

// 抽取当前天气池中的天气
window.drawWeatherFromCurrentPool = function() {
  const pool = getActiveWeatherPool();
  if (!pool || !Array.isArray(pool.items) || pool.items.length === 0) {
    return { name: "晴天", rate: 100, note: "天气晴朗" };
  }
  const totalRate = pool.items.reduce((sum, item) => sum + (parseFloat(item.rate) || 0), 0);
  if (totalRate <= 0) return pool.items[0];

  let rand = Math.random() * totalRate;
  for (const item of pool.items) {
    const r = parseFloat(item.rate) || 0;
    if (rand < r) {
      return item;
    }
    rand -= r;
  }
  return pool.items[pool.items.length - 1];
};

// 掷多面骰辅助函数
function rollDiceExpression(expr) {
  let clean = expr.toLowerCase().replace(/\s+/g, "");
  if (!clean || clean === "1d100" || clean === "d100" || clean === "100") {
    const val = Math.floor(Math.random() * 100) + 1;
    return { total: val, detail: `D100=${val}` };
  }

  const match = clean.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (match) {
    const count = parseInt(match[1], 10) || 1;
    const sides = parseInt(match[2], 10);
    const mod = match[3] ? parseInt(match[3], 10) : 0;

    let rolls = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      sum += r;
    }
    const finalVal = sum + mod;
    let detail = "";
    if (count > 1 || mod !== 0) {
      detail = `${rolls.join("+")}${mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}=${finalVal}`;
    } else {
      detail = `${finalVal}`;
    }
    return { total: finalVal, detail: detail };
  }

  const num = parseInt(clean, 10);
  if (!isNaN(num)) {
    return { total: num, detail: `${num}` };
  }

  const def = Math.floor(Math.random() * 100) + 1;
  return { total: def, detail: `D100=${def}` };
}

// 格式化占位符替换
function formatDiceTemplate(template, vars) {
  let str = template;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return str;
}

// 生成一组 COC7 属性
function generateCoc7Attributes() {
  const roll3d6 = () => (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
  const roll2d6p6 = () => (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1) + 6;

  const str = roll3d6() * 5;
  const con = roll3d6() * 5;
  const siz = roll2d6p6() * 5;
  const dex = roll3d6() * 5;
  const app = roll3d6() * 5;
  const int = roll2d6p6() * 5;
  const pow = roll3d6() * 5;
  const edu = roll2d6p6() * 5;
  const luk = roll3d6() * 5;

  const total = str + con + siz + dex + app + int + pow + edu;
  const totalWithLuk = total + luk;

  return { str, con, siz, dex, app, int, pow, edu, luk, total, totalWithLuk };
}

const COC_KEY_MAP = {
  "str": "str", "力量": "str",
  "dex": "dex", "敏捷": "dex",
  "con": "con", "体质": "con",
  "pow": "pow", "意志": "pow",
  "siz": "siz", "体型": "siz",
  "edu": "edu", "教育": "edu",
  "app": "app", "外貌": "app",
  "int": "int", "智力": "int", "灵感": "int",
  "luk": "luk", "幸运": "luk",
  "hp": "hp", "生命": "hp",
  "mp": "mp", "魔法": "mp",
  "san": "san", "理智": "san", "心智": "san"
};

// 核心指令解析函数
window.executeDiceCommand = function(rawContent, chat, diceInfo) {
  if (!rawContent || typeof rawContent !== "string") return null;

  const trimmed = rawContent.trim();
  if (!trimmed.startsWith(".") && !trimmed.startsWith("。")) {
    return null;
  }

  const cmdLine = trimmed.slice(1).trim();
  if (!cmdLine) return null;

  const activePreset = getActiveDicePreset();
  const templates = { ...DEFAULT_DICE_TEMPLATES, ...(activePreset.templates || {}) };

  const userName = chat.settings?.myNickname || chat.settings?.myName || "我";
  let userCoc = chat.settings?.myCocPanel || (typeof getDefaultCocData === "function" ? getDefaultCocData() : { stats: {}, skills: {}, calculated: {} });

  // 1. 普通投掷 .r 或 .r xdy
  const rMatch = cmdLine.match(/^r(?:\s+(.+))?$/i);
  if (rMatch) {
    const expr = rMatch[1] ? rMatch[1].trim() : "1d100";
    const res = rollDiceExpression(expr);
    const text = formatDiceTemplate(templates.roll || DEFAULT_DICE_TEMPLATES.roll, {
      角色名: userName,
      表达式: expr,
      结果: res.total
    });
    return { handled: true, text };
  }

  // 2. 暗骰 .rh
  const rhMatch = cmdLine.match(/^rh(?:\s+(.+))?$/i);
  if (rhMatch) {
    const subExpr = rhMatch[1] ? rhMatch[1].trim() : "1d100";
    const res = rollDiceExpression(subExpr);
    const text = `${templates.secret || DEFAULT_DICE_TEMPLATES.secret} 点数已密掷`;
    return { handled: true, text };
  }

  // 3. 技能/属性检定 .ra 技能名/属性名 或 .ra 技能名 b/p
  const raMatch = cmdLine.match(/^ra\s+([^\s]+)(?:\s+(b\d*|p\d*))?$/i);
  if (raMatch) {
    const skillName = raMatch[1].trim();
    const bpMod = raMatch[2] ? raMatch[2].toLowerCase() : "";

    const lowerKey = skillName.toLowerCase();
    const mappedKey = COC_KEY_MAP[lowerKey] || COC_KEY_MAP[skillName];

    let skillVal = 50;
    if (mappedKey) {
      if (["hp", "mp", "san"].includes(mappedKey)) {
        if (userCoc.calculated && typeof userCoc.calculated[mappedKey] !== "undefined") {
          skillVal = parseInt(userCoc.calculated[mappedKey], 10) || 0;
        }
      } else if (userCoc.stats && typeof userCoc.stats[mappedKey] !== "undefined") {
        skillVal = parseInt(userCoc.stats[mappedKey], 10) || 0;
      }
    } else if (userCoc.skills && typeof userCoc.skills[skillName] !== "undefined") {
      skillVal = parseInt(userCoc.skills[skillName], 10) || 0;
    } else if (userCoc.stats && typeof userCoc.stats[skillName] !== "undefined") {
      skillVal = parseInt(userCoc.stats[skillName], 10) || 0;
    } else if (typeof getSkillBaseValue === "function") {
      skillVal = getSkillBaseValue(skillName, userCoc.stats);
    }

    let finalRoll = Math.floor(Math.random() * 100) + 1;
    let rollDetail = `${finalRoll}`;

    if (bpMod.startsWith("b")) {
      const bonusCount = parseInt(bpMod.slice(1), 10) || 1;
      const units = finalRoll % 10;
      let tens = [Math.floor(finalRoll / 10)];
      for (let i = 0; i < bonusCount; i++) {
        tens.push(Math.floor(Math.random() * 10));
      }
      const minTen = Math.min(...tens);
      finalRoll = (minTen === 0 && units === 0) ? 100 : (minTen * 10 + units);
      rollDetail = `${finalRoll}`;
    } else if (bpMod.startsWith("p")) {
      const penaltyCount = parseInt(bpMod.slice(1), 10) || 1;
      const units = finalRoll % 10;
      let tens = [Math.floor(finalRoll / 10)];
      for (let i = 0; i < penaltyCount; i++) {
        tens.push(Math.floor(Math.random() * 10));
      }
      const maxTen = Math.max(...tens);
      finalRoll = (maxTen === 0 && units === 0) ? 100 : (maxTen * 10 + units);
      rollDetail = `${finalRoll}`;
    }

    let level = "失败";
    if (finalRoll === 1) {
      level = "大成功";
    } else if (finalRoll === 100 || (skillVal >= 50 && finalRoll >= 96)) {
      level = "大失败";
    } else if (finalRoll <= Math.floor(skillVal / 5)) {
      level = "极难成功";
    } else if (finalRoll <= Math.floor(skillVal / 2)) {
      level = "困难成功";
    } else if (finalRoll <= skillVal) {
      level = "常规成功";
    }

    const text = formatDiceTemplate(templates.check || DEFAULT_DICE_TEMPLATES.check, {
      角色名: userName,
      技能: skillName,
      结果: rollDetail,
      技能数值: skillVal,
      成功等级: level
    });
    return { handled: true, text };
  }

  // 3.5 属性/技能录入与修改 .st 力量60 / .st hp+5 / .st 侦查 80
  const stMatch = cmdLine.match(/^st\s+(.+)$/i);
  if (stMatch) {
    const stContent = stMatch[1].trim();
    const regex = /([^\s\d\+\-\=]+)\s*([\+\-\=])?\s*(\d+)/g;
    let match;
    const changes = [];

    if (!userCoc.stats) userCoc.stats = {};
    if (!userCoc.calculated) userCoc.calculated = {};
    if (!userCoc.skills) userCoc.skills = {};

    let statsChanged = false;

    while ((match = regex.exec(stContent)) !== null) {
      const key = match[1].trim();
      const op = match[2] || "=";
      const val = parseInt(match[3], 10) || 0;

      const lowerKey = key.toLowerCase();
      const mappedKey = COC_KEY_MAP[lowerKey] || COC_KEY_MAP[key];

      if (mappedKey) {
        if (["hp", "mp", "san"].includes(mappedKey)) {
          const cur = parseInt(userCoc.calculated[mappedKey], 10) || (mappedKey === "san" ? (userCoc.stats.pow || 50) : 10);
          let newVal = cur;
          if (op === "+") newVal = cur + val;
          else if (op === "-") newVal = cur - val;
          else newVal = val;
          userCoc.calculated[mappedKey] = Math.max(0, newVal);
          changes.push(`${key.toUpperCase()}: ${userCoc.calculated[mappedKey]}`);
        } else {
          const cur = parseInt(userCoc.stats[mappedKey], 10) || 50;
          let newVal = cur;
          if (op === "+") newVal = cur + val;
          else if (op === "-") newVal = cur - val;
          else newVal = val;
          userCoc.stats[mappedKey] = Math.max(0, newVal);
          statsChanged = true;
          changes.push(`${key}: ${userCoc.stats[mappedKey]}`);
        }
      } else {
        const cur = parseInt(userCoc.skills[key], 10) || (typeof getSkillBaseValue === "function" ? getSkillBaseValue(key, userCoc.stats) : 0);
        let newVal = cur;
        if (op === "+") newVal = cur + val;
        else if (op === "-") newVal = cur - val;
        else newVal = val;
        userCoc.skills[key] = Math.max(0, newVal);
        changes.push(`${key}: ${userCoc.skills[key]}`);
      }
    }

    if (statsChanged && typeof calculateCocStats === "function") {
      userCoc.calculated = calculateCocStats(userCoc.stats, userCoc.calculated);
    }

    if (changes.length > 0) {
      if (!chat.settings) chat.settings = {};
      chat.settings.myCocPanel = userCoc;
      if (window.myCocPanel) {
        window.myCocPanel.setData(userCoc);
      }
      const text = `${userName} 修改属性成功：${changes.join(" | ")}`;
      return { handled: true, text, persistChat: true };
    }
  }

  // 4. 理智检定 .sc 成功损失/失败损失
  const scMatch = cmdLine.match(/^sc\s+([^\/]+)\/([^\s]+)/i);
  if (scMatch) {
    const succExpr = scMatch[1].trim();
    const failExpr = scMatch[2].trim();

    const currentSan = (userCoc.calculated && typeof userCoc.calculated.san === "number")
      ? userCoc.calculated.san
      : (userCoc.stats?.pow || 50);

    const rollVal = Math.floor(Math.random() * 100) + 1;
    let isSuccess = rollVal <= currentSan;
    let level = isSuccess ? (rollVal <= Math.floor(currentSan / 5) ? "极难成功" : (rollVal <= Math.floor(currentSan / 2) ? "困难成功" : "常规成功")) : "失败";
    if (rollVal === 1) level = "大成功";
    if (rollVal === 100 || (currentSan >= 50 && rollVal >= 96)) level = "大失败";

    const lossExpr = isSuccess ? succExpr : failExpr;
    const lossResult = rollDiceExpression(lossExpr);
    const lossNum = Math.max(0, lossResult.total);

    const newSan = Math.max(0, currentSan - lossNum);

    if (!userCoc.calculated) userCoc.calculated = {};
    userCoc.calculated.san = newSan;
    if (!chat.settings) chat.settings = {};
    chat.settings.myCocPanel = userCoc;

    const text = formatDiceTemplate(templates.sc || DEFAULT_DICE_TEMPLATES.sc, {
      角色名: userName,
      结果: rollVal,
      SAN: currentSan,
      成功等级: level,
      旧SAN: currentSan,
      新SAN: newSan
    });

    return { handled: true, text, persistChat: true };
  }

  // 5. HP 调整指令 .hp -3 或 .hp +2
  const hpMatch = cmdLine.match(/^hp\s*([+-]\d+)/i);
  if (hpMatch) {
    const delta = parseInt(hpMatch[1], 10);
    const currentHp = (userCoc.calculated && typeof userCoc.calculated.hp === "number") ? userCoc.calculated.hp : 10;
    const maxHp = (userCoc.calculated && typeof userCoc.calculated.maxHp === "number") ? userCoc.calculated.maxHp : 10;
    const newHp = Math.max(0, Math.min(maxHp, currentHp + delta));

    if (!userCoc.calculated) userCoc.calculated = {};
    userCoc.calculated.hp = newHp;
    if (!chat.settings) chat.settings = {};
    chat.settings.myCocPanel = userCoc;

    const text = formatDiceTemplate(templates.hp || DEFAULT_DICE_TEMPLATES.hp, {
      角色名: userName,
      旧HP: currentHp,
      新HP: newHp
    });
    return { handled: true, text, persistChat: true };
  }

  // 6. 成长检定 .en 技能名
  const enMatch = cmdLine.match(/^en\s+([^\s]+)/i);
  if (enMatch) {
    const skillName = enMatch[1].trim();
    let currentVal = (userCoc.skills && typeof userCoc.skills[skillName] !== "undefined")
      ? parseInt(userCoc.skills[skillName], 10)
      : (typeof getSkillBaseValue === "function" ? getSkillBaseValue(skillName, userCoc.stats) : 50);

    const rollVal = Math.floor(Math.random() * 100) + 1;
    let growthNum = 0;
    if (rollVal > currentVal || rollVal > 95) {
      growthNum = Math.floor(Math.random() * 10) + 1;
      const newVal = currentVal + growthNum;
      if (!userCoc.skills) userCoc.skills = {};
      userCoc.skills[skillName] = newVal;
      if (!chat.settings) chat.settings = {};
      chat.settings.myCocPanel = userCoc;

      const text = `${userName} 进行 ${skillName} 成长检定：D100=${rollVal}/${currentVal} 成功 技能增加 ${growthNum} 点 当前为 ${newVal}`;
      return { handled: true, text, persistChat: true };
    } else {
      const text = `${userName} 进行 ${skillName} 成长检定：D100=${rollVal}/${currentVal} 失败 未能成长`;
      return { handled: true, text };
    }
  }

  // 7. 短期疯狂发作 .ti
  if (cmdLine.toLowerCase() === "ti") {
    const randIdx = Math.floor(Math.random() * COC_SHORT_TERM_INSANITY.length);
    const symptom = COC_SHORT_TERM_INSANITY[randIdx];
    const text = formatDiceTemplate(templates.ti || DEFAULT_DICE_TEMPLATES.ti, {
      角色名: userName,
      疯狂症状: symptom
    });
    return { handled: true, text };
  }

  // 8. 属性生成 .coc 与 .coc5
  const cocMatch = cmdLine.match(/^coc(5)?$/i);
  if (cocMatch) {
    const isFive = cocMatch[1] === "5";

    const getCalcSummary = (str, con, pow, siz) => {
      const hp = Math.floor((con + siz) / 10);
      const sum = str + siz;
      let db = "0";
      if (sum < 65) db = "-2";
      else if (sum <= 84) db = "-1";
      else if (sum <= 124) db = "0";
      else if (sum <= 164) db = "+1D4";
      else if (sum <= 204) db = "+1D6";
      else if (sum <= 284) db = "+2D6";
      else if (sum <= 364) db = "+3D6";
      else db = "+4D6";
      return { hp, db };
    };

    const renderAttrItem = (lbl, val) => `
      <div style="display: flex; align-items: center; white-space: nowrap; font-size: 11px;">
        <span style="font-weight: 600; color: var(--text-primary); display: inline-block; width: 26px; text-align-last: justify;">${lbl}</span>
        <span style="color: var(--text-primary); margin-right: 2px;">:</span>
        <span style="color: #444; font-weight: 600; font-size: 11px; display: inline-block; width: 22px; text-align: left;">${val}</span>
      </div>
    `;

    if (!isFive) {
      const attrs = generateCoc7Attributes();
      const calc = getCalcSummary(attrs.str, attrs.con, attrs.pow, attrs.siz);
      const dataStr = encodeURIComponent(JSON.stringify(attrs));

      const cardHtml = `
        <div class="coc-gen-result-card" style="font-size: 11px; line-height: 1.5; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 4px; overflow: hidden;">
          <div class="coc-card-header" style="padding: 6px 10px; font-weight: 600; color: var(--text-primary); font-size: 12px; background: var(--secondary-bg); border-bottom: 1px solid var(--border-color);">COC7 七版人物属性</div>
          <div style="padding: 8px 10px;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 8px; font-size: 11px; color: var(--text-primary);">
              ${renderAttrItem("力量", attrs.str)}
              ${renderAttrItem("敏捷", attrs.dex)}
              ${renderAttrItem("体质", attrs.con)}
              ${renderAttrItem("意志", attrs.pow)}
              ${renderAttrItem("体型", attrs.siz)}
              ${renderAttrItem("教育", attrs.edu)}
              ${renderAttrItem("外貌", attrs.app)}
              ${renderAttrItem("智力", attrs.int)}
              ${renderAttrItem("幸运", attrs.luk)}
            </div>
            <div style="display: flex; align-items: center; gap: 14px; font-size: 11px; margin-top: 6px; color: var(--text-primary);">
              <div style="display: flex; align-items: center; white-space: nowrap;">
                <span style="font-weight: 600; color: var(--text-primary); display: inline-block; width: 26px; text-align-last: justify;">HP</span>
                <span style="color: var(--text-primary); margin-right: 2px;">:</span>
                <span style="color: #444; font-weight: 600; font-size: 11px; display: inline-block; width: 22px; text-align: left;">${calc.hp}</span>
              </div>
              <div style="display: flex; align-items: center; white-space: nowrap;">
                <span style="font-weight: 600; color: var(--text-primary); display: inline-block; width: 26px; text-align-last: justify;">DB</span>
                <span style="color: var(--text-primary); margin-right: 2px;">:</span>
                <span style="color: #444; font-weight: 600; font-size: 11px; text-align: left;">${calc.db}</span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px;">
              <div style="font-size: 10px; color: var(--text-secondary);">合计:${attrs.total} 含幸运:${attrs.totalWithLuk}</div>
              <button type="button" class="moe-btn-compact coc-apply-attrs-btn" data-attrs="${dataStr}" style="padding: 2px 10px; font-size: 10px; border-radius: 10px; background: var(--secondary-bg); border: 1px solid var(--border-color); cursor: pointer; color: var(--accent-color); font-weight: 600;">选择</button>
            </div>
          </div>
        </div>
      `;
      const text = `${userName} 生成了一组 COC7 属性`;
      return { handled: true, text, html: cardHtml };
    } else {
      let listHtml = "";

      for (let i = 1; i <= 5; i++) {
        const a = generateCoc7Attributes();
        const calc = getCalcSummary(a.str, a.con, a.pow, a.siz);
        const dataStr = encodeURIComponent(JSON.stringify(a));
        listHtml += `
          <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 6px; overflow: hidden;">
            <div class="coc-card-header" style="padding: 4px 8px; font-size: 11px; font-weight: 600; color: var(--text-primary); background: var(--secondary-bg); border-bottom: 1px solid var(--border-color);">方案 ${i}</div>
            <div style="padding: 6px 8px;">
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 6px; font-size: 11px; color: var(--text-primary);">
                ${renderAttrItem("力量", a.str)}
                ${renderAttrItem("敏捷", a.dex)}
                ${renderAttrItem("体质", a.con)}
                ${renderAttrItem("意志", a.pow)}
                ${renderAttrItem("体型", a.siz)}
                ${renderAttrItem("教育", a.edu)}
                ${renderAttrItem("外貌", a.app)}
                ${renderAttrItem("智力", a.int)}
                ${renderAttrItem("幸运", a.luk)}
              </div>
              <div style="display: flex; align-items: center; gap: 14px; font-size: 11px; margin-top: 5px; color: var(--text-primary);">
                <div style="display: flex; align-items: center; white-space: nowrap;">
                  <span style="font-weight: 600; color: var(--text-primary); display: inline-block; width: 26px; text-align-last: justify;">HP</span>
                  <span style="color: var(--text-primary); margin-right: 2px;">:</span>
                  <span style="color: #444; font-weight: 600; font-size: 11px; display: inline-block; width: 22px; text-align: left;">${calc.hp}</span>
                </div>
                <div style="display: flex; align-items: center; white-space: nowrap;">
                  <span style="font-weight: 600; color: var(--text-primary); display: inline-block; width: 26px; text-align-last: justify;">DB</span>
                  <span style="color: var(--text-primary); margin-right: 2px;">:</span>
                  <span style="color: #444; font-weight: 600; font-size: 11px; text-align: left;">${calc.db}</span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4px;">
                <div style="font-size: 10px; color: var(--text-secondary);">合计:${a.total} 含运:${a.totalWithLuk}</div>
                <button type="button" class="moe-btn-compact coc-apply-attrs-btn" data-attrs="${dataStr}" style="padding: 1px 10px; font-size: 10px; border-radius: 10px; background: var(--secondary-bg); border: 1px solid var(--border-color); cursor: pointer; color: var(--accent-color); font-weight: 600;">选择</button>
              </div>
            </div>
          </div>
        `;
      }

      const fullHtml = `
        <div class="coc-gen-multi-card" style="font-size: 11px; line-height: 1.5; padding: 8px 10px; background: var(--secondary-bg); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 4px;">
          <div class="coc-card-header" style="font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 12px;">COC7 七版人物属性生成 5组</div>
          ${listHtml}
        </div>
      `;

      const text = `${userName} 生成了 5 组 COC7 属性`;
      return { handled: true, text, html: fullHtml };
    }
  }

  return null;
};

// 监听气泡中选择并导入属性卡按钮
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".coc-apply-attrs-btn");
  if (!btn) return;
  const rawStr = btn.dataset.attrs;
  if (!rawStr) return;

  try {
    const a = JSON.parse(decodeURIComponent(rawStr));
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    if (!chat.settings) chat.settings = {};
    if (!chat.settings.myCocPanel) {
      chat.settings.myCocPanel = (typeof getDefaultCocData === "function" ? getDefaultCocData() : { stats: {}, skills: {}, calculated: {} });
    }

    chat.settings.myCocPanel.stats = {
      str: a.str,
      dex: a.dex,
      con: a.con,
      pow: a.pow,
      siz: a.siz,
      edu: a.edu,
      app: a.app,
      int: a.int,
      luk: a.luk
    };

    if (typeof calculateCocStats === "function") {
      chat.settings.myCocPanel.calculated = calculateCocStats(chat.settings.myCocPanel.stats, chat.settings.myCocPanel.calculated);
    }

    if (!chat.settings.myCocPanel.skills) chat.settings.myCocPanel.skills = {};
    chat.settings.myCocPanel.skills["闪避"] = Math.floor(a.dex / 2);

    if (window.myCocPanel) {
      window.myCocPanel.setData(chat.settings.myCocPanel);
    }

    state.chats[state.activeChatId] = chat;
    await db.chats.put(chat);
    const targetName = chat.settings?.myName || chat.settings?.myNickname || "我";
    const msg = `已导入${targetName}的面板`;
    if (typeof window.showCustomAlert === "function") {
      await window.showCustomAlert("提示", msg);
    } else {
      alert(msg);
    }
  } catch (err) {
    console.error("导入COC属性失败:", err);
  }
});

// ===================================================================
// UI 渲染：指令管理中心与天气池界面 (模块 5 & 模块 6)
// ===================================================================

let currentCmdTab = "commands"; // "commands" 或 "weather"

window.renderDiceCommandCenter = function() {
  const container = document.getElementById("studio-content-area");
  if (!container) return;

  const titleEl = document.getElementById("studio-main-title");
  if (titleEl) titleEl.textContent = "指令";

  const tabCmdBtn = document.getElementById("cmd-tab-commands");
  const tabWeatherBtn = document.getElementById("cmd-tab-weather");

  if (tabCmdBtn && tabWeatherBtn) {
    if (currentCmdTab === "commands") {
      tabCmdBtn.style.fontWeight = "bold";
      tabCmdBtn.style.color = "var(--accent-color)";
      tabWeatherBtn.style.fontWeight = "normal";
      tabWeatherBtn.style.color = "var(--text-secondary)";
    } else {
      tabWeatherBtn.style.fontWeight = "bold";
      tabWeatherBtn.style.color = "var(--accent-color)";
      tabCmdBtn.style.fontWeight = "normal";
      tabCmdBtn.style.color = "var(--text-secondary)";
    }
  }

  if (currentCmdTab === "commands") {
    renderCommandsTab(container);
  } else {
    renderWeatherTab(container);
  }
};

function renderCommandsTab(container) {
  const presets = getStoredDicePresets();
  const activePreset = getActiveDicePreset();
  const currentTemplates = { ...DEFAULT_DICE_TEMPLATES, ...(activePreset.templates || {}) };

  let presetOptionsHtml = presets.map(p => `<option value="${p.id}" ${p.id === activePreset.id ? "selected" : ""}>${p.name}</option>`).join("");

  let cardsHtml = COC7_RULEBOOK_COMMAND_DOCS.map(doc => {
    const val = currentTemplates[doc.key] || DEFAULT_DICE_TEMPLATES[doc.key] || "";
    return `
      <div class="moe-card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px; margin-bottom: 12px; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${doc.name}</span>
          <span style="font-size: 11px; background: var(--secondary-bg); color: var(--accent-color); padding: 2px 6px; border-radius: 4px; font-weight: 600;">${doc.syntax}</span>
        </div>
        <div style="font-size: 11px; line-height: 1.5; color: var(--text-secondary); background: var(--secondary-bg); border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; white-space: pre-wrap;">${doc.desc}</div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 11px; color: var(--text-primary); font-weight: 600; margin-bottom: 3px; display: block;">播报文本</label>
          <input type="text" class="moe-input cmd-template-input" data-key="${doc.key}" value="${val.replace(/"/g, "&quot;")}" style="width: 100%; box-sizing: border-box; font-size: 12px; padding: 4px 6px;">
          <div style="font-size: 10px; color: var(--text-secondary); margin-top: 3px;">支持占位符: ${doc.vars}</div>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 10px; width: 100%; box-sizing: border-box; position: relative; z-index: 5;">
      <select id="cmd-preset-select" class="moe-input" style="flex: 1 1 auto; height: 28px; min-height: 28px; font-size: 11px; padding: 2px 8px; min-width: 90px; color: var(--text-primary); background-color: var(--card-bg, #ffffff); position: relative; z-index: 5; opacity: 1; visibility: visible; border-radius: 14px;">
        ${presetOptionsHtml}
      </select>
      <button type="button" id="cmd-new-preset-btn" class="moe-btn-mini" style="flex: 0 0 auto !important; width: auto !important; max-width: 44px !important; padding: 2px 6px !important; font-size: 11px !important; height: 26px !important; line-height: 20px !important;">新建</button>
      <button type="button" id="cmd-saveas-preset-btn" class="moe-btn-mini" style="flex: 0 0 auto !important; width: auto !important; max-width: 44px !important; padding: 2px 6px !important; font-size: 11px !important; height: 26px !important; line-height: 20px !important;">另存</button>
      <button type="button" id="cmd-save-preset-btn" class="moe-btn-mini" style="flex: 0 0 auto !important; width: auto !important; max-width: 44px !important; padding: 2px 6px !important; font-size: 11px !important; height: 26px !important; line-height: 20px !important;">保存</button>
      <button type="button" id="cmd-del-preset-btn" class="moe-btn-mini" style="flex: 0 0 auto !important; width: auto !important; max-width: 44px !important; padding: 2px 6px !important; font-size: 11px !important; height: 26px !important; line-height: 20px !important;">删除</button>
    </div>
    <div id="cmd-cards-container">
      ${cardsHtml}
    </div>
  `;

  // 绑定事件
  document.getElementById("cmd-preset-select").onchange = (e) => {
    localStorage.setItem("coc_active_dice_preset_id", e.target.value);
    renderCommandsTab(container);
  };

  document.getElementById("cmd-save-preset-btn").onclick = async () => {
    const inputs = container.querySelectorAll(".cmd-template-input");
    inputs.forEach(input => {
      const k = input.dataset.key;
      activePreset.templates[k] = input.value.trim();
    });
    saveStoredDicePresets(presets);
    const saveBtn = document.getElementById("cmd-save-preset-btn");
    saveBtn.textContent = "已保存";
    setTimeout(() => { saveBtn.textContent = "保存"; }, 1000);
  };

  document.getElementById("cmd-new-preset-btn").onclick = async () => {
    let name = null;
    if (typeof window.showCustomPrompt === "function") {
      name = await window.showCustomPrompt("新建预设", "请输入预设方案名称", "新播报方案");
    } else {
      name = prompt("请输入预设方案名称:");
    }
    if (!name || !name.trim()) return;
    const newId = "preset_" + Date.now();
    const newPreset = {
      id: newId,
      name: name.trim(),
      templates: { ...DEFAULT_DICE_TEMPLATES }
    };
    presets.push(newPreset);
    saveStoredDicePresets(presets);
    localStorage.setItem("coc_active_dice_preset_id", newId);
    renderCommandsTab(container);
  };

  document.getElementById("cmd-saveas-preset-btn").onclick = async () => {
    let name = null;
    if (typeof window.showCustomPrompt === "function") {
      name = await window.showCustomPrompt("另存为预设", "请输入新方案名称", activePreset.name + " 副本");
    } else {
      name = prompt("请输入新方案名称:");
    }
    if (!name || !name.trim()) return;
    const newId = "preset_" + Date.now();
    const curTemplates = {};
    container.querySelectorAll(".cmd-template-input").forEach(inp => {
      curTemplates[inp.dataset.key] = inp.value.trim();
    });
    const newPreset = {
      id: newId,
      name: name.trim(),
      templates: curTemplates
    };
    presets.push(newPreset);
    saveStoredDicePresets(presets);
    localStorage.setItem("coc_active_dice_preset_id", newId);
    renderCommandsTab(container);
  };

  document.getElementById("cmd-del-preset-btn").onclick = async () => {
    if (presets.length <= 1) {
      if (typeof window.showCustomAlert === "function") {
        await window.showCustomAlert("提示", "必须保留至少一个预设方案");
      } else {
        alert("必须保留至少一个预设方案");
      }
      return;
    }
    const idx = presets.findIndex(p => p.id === activePreset.id);
    if (idx !== -1) {
      presets.splice(idx, 1);
      saveStoredDicePresets(presets);
      localStorage.setItem("coc_active_dice_preset_id", presets[0].id);
      renderCommandsTab(container);
    }
  };
}

function renderWeatherTab(container) {
  const pools = getStoredWeatherPools();
  const activePool = getActiveWeatherPool();

  let poolOptionsHtml = pools.map(p => `<option value="${p.id}" ${p.id === activePool.id ? "selected" : ""}>${p.name}</option>`).join("");

  let itemsHtml = activePool.items.map((item, index) => {
    return `
      <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 6px; background: var(--secondary-bg); padding: 4px 6px; border-radius: 6px; border: 1px solid var(--border-color);">
        <input type="text" class="moe-input weather-name-input" data-index="${index}" value="${item.name}" placeholder="天气名称" style="width: 70px; flex-shrink: 0; font-size: 11px; padding: 2px 4px;">
        <div style="display: flex; align-items: center; gap: 2px; width: 60px; flex-shrink: 0;">
          <input type="number" class="moe-input weather-rate-input" data-index="${index}" value="${item.rate}" placeholder="概率" style="width: 44px; font-size: 11px; padding: 2px 4px; text-align: right;">
          <span style="font-size: 11px; color: var(--text-secondary);">%</span>
        </div>
        <input type="text" class="moe-input weather-note-input" data-index="${index}" value="${item.note || ""}" placeholder="备注 (仅AI可见)" style="flex: 1 1 auto; font-size: 11px; padding: 2px 4px;">
        <button type="button" class="moe-btn-mini weather-del-item-btn" data-index="${index}" style="flex: 0 0 auto !important; width: 22px !important; height: 22px !important; min-width: 22px !important; padding: 0 !important; line-height: 20px !important; text-align: center; color: #ff4d4f;">&times;</button>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 10px; width: 100%; box-sizing: border-box; position: relative; z-index: 5;">
      <select id="weather-pool-select" class="moe-input" style="flex: 1 1 auto; height: 28px; min-height: 28px; font-size: 11px; padding: 2px 8px; min-width: 90px; color: var(--text-primary); background-color: var(--card-bg, #ffffff); position: relative; z-index: 5; opacity: 1; visibility: visible; border-radius: 14px;">
        ${poolOptionsHtml}
      </select>
      <button type="button" id="weather-new-pool-btn" class="moe-btn-mini" style="flex: 0 0 auto !important; width: auto !important; max-width: 44px !important; padding: 2px 6px !important; font-size: 11px !important; height: 26px !important; line-height: 20px !important;">新建</button>
      <button type="button" id="weather-save-pool-btn" class="moe-btn-mini" style="flex: 0 0 auto !important; width: auto !important; max-width: 44px !important; padding: 2px 6px !important; font-size: 11px !important; height: 26px !important; line-height: 20px !important;">保存</button>
      <button type="button" id="weather-del-pool-btn" class="moe-btn-mini" style="flex: 0 0 auto !important; width: auto !important; max-width: 44px !important; padding: 2px 6px !important; font-size: 11px !important; height: 26px !important; line-height: 20px !important;">删除</button>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="font-weight: 700; font-size: 13px; color: var(--text-primary);">天气项列表</span>
      <div style="display: flex; gap: 6px;">
        <button type="button" id="weather-test-draw-btn" class="moe-btn-mini" style="width: auto !important; padding: 2px 8px !important; font-size: 10px !important; color: var(--accent-color);">测试抽取</button>
        <button type="button" id="weather-add-item-btn" class="moe-btn-mini" style="width: auto !important; padding: 2px 8px !important; font-size: 10px !important;">+ 添加</button>
      </div>
    </div>

    <div id="weather-items-list" style="margin-bottom: 12px;">
      ${itemsHtml}
    </div>
  `;

  // 绑定事件
  document.getElementById("weather-pool-select").onchange = (e) => {
    localStorage.setItem("coc_active_weather_pool_id", e.target.value);
    renderWeatherTab(container);
  };

  document.getElementById("weather-save-pool-btn").onclick = async () => {
    const names = container.querySelectorAll(".weather-name-input");
    const rates = container.querySelectorAll(".weather-rate-input");
    const notes = container.querySelectorAll(".weather-note-input");

    activePool.items = [];
    for (let i = 0; i < names.length; i++) {
      activePool.items.push({
        name: names[i].value.trim(),
        rate: parseFloat(rates[i].value) || 0,
        note: notes[i].value.trim()
      });
    }

    saveStoredWeatherPools(pools);
    const saveBtn = document.getElementById("weather-save-pool-btn");
    saveBtn.textContent = "已保存";
    setTimeout(() => { saveBtn.textContent = "保存"; }, 1000);
  };

  document.getElementById("weather-new-pool-btn").onclick = async () => {
    let name = null;
    if (typeof window.showCustomPrompt === "function") {
      name = await window.showCustomPrompt("新建天气池", "请输入气候/天气池名称", "自定义气候");
    } else {
      name = prompt("请输入气候/天气池名称:");
    }
    if (!name || !name.trim()) return;
    const newId = "weather_" + Date.now();
    const newPool = {
      id: newId,
      name: name.trim(),
      items: [
        { name: "晴天", rate: 50, note: "晴空万里" },
        { name: "多云", rate: 30, note: "云层微厚" },
        { name: "雨天", rate: 20, note: "阴雨霏霏" }
      ]
    };
    pools.push(newPool);
    saveStoredWeatherPools(pools);
    localStorage.setItem("coc_active_weather_pool_id", newId);
    renderWeatherTab(container);
  };

  document.getElementById("weather-del-pool-btn").onclick = async () => {
    if (pools.length <= 1) {
      if (typeof window.showCustomAlert === "function") {
        await window.showCustomAlert("提示", "必须保留至少一个天气池");
      } else {
        alert("必须保留至少一个天气池");
      }
      return;
    }
    const idx = pools.findIndex(p => p.id === activePool.id);
    if (idx !== -1) {
      pools.splice(idx, 1);
      saveStoredWeatherPools(pools);
      localStorage.setItem("coc_active_weather_pool_id", pools[0].id);
      renderWeatherTab(container);
    }
  };

  document.getElementById("weather-add-item-btn").onclick = () => {
    activePool.items.push({
      name: "新天气",
      rate: 10,
      note: ""
    });
    renderWeatherTab(container);
  };

  container.querySelectorAll(".weather-del-item-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.index, 10);
      activePool.items.splice(idx, 1);
      renderWeatherTab(container);
    };
  });

  document.getElementById("weather-test-draw-btn").onclick = async () => {
    const drawn = window.drawWeatherFromCurrentPool();
    const alertMsg = `当前抽中天气: ${drawn.name} (概率: ${drawn.rate}%) 备注: ${drawn.note || "无"}`;
    if (typeof window.showCustomAlert === "function") {
      await window.showCustomAlert("天气抽取结果", alertMsg);
    } else {
      alert(alertMsg);
    }
  };
}

// 绑定导航栏标签切换事件
document.addEventListener("DOMContentLoaded", () => {
  const tabCmd = document.getElementById("cmd-tab-commands");
  const tabWeather = document.getElementById("cmd-tab-weather");
  if (tabCmd) {
    tabCmd.addEventListener("click", () => {
      currentCmdTab = "commands";
      window.renderDiceCommandCenter();
    });
  }
  if (tabWeather) {
    tabWeather.addEventListener("click", () => {
      currentCmdTab = "weather";
      window.renderDiceCommandCenter();
    });
  }
});
