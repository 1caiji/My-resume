const STORAGE_KEY = "future-nexus-portal:v1";
const DATA_FILE_PATH = "./resume-data.json";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const categoryLabels = {
    education: "教育",
    honor: "奖项",
    publication: "成果",
    project: "项目",
    experience: "经历",
    role: "角色",
    config: "配置",
    help: "帮助",
};

const accentLabels = {
    cyan: "电光蓝",
    violet: "霓虹紫",
    pink: "炫光粉",
    green: "量子绿",
    amber: "琥珀橙",
};

const themeLabels = {
    obsidian: "深色科技",
    aurora: "极光霓彩",
    guofeng: "古风素雅",
    oilpaint: "油画艺术",
};

const state = createDefaultState();
const ui = {
    view: "dashboard",
    search: "",
    filter: "all",
    modal: null,
    selectedModuleId: null,
    expandedEntries: new Set(),
    publishedLoaded: false,
    hasLocalDraft: false,
};

const els = {
    viewTitle: document.getElementById("view-title"),
    navButtons: [...document.querySelectorAll(".nav-button")],
    panels: [...document.querySelectorAll(".view-panel")],
    search: document.getElementById("global-search"),
    filter: document.getElementById("category-filter"),
    dashboard: document.getElementById("dashboard-view"),
    knowledge: document.getElementById("knowledge-view"),
    content: document.getElementById("content-view"),
    media: document.getElementById("media-view"),
    help: document.getElementById("help-view"),
    settings: document.getElementById("settings-view"),
    modalShell: document.getElementById("modal-shell"),
    modalTitle: document.getElementById("modal-title"),
    modalKicker: document.getElementById("modal-kicker"),
    modalForm: document.getElementById("modal-form"),
    toastStack: document.getElementById("toast-stack"),
    avatarInput: document.getElementById("avatar-input"),
    galleryInput: document.getElementById("gallery-input"),
    importInput: document.getElementById("import-input"),
    pulse: document.getElementById("system-pulse"),
};

init();

async function init() {
    bindStaticEvents();
    await hydrateState();
    applySystemSettings();
    render();
    startParticles();
}

function bindStaticEvents() {
    els.navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            ui.view = button.dataset.view;
            render();
        });
    });

    els.search.addEventListener("input", (event) => {
        ui.search = event.target.value.trim();
        render();
    });

    els.filter.addEventListener("change", (event) => {
        ui.filter = event.target.value;
        render();
    });

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("change", handleDocumentChange);
    document.addEventListener("submit", handleDocumentSubmit);

    els.avatarInput.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImageUpload(file, "avatar");
        }
        event.target.value = "";
    });

    els.galleryInput.addEventListener("change", (event) => {
        [...(event.target.files || [])].forEach((file) => handleImageUpload(file, "gallery"));
        event.target.value = "";
    });

    els.importInput.addEventListener("change", handleImportFile);
}

function render() {
    renderActiveView();
    renderDashboard();
    renderKnowledge();
    renderContent();
    renderMedia();
    renderHelp();
    renderSettings();
    renderModal();
    bindDropzones();
    updatePulse();
}

function renderActiveView() {
    const titleMap = {
        dashboard: "简历总览",
        knowledge: "简历信息",
        content: "内容维护",
        media: "图片资料",
        help: "帮助中心",
        settings: "页面设置",
    };

    els.viewTitle.textContent = titleMap[ui.view];
    els.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === ui.view));
    els.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === ui.view));
}

function renderDashboard() {
    const stats = computeStats();
    const recent = getRecentUpdates(6);
    const timeline = getTimelineItems(8);
    const featuredModules = state.modules.filter((module) => ["honor", "publication", "project", "experience"].includes(module.category)).slice(0, 4);
    const homepageImage = getHomepageImage();
    const searchResults = ui.search ? getSearchResults(6) : null;

    els.dashboard.innerHTML = `
        <div class="dashboard-grid">
            <div class="dashboard-stack">
                <article class="hero-card">
                    <div class="hero-header">
                        <div class="hero-copy">
                            <span class="eyebrow">Personal Resume Overview</span>
                            <h3>${escapeHTML(state.profile.tagline)}</h3>
                            <p>${escapeHTML(state.profile.summary)}</p>
                        </div>
                        <div class="hero-visual">
                            <div class="hero-figure">
                                <img src="${homepageImage.dataUrl}" alt="${escapeAttribute(homepageImage.name || state.profile.name)}" style="object-fit:${homepageImage.fit || "cover"};">
                            </div>
                            <div class="profile-badge">
                                <span>${escapeHTML(state.profile.name)}</span>
                                <strong>${escapeHTML(state.profile.headline)}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="chip-row">
                        ${state.profile.focusTags.map((tag) => `<span class="chip">${escapeHTML(tag)}</span>`).join("")}
                    </div>
                    <div class="stat-grid">
                        <div class="stat-tile"><span>模块总数</span><strong>${stats.modules}</strong></div>
                        <div class="stat-tile"><span>知识条目</span><strong>${stats.entries}</strong></div>
                        <div class="stat-tile"><span>图片资产</span><strong>${stats.images}</strong></div>
                        <div class="stat-tile stat-tile--date"><span>最近更新</span><strong>${escapeHTML(stats.lastUpdate)}</strong></div>
                    </div>
                    <div class="action-row" style="justify-content:flex-start;">
                        <button class="primary-action" data-quick-action="add-entry" aria-label="新增条目"><i class="fas fa-plus"></i></button>
                        <button class="secondary-action" data-quick-action="upload-image" aria-label="上传图片"><i class="fas fa-upload"></i></button>
                        <button class="secondary-action" data-quick-action="export-data" aria-label="导出数据"><i class="fas fa-download"></i></button>
                    </div>
                </article>

                ${searchResults ? `
                    <article class="summary-card">
                        <div class="section-headline">
                            <div>
                                <span class="eyebrow">Search Result</span>
                                <h4>搜索结果</h4>
                            </div>
                            <span class="module-badge">${searchResults.modules.length} 个模块 · ${searchResults.items.length} 条内容</span>
                        </div>
                        <p class="meta-text">当前关键词：${escapeHTML(ui.search)}</p>
                        <div class="summary-list" style="margin-top:14px;">
                            ${searchResults.items.map((result) => `
                                <div class="summary-item">
                                    <span class="date-chip">${escapeHTML(categoryLabels[result.module.category] || result.module.category)}</span>
                                    <strong>${escapeHTML(result.item.title)}</strong>
                                    <p>${escapeHTML(result.module.title)}${result.item.subtitle ? ` · ${escapeHTML(result.item.subtitle)}` : result.item.date ? ` · ${escapeHTML(result.item.date)}` : ""}</p>
                                </div>
                            `).join("") || `<div class="empty-state">没有匹配到相关内容，请换个关键词试试。</div>`}
                        </div>
                        <div class="inline-actions" style="margin-top:14px;">
                            <button class="pill-button" data-go-view="knowledge" aria-label="查看筛选后的简历信息"><i class="fas fa-file-alt"></i></button>
                            <button class="pill-button" data-go-view="content" aria-label="查看可维护内容"><i class="fas fa-edit"></i></button>
                        </div>
                    </article>
                ` : ""}

                <div class="quick-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                    ${featuredModules.map((module) => `
                        <article class="summary-card">
                            <div class="section-headline">
                                <div>
                                    <span class="eyebrow">${escapeHTML(categoryLabels[module.category])}</span>
                                    <h4>${escapeHTML(module.title)}</h4>
                                </div>
                                <span class="module-badge">${module.items.length} 条</span>
                            </div>
                            <p class="meta-text">${escapeHTML(module.description)}</p>
                            <div class="inline-actions" style="margin-top:14px;">
                                <button class="pill-button" data-go-view="knowledge" aria-label="浏览模块"><i class="fas fa-eye"></i></button>
                                <button class="pill-button" data-module-select="${module.id}" data-go-view="content" aria-label="管理内容"><i class="fas fa-cog"></i></button>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </div>

            <div class="dashboard-stack">
                <article class="summary-card">
                    <div class="section-headline">
                        <h4>最近更新</h4>
                        <span class="module-badge">${recent.length} 条</span>
                    </div>
                    <div class="summary-list">
                        ${recent.map((item) => `
                            <div class="summary-item">
                                <span class="date-chip">${escapeHTML(formatDate(item.updatedAt))}</span>
                                <strong>${escapeHTML(item.title)}</strong>
                                <p>${escapeHTML(item.moduleTitle)} · ${escapeHTML(item.subtitle || item.date || "已同步到知识库")}</p>
                            </div>
                        `).join("") || `<div class="empty-state">还没有更新记录。</div>`}
                    </div>
                </article>

                <article class="summary-card">
                    <div class="section-headline">
                        <h4>关键时间线</h4>
                        <span class="module-badge">${timeline.length} 条</span>
                    </div>
                    <div class="timeline-list">
                        ${timeline.map((item) => `
                            <div class="timeline-item">
                                <span class="date-chip">${escapeHTML(item.date || "未标注时间")}</span>
                                <strong>${escapeHTML(item.title)}</strong>
                                <p>${escapeHTML(item.moduleTitle)}${item.subtitle ? ` · ${escapeHTML(item.subtitle)}` : ""}</p>
                            </div>
                        `).join("") || `<div class="empty-state">为条目补充日期后，会自动汇入这里。</div>`}
                    </div>
                </article>
            </div>
        </div>
    `;
}

function renderKnowledge() {
    const grouped = groupVisibleModules();
    const sections = Object.entries(grouped).map(([category, modules]) => `
        <div class="knowledge-group">
            <div class="section-headline">
                <div>
                    <span class="eyebrow">${escapeHTML(categoryLabels[category] || "模块")}</span>
                    <h3>${escapeHTML(categoryLabels[category] || "模块")}</h3>
                </div>
                <span class="module-badge">${modules.length} 个模块</span>
            </div>
            <div class="module-grid">
                ${modules.map((module) => renderKnowledgeModule(module)).join("")}
            </div>
        </div>
    `).join("");

    els.knowledge.innerHTML = sections || `<div class="empty-state">当前筛选条件下没有匹配模块，试试调整搜索词或分类。</div>`;
}

function renderKnowledgeModule(module) {
    const visibleItems = getVisibleItems(module);
    const itemsMarkup = module.collapsed ? "" : visibleItems.slice(0, 8).map((item) => renderEntryCard(item, module, "knowledge")).join("");
    const collapsedLabel = module.collapsed ? "展开" : "收起";

    return `
        <article class="module-card">
            <div class="module-card-header">
                <div>
                    <div class="module-meta">
                        <span class="module-badge">${escapeHTML(categoryLabels[module.category])}</span>
                        <span class="accent-pill">${escapeHTML(accentLabels[module.accent] || module.accent)}</span>
                    </div>
                    <h4 style="margin-top:10px;">${escapeHTML(module.title)}</h4>
                </div>
                <div class="module-actions">
                    <button class="module-action" data-module-collapse="${module.id}" aria-label="${collapsedLabel}"><i class="fas ${module.collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i></button>
                    <button class="module-action" data-edit-module="${module.id}" aria-label="编辑模块"><i class="fas fa-pencil-alt"></i></button>
                    <button class="module-action" data-add-item-to="${module.id}" aria-label="新增条目"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <p class="module-summary">${escapeHTML(module.description)}</p>
            <div class="module-meta">
                <span class="status-pill">${visibleItems.length} 条可见内容</span>
                <span class="module-badge">最近更新：${escapeHTML(formatDate(module.updatedAt))}</span>
            </div>
            ${module.collapsed ? "" : `<div class="entry-grid">${itemsMarkup || `<div class="empty-state">当前没有匹配条目。</div>`}</div>`}
        </article>
    `;
}

function renderEntryCard(item, module, mode) {
    const expanded = ui.expandedEntries.has(item.id) || mode === "content";
    const longText = item.description || "";
    const preview = expanded ? renderRichText(longText) : renderRichText(truncateText(longText, 180));
    const canExpand = stripHtml(longText).length > 180;

    return `
        <div class="entry-card">
            <div class="entry-card-header">
                <div>
                    <strong>${escapeHTML(item.title)}</strong>
                    <p>${escapeHTML(item.subtitle || item.date || "未补充副标题")}</p>
                </div>
                <div class="inline-actions">
                    ${canExpand ? `<button class="icon-action" data-item-expand="${item.id}" aria-label="${expanded ? '折叠' : '展开'}"><i class="fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}"></i></button>` : ""}
                    ${mode === "content" ? `
                        <button class="icon-action" data-edit-item="${module.id}|${item.id}" aria-label="编辑条目"><i class="fas fa-pencil-alt"></i></button>
                        <button class="icon-action" data-delete-item="${module.id}|${item.id}" aria-label="删除条目"><i class="fas fa-trash"></i></button>
                    ` : ""}
                </div>
            </div>
            ${item.date ? `<span class="date-chip">${escapeHTML(item.date)}</span>` : ""}
            <div class="meta-text" style="margin-top:10px;">${preview}</div>
            ${item.tags?.length ? `<div class="entry-tags">${item.tags.map((tag) => `<span class="entry-tag">${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
        </div>
    `;
}

function renderContent() {
    const modules = getFilteredModules();
    if (!modules.length && (ui.search || ui.filter !== "all")) {
        els.content.innerHTML = `<div class="empty-state">当前筛选条件下没有匹配模块，请调整搜索词或分类。</div>`;
        return;
    }
    if (!modules.length) {
        els.content.innerHTML = `<div class="empty-state">当前没有模块。点击“新增模块”开始构建你的知识中枢。</div>`;
        return;
    }

    if (!modules.some((module) => module.id === ui.selectedModuleId)) {
        ui.selectedModuleId = modules[0].id;
    }

    const currentModule = modules.find((module) => module.id === ui.selectedModuleId);
    const visibleItems = getVisibleItems(currentModule);

    els.content.innerHTML = `
        <div class="content-layout">
            <article class="content-card">
                <div class="content-head">
                    <div>
                        <span class="eyebrow">Module List</span>
                        <h4>模块列表</h4>
                    </div>
                    <button class="primary-action" data-quick-action="add-module" aria-label="新增模块"><i class="fas fa-plus"></i></button>
                </div>
                <div class="module-list">
                    ${modules.map((module, index) => `
                        <div class="module-list-item ${module.id === ui.selectedModuleId ? "active" : ""}" data-module-select="${module.id}">
                            <strong>${escapeHTML(module.title)}</strong>
                            <p>${escapeHTML(module.description)}</p>
                            <div class="inline-actions" style="margin-top:10px;">
                                <span class="module-badge">${escapeHTML(categoryLabels[module.category])}</span>
                                <button class="icon-action" data-module-up="${module.id}" ${index === 0 ? "disabled" : ""} aria-label="上移"><i class="fas fa-arrow-up"></i></button>
                                <button class="icon-action" data-module-down="${module.id}" ${index === modules.length - 1 ? "disabled" : ""} aria-label="下移"><i class="fas fa-arrow-down"></i></button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </article>

            <article class="content-card">
                <div class="content-head">
                    <div>
                        <span class="eyebrow">Content Maintenance</span>
                        <h4>${escapeHTML(currentModule.title)}</h4>
                        <p class="meta-text">${escapeHTML(currentModule.description)}</p>
                    </div>
                    <div class="content-toolbar">
                        <button class="icon-action" data-edit-module="${currentModule.id}" aria-label="编辑模块"><i class="fas fa-pencil-alt"></i></button>
                        <button class="icon-action" data-add-item-to="${currentModule.id}" aria-label="新增条目"><i class="fas fa-plus"></i></button>
                        <button class="icon-action danger" data-delete-module="${currentModule.id}" aria-label="删除模块"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="summary-item" style="margin-bottom:14px;">
                    <strong>模块设置</strong>
                    <p>分类：${escapeHTML(categoryLabels[currentModule.category])} · 条目：${currentModule.items.length} · 最近更新：${escapeHTML(formatDate(currentModule.updatedAt))}</p>
                </div>
                <div class="entry-grid">
                    ${visibleItems.map((item, index) => `
                        <div class="entry-item">
                            <div class="entry-card-header">
                                <div>
                                    <strong>${escapeHTML(item.title)}</strong>
                                    <p>${escapeHTML(item.subtitle || item.date || "未补充副标题")}</p>
                                </div>
                                <div class="inline-actions">
                                    <button class="icon-action" data-item-up="${currentModule.id}|${item.id}" ${index === 0 ? "disabled" : ""} aria-label="上移"><i class="fas fa-arrow-up"></i></button>
                                    <button class="icon-action" data-item-down="${currentModule.id}|${item.id}" ${index === visibleItems.length - 1 ? "disabled" : ""} aria-label="下移"><i class="fas fa-arrow-down"></i></button>
                                </div>
                            </div>
                            ${renderEntryCard(item, currentModule, "content")}
                        </div>
                    `).join("") || `<div class="empty-state">当前筛选下没有条目，或者模块还未加入内容。</div>`}
                </div>
            </article>
        </div>
    `;
}

function renderMedia() {
    const avatarFit = state.profile.avatar?.fit || "cover";

    els.media.innerHTML = `
        <div class="media-grid">
            <article class="media-card">
                <div class="media-head">
                    <div>
                        <span class="eyebrow">Profile</span>
                        <h4>头像与简介</h4>
                    </div>
                    <div class="inline-actions">
                        <button class="primary-action" data-avatar-upload="true" aria-label="上传头像"><i class="fas fa-upload"></i></button>
                        <button class="secondary-action" data-avatar-delete="true" aria-label="删除头像"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="avatar-grid">
                    <div class="avatar-preview">
                        <img src="${state.profile.avatar.dataUrl}" alt="头像预览" style="object-fit:${avatarFit};">
                    </div>
                    <p class="meta-text">上传头像后，首页会优先显示头像；如果没有头像，则首页自动显示最新上传的图片。</p>
                    <form id="profile-form" class="modal-form">
                        <div class="form-grid">
                            <label class="field-block"><span>姓名</span><input name="name" value="${escapeAttribute(state.profile.name)}"></label>
                            <label class="field-block"><span>头衔</span><input name="headline" value="${escapeAttribute(state.profile.headline)}"></label>
                            <label class="field-block"><span>状态</span><input name="status" value="${escapeAttribute(state.profile.status)}"></label>
                            <label class="field-block"><span>所在地 / 当前节点</span><input name="location" value="${escapeAttribute(state.profile.location)}"></label>
                            <label class="field-block" style="grid-column:1/-1;"><span>门户标语</span><input name="tagline" value="${escapeAttribute(state.profile.tagline)}"></label>
                            <label class="field-block" style="grid-column:1/-1;"><span>简介摘要</span><textarea name="summary">${escapeHTML(state.profile.summary)}</textarea></label>
                            <label class="field-block" style="grid-column:1/-1;"><span>补充说明</span><textarea name="bio">${escapeHTML(state.profile.bio)}</textarea></label>
                            <label class="field-block"><span>头像展示模式</span>
                                <select name="avatarFit">
                                    <option value="cover" ${avatarFit === "cover" ? "selected" : ""}>自适应填充</option>
                                    <option value="contain" ${avatarFit === "contain" ? "selected" : ""}>完整显示</option>
                                </select>
                            </label>
                            <label class="field-block"><span>焦点标签</span><input name="focusTags" value="${escapeAttribute(state.profile.focusTags.join(", "))}"></label>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="primary-action">保存个人资料</button>
                        </div>
                    </form>
                </div>
            </article>

            <article class="media-card">
                <div class="media-head">
                    <div>
                        <span class="eyebrow">Gallery</span>
                        <h4>照片上传与图库</h4>
                    </div>
                    <button class="primary-action" data-gallery-upload="true" aria-label="新增图片"><i class="fas fa-plus"></i></button>
                </div>
                <div class="upload-dropzone" data-upload-zone="gallery">
                    <strong>拖拽图片到这里，或点击按钮上传</strong>
                    <p class="meta-text">支持 JPG / PNG / WEBP / GIF，单张不超过 5MB。上传后立即预览，可替换、删除，并切换显示模式。</p>
                    <div class="inline-actions" style="justify-content:center;">
                        <button class="upload-button" data-gallery-upload="true" aria-label="选择图片"><i class="fas fa-upload"></i></button>
                    </div>
                </div>
                <div class="gallery-grid" style="margin-top:18px;">
                    ${state.profile.gallery.map((photo) => `
                        <div class="gallery-card">
                            <div class="gallery-thumb">
                                <img src="${photo.dataUrl}" alt="${escapeAttribute(photo.name)}" style="object-fit:${photo.fit || "cover"};">
                            </div>
                            <div>
                                <strong>${escapeHTML(photo.name)}</strong>
                                <p class="meta-text">${escapeHTML(formatDate(photo.createdAt))}</p>
                            </div>
                            <label class="field-block">
                                <span>显示模式</span>
                                <select data-photo-fit="${photo.id}">
                                    <option value="cover" ${(photo.fit || "cover") === "cover" ? "selected" : ""}>自适应填充</option>
                                    <option value="contain" ${(photo.fit || "cover") === "contain" ? "selected" : ""}>完整显示</option>
                                </select>
                            </label>
                            <div class="inline-actions">
                                <button class="icon-action danger" data-photo-delete="${photo.id}" aria-label="删除图片"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join("") || `<div class="empty-state">当前还没有上传图片，可以先上传头像或建立图库。</div>`}
                </div>
            </article>
        </div>
    `;
}

function renderHelp() {
    const helpModules = state.modules.filter((module) => module.category === "help");
    const configModules = state.modules.filter((module) => module.category === "config");

    els.help.innerHTML = `
        <div class="help-grid">
            ${helpModules.map((module) => `
                <article class="help-card">
                    <div class="section-headline">
                        <div>
                        <span class="eyebrow">Guide</span>
                            <h4>${escapeHTML(module.title)}</h4>
                        </div>
                        <button class="pill-button" data-edit-module="${module.id}" aria-label="编辑说明"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                    <div class="faq-grid">
                        ${module.items.map((item) => `
                            <div class="faq-item">
                                <strong>${escapeHTML(item.title)}</strong>
                                <p>${renderRichText(item.description)}</p>
                            </div>
                        `).join("")}
                    </div>
                </article>
            `).join("")}

            <article class="help-card">
                <div class="section-headline">
                    <div>
                        <span class="eyebrow">Tips</span>
                        <h4>维护提示</h4>
                    </div>
                    <button class="pill-button" data-go-view="settings">前往页面设置</button>
                </div>
                <div class="faq-grid">
                    ${configModules.flatMap((module) => module.items.slice(0, 2)).map((item) => `
                        <div class="faq-item">
                            <strong>${escapeHTML(item.title)}</strong>
                            <p>${renderRichText(item.description)}</p>
                        </div>
                    `).join("")}
                </div>
            </article>
        </div>
    `;
}

function renderSettings() {
    const configModule = state.modules.find((module) => module.category === "config");
    const activeShareUrl = getActiveShareUrl();
    const validShareUrl = isShareableUrl(activeShareUrl);
    const settingsItems = [
        { key: "theme", title: "主题切换", value: themeLabels[state.settings.theme] || "深色科技" },
        { key: "motionEnabled", title: "动效开关", value: state.settings.motionEnabled ? "已开启" : "已关闭", toggle: true, active: state.settings.motionEnabled },
        { key: "density", title: "布局密度", value: state.settings.density === "cozy" ? "舒展布局" : "紧凑布局" },
        { key: "defaultView", title: "默认首页", value: titleByView(state.settings.defaultView) },
    ];

    els.settings.innerHTML = `
        <div class="settings-grid">
            <article class="settings-card">
                <div class="section-headline">
                    <div>
                        <span class="eyebrow">Display</span>
                        <h4>运行偏好</h4>
                    </div>
                </div>
                <div class="settings-list">
                    ${settingsItems.map((item) => `
                        <div class="settings-item">
                            <div>
                                <strong>${escapeHTML(item.title)}</strong>
                                <p class="meta-text">${escapeHTML(item.value)}</p>
                            </div>
                            ${item.key === "motionEnabled" ? `<button class="toggle ${item.active ? "active" : ""}" data-setting-toggle="${item.key}"></button>` : ""}
                            ${item.key === "theme" ? `<button class="pill-button" data-setting-cycle="theme" aria-label="切换主题"><i class="fas fa-palette"></i></button>` : ""}
                            ${item.key === "density" ? `<button class="pill-button" data-setting-cycle="density" aria-label="切换密度"><i class="fas fa-compress-alt"></i></button>` : ""}
                            ${item.key === "defaultView" ? `<button class="pill-button" data-setting-cycle="defaultView" aria-label="切换默认页"><i class="fas fa-home"></i></button>` : ""}
                        </div>
                    `).join("")}
                </div>
                <div class="settings-list" style="margin-top:14px;">
                    <div class="settings-item" style="align-items:flex-start;">
                        <div>
                            <strong>主题预览</strong>
                            <p class="meta-text">点击可直接切换到对应主题。</p>
                        </div>
                        <div class="inline-actions">
                            ${Object.entries(themeLabels).map(([value, label]) => `
                                <button class="pill-button ${state.settings.theme === value ? "theme-active" : ""}" data-set-theme="${value}">${label}</button>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </article>

            <article class="settings-card">
                <div class="section-headline">
                    <div>
                        <span class="eyebrow">Data</span>
                        <h4>导入、导出与恢复</h4>
                    </div>
                </div>
                <div class="settings-list">
                    <div class="settings-item">
                        <div>
                            <strong>公开站点数据源</strong>
                            <p class="meta-text">${ui.publishedLoaded ? "当前站点支持从 resume-data.json 读取公开内容。" : "当前尚未检测到 resume-data.json，公开站点会回退到内置默认内容。"}</p>
                        </div>
                        <span class="module-badge">${ui.hasLocalDraft ? "本机有草稿" : "当前无草稿"}</span>
                    </div>
                    <div class="settings-item">
                        <div>
                            <strong>导出知识库</strong>
                            <p class="meta-text">将全部模块、图片和设置导出为 JSON 文件。</p>
                        </div>
                        <button class="primary-action" data-quick-action="export-data">导出</button>
                    </div>
                    <div class="settings-item">
                        <div>
                            <strong>导入备份</strong>
                            <p class="meta-text">从 JSON 恢复或迁移你的内容中枢。</p>
                        </div>
                        <button class="secondary-action" data-quick-action="import-data">导入</button>
                    </div>
                    <div class="settings-item">
                        <div>
                            <strong>重置为默认</strong>
                            <p class="meta-text">清空本地修改并恢复初始整理版本。</p>
                        </div>
                        <button class="secondary-action danger" data-quick-action="reset-data">重置</button>
                    </div>
                </div>
            </article>

            <article class="settings-card">
                <div class="section-headline">
                    <div>
                        <span class="eyebrow">Publish</span>
                        <h4>发布中心</h4>
                    </div>
                </div>
                <div class="settings-list">
                    <div class="settings-item">
                        <div>
                            <strong>公开站点数据源</strong>
                            <p class="meta-text">${ui.publishedLoaded ? "当前站点支持从 `resume-data.json` 读取公开内容。" : "当前尚未检测到 `resume-data.json`，公开站点会回退到内置默认内容。"}</p>
                        </div>
                        <span class="module-badge">${ui.hasLocalDraft ? "本机有草稿" : "当前无草稿"}</span>
                    </div>
                    <div class="settings-item">
                        <div>
                            <strong>导出发布数据</strong>
                            <p class="meta-text">导出为 resume-data.json。把它上传到 GitHub 仓库根目录后，公网简历会显示你最新发布的内容。</p>
                        </div>
                        <button class="secondary-action" data-quick-action="export-publish-data" aria-label="导出发布文件"><i class="fas fa-file-export"></i></button>
                    </div>
                    <div class="settings-item">
                        <div>
                            <strong>清空本机草稿</strong>
                            <p class="meta-text">清除当前浏览器里的本地修改，并重新读取公开发布版本，方便核对别人看到的内容。</p>
                        </div>
                        <button class="secondary-action" data-quick-action="clear-local-draft" aria-label="清空草稿"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            </article>

            <article class="settings-card">
                <div class="section-headline">
                    <div>
                        <span class="eyebrow">Share</span>
                        <h4>分享页与二维码</h4>
                    </div>
                </div>
                <form id="share-form" class="modal-form">
                    <label class="field-block" style="grid-column:1/-1;">
                        <span>公开访问链接</span>
                        <input name="shareUrl" type="url" placeholder="先把分享页上传到公开网址，再把链接粘贴到这里" value="${escapeAttribute(state.settings.shareUrl || activeShareUrl)}">
                    </label>
                    <div class="share-layout">
                        <div class="share-preview ${validShareUrl ? "" : "share-preview--empty"}">
                            ${validShareUrl ? `
                                <img src="${escapeAttribute(getQrCodeUrl(activeShareUrl, 320))}" alt="简历分享二维码">
                                <p class="meta-text share-link">${escapeHTML(activeShareUrl)}</p>
                            ` : `
                                <div class="empty-state">二维码只能承载链接，装不下完整网页。先导出分享页，再上传到 GitHub Pages、Netlify 或网盘直链，然后把公开网址填到这里。</div>
                            `}
                        </div>
                        <div class="settings-list">
                            <div class="settings-item" style="align-items:flex-start;">
                                <div>
                                    <strong>当前状态</strong>
                                    <p class="meta-text">${validShareUrl ? "二维码已可用，别人扫码后即可直接查看你的简历分享页。" : "当前还没有可供扫码访问的公开链接。"}</p>
                                </div>
                                <span class="module-badge">${validShareUrl ? "已就绪" : "待配置"}</span>
                            </div>
                            <div class="settings-item" style="align-items:flex-start;">
                                <div>
                                    <strong>推荐流程</strong>
                                    <p class="meta-text">1）点击“导出分享页”生成独立 HTML；2）上传到公开网址；3）保存链接并生成二维码。</p>
                                </div>
                            </div>
                            <div class="action-row" style="justify-content:flex-start;">
                                <button type="submit" class="primary-action" aria-label="保存分享链接"><i class="fas fa-check"></i></button>
                                <button type="button" class="secondary-action" data-export-share-page="true" aria-label="导出分享页"><i class="fas fa-share-alt"></i></button>
                                <button type="button" class="secondary-action" data-copy-share-url="true" ${validShareUrl ? "" : "disabled"} aria-label="复制链接"><i class="fas fa-copy"></i></button>
                                <button type="button" class="secondary-action" data-open-share-url="true" ${validShareUrl ? "" : "disabled"} aria-label="预览链接"><i class="fas fa-external-link-alt"></i></button>
                            </div>
                        </div>
                    </div>
                </form>
            </article>

            <article class="settings-card" style="grid-column:1/-1;">
                <div class="section-headline">
                    <div>
                        <span class="eyebrow">Maintenance</span>
                        <h4>维护设置摘要</h4>
                    </div>
                    ${configModule ? `<button class="pill-button" data-module-select="${configModule.id}" data-go-view="content" aria-label="编辑配置中心"><i class="fas fa-cog"></i></button>` : ""}
                </div>
                <div class="summary-list">
                    ${(configModule?.items || []).map((item) => `
                        <div class="summary-item">
                            <strong>${escapeHTML(item.title)}</strong>
                            <p>${renderRichText(item.description)}</p>
                        </div>
                    `).join("")}
                </div>
            </article>
        </div>
    `;
}

function renderModal() {
    if (!ui.modal) {
        els.modalShell.classList.add("hidden");
        els.modalForm.innerHTML = "";
        return;
    }

    els.modalShell.classList.remove("hidden");

    if (ui.modal.type === "module") {
        const module = state.modules.find((item) => item.id === ui.modal.moduleId);
        els.modalKicker.textContent = module ? "Edit Module" : "New Module";
        els.modalTitle.textContent = module ? "编辑模块" : "新增模块";
        els.modalForm.innerHTML = renderModuleForm(module);
    }

    if (ui.modal.type === "item") {
        const module = state.modules.find((item) => item.id === ui.modal.moduleId);
        const entry = module?.items.find((item) => item.id === ui.modal.itemId);
        els.modalKicker.textContent = entry ? "Edit Entry" : "New Entry";
        els.modalTitle.textContent = entry ? "编辑条目" : "新增条目";
        els.modalForm.innerHTML = renderItemForm(module, entry);
    }
}

function renderModuleForm(module) {
    return `
        <input type="hidden" name="formType" value="module">
        <input type="hidden" name="moduleId" value="${module?.id || ""}">
        <div class="form-grid">
            <label class="field-block"><span>模块名称</span><input name="title" required value="${escapeAttribute(module?.title || "")}"></label>
            <label class="field-block"><span>模块分类</span>
                <select name="category">
                    ${Object.entries(categoryLabels).map(([value, label]) => `<option value="${value}" ${module?.category === value ? "selected" : ""}>${label}</option>`).join("")}
                </select>
            </label>
            <label class="field-block" style="grid-column:1/-1;"><span>模块说明</span><textarea name="description" required>${escapeHTML(module?.description || "")}</textarea></label>
            <label class="field-block"><span>模块配色</span>
                <select name="accent">
                    ${Object.entries(accentLabels).map(([value, label]) => `<option value="${value}" ${module?.accent === value ? "selected" : ""}>${label}</option>`).join("")}
                </select>
            </label>
            <label class="field-block"><span>默认状态</span>
                <select name="collapsed">
                    <option value="false" ${!module?.collapsed ? "selected" : ""}>展开</option>
                    <option value="true" ${module?.collapsed ? "selected" : ""}>收起</option>
                </select>
            </label>
        </div>
        <div class="form-actions">
            <button type="button" class="secondary-action" data-close-modal="true" aria-label="取消"><i class="fas fa-times"></i></button>
            <button type="submit" class="primary-action" aria-label="保存模块"><i class="fas fa-check"></i></button>
        </div>
    `;
}

function renderItemForm(module, item) {
    return `
        <input type="hidden" name="formType" value="item">
        <input type="hidden" name="itemId" value="${item?.id || ""}">
        <div class="form-grid">
            <label class="field-block"><span>所属模块</span>
                <select name="moduleId">
                    ${state.modules.map((candidate) => `<option value="${candidate.id}" ${(candidate.id === module?.id) ? "selected" : ""}>${escapeHTML(candidate.title)}</option>`).join("")}
                </select>
            </label>
            <label class="field-block"><span>条目标题</span><input name="title" required value="${escapeAttribute(item?.title || "")}"></label>
            <label class="field-block"><span>副标题 / 机构</span><input name="subtitle" value="${escapeAttribute(item?.subtitle || "")}"></label>
            <label class="field-block"><span>日期 / 时间段</span><input name="date" value="${escapeAttribute(item?.date || "")}"></label>
            <label class="field-block"><span>状态标签</span><input name="status" value="${escapeAttribute(item?.status || "")}"></label>
            <label class="field-block"><span>标签（逗号分隔）</span><input name="tags" value="${escapeAttribute((item?.tags || []).join(", "))}"></label>
            <label class="field-block" style="grid-column:1/-1;">
                <span>内容描述</span>
                <div class="inline-actions" style="margin-bottom:8px;">
                    <button type="button" class="icon-action" data-editor-command="bold">加粗</button>
                    <button type="button" class="icon-action" data-editor-command="italic">斜体</button>
                    <button type="button" class="icon-action" data-editor-command="insertUnorderedList">列表</button>
                    <button type="button" class="icon-action" data-editor-command="formatBlock" data-editor-value="blockquote">引用</button>
                </div>
                <div id="rich-editor" contenteditable="true" class="entry-item" style="min-height:180px;">${item?.description || ""}</div>
            </label>
        </div>
        <div class="form-actions">
            <button type="button" class="secondary-action" data-close-modal="true" aria-label="取消"><i class="fas fa-times"></i></button>
            <button type="submit" class="primary-action" aria-label="保存条目"><i class="fas fa-check"></i></button>
        </div>
    `;
}

function handleDocumentClick(event) {
    const target = event.target.closest("button, [data-go-view], [data-module-select]");
    if (!target) {
        return;
    }

    if (target.dataset.closeModal === "true") {
        ui.modal = null;
        renderModal();
        return;
    }

    if (target.dataset.goView) {
        ui.view = target.dataset.goView;
        if (target.dataset.moduleSelect) {
            ui.selectedModuleId = target.dataset.moduleSelect;
        }
        render();
        return;
    }

    if (target.dataset.quickAction) {
        handleQuickAction(target.dataset.quickAction);
        return;
    }

    if (target.dataset.exportSharePage) {
        exportSharePage();
        return;
    }

    if (target.dataset.copyShareUrl) {
        copyShareUrl();
        return;
    }

    if (target.dataset.openShareUrl) {
        openShareUrl();
        return;
    }

    if (target.dataset.moduleSelect) {
        ui.selectedModuleId = target.dataset.moduleSelect;
        render();
        return;
    }

    if (target.dataset.moduleCollapse) {
        const module = getModule(target.dataset.moduleCollapse);
        module.collapsed = !module.collapsed;
        module.updatedAt = now();
        persist();
        render();
        return;
    }

    if (target.dataset.editModule) {
        ui.modal = { type: "module", moduleId: target.dataset.editModule };
        renderModal();
        return;
    }

    if (target.dataset.addItemTo) {
        ui.modal = { type: "item", moduleId: target.dataset.addItemTo };
        renderModal();
        return;
    }

    if (target.dataset.deleteModule) {
        deleteModule(target.dataset.deleteModule);
        return;
    }

    if (target.dataset.editItem) {
        const [moduleId, itemId] = target.dataset.editItem.split("|");
        ui.modal = { type: "item", moduleId, itemId };
        renderModal();
        return;
    }

    if (target.dataset.deleteItem) {
        const [moduleId, itemId] = target.dataset.deleteItem.split("|");
        deleteItem(moduleId, itemId);
        return;
    }

    if (target.dataset.itemExpand) {
        const itemId = target.dataset.itemExpand;
        if (ui.expandedEntries.has(itemId)) {
            ui.expandedEntries.delete(itemId);
        } else {
            ui.expandedEntries.add(itemId);
        }
        render();
        return;
    }

    if (target.dataset.moduleUp) {
        reorderModule(target.dataset.moduleUp, -1);
        return;
    }

    if (target.dataset.moduleDown) {
        reorderModule(target.dataset.moduleDown, 1);
        return;
    }

    if (target.dataset.itemUp) {
        const [moduleId, itemId] = target.dataset.itemUp.split("|");
        reorderItem(moduleId, itemId, -1);
        return;
    }

    if (target.dataset.itemDown) {
        const [moduleId, itemId] = target.dataset.itemDown.split("|");
        reorderItem(moduleId, itemId, 1);
        return;
    }

    if (target.dataset.avatarUpload) {
        els.avatarInput.click();
        return;
    }

    if (target.dataset.galleryUpload) {
        els.galleryInput.click();
        return;
    }

    if (target.dataset.avatarDelete) {
        state.profile.avatar = createAvatarObject("姓名");
        persist();
        toast("头像已恢复为默认占位图。");
        render();
        return;
    }

    if (target.dataset.photoDelete) {
        state.profile.gallery = state.profile.gallery.filter((photo) => photo.id !== target.dataset.photoDelete);
        persist();
        toast("图片已删除。");
        render();
        return;
    }

    if (target.dataset.settingToggle) {
        if (target.dataset.settingToggle === "motionEnabled") {
            state.settings.motionEnabled = !state.settings.motionEnabled;
            applySystemSettings();
            persist();
            render();
        }
        return;
    }

    if (target.dataset.settingCycle) {
        cycleSetting(target.dataset.settingCycle);
        return;
    }

    if (target.dataset.setTheme) {
        state.settings.theme = target.dataset.setTheme;
        applySystemSettings();
        persist();
        render();
        return;
    }

    if (target.dataset.editorCommand) {
        const value = target.dataset.editorValue || null;
        document.execCommand(target.dataset.editorCommand, false, value);
    }
}

function handleDocumentChange(event) {
    const target = event.target;
    if (target.dataset.photoFit) {
        const photo = state.profile.gallery.find((item) => item.id === target.dataset.photoFit);
        if (photo) {
            photo.fit = target.value;
            persist();
            render();
        }
    }
}

function handleDocumentSubmit(event) {
    if (event.target.id === "share-form") {
        event.preventDefault();
        const formData = new FormData(event.target);
        const shareUrl = String(formData.get("shareUrl") || "").trim();
        if (shareUrl && !isShareableUrl(shareUrl)) {
            toast("分享链接无效：请输入 http:// 或 https:// 开头的公开网址。", "error");
            return;
        }
        state.settings.shareUrl = shareUrl;
        persist();
        render();
        toast(shareUrl ? "分享链接已保存，二维码已更新。" : "已清空自定义分享链接。");
        return;
    }

    if (event.target.id === "profile-form") {
        event.preventDefault();
        const formData = new FormData(event.target);
        state.profile.name = formData.get("name").trim() || "待补充姓名";
        state.profile.headline = formData.get("headline").trim() || "待补充头衔";
        state.profile.status = formData.get("status").trim();
        state.profile.location = formData.get("location").trim();
        state.profile.tagline = formData.get("tagline").trim();
        state.profile.summary = formData.get("summary").trim();
        state.profile.bio = formData.get("bio").trim();
        state.profile.focusTags = splitTags(formData.get("focusTags"));
        state.profile.avatar.fit = formData.get("avatarFit");
        state.profile.updatedAt = now();
        persist();
        toast("个人资料已保存。");
        render();
        return;
    }

    if (event.target.id === "modal-form") {
        event.preventDefault();
        const formData = new FormData(event.target);
        const formType = formData.get("formType");
        if (formType === "module") {
            saveModule(formData);
        }
        if (formType === "item") {
            saveItem(formData);
        }
    }
}

function handleQuickAction(action) {
    if (action === "add-module") {
        ui.modal = { type: "module" };
        renderModal();
        return;
    }
    if (action === "add-entry") {
        ui.modal = { type: "item", moduleId: ui.selectedModuleId || state.modules[0]?.id };
        renderModal();
        return;
    }
    if (action === "upload-image") {
        ui.view = "media";
        render();
        els.galleryInput.click();
        return;
    }
    if (action === "export-data") {
        exportData();
        return;
    }
    if (action === "export-publish-data") {
        exportPublishData();
        return;
    }
    if (action === "import-data") {
        els.importInput.click();
        return;
    }
    if (action === "clear-local-draft") {
        clearLocalDraft();
        return;
    }
    if (action === "reset-data") {
        if (window.confirm("确认重置为默认整理版本吗？本地修改会被覆盖。")) {
            const fresh = createDefaultState();
            Object.keys(state).forEach((key) => delete state[key]);
            Object.assign(state, fresh);
            ui.selectedModuleId = state.modules[0]?.id || null;
            ui.view = state.settings.defaultView || "dashboard";
            ui.modal = null;
            applySystemSettings();
            persist();
            render();
            toast("已恢复为默认整理版本。");
        }
    }
}

function saveModule(formData) {
    const moduleId = formData.get("moduleId");
    const payload = {
        title: formData.get("title").trim(),
        category: formData.get("category"),
        description: formData.get("description").trim(),
        accent: formData.get("accent"),
        collapsed: formData.get("collapsed") === "true",
        updatedAt: now(),
    };

    if (!payload.title || !payload.description) {
        toast("模块名称和说明不能为空。", "error");
        return;
    }

    if (moduleId) {
        const module = getModule(moduleId);
        Object.assign(module, payload);
        toast("模块已更新。");
    } else {
        state.modules.push({ id: uid(), items: [], ...payload });
        ui.selectedModuleId = state.modules[state.modules.length - 1].id;
        toast("模块已创建。");
    }

    persist();
    ui.modal = null;
    render();
}

function saveItem(formData) {
    const moduleId = formData.get("moduleId");
    const itemId = formData.get("itemId");
    const module = getModule(moduleId);
    const description = document.getElementById("rich-editor")?.innerHTML?.trim() || "";
    const payload = {
        title: formData.get("title").trim(),
        subtitle: formData.get("subtitle").trim(),
        date: formData.get("date").trim(),
        status: formData.get("status").trim(),
        tags: splitTags(formData.get("tags")),
        description,
        updatedAt: now(),
    };

    if (!payload.title) {
        toast("条目标题不能为空。", "error");
        return;
    }

    if (itemId) {
        const sourceModule = state.modules.find((candidate) => candidate.items.some((item) => item.id === itemId));
        const entry = sourceModule.items.find((item) => item.id === itemId);
        Object.assign(entry, payload);
        if (sourceModule.id !== module.id) {
            sourceModule.items = sourceModule.items.filter((item) => item.id !== itemId);
            module.items.unshift(entry);
        }
        sourceModule.updatedAt = now();
        module.updatedAt = now();
        toast("条目已更新。");
    } else {
        module.items.unshift({ id: uid(), ...payload });
        module.updatedAt = now();
        toast("条目已创建。");
    }

    ui.selectedModuleId = module.id;
    persist();
    ui.modal = null;
    render();
}

function deleteModule(moduleId) {
    const module = getModule(moduleId);
    if (!module) {
        return;
    }
    if (!window.confirm(`确认删除模块“${module.title}”吗？其中的条目也会一并删除。`)) {
        return;
    }
    state.modules = state.modules.filter((item) => item.id !== moduleId);
    ui.selectedModuleId = state.modules[0]?.id || null;
    persist();
    toast("模块已删除。");
    render();
}

function deleteItem(moduleId, itemId) {
    const module = getModule(moduleId);
    const item = module?.items.find((entry) => entry.id === itemId);
    if (!module || !item) {
        return;
    }
    if (!window.confirm(`确认删除条目“${item.title}”吗？`)) {
        return;
    }
    module.items = module.items.filter((entry) => entry.id !== itemId);
    module.updatedAt = now();
    persist();
    toast("条目已删除。");
    render();
}

function reorderModule(moduleId, direction) {
    const index = state.modules.findIndex((module) => module.id === moduleId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= state.modules.length) {
        return;
    }
    [state.modules[index], state.modules[targetIndex]] = [state.modules[targetIndex], state.modules[index]];
    persist();
    render();
}

function reorderItem(moduleId, itemId, direction) {
    const module = getModule(moduleId);
    const index = module.items.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= module.items.length) {
        return;
    }
    [module.items[index], module.items[targetIndex]] = [module.items[targetIndex], module.items[index]];
    module.updatedAt = now();
    persist();
    render();
}

function handleImageUpload(file, mode) {
    if (!IMAGE_TYPES.includes(file.type)) {
        toast("上传失败：仅支持 JPG / PNG / WEBP / GIF。", "error");
        return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
        toast("上传失败：单张图片不能超过 5MB。", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        if (mode === "avatar") {
            state.profile.avatar = {
                id: uid(),
                name: file.name,
                dataUrl: reader.result,
                fit: "cover",
                createdAt: now(),
            };
            state.profile.updatedAt = now();
            toast("头像上传成功。");
        } else {
            state.profile.gallery.unshift({
                id: uid(),
                name: file.name,
                dataUrl: reader.result,
                fit: "cover",
                createdAt: now(),
            });
            state.profile.updatedAt = now();
            toast(`图片“${file.name}”已加入图库。`);
        }
        persist();
        render();
    };
    reader.onerror = () => toast("上传失败：文件读取异常。", "error");
    reader.readAsDataURL(file);
}

function bindDropzones() {
    const zones = [...document.querySelectorAll("[data-upload-zone]")];
    zones.forEach((zone) => {
        zone.ondragover = (event) => {
            event.preventDefault();
            zone.classList.add("dragover");
        };
        zone.ondragleave = () => zone.classList.remove("dragover");
        zone.ondrop = (event) => {
            event.preventDefault();
            zone.classList.remove("dragover");
            [...(event.dataTransfer?.files || [])].forEach((file) => handleImageUpload(file, zone.dataset.uploadZone));
        };
    });
}

function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `future-nexus-portal-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("数据已导出。");
}

function exportPublishData() {
    downloadFile(
        "resume-data.json",
        JSON.stringify(buildPublishState(), null, 2),
        "application/json",
    );
    toast("已导出发布文件。上传到仓库根目录后，公网内容会更新。");
}

function buildPublishState() {
    const normalized = normalizeState(state);
    return {
        profile: normalized.profile,
        settings: normalized.settings,
        modules: normalized.modules,
    };
}

function clearLocalDraft() {
    if (!window.confirm("确认清空当前浏览器中的本地草稿，并重新读取公开发布版本吗？")) {
        return;
    }
    localStorage.removeItem(STORAGE_KEY);
    ui.hasLocalDraft = false;
    window.location.reload();
}

function exportSharePage() {
    downloadFile(
        `resume-share-${new Date().toISOString().slice(0, 10)}.html`,
        buildSharePageHtml(),
        "text/html;charset=utf-8",
    );
    toast("分享页已导出。上传到公开网址后，就可以生成二维码。");
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function buildSharePageHtml() {
    const heroImage = getHomepageImage();
    const publicModules = state.modules.filter((module) => !["config", "help"].includes(module.category));
    const groupedModules = publicModules.reduce((acc, module) => {
        acc[module.category] ||= [];
        acc[module.category].push(module);
        return acc;
    }, {});
    const sections = Object.entries(groupedModules).map(([category, modules]) => `
        <section class="resume-section">
            <div class="section-title">
                <span>${escapeHTML(categoryLabels[category] || "简历模块")}</span>
                <h2>${escapeHTML(categoryLabels[category] || "简历模块")}</h2>
            </div>
            <div class="module-stack">
                ${modules.map((module) => `
                    <article class="module-card">
                        <header class="module-header">
                            <div>
                                <h3>${escapeHTML(module.title)}</h3>
                                <p>${escapeHTML(module.description)}</p>
                            </div>
                            <span class="tag">${escapeHTML(formatDate(module.updatedAt))}</span>
                        </header>
                        <div class="entry-stack">
                            ${module.items.map((item) => `
                                <article class="entry-card">
                                    <div class="entry-head">
                                        <div>
                                            <h4>${escapeHTML(item.title)}</h4>
                                            <p>${escapeHTML(item.subtitle || item.date || "")}</p>
                                        </div>
                                        ${item.date ? `<span class="tag">${escapeHTML(item.date)}</span>` : ""}
                                    </div>
                                    ${item.tags?.length ? `<div class="tag-row">${item.tags.map((tag) => `<span class="tag muted-tag">${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
                                    <div class="entry-body">${renderRichText(item.description)}</div>
                                </article>
                            `).join("")}
                        </div>
                    </article>
                `).join("")}
            </div>
        </section>
    `).join("");

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(state.profile.name)} - 个人简历</title>
    <meta name="description" content="${escapeAttribute(state.profile.summary || state.profile.tagline)}">
    <style>
        :root {
            --bg: #0b1020;
            --panel: rgba(15, 23, 42, 0.82);
            --panel-soft: rgba(148, 163, 184, 0.12);
            --text: #ecf6ff;
            --muted: #a7b5c9;
            --line: rgba(125, 211, 252, 0.18);
            --accent: #7dd3fc;
            --shadow: 0 24px 80px rgba(8, 15, 35, 0.45);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
            color: var(--text);
            background:
                radial-gradient(circle at top, rgba(125, 211, 252, 0.16), transparent 32%),
                radial-gradient(circle at right, rgba(192, 132, 252, 0.12), transparent 22%),
                linear-gradient(180deg, #08101f, #111827 48%, #0b1120);
        }
        .page {
            width: min(1100px, calc(100vw - 32px));
            margin: 0 auto;
            padding: 40px 0 56px;
        }
        .hero,
        .module-card,
        .resume-section {
            border: 1px solid var(--line);
            background: var(--panel);
            box-shadow: var(--shadow);
            backdrop-filter: blur(20px);
        }
        .hero {
            display: grid;
            grid-template-columns: 180px minmax(0, 1fr);
            gap: 24px;
            padding: 28px;
            border-radius: 28px;
            margin-bottom: 24px;
        }
        .hero img {
            width: 180px;
            height: 220px;
            border-radius: 22px;
            object-fit: ${escapeHTML(heroImage.fit || "cover")};
            border: 1px solid var(--line);
            background: rgba(255,255,255,0.06);
        }
        .eyebrow, .section-title span {
            color: var(--accent);
            letter-spacing: 0.22em;
            font-size: 12px;
            text-transform: uppercase;
        }
        h1, h2, h3, h4, p { margin: 0; }
        h1 { font-size: 38px; margin: 10px 0 8px; }
        .headline { font-size: 18px; color: #d6e7ff; margin-bottom: 10px; }
        .summary { color: var(--muted); line-height: 1.8; }
        .meta-row, .tag-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 16px;
        }
        .tag {
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            border: 1px solid var(--line);
            background: rgba(125, 211, 252, 0.12);
            color: #d8efff;
        }
        .muted-tag {
            background: var(--panel-soft);
            color: var(--muted);
        }
        .resume-section {
            border-radius: 24px;
            padding: 22px;
            margin-bottom: 18px;
        }
        .section-title { margin-bottom: 16px; }
        .section-title h2 { font-size: 24px; margin-top: 8px; }
        .module-stack, .entry-stack {
            display: grid;
            gap: 14px;
        }
        .module-card {
            border-radius: 22px;
            padding: 18px;
        }
        .module-header, .entry-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
        }
        .module-header h3, .entry-head h4 {
            font-size: 20px;
            margin-bottom: 6px;
        }
        .module-header p, .entry-head p, .entry-body {
            color: var(--muted);
            line-height: 1.8;
        }
        .entry-card {
            padding: 16px;
            border-radius: 18px;
            background: rgba(148, 163, 184, 0.08);
            border: 1px solid rgba(148, 163, 184, 0.14);
        }
        .entry-body { margin-top: 12px; }
        .entry-body ul { padding-left: 20px; }
        .footer-note {
            margin-top: 18px;
            color: var(--muted);
            text-align: center;
            font-size: 13px;
        }
        @media (max-width: 720px) {
            .page { width: min(100vw - 20px, 100%); padding: 20px 0 36px; }
            .hero { grid-template-columns: 1fr; }
            .hero img { width: 140px; height: 180px; }
            .module-header, .entry-head { flex-direction: column; }
            h1 { font-size: 30px; }
        }
    </style>
</head>
<body>
    <main class="page">
        <section class="hero">
            <img src="${escapeAttribute(heroImage.dataUrl)}" alt="${escapeAttribute(state.profile.name)}">
            <div>
                <div class="eyebrow">Resume Snapshot</div>
                <h1>${escapeHTML(state.profile.name)}</h1>
                <p class="headline">${escapeHTML(state.profile.headline)}</p>
                <p class="summary">${escapeHTML(state.profile.summary)}</p>
                <div class="meta-row">
                    ${state.profile.status ? `<span class="tag">${escapeHTML(state.profile.status)}</span>` : ""}
                    ${state.profile.location ? `<span class="tag">${escapeHTML(state.profile.location)}</span>` : ""}
                    <span class="tag">更新于 ${escapeHTML(formatShortDate(state.profile.updatedAt || now()))}</span>
                </div>
                ${state.profile.focusTags?.length ? `<div class="tag-row">${state.profile.focusTags.map((tag) => `<span class="tag muted-tag">${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
                ${state.profile.bio ? `<p class="summary" style="margin-top:16px;">${escapeHTML(state.profile.bio)}</p>` : ""}
            </div>
        </section>
        ${sections}
        <p class="footer-note">本页由个人简历门户导出生成，可独立上传并公开分享。</p>
    </main>
</body>
</html>`;
}

function getDefaultShareUrl() {
    try {
        if (typeof window !== "undefined" && ["http:", "https:"].includes(window.location.protocol)) {
            return window.location.href.split("#")[0];
        }
    } catch (error) {
        return "";
    }
    return "";
}

function getActiveShareUrl() {
    return String(state.settings.shareUrl || "").trim() || getDefaultShareUrl();
}

function isShareableUrl(value) {
    if (!value) {
        return false;
    }
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    } catch (error) {
        return false;
    }
}

function getQrCodeUrl(value, size = 280) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(value)}`;
}

async function copyShareUrl() {
    const url = getActiveShareUrl();
    if (!isShareableUrl(url)) {
        toast("还没有可复制的公开分享链接。", "error");
        return;
    }
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
        } else {
            const input = document.createElement("textarea");
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            input.remove();
        }
        toast("分享链接已复制。");
    } catch (error) {
        toast("复制失败，请手动复制链接。", "error");
    }
}

function openShareUrl() {
    const url = getActiveShareUrl();
    if (!isShareableUrl(url)) {
        toast("当前还没有可预览的公开分享链接。", "error");
        return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
}

function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const imported = JSON.parse(String(reader.result));
            const normalized = normalizeState(imported);
            Object.keys(state).forEach((key) => delete state[key]);
            Object.assign(state, normalized);
            ui.selectedModuleId = state.modules[0]?.id || null;
            ui.view = state.settings.defaultView || "dashboard";
            ui.modal = null;
            applySystemSettings();
            persist();
            render();
            toast("数据导入成功。");
        } catch (error) {
            toast("导入失败：JSON 结构无效。", "error");
        }
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
}

function groupVisibleModules() {
    const visibleModules = getFilteredModules();

    return visibleModules.reduce((acc, module) => {
        acc[module.category] ||= [];
        acc[module.category].push(module);
        return acc;
    }, {});
}

function getVisibleItems(module) {
    if (!module) {
        return [];
    }
    const query = normalizeSearchText(ui.search);
    if (!query) {
        return module.items;
    }

    const moduleMatch = buildModuleSearchSource(module, false).includes(query);
    if (moduleMatch) {
        return module.items;
    }

    return module.items.filter((item) => buildItemSearchSource(item).includes(query));
}

function getFilteredModules() {
    const query = normalizeSearchText(ui.search);
    return state.modules.filter((module) => {
        if (ui.filter !== "all" && module.category !== ui.filter) {
            return false;
        }
        if (!query) {
            return true;
        }
        return buildModuleSearchSource(module).includes(query);
    });
}

function getSearchResults(limit = 6) {
    const modules = getFilteredModules();
    const query = normalizeSearchText(ui.search);
    const items = [];

    modules.forEach((module) => {
        const moduleMatched = buildModuleSearchSource(module, false).includes(query);
        const matchedItems = moduleMatched
            ? module.items
            : module.items.filter((item) => buildItemSearchSource(item).includes(query));

        matchedItems.forEach((item) => items.push({ module, item }));
    });

    return {
        modules,
        items: items.slice(0, limit),
    };
}

function buildModuleSearchSource(module, includeItems = true) {
    const source = [
        module.title,
        module.description,
        module.category,
        categoryLabels[module.category] || "",
    ];

    if (includeItems) {
        source.push(...module.items.map((item) => buildItemSearchSource(item)));
    }

    return normalizeSearchText(source.join(" "));
}

function buildItemSearchSource(item) {
    return normalizeSearchText([
        item.title,
        item.subtitle,
        item.date,
        (item.tags || []).join(" "),
        stripHtml(item.description),
    ].join(" "));
}

function normalizeSearchText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function computeStats() {
    const entries = state.modules.reduce((sum, module) => sum + module.items.length, 0);
    const lastUpdate = getRecentUpdates(1)[0]?.updatedAt || state.profile.updatedAt;
    return {
        modules: state.modules.length,
        entries,
        images: state.profile.gallery.length + (state.profile.avatar?.dataUrl ? 1 : 0),
        lastUpdate: formatShortDate(lastUpdate),
    };
}

function getRecentUpdates(limit) {
    return state.modules.flatMap((module) => module.items.map((item) => ({ ...item, moduleTitle: module.title })))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit);
}

function getTimelineItems(limit) {
    return state.modules.flatMap((module) => module.items.filter((item) => item.date).map((item) => ({
        ...item,
        moduleTitle: module.title,
        sortValue: dateSortValue(item.date),
    }))).sort((a, b) => b.sortValue - a.sortValue).slice(0, limit);
}

function cycleSetting(key) {
    if (key === "theme") {
        const themes = ["obsidian", "aurora", "guofeng", "oilpaint"];
        const currentIndex = themes.indexOf(state.settings.theme);
        state.settings.theme = themes[(currentIndex + 1) % themes.length];
    }
    if (key === "density") {
        state.settings.density = state.settings.density === "cozy" ? "compact" : "cozy";
    }
    if (key === "defaultView") {
        const options = ["dashboard", "knowledge", "content", "media", "help", "settings"];
        const currentIndex = options.indexOf(state.settings.defaultView);
        state.settings.defaultView = options[(currentIndex + 1) % options.length];
    }
    applySystemSettings();
    persist();
    render();
}

function applySystemSettings() {
    document.body.dataset.theme = state.settings.theme;
    document.body.dataset.motion = state.settings.motionEnabled ? "on" : "off";
    document.body.dataset.density = state.settings.density;
}

function updatePulse() {
    const labels = ["可维护", "可编辑", "已保存", "运行中"];
    const index = Math.floor((Date.now() / 4000) % labels.length);
    els.pulse.textContent = labels[index];
}

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    ui.hasLocalDraft = true;
}

async function hydrateState() {
    const published = await loadPublishedState();
    if (published) {
        replaceState(published);
        ui.publishedLoaded = true;
    }

    const localDraft = loadLocalDraft();
    if (localDraft) {
        replaceState(localDraft);
        ui.hasLocalDraft = true;
    }

    syncUiState();
}

async function loadPublishedState() {
    try {
        const response = await fetch(DATA_FILE_PATH, { cache: "no-store" });
        if (!response.ok) {
            return null;
        }
        return normalizeState(await response.json());
    } catch (error) {
        return null;
    }
}

function loadLocalDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        return normalizeState(JSON.parse(raw));
    } catch (error) {
        return null;
    }
}

function replaceState(nextState) {
    const normalized = normalizeState(nextState);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, normalized);
}

function syncUiState() {
    ui.view = state.settings?.defaultView || "dashboard";
    ui.selectedModuleId = state.modules[0]?.id || null;
}

function normalizeState(input) {
    const fallback = createDefaultState();
    return {
        profile: {
            ...fallback.profile,
            ...(input.profile || {}),
            avatar: {
                ...fallback.profile.avatar,
                ...(input.profile?.avatar || {}),
            },
            gallery: Array.isArray(input.profile?.gallery) ? input.profile.gallery : fallback.profile.gallery,
            focusTags: Array.isArray(input.profile?.focusTags) ? input.profile.focusTags : fallback.profile.focusTags,
        },
        settings: {
            ...fallback.settings,
            ...(input.settings || {}),
        },
        modules: Array.isArray(input.modules) ? input.modules.map((module) => ({
            id: module.id || uid(),
            title: module.title || "未命名模块",
            category: module.category || "experience",
            description: module.description || "",
            accent: module.accent || "cyan",
            collapsed: Boolean(module.collapsed),
            updatedAt: module.updatedAt || now(),
            items: Array.isArray(module.items) ? module.items.map((item) => ({
                id: item.id || uid(),
                title: item.title || "未命名条目",
                subtitle: item.subtitle || "",
                date: item.date || "",
                status: item.status || "",
                description: item.description || "",
                tags: Array.isArray(item.tags) ? item.tags : [],
                updatedAt: item.updatedAt || now(),
            })) : [],
        })) : fallback.modules,
    };
}

function createDefaultState() {
    const seedNow = now();

    return {
        profile: {
            name: "待补充姓名",
            headline: "南京大学商学院博士研究生",
            status: "已支持内容维护、图片上传与本地持久化",
            location: "当前节点：2025年5月进入南京大学商学院攻读博士",
            tagline: "个人简历与资料展示网站",
            summary: "把分散的经历、奖项、论文、项目和图片资料整理到一个清晰、可持续维护的网站中。",
            bio: "默认内容已根据提供材料做了首轮整理。现在可以继续新增模块、编辑条目、上传头像与图片，也可以导出为 JSON 备份。",
            focusTags: ["教育经历", "奖项荣誉", "论文成果", "科研项目", "图片资料"],
            avatar: createAvatarObject("姓名"),
            gallery: [],
            updatedAt: seedNow,
        },
        settings: {
            theme: "obsidian",
            motionEnabled: true,
            density: "cozy",
            defaultView: "dashboard",
            shareUrl: getDefaultShareUrl(),
        },
        modules: [
            {
                id: uid(),
                title: "教育与进阶路径",
                category: "education",
                description: "聚合本科、研究生与博士阶段的关键节点，构成当前学业主线。",
                accent: "cyan",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("海南大学本科阶段", "本科经历与奖项基础", "本科期间", "围绕校级奖学金、志愿服务、学生组织与财务助理工作积累了最初的组织与管理经验。", ["本科", "海南大学"], "归档"),
                    item("济南大学研究生阶段", "竞赛、奖学金、论文与编辑部工作同步推进", "2022.09-2025.05", "在研究生阶段形成了竞赛获奖、论文发表、项目参与与学术编辑工作的多线程积累，并获得多项校级与国家级荣誉。", ["研究生", "济南大学"], "主线"),
                    item("南京大学商学院博士阶段", "博士研究生", "2025.05-至今", "2025年5月22日进入南京大学商学院攻读博士研究生，并于2025年9月担任南京大学产经一支部支委（组织委员）。", ["博士", "南京大学"], "进行中"),
                ],
            },
            {
                id: uid(),
                title: "奖项与荣誉库",
                category: "honor",
                description: "将重复奖项统一标准化为唯一条目，形成可检索、可排序的荣誉台账。",
                accent: "violet",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("海南大学校二等奖学金", "海南大学", "2020.09", "海南大学2020学年校二等奖学金。", ["奖学金", "海南大学"], "已整理"),
                    item("海南大学校优秀志愿者", "海南大学", "本科期间", "海南大学校优秀志愿者。", ["志愿服务"], "已整理"),
                    item("海南大学优秀共产党员", "海南大学", "本科期间", "海南大学优秀共产党员。", ["党建"], "已整理"),
                    item("志愿案例分析大赛二等奖", "海南大学管理学院", "2021上半年", "海南大学管理学院2021学年上半年志愿案例分析大赛二等奖。", ["竞赛"], "已整理"),
                    item("暑期社会实践积极分子", "海南大学", "2020暑期", "海南大学2020年暑期社会实践积极分子。", ["社会实践"], "已整理"),
                    item("济南大学入学二等奖学金", "济南大学", "2022.11", "济南大学入学二等奖学金。", ["奖学金", "济南大学"], "已整理"),
                    item("“正大杯”山东省一等奖", "第十三届全国大学生市场调查与分析大赛", "2023.04", "“正大杯”第十三届全国大学生市场调查与分析大赛山东省一等奖。", ["竞赛", "省级"], "高亮"),
                    item("“挑战杯”校一等奖", "济南大学", "2023.04", "“挑战杯”全国大学生课外学术科技作品竞赛山东省济南大学校一等奖。", ["竞赛"], "已整理"),
                    item("第十二届中国知识产权年会优秀志愿者", "中国知识产权年会", "2023.09", "第十二届中国知识产权年会优秀志愿者。", ["志愿服务"], "已整理"),
                    item("济南大学学业一等奖学金", "济南大学", "2023.10", "济南大学学业一等奖学金。", ["奖学金"], "已整理"),
                    item("济南大学校优秀学生", "济南大学", "2023.10", "济南大学校优秀学生。", ["荣誉称号"], "已整理"),
                    item("学术沙龙比赛一等奖", "济南大学管理科学与工程学院", "2024.04", "济南大学管理科学与工程学院学术沙龙比赛一等奖。", ["学术论坛"], "已整理"),
                    item("济南大学学业一等奖学金", "济南大学", "2024.10", "济南大学学业一等奖学金。", ["奖学金"], "已整理"),
                    item("济南大学优秀学生", "济南大学", "2024.10", "济南大学优秀学生。", ["荣誉称号"], "已整理"),
                    item("研究生国家奖学金", "济南大学", "2024.12", "研究生国家奖学金。", ["国家级", "奖学金"], "高亮"),
                    item("济南大学校优秀毕业生", "济南大学", "2024.10", "济南大学校优秀毕业生。", ["毕业荣誉"], "已整理"),
                    item("济南大学校级榜样繁星", "济南大学", "2024.12", "济南大学校级榜样繁星。", ["榜样荣誉"], "已整理"),
                    item("济南大学校优秀毕业论文", "济南大学", "2025.05", "济南大学校优秀毕业论文。", ["毕业论文"], "高亮"),
                    item("江苏省社科界第十九届学术大会参会论文一等奖", "江苏省社科界学术大会", "2025.10", "江苏省社科界第十九届学术大会参会论文一等奖。", ["论文奖"], "高亮"),
                ],
            },
            {
                id: uid(),
                title: "论文与学术成果",
                category: "publication",
                description: "统一收纳已提供的中英文论文成果，支持后续继续扩充。",
                accent: "pink",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("Before the rain falls: corporate climate risk perception and supply chain stability", "Environ Dev Sustain", "2026", "Ren, Y., Yuan, P. & Dong, X. Before the rain falls: corporate climate risk perception and supply chain stability. Environ Dev Sustain (2026). https://doi.org/10.1007/s10668-026-07323-3", ["英文论文", "供应链", "气候风险"], "最新"),
                    item("How to prevent “greenwash” in green retrofit process under PPP model", "Applied Economics", "2025", "Ren Y, Yuan P, Dong X, et al. How to prevent “greenwash” in green retrofit process under PPP model: An evolutionary game theory-based analysis[J]. Applied Economics, 2025, 57(16): 1888-1908.", ["英文论文", "PPP", "绿色改造"], "核心成果"),
                    item("良师益友：企业ESG表现的区域同群效应", "重庆大学学报(社会科学版)", "2025", "袁朋伟, 任缘, 董晓庆. 良师益友：企业ESG表现的区域同群效应[J]. 重庆大学学报(社会科学版), 2025, 31(04):76-95.", ["中文论文", "ESG"], "核心成果"),
                    item("公共数据要素开放与企业组织韧性", "财经论丛(浙江财经大学学报)", "2025", "袁朋伟, 任缘, 董晓庆. 公共数据要素开放与企业组织韧性[J]. 财经论丛(浙江财经大学学报), 2025,(09):28-38.", ["中文论文", "组织韧性"], "核心成果"),
                    item("因果必然还是无奈之举：管理者短视与创新模式选择", "珞珈管理评论", "2024", "董晓庆, 袁朋伟, 任缘. 因果必然还是无奈之举：管理者短视与创新模式选择[J]. 珞珈管理评论, 2024,(04):46-71.", ["中文论文", "创新"], "已发表"),
                    item("产业链绿色技术创新的同群效应研究", "郑州大学学报(哲学社会科学版)", "2024", "袁朋伟, 董晓庆, 任缘. 产业链绿色技术创新的同群效应研究[J]. 郑州大学学报(哲学社会科学版), 2024,57(01):50-58+143.", ["中文论文", "绿色技术"], "已发表"),
                    item("Going Green on the Government’s Dime", "Sustainability", "2025", "Dong X, Cheng G, Ren Y. Going Green on the Government’s Dime: Unpacking the Subsidy Boost in Family Firms[J]. Sustainability, 2025, 17(10): 4547. https://doi.org/10.3390/su17104547", ["英文论文", "补贴", "家族企业"], "已发表"),
                ],
            },
            {
                id: uid(),
                title: "科研项目档案",
                category: "project",
                description: "聚焦已提供的国家社科基金、自然科学基金与省级项目条目。",
                accent: "green",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("竞争性国企创新效率损失及优化对策研究", "国家社科基金一般项目", "项目编号：20BGL047", "国家社科基金一般项目：“竞争性国企创新效率损失及优化对策研究”。", ["国家社科基金"], "已归档"),
                    item("城市关联生命线系统韧性评价与提升机制研究", "山东省自然科学基金项目", "项目编号：ZR2023MG044", "山东省自然科学基金项目：“城市关联生命线系统韧性评价与提升机制研究”。", ["省级项目", "韧性"], "已归档"),
                    item("山东省城市关联生命线系统韧性提升机理与策略研究", "项目编号：23CCXJ01", "项目资料", "山东省城市关联生命线系统韧性提升机理与策略研究。", ["省级项目", "策略研究"], "已归档"),
                ],
            },
            {
                id: uid(),
                title: "工作与社会实践",
                category: "experience",
                description: "将财务、实习、编辑部与社会实践统一整理，便于后续写入申请材料。",
                accent: "amber",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("海南大学财务部财务助理", "负责账单登记与报销数据核对", "2019.09-2020.04", "帮助校财务部老师登记账单、核对报销数据，参与审核老师课题结算项目费用等工作。", ["财务", "校内工作"], "已整理"),
                    item("海南省用友网络科技有限公司实施运维实习生", "实施部系统维护及客户对接", "2022.07-2022.08", "负责公司实施部系统维护及客户对接工作。", ["实习", "运维"], "已整理"),
                    item("济南大学学报编辑部助理编辑", "长期持续岗位", "2022.09-至今", "在济南大学学报编辑部担任助理编辑。", ["编辑", "学术支持"], "进行中"),
                    item("暑期社会实践积极分子", "实践总结归档", "2020", "已纳入奖项模块，同时在实践经历中保留该阶段的活动属性。", ["实践"], "关联条目"),
                ],
            },
            {
                id: uid(),
                title: "组织、志愿与党务角色",
                category: "role",
                description: "整理支教、新生班助、学生党支部与博士阶段组织角色。",
                accent: "cyan",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("“苍鹰”支教队安全部干事", "海南大学", "2018.09-2019.06", "负责支教队百余队员出校支教的路途安全工作，支配后勤物资运转与人员调转安排，负责考勤以及支教队对外联络。获优秀队员、优秀干事、优秀辅导员荣誉。", ["支教", "安全部"], "重要经历"),
                    item("管理学院新生班助", "海南大学管理学院", "2020.09-2021.01", "负责新生的学校政策宣传、入学教育及贫困生认定等工作。", ["班助", "学生工作"], "已整理"),
                    item("管理科学与工程系学生党支部支委（纪律委员）", "海南大学管理学院", "2020.09-2022.06", "负责支部党员档案审核、填写，与上级党支部对接等工作。", ["党务", "纪律委员"], "已整理"),
                    item("南京大学产经一支部支委（组织委员）", "南京大学", "2025.09", "南京大学产经一支部支委（组织委员）。", ["党务", "组织委员"], "当前角色"),
                ],
            },
            {
                id: uid(),
                title: "网站维护设置",
                category: "config",
                description: "说明当前网站的保存方式、图片上传规则与维护能力。",
                accent: "violet",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("保存方式", "浏览器本地保存", "实时生效", "模块、条目、头像、图库和页面设置都会保存在浏览器本地，可导出为 JSON 备份。", ["保存", "JSON"], "启用中"),
                    item("图片上传规则", "常见图片格式", "最大 5MB", "支持 JPG、PNG、WEBP、GIF。上传后可即时预览、替换、删除，并调整展示方式。", ["图片上传", "预览"], "启用中"),
                    item("维护功能", "支持日常更新", "可用", "支持新增模块、新增条目、编辑、删除、排序、搜索、筛选、折叠与展开。", ["编辑", "排序", "搜索"], "启用中"),
                    item("信息安全提醒", "敏感内容请脱敏", "建议", "如果后续加入账号、密钥或内部链接，建议使用占位符或脱敏方式展示，不要直接公开。", ["安全", "提醒"], "建议"),
                ],
            },
            {
                id: uid(),
                title: "帮助与维护指南",
                category: "help",
                description: "把后续维护要点也内置到门户里，确保它不仅能看，还能长期用。",
                accent: "pink",
                collapsed: false,
                updatedAt: seedNow,
                items: [
                    item("如何新增模块", "内容管理中心", "长期可用", "进入“内容管理”，点击“新增模块”，填写名称、分类、说明和配色后即可建立新模块。", ["新增模块"], "帮助"),
                    item("如何新增或编辑条目", "模块内维护", "长期可用", "在任意模块点击“新增条目”或“编辑”，支持标题、副标题、时间、标签与富文本描述。", ["新增条目", "编辑"], "帮助"),
                    item("如何上传照片", "图片与资料中心", "长期可用", "支持点击上传和拖拽上传。上传后可即时预览、删除，并切换图片显示模式。", ["上传图片"], "帮助"),
                    item("如何备份与恢复", "系统设置", "长期可用", "在“系统设置”中导出 JSON 进行备份。导入时可恢复全部模块、条目、图片与设置。", ["备份", "恢复"], "帮助"),
                ],
            },
        ],
    };
}

function item(title, subtitle, date, description, tags, status) {
    return {
        id: uid(),
        title,
        subtitle,
        date,
        description,
        tags,
        status,
        updatedAt: now(),
    };
}

function getModule(moduleId) {
    return state.modules.find((module) => module.id === moduleId);
}

function uid() {
    return crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
    return new Date().toISOString();
}

function splitTags(value) {
    return String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
    return escapeHTML(value).replaceAll("'", "&#39;");
}

function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(value, length) {
    const stripped = stripHtml(value);
    return stripped.length > length ? `${stripped.slice(0, length)}...` : stripped;
}

function renderRichText(value) {
    if (!value) {
        return "";
    }
    if (/<[a-z][\s\S]*>/i.test(value)) {
        return value;
    }
    return escapeHTML(value).replace(/\n/g, "<br>");
}

function formatDate(value) {
    if (!value) {
        return "未记录";
    }
    if (/^\d{4}([.-]\d{1,2})?/.test(value)) {
        return value;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(value) {
    if (!value) {
        return "未记录";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return formatDate(value);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateSortValue(value) {
    const digits = String(value || "").match(/\d+/g);
    if (!digits) {
        return 0;
    }
    const [year = "0", month = "0", day = "0"] = digits;
    return Number(`${year.padStart(4, "0")}${month.padStart(2, "0")}${day.padStart(2, "0")}`);
}

function titleByView(view) {
    return {
        dashboard: "简历总览",
        knowledge: "简历信息",
        content: "内容维护",
        media: "图片资料",
        help: "帮助中心",
        settings: "页面设置",
    }[view] || "简历总览";
}

function getHomepageImage() {
    const avatar = state.profile.avatar;
    const hasCustomAvatar = avatar && avatar.name !== "default-avatar.svg";
    if (hasCustomAvatar) {
        return avatar;
    }
    if (state.profile.gallery.length) {
        return state.profile.gallery[0];
    }
    return avatar;
}

function toast(message, type = "success") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    els.toastStack.appendChild(node);
    window.setTimeout(() => node.remove(), 2800);
}

function createAvatarObject(label) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">
            <defs>
                <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stop-color="#5ef2ff"/>
                    <stop offset="50%" stop-color="#6a8bff"/>
                    <stop offset="100%" stop-color="#ff5ea8"/>
                </linearGradient>
            </defs>
            <rect width="480" height="480" rx="92" fill="#081122"/>
            <circle cx="140" cy="110" r="120" fill="url(#g)" opacity="0.35"/>
            <circle cx="370" cy="370" r="150" fill="#8f6dff" opacity="0.18"/>
            <path d="M78 364C136 287 204 248 282 248C352 248 411 285 430 364" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="22" stroke-linecap="round"/>
            <circle cx="240" cy="176" r="78" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="22"/>
            <text x="240" y="438" text-anchor="middle" font-size="86" fill="#eef4ff" font-family="Arial, sans-serif" font-weight="700">${label}</text>
        </svg>
    `;

    return {
        id: uid(),
        name: "default-avatar.svg",
        dataUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        fit: "cover",
        createdAt: now(),
    };
}

function startParticles() {
    const canvas = document.getElementById("particle-canvas");
    const context = canvas.getContext("2d");
    let animationId = null;
    const particles = Array.from({ length: 46 }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00055,
        vy: (Math.random() - 0.5) * 0.00055,
        radius: 1 + Math.random() * 2.2,
    }));

    const resize = () => {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const draw = () => {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const computed = getComputedStyle(document.body);
        const particleA = computed.getPropertyValue("--cyan").trim() || "#5ef2ff";
        const particleB = computed.getPropertyValue("--blue").trim() || "#6a8bff";
        const particleC = computed.getPropertyValue("--pink").trim() || "#ff5ea8";

        if (!state.settings.motionEnabled) {
            animationId = requestAnimationFrame(draw);
            return;
        }

        particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
            if (particle.y < 0 || particle.y > 1) particle.vy *= -1;

            const px = particle.x * window.innerWidth;
            const py = particle.y * window.innerHeight;
            context.beginPath();
            context.fillStyle = index % 3 === 0 ? hexToRgba(particleA, 0.8) : index % 3 === 1 ? hexToRgba(particleB, 0.72) : hexToRgba(particleC, 0.64);
            context.arc(px, py, particle.radius, 0, Math.PI * 2);
            context.fill();
        });

        for (let i = 0; i < particles.length; i += 1) {
            for (let j = i + 1; j < particles.length; j += 1) {
                const a = particles[i];
                const b = particles[j];
                const dx = (a.x - b.x) * window.innerWidth;
                const dy = (a.y - b.y) * window.innerHeight;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 120) {
                    context.strokeStyle = hexToRgba(particleA, 0.14 - distance / 900);
                    context.lineWidth = 1;
                    context.beginPath();
                    context.moveTo(a.x * window.innerWidth, a.y * window.innerHeight);
                    context.lineTo(b.x * window.innerWidth, b.y * window.innerHeight);
                    context.stroke();
                }
            }
        }

        animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (animationId) cancelAnimationFrame(animationId);
    draw();
}

function hexToRgba(value, alpha) {
    const fallback = `rgba(94, 242, 255, ${alpha})`;
    const hex = value.replace("#", "").trim();
    if (![3, 6].includes(hex.length)) {
        return fallback;
    }
    const normalized = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) {
        return fallback;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
