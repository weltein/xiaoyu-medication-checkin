const PLAN_STORAGE_KEY = "medication-plans-v1";
const RECORD_STORAGE_KEY = "medication-checkin-records-v1";
const SLOTS = ["早", "午", "晚", "睡前"];
const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const DEFAULT_PLANS = [
  {
    id: "gatifloxacin",
    name: "加替沙星滴眼液（术前已开）",
    rule: "每天4次 · 9/16–9/22",
    periods: [{ start: "2026-09-16", end: "2026-09-22", slots: SLOTS.slice() }]
  },
  {
    id: "tobradex",
    name: "典必殊（妥布霉素地塞米松）滴眼液",
    rule: "每天4次 · 9/16–9/19",
    warning: "激素类用药，严格按医嘱",
    periods: [{ start: "2026-09-16", end: "2026-09-19", slots: SLOTS.slice() }]
  },
  {
    id: "fluorometholone",
    name: "氟米龙滴眼液",
    rule: "按阶段减量 · 9/20–10/10",
    warning: "激素类用药，严格按医嘱",
    periods: [
      { start: "2026-09-20", end: "2026-09-26", slots: SLOTS.slice() },
      { start: "2026-09-27", end: "2026-10-03", slots: ["早", "晚"] },
      { start: "2026-10-04", end: "2026-10-10", slots: ["睡前"] }
    ]
  },
  {
    id: "vitamin-a-gel",
    name: "维生素A棕阀酸酯眼用凝胶",
    rule: "每晚睡前1次 · 9/16–9/29",
    periods: [{ start: "2026-09-16", end: "2026-09-29", slots: ["睡前"] }]
  },
  {
    id: "artificial-tears",
    name: "人工泪液",
    rule: "每天4次 · 9/30–3/30",
    periods: [{ start: "2026-09-30", end: "2027-03-30", slots: SLOTS.slice() }]
  },
  {
    id: "betaxolol",
    name: "盐酸倍他洛尔滴眼液",
    rule: "每晚1次 · 9/16–10/16",
    periods: [{ start: "2026-09-16", end: "2026-10-16", slots: ["睡前"] }]
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localDate(value) {
  const date = value || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(key) {
  const parts = key.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function recordId(key, slot, medicineId) {
  return `${key}|${slot}|${medicineId}`;
}

function loadPlans() {
  const saved = wx.getStorageSync(PLAN_STORAGE_KEY);
  return Array.isArray(saved) && saved.length === DEFAULT_PLANS.length ? saved : clone(DEFAULT_PLANS);
}

function loadRecords() {
  const saved = wx.getStorageSync(RECORD_STORAGE_KEY);
  return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

Page({
  data: {
    selectedDateKey: "",
    dateTitle: "",
    weekdayText: "",
    isToday: true,
    groups: [],
    totalCount: 0,
    completedCount: 0,
    progressPercent: 0,
    plans: [],
    editorVisible: false,
    editingPlan: false,
    editingPlanId: "",
    draft: null,
    formError: ""
  },

  onLoad() {
    this.setData({ plans: loadPlans(), selectedDateKey: dateKey(localDate()) });
    this.renderSchedule();
  },

  onShow() {
    if (this.data.selectedDateKey) this.renderSchedule();
  },

  renderSchedule() {
    const key = this.data.selectedDateKey;
    const selectedDate = parseDate(key);
    const records = loadRecords();
    const groups = SLOTS.map((slot) => ({ slot, tasks: [] }));

    this.data.plans.forEach((plan) => {
      plan.periods.forEach((period) => {
        if (key < period.start || key > period.end) return;
        period.slots.forEach((slot) => {
          const group = groups.find((item) => item.slot === slot);
          if (!group) return;
          const id = recordId(key, slot, plan.id);
          group.tasks.push({
            id: plan.id,
            recordId: id,
            name: plan.name,
            rule: plan.rule,
            warning: plan.warning || "",
            completed: Boolean(records[id]),
            recordedTime: records[id] ? records[id].time : ""
          });
        });
      });
    });

    const visibleGroups = groups.filter((group) => group.tasks.length);
    const tasks = visibleGroups.reduce((all, group) => all.concat(group.tasks), []);
    const completedCount = tasks.filter((task) => task.completed).length;
    const todayKey = dateKey(localDate());
    this.setData({
      dateTitle: `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`,
      weekdayText: `${key === todayKey ? "今天 · " : ""}${WEEKDAYS[selectedDate.getDay()]}`,
      isToday: key === todayKey,
      groups: visibleGroups,
      totalCount: tasks.length,
      completedCount,
      progressPercent: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
    });
  },

  moveDay(event) {
    const current = parseDate(this.data.selectedDateKey);
    current.setDate(current.getDate() + Number(event.currentTarget.dataset.offset));
    this.setData({ selectedDateKey: dateKey(current) });
    this.renderSchedule();
    wx.pageScrollTo({ scrollTop: 0, duration: 180 });
  },

  backToday() {
    this.setData({ selectedDateKey: dateKey(localDate()) });
    this.renderSchedule();
  },

  toggleRecord(event) {
    const slot = event.currentTarget.dataset.slot;
    const medicineId = event.currentTarget.dataset.medicineId;
    const id = recordId(this.data.selectedDateKey, slot, medicineId);
    const records = loadRecords();
    if (records[id]) {
      delete records[id];
    } else {
      const now = new Date();
      records[id] = {
        completedAt: now.toISOString(),
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      };
    }
    wx.setStorageSync(RECORD_STORAGE_KEY, records);
    this.renderSchedule();
  },

  openEditor() {
    this.setData({ editorVisible: true, editingPlan: false, editingPlanId: "", draft: null, formError: "" });
  },

  closeEditor() {
    this.setData({ editorVisible: false, editingPlan: false, draft: null, formError: "" });
  },

  stopPropagation() {},

  showPlanList() {
    this.setData({ editingPlan: false, editingPlanId: "", draft: null, formError: "" });
  },

  editPlan(event) {
    const plan = this.data.plans.find((item) => item.id === event.currentTarget.dataset.planId);
    if (!plan) return;
    const draft = clone(plan);
    draft.periods = draft.periods.map((period) => ({
      start: period.start,
      end: period.end,
      slots: period.slots.slice(),
      slotOptions: SLOTS.map((name) => ({ name, selected: period.slots.includes(name) }))
    }));
    this.setData({ editingPlan: true, editingPlanId: plan.id, draft, formError: "" });
  },

  updateTextField(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`draft.${field}`]: event.detail.value, formError: "" });
  },

  changeDate(event) {
    const phaseIndex = Number(event.currentTarget.dataset.phaseIndex);
    const field = event.currentTarget.dataset.dateField;
    this.setData({ [`draft.periods[${phaseIndex}].${field}`]: event.detail.value, formError: "" });
  },

  toggleDraftSlot(event) {
    const phaseIndex = Number(event.currentTarget.dataset.phaseIndex);
    const slot = event.currentTarget.dataset.slot;
    const draft = clone(this.data.draft);
    const period = draft.periods[phaseIndex];
    period.slotOptions = period.slotOptions.map((item) => (
      item.name === slot ? { name: item.name, selected: !item.selected } : item
    ));
    period.slots = period.slotOptions.filter((item) => item.selected).map((item) => item.name);
    this.setData({ draft, formError: "" });
  },

  savePlan() {
    const draft = clone(this.data.draft);
    draft.name = (draft.name || "").trim();
    draft.rule = (draft.rule || "").trim();
    if (!draft.name || !draft.rule) {
      this.setData({ formError: "请填写药品名称和用法。" });
      return;
    }
    if (draft.periods.some((period) => !period.start || !period.end || period.start > period.end)) {
      this.setData({ formError: "请检查开始和结束日期。" });
      return;
    }
    if (draft.periods.some((period) => !period.slots.length)) {
      this.setData({ formError: "每个使用阶段至少选择一个时段。" });
      return;
    }

    draft.periods = draft.periods.map((period) => ({
      start: period.start,
      end: period.end,
      slots: period.slots.slice()
    }));
    const plans = this.data.plans.map((plan) => plan.id === this.data.editingPlanId ? draft : plan);
    wx.setStorageSync(PLAN_STORAGE_KEY, plans);
    this.setData({ plans, editingPlan: false, editingPlanId: "", draft: null, formError: "" });
    this.renderSchedule();
    wx.showToast({ title: "已保存", icon: "success", duration: 1200 });
  }
});
