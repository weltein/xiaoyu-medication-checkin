const assert = require("assert");

const storage = {};
global.wx = {
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = JSON.parse(JSON.stringify(value));
  },
  pageScrollTo() {},
  showToast() {}
};

global.Page = (definition) => {
  global.pageDefinition = definition;
};

require("../miniprogram/pages/index/index.js");

const page = global.pageDefinition;
page.data = JSON.parse(JSON.stringify(page.data));
page.setData = function setData(updates) {
  Object.entries(updates).forEach(([path, value]) => {
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let target = this.data;
    for (let index = 0; index < parts.length - 1; index += 1) {
      target = target[parts[index]];
    }
    target[parts[parts.length - 1]] = value;
  });
};

page.onLoad();
page.setData({ selectedDateKey: "2026-09-19" });
page.renderSchedule();

assert.strictEqual(page.data.totalCount, 10, "9月19日应有10项用药任务");
assert.strictEqual(page.data.completedCount, 0, "初始不应有打卡记录");
assert.deepStrictEqual(page.data.groups.map((group) => group.slot), ["早", "午", "晚", "睡前"]);

page.toggleRecord({ currentTarget: { dataset: { slot: "早", medicineId: "gatifloxacin" } } });
assert.strictEqual(page.data.completedCount, 1, "记录后完成数应增加");

page.toggleRecord({ currentTarget: { dataset: { slot: "早", medicineId: "gatifloxacin" } } });
assert.strictEqual(page.data.completedCount, 0, "再次点击后应取消记录");

page.editPlan({ currentTarget: { dataset: { planId: "gatifloxacin" } } });
page.updateTextField({ currentTarget: { dataset: { field: "name" } }, detail: { value: "测试药品名称" } });
page.savePlan();
assert.strictEqual(page.data.plans[0].name, "测试药品名称", "应保存药品名称修改");

page.setData({ selectedDateKey: "2026-09-23" });
page.renderSchedule();
assert.strictEqual(page.data.totalCount, 6, "9月23日应按阶段显示6项用药任务");

console.log("Mini Program smoke tests passed.");
