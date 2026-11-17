/**
 * Internationalisation (i18n) for My Becoming Journal.
 * Supports English and Simplified Chinese.
 * Phase 1 includes core labels; full translation coverage expands in later phases.
 */

const translations = {
  en: {
    /* Nav */
    nav_home: 'Home',
    nav_calendar: 'Calendar',
    nav_projects: 'Projects',
    nav_statistics: 'Statistics',
    nav_settings: 'Settings',

    /* Home */
    brand: 'My Becoming Journal',
    home_this_month: 'This Month',
    home_all_time: 'All Time',
    home_my_projects: 'My Projects',
    home_this_month_inline: 'this month',
    home_in_total: 'total',
    home_quick_text: 'Start a focus session or record your time.',
    home_start_timer: 'Start Timer',
    home_add_record: 'Add Record',
    home_no_projects: 'No projects yet',
    home_no_projects_text: 'Create your first project to start recording time.',
    home_create_project: 'Create Project',
    home_this_month_short: 'mo',

    /* Projects */
    projects_title: 'Projects',
    projects_create: 'Create Project',
    projects_edit: 'Edit Project',
    projects_archived: 'Archived Projects',
    projects_no_active: 'No active projects',
    projects_no_active_text: 'Create a project to start recording your time.',
    projects_no_archived: 'No archived projects.',
    projects_this_month: 'this month',
    projects_all_time: 'all time',
    projects_archive: 'Archive',
    projects_restore: 'Restore',
    projects_delete: 'Delete',
    projects_archived_label: 'Archived',
    projects_delete_title: 'Delete',
    projects_delete_message: 'This will permanently delete this project and all its associated data, including:',
    projects_delete_item_records: 'All learning records.',
    projects_delete_item_notes: 'Record notes.',
    projects_delete_item_history: 'Project history.',
    projects_delete_item_project_items: 'Related project items.',
    projects_delete_item_timers: 'Associated timer sessions.',
    projects_delete_warning: 'This action cannot be undone.',
    projects_delete_confirm: 'Delete Project',

    /* Project form */
    project_name: 'Project Name',
    project_colour: 'Project Colour',
    project_name_placeholder: 'e.g. Spanish, Reading, Yoga…',
    project_save: 'Save',
    project_cancel: 'Cancel',

    /* Records */
    record_add: 'Add Record',
    record_edit: 'Edit Record',
    record_project: 'Project',
    record_date: 'Date',
    record_duration: 'Duration',
    record_duration_min: 'minutes',
    record_hours: 'Hours',
    record_minutes: 'Minutes',
    record_duration_hint: 'Enter hours, minutes, or both.',
    record_note: 'Note',
    record_note_placeholder: 'Optional note about this session…',
    record_save: 'Save',
    record_cancel: 'Cancel',
    record_delete: 'Delete',
    record_delete_confirm: 'Delete this record? This cannot be undone.',
    record_select_project: 'Select a project',
    record_no_project: 'No project',
    record_actions_hint: 'Tap a row to edit or delete',

    /* Common */
    common_today: 'Today',
    common_yes: 'Yes',
    common_no: 'No',
    common_confirm: 'Confirm',
    common_close: 'Close',
    common_back: 'Back',
    common_minutes: 'minutes',
    common_hours: 'hours',
    common_none: 'None',
    common_select: 'Select…',

    /* Days of week (Monday-first) */
    day_mon_short: 'Mon',
    day_tue_short: 'Tue',
    day_wed_short: 'Wed',
    day_thu_short: 'Thu',
    day_fri_short: 'Fri',
    day_sat_short: 'Sat',
    day_sun_short: 'Sun',

    /* Months */
    month_1: 'January', month_2: 'February', month_3: 'March', month_4: 'April',
    month_5: 'May', month_6: 'June', month_7: 'July', month_8: 'August',
    month_9: 'September', month_10: 'October', month_11: 'November', month_12: 'December',
  },

  zh: {
    nav_home: '首页',
    nav_calendar: '日历',
    nav_projects: '项目',
    nav_statistics: '统计',
    nav_settings: '设置',

    brand: '我的成长日志',
    home_this_month: '本月',
    home_all_time: '累计',
    home_my_projects: '我的项目',
    home_this_month_inline: '本月',
    home_in_total: '累计',
    home_quick_text: '开始一次专注，或记录你的时间。',
    home_start_timer: '开始计时',
    home_add_record: '添加记录',
    home_no_projects: '还没有项目',
    home_no_projects_text: '创建你的第一个项目，开始记录时间。',
    home_create_project: '创建项目',
    home_this_month_short: '月',

    projects_title: '项目',
    projects_create: '创建项目',
    projects_edit: '编辑项目',
    projects_archived: '已归档项目',
    projects_no_active: '没有活动项目',
    projects_no_active_text: '创建一个项目，开始记录你的时间。',
    projects_no_archived: '没有已归档的项目。',
    projects_this_month: '本月',
    projects_all_time: '累计',
    projects_archive: '归档',
    projects_restore: '恢复',
    projects_delete: '删除',
    projects_archived_label: '已归档',
    projects_delete_title: '删除',
    projects_delete_message: '此操作将永久删除该项目及其所有关联数据，包括：',
    projects_delete_item_records: '所有学习记录。',
    projects_delete_item_notes: '记录备注。',
    projects_delete_item_history: '项目历史。',
    projects_delete_item_project_items: '相关项目条目。',
    projects_delete_item_timers: '关联的计时器会话。',
    projects_delete_warning: '此操作无法撤销。',
    projects_delete_confirm: '删除项目',

    project_name: '项目名称',
    project_colour: '项目颜色',
    project_name_placeholder: '例如：西班牙语、阅读、瑜伽…',
    project_save: '保存',
    project_cancel: '取消',

    record_add: '添加记录',
    record_edit: '编辑记录',
    record_project: '项目',
    record_date: '日期',
    record_duration: '时长',
    record_duration_min: '分钟',
    record_hours: '小时',
    record_minutes: '分钟',
    record_duration_hint: '可只填小时或分钟，也可都填。',
    record_note: '备注',
    record_note_placeholder: '可选：关于这次记录的备注…',
    record_save: '保存',
    record_cancel: '取消',
    record_delete: '删除',
    record_delete_confirm: '确认删除这条记录？此操作不可撤销。',
    record_select_project: '选择项目',
    record_no_project: '无项目',
    record_actions_hint: '点击记录可编辑或删除',

    common_today: '今天',
    common_yes: '是',
    common_no: '否',
    common_confirm: '确认',
    common_close: '关闭',
    common_back: '返回',
    common_minutes: '分钟',
    common_hours: '小时',
    common_none: '无',
    common_select: '选择…',

    day_mon_short: '一', day_tue_short: '二', day_wed_short: '三',
    day_thu_short: '四', day_fri_short: '五', day_sat_short: '六', day_sun_short: '日',

    month_1: '一月', month_2: '二月', month_3: '三月', month_4: '四月',
    month_5: '五月', month_6: '六月', month_7: '七月', month_8: '八月',
    month_9: '九月', month_10: '十月', month_11: '十一月', month_12: '十二月',
  },
};

let _currentLang = 'en';

export function setLanguage(lang) {
  if (translations[lang]) {
    _currentLang = lang;
  }
}

export function getLanguage() {
  return _currentLang;
}

export function getAvailableLanguages() {
  return [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '简体中文' },
  ];
}

/**
 * Translate a key. Falls back to English, then to the key itself.
 */
export function t(key, params) {
  let str = translations[_currentLang]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

/**
 * Detect device language on first launch.
 */
export function detectDeviceLanguage() {
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}
