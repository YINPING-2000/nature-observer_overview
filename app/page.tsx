"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type TabId = "overview" | "product" | "research" | "evolution" | "reflection";

const EDITOR_ENABLED = false;

const tabs: { id: TabId; label: string; eyebrow: string }[] = [
  { id: "overview", label: "项目概览", eyebrow: "OVERVIEW" },
  { id: "product", label: "产品介绍", eyebrow: "PRODUCT" },
  { id: "research", label: "调研过程", eyebrow: "RESEARCH" },
  { id: "evolution", label: "项目发展", eyebrow: "EVOLUTION" },
];

const productSteps = [
  { number: "01", title: "识别", copy: "拍照或上传感兴趣的植物，快速获得识别结果。" },
  { number: "02", title: "探索", copy: "从关键特征、生态与人文关系中，理解一株植物。" },
  { number: "03", title: "观察", copy: "用问题，引导用户观察眼前的植物。" },
  { number: "04", title: "收藏", copy: "保存植物的识别记录，方便回顾。" },
];

function FolderTabs({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const keyOffset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!keyOffset && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + keyOffset + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    requestAnimationFrame(() => document.getElementById(`tab-${nextTab.id}`)?.focus());
  }

  return (
    <nav className="folder-nav" aria-label="案例研究章节">
      <div className="folder-tabs" role="tablist" aria-label="Nature Observer 项目档案">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`folder-tab folder-${index + 1} ${active === tab.id ? "is-active" : ""}`}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span>{tab.eyebrow}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionHeading({ index, label, title, copy }: { index: string; label: string; title: ReactNode; copy?: string }) {
  return (
    <header className="section-heading">
      <div className="section-kicker"><span>{index}</span>{label}</div>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </header>
  );
}

function ProductDevice({ src, videoSrc, alt, className = "", scrollable = false }: { src?: string; videoSrc?: string; alt: string; className?: string; scrollable?: boolean }) {
  return (
    <figure className={`product-device ${scrollable ? "scrollable-device" : ""} ${className}`} aria-label={src || videoSrc ? undefined : alt}>
      {videoSrc ? (
        <video autoPlay muted loop playsInline preload="metadata" poster="/assets/product/quiz-1.png" aria-label={alt}>
          <source src={videoSrc} type="video/mp4" />
          您的浏览器暂不支持视频播放。
        </video>
      ) : src ? (
        scrollable ? (
          <div className="device-scroll-viewport" role="region" aria-label={`${alt}，可上下滚动`} tabIndex={0}>
            <img src={src} alt={alt} />
          </div>
        ) : <img src={src} alt={alt} />
      ) : <div className="device-empty" aria-hidden="true"><span /></div>}
    </figure>
  );
}

function SceneDiagram({ type }: { type: "core" | "education" }) {
  const steps = type === "core"
    ? ["遇见植物", "拍照识别", "现场观察"]
    : ["讲解任务", "学生互动", "延伸查看"];
  return (
    <div className={`scene-diagram scene-${type}`} aria-label={steps.join("，然后")}>
      {steps.map((step, index) => (
        <div className="scene-step-wrap" key={step}>
          <span>{String(index + 1).padStart(2, "0")}</span><b>{step}</b>
          {index < steps.length - 1 && <i>→</i>}
        </div>
      ))}
    </div>
  );
}

type DraftImage = { dataUrl: string; name: string; type: string };
type SiteDraft = {
  version: 1;
  text: Record<string, string>;
  hidden: string[];
  images: Record<string, DraftImage>;
};

const DRAFT_DB_NAME = "nature-observer-drafts";
const DRAFT_STORE_NAME = "drafts";
const DRAFT_RECORD_KEY = "current-site-draft";
const DRAFT_PAGE_SCOPES: Record<TabId, string> = {
  overview: "overview-v2",
  product: "product-v2",
  research: "research-v2",
  evolution: "evolution",
  reflection: "reflection",
};

function emptySiteDraft(): SiteDraft {
  return { version: 1, text: {}, hidden: [], images: {} };
}

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DRAFT_STORE_NAME)) request.result.createObjectStore(DRAFT_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSiteDraft(): Promise<SiteDraft> {
  const database = await openDraftDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readonly");
    const request = transaction.objectStore(DRAFT_STORE_NAME).get(DRAFT_RECORD_KEY);
    request.onsuccess = () => resolve((request.result as SiteDraft | undefined) ?? emptySiteDraft());
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeSiteDraft(draft: SiteDraft): Promise<void> {
  const database = await openDraftDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.objectStore(DRAFT_STORE_NAME).put(draft, DRAFT_RECORD_KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function clearSiteDraft(): Promise<void> {
  const database = await openDraftDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.objectStore(DRAFT_STORE_NAME).delete(DRAFT_RECORD_KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

function elementPath(element: Element, root: Element): string {
  const indexes: number[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    indexes.unshift(Array.from(parent.children).indexOf(current));
    current = parent;
  }
  return indexes.join(".");
}

function DraftEditor({ active }: { active: TabId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [draft, setDraft] = useState<SiteDraft>(emptySiteDraft);
  const [applyVersion, setApplyVersion] = useState(0);
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);
  const [selectedBlockLabel, setSelectedBlockLabel] = useState("");
  const [saveStatus, setSaveStatus] = useState("本地草稿未修改");
  const selectedBlockRef = useRef<HTMLElement | null>(null);
  const targetImageRef = useRef<HTMLImageElement | null>(null);
  const draftRef = useRef<SiteDraft>(draft);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    readSiteDraft()
      .then((savedDraft) => {
        draftRef.current = savedDraft;
        setDraft(savedDraft);
        setSaveStatus(Object.keys(savedDraft.text).length || savedDraft.hidden.length || Object.keys(savedDraft.images).length ? "已载入本地草稿" : "本地草稿未修改");
        setIsReady(true);
        setApplyVersion((version) => version + 1);
      })
      .catch(() => { setSaveStatus("浏览器无法保存草稿"); setIsReady(true); });
  }, []);

  function commitDraft(nextDraft: SiteDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveStatus("正在保存…");
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      writeSiteDraft(draftRef.current)
        .then(() => setSaveStatus("已自动保存到当前浏览器"))
        .catch(() => setSaveStatus("保存失败，请先导出草稿"));
    }, 350);
  }

  useEffect(() => {
    if (!isReady) return;
    let cleanupPanel: (() => void) | undefined;
    const frame = window.requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(`#panel-${active} .panel-inner`);
      if (!panel) return;
      const draftScope = DRAFT_PAGE_SCOPES[active];
      selectedBlockRef.current?.classList.remove("is-draft-selected");
      selectedBlockRef.current = null;
      setSelectedBlockKey(null);
      setSelectedBlockLabel("");
      panel.classList.toggle("draft-editing", isEditing);

      const blockElements = new Set<HTMLElement>();
      Array.from(panel.children).forEach((element) => blockElements.add(element as HTMLElement));
      panel.querySelectorAll<HTMLElement>(".product-feature-item, .product-scene-grid > article, .study-block, .timeline-item, .reflection-grid > article").forEach((element) => blockElements.add(element));
      blockElements.forEach((element) => {
        const key = `${draftScope}:block:${elementPath(element, panel)}`;
        element.dataset.draftBlockKey = key;
        element.style.display = draftRef.current.hidden.includes(key) ? "none" : "";
        element.tabIndex = isEditing ? 0 : -1;
      });

      const textSelector = "h1,h2,h3,h4,p,li,blockquote,figcaption,.section-kicker,.tiny-label,.project-strip span,.project-strip strong,.product-flow b,.overview-solution-flow b,.product-capability-grid article>span,.metric-grid span,.overview-method-grid span,.status-chip,.feature-note";
      panel.querySelectorAll<HTMLElement>(textSelector).forEach((element) => {
        const key = `${draftScope}:text:${elementPath(element, panel)}`;
        element.dataset.draftTextKey = key;
        const savedText = draftRef.current.text[key];
        if (savedText !== undefined && element.innerHTML !== savedText) element.innerHTML = savedText;
        element.contentEditable = isEditing ? "true" : "false";
        element.spellcheck = false;
      });

      panel.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
        const key = `${draftScope}:image:${elementPath(image, panel)}`;
        image.dataset.draftImageKey = key;
        const savedImage = draftRef.current.images[key];
        if (savedImage && image.src !== savedImage.dataUrl) image.src = savedImage.dataUrl;
      });

      const handleInput = (event: Event) => {
        const element = event.target as HTMLElement;
        const key = element.dataset.draftTextKey;
        if (!key) return;
        commitDraft({ ...draftRef.current, text: { ...draftRef.current.text, [key]: element.innerHTML } });
      };

      const selectBlock = (element: HTMLElement) => {
        selectedBlockRef.current?.classList.remove("is-draft-selected");
        element.classList.add("is-draft-selected");
        selectedBlockRef.current = element;
        setSelectedBlockKey(element.dataset.draftBlockKey ?? null);
        setSelectedBlockLabel(element.querySelector("h1,h2,h3,h4")?.textContent?.trim() || "当前板块");
      };

      const handleClick = (event: MouseEvent) => {
        if (!isEditing) return;
        const target = event.target as HTMLElement;
        const image = target.closest<HTMLImageElement>("img[data-draft-image-key]");
        if (image) {
          event.preventDefault();
          event.stopPropagation();
          targetImageRef.current = image;
          fileInputRef.current?.click();
          return;
        }
        let candidate: HTMLElement | null = target;
        while (candidate && candidate !== panel && !candidate.dataset.draftBlockKey) candidate = candidate.parentElement;
        if (candidate?.dataset.draftBlockKey) selectBlock(candidate);
      };

      panel.addEventListener("input", handleInput);
      panel.addEventListener("click", handleClick);
      cleanupPanel = () => {
        panel.removeEventListener("input", handleInput);
        panel.removeEventListener("click", handleClick);
      };
    });
    return () => {
      window.cancelAnimationFrame(frame);
      cleanupPanel?.();
    };
  }, [active, applyVersion, isEditing, isReady]);

  useEffect(() => () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
  }, []);

  function hideSelectedBlock() {
    if (!selectedBlockKey || !selectedBlockRef.current) return;
    selectedBlockRef.current.style.display = "none";
    selectedBlockRef.current.classList.remove("is-draft-selected");
    const hidden = draftRef.current.hidden.includes(selectedBlockKey) ? draftRef.current.hidden : [...draftRef.current.hidden, selectedBlockKey];
    commitDraft({ ...draftRef.current, hidden });
    selectedBlockRef.current = null;
    setSelectedBlockKey(null);
    setSelectedBlockLabel("");
  }

  function restoreLastBlock() {
    const key = draftRef.current.hidden[draftRef.current.hidden.length - 1];
    if (!key) return;
    const hidden = draftRef.current.hidden.filter((item) => item !== key);
    document.querySelectorAll<HTMLElement>("[data-draft-block-key]").forEach((element) => {
      if (element.dataset.draftBlockKey === key) element.style.display = "";
    });
    commitDraft({ ...draftRef.current, hidden });
  }

  function restoreAllBlocks() {
    document.querySelectorAll<HTMLElement>("[data-draft-block-key]").forEach((element) => { element.style.display = ""; });
    commitDraft({ ...draftRef.current, hidden: [] });
  }

  function replaceImage(file: File) {
    const image = targetImageRef.current;
    const key = image?.dataset.draftImageKey;
    if (!image || !key) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      image.src = dataUrl;
      commitDraft({ ...draftRef.current, images: { ...draftRef.current.images, [key]: { dataUrl, name: file.name, type: file.type } } });
    };
    reader.readAsDataURL(file);
  }

  function exportDraft() {
    const payload = {
      schema: "nature-observer-browser-draft/v1",
      exportedAt: new Date().toISOString(),
      source: window.location.href,
      draft: draftRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nature-observer-draft-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveStatus("草稿文件已导出");
  }

  async function resetDraft() {
    if (!window.confirm("确定清空当前浏览器中的全部草稿修改吗？此操作不会影响正式网站。")) return;
    await clearSiteDraft();
    window.location.reload();
  }

  return (
    <aside className={`draft-editor ${isEditing ? "is-editing" : ""}`} aria-label="页面草稿编辑器">
      <input ref={fileInputRef} className="draft-file-input" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) replaceImage(file); event.target.value = ""; }} />
      <div className="draft-editor-primary">
        <button className="draft-primary-button" onClick={() => { setIsEditing((value) => !value); setSelectedBlockKey(null); selectedBlockRef.current?.classList.remove("is-draft-selected"); selectedBlockRef.current = null; }}>
          {isEditing ? "预览草稿" : "编辑草稿"}
        </button>
        <div><b>{isEditing ? "编辑模式" : "草稿预览"}</b><span>{saveStatus}</span></div>
      </div>
      {isEditing && <div className="draft-selection"><span>{selectedBlockKey ? `已选择：${selectedBlockLabel}` : "点击板块进行选择；点击图片进行替换"}</span>{selectedBlockKey && <button className="draft-danger" onClick={hideSelectedBlock}>删除所选板块</button>}</div>}
      <div className="draft-editor-actions">
        {draft.hidden.length > 0 && <button onClick={restoreLastBlock}>撤销删除</button>}
        {draft.hidden.length > 1 && <button onClick={restoreAllBlocks}>恢复全部板块</button>}
        <button onClick={exportDraft}>导出编辑文件</button>
        <button onClick={resetDraft}>清空草稿</button>
      </div>
    </aside>
  );
}

const overviewTeam = {
  design: [
    { name: "殷平", detail: "密歇根大学硕士\n景观建筑＋交互设计专业", avatar: "ping" },
    { name: "朱宁睿", detail: "密歇根大学硕士\n交互设计专业", avatar: "ningrui" },
    { name: "李方仪", detail: "密歇根大学硕士\n交互设计专业", avatar: "fangyi" },
  ],
  tech: [
    { name: "江佳圆", detail: "密歇根大学硕士\n地理信息科学＋数据科学专业", avatar: "jiayuan" },
    { name: "卞江畔", detail: "密歇根大学硕士\n地理信息科学专业", avatar: "jiangpan" },
    { name: "苏隽", detail: "密歇根大学硕士\n应用统计＋数据科学专业", avatar: "junsu" },
    { name: "张弘昊", detail: "密歇根大学学士\n计算机科学+统计专业", avatar: "honghao" },
  ],
};

function TeamMember({ member }: { member: { name: string; detail: string; avatar: string } }) {
  const standalone = member.avatar === "ping"
    ? "/assets/overview/ping-avatar.webp"
    : member.avatar === "fangyi"
      ? "/assets/overview/li-fangyi.png"
      : member.avatar === "honghao"
        ? "/assets/overview/zhang-honghao.webp"
        : null;

  return (
    <article className="team-member">
      {standalone
        ? <div className={`member-avatar avatar-${member.avatar}`}><img src={standalone} alt={`${member.name}的团队头像`} /></div>
        : <div className={`member-avatar composite-avatar avatar-${member.avatar}`} role="img" aria-label={`${member.name}的团队头像`} />}
      <div><h4>{member.name}</h4><p>{member.detail.split("\n").map((line) => <span key={line}>{line}</span>)}</p></div>
    </article>
  );
}

function OverviewPanel() {
  return (
    <div className="panel-inner overview-latest">
      <section className="overview-latest-hero">
        <div className="tiny-label"><span className="pixel-dot" />NATURE EDUCATION · AI PRODUCT</div>
        <div className="overview-hero-layout">
          <div className="overview-hero-copy">
            <h1>Nature Observer<br /><span>自然观察家</span></h1>
            <p>一个 AI 驱动的植物学习工具，帮助用户在公园中识别、观察植物，理解植物背后的故事。</p>
            <div className="status-chip"><i /> FIELD TESTED · MVP V2.0</div>
          </div>
          <figure className="overview-hero-composite">
            <img src="/assets/overview/overview-hero-composite-v2.png" alt="Nature Observer 拍照识别、植物知识和引导观察界面组合" />
          </figure>
        </div>
      </section>

      <section className="project-strip overview-project-strip" aria-label="项目基本信息">
        <div><span>用户</span><strong>初级植物爱好者</strong></div>
        <div><span>使用场景</span><strong>户外：植物园、公园、街道</strong></div>
        <div><span>解决问题</span><strong>现有植物识别软件<br />只给结果，丢失学习过程</strong></div>
      </section>

      <section id="overview-story" className="overview-problem-latest">
        <SectionHeading index="01" label="核心问题" title="只展示识别结果，丢失学习过程" />
        <p className="overview-problem-intro">当人们在户外遇到陌生植物时，通常会借助识别工具获得植物名称。但现有体验止步于“它是什么”，而没有解释“它的特征”。由此产生两个问题：</p>
        <div className="overview-problem-grid">
          <article>
            <div className="overview-problem-illustration memory"><img src="/assets/overview/problem-memory.png" alt="从观察到记忆的示意图" /></div>
            <h3>被动学习，容易遗忘</h3>
            <p>用户没有主动观察植物的关键识别特征，识别结果难以形成长期记忆，下次遇见时仍然无法独立辨认。</p>
          </article>
          <article>
            <div className="overview-problem-illustration curiosity"><img src="/assets/overview/problem-curiosity.png" alt="植物与生态关系的示意图" /></div>
            <h3>缺失其他相关信息，无法满足好奇心</h3>
            <p>植物名称本身无法满足植物爱好者的好奇心。他们还希望了解植物独特的形态、季节变化，以及它与人类、其他生物和生态环境之间的关系。</p>
          </article>
        </div>
      </section>

      <section className="overview-solution-latest">
        <div className="section-kicker"><span>02</span>解决方案</div>
        <h2>将一次性的植物识别转化为主动的观察学习</h2>
        <div className="overview-solution-flow" aria-label="拍照、识别植物、探索趣味知识、跟随引导观察、保存收藏">
          <b>拍照</b><i>→</i><b>识别植物</b><i>→</i><b>探索趣味知识</b><i>→</i><b>跟随引导观察</b><i>→</i><b>保存收藏</b>
        </div>
      </section>

      <section className="overview-research-latest">
        <SectionHeading index="03" label="研究方法" title={<>4 种调研方法，<br />明确用户需求与潜在使用场景</>} />
        <div className="overview-method-grid">
          <article>
            <b>106</b><span>份线上问卷</span>
            <p>广泛理解自然兴趣、观察习惯、困难与工具期待</p>
          </article>
          <article>
            <b>24</b><span>位现场拦访</span>
            <p>确认植物园访客画像与科普内容需求</p>
          </article>
          <article>
            <b>15</b><span>人次深度访谈</span>
            <p>覆盖植物园方、游客与植物爱好者</p>
          </article>
          <article>
            <b>02</b><span>类实地观察</span>
            <p>高中研学活动与市民 Wonder Walk</p>
          </article>
        </div>
      </section>

      <section className="overview-closing overview-latest-closing">
        <div className="section-kicker overview-closing-kicker"><span>04</span>团队与周期</div>
        <div className="overview-closing-content">
          <div className="project-period">
            <h3>项目周期</h3>
            <strong>2025.10—至今</strong>
          </div>
          <div className="team-roster">
            <h3>团队构成</h3>
            <div className="team-groups">
              <section>
                <h3>产品＋设计侧</h3>
                <div className="team-member-grid design-team">{overviewTeam.design.map((member) => <TeamMember key={member.name} member={member} />)}</div>
              </section>
              <section>
                <h3>技术侧</h3>
                <div className="team-member-grid tech-team">{overviewTeam.tech.map((member) => <TeamMember key={member.name} member={member} />)}</div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductPanel() {
  return (
    <div className="panel-inner product-panel">
      <section className="product-journey">
        <SectionHeading
          index="01"
          label="核心体验流程"
          title={<>将一次性的植物识别,<br />转化为主动的观察学习</>}
        />
        <div className="product-flow" aria-label="拍照、识别植物、探索趣味知识、跟随引导观察、保存收藏">
          <b>拍照</b><i>→</i><b>识别植物</b><i>→</i><b>探索趣味知识</b><i>→</i><b>跟随引导观察</b><i>→</i><b>保存收藏</b>
        </div>
      </section>

      <section className="product-capabilities">
        <div className="section-kicker"><span>02</span>产品功能</div>
        <div className="product-capability-grid">
          {productSteps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.copy}</p></article>)}
        </div>
      </section>

      <section className="product-scenes">
        <div className="section-kicker"><span>03</span>使用场景</div>
        <div className="product-scene-grid">
          <article>
            <h3>核心使用场景</h3>
            <p>初级植物爱好者在植物园、公园、街角遇到感兴趣的植物，拍照识别后，用 1–3 分钟了解其关键识别特征，并跟随问题进行现场观察。</p>
            <SceneDiagram type="core" />
          </article>
          <article>
            <h3>延伸场景</h3>
            <p>在自然教育活动中，Nature Observer 作为讲解者的数字辅助工具：学生或参与者扫描植物、回答观察问题，并在讲解结束后继续查看图片、故事与生态关系。</p>
            <SceneDiagram type="education" />
          </article>
        </div>
      </section>

      <section className="product-feature-list">
        <div className="section-kicker"><span>04</span>关键功能与界面</div>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <h3>识别植物</h3>
            <p>当用户在公园、植物园或自然教育活动中遇到陌生植物时，可以通过拍照或上传图片快速获得识别结果。</p>
            <p className="experience-value">体验价值：快速回答“它是什么”——最基础的问题</p>
          </div>
          <ProductDevice src="/assets/product/upload.png" alt="Nature Observer 植物照片上传首页" />
        </article>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <h3>探索趣味知识</h3>
            <p>识别完成后，用户首先看到植物名称和最值得记住的特征，再根据兴趣继续探索植物的形态、季节变化、原生地、生态关系以及人文故事。</p>
            <p className="experience-value">体验价值：按照“了解名称—理解特征—继续探索”的阅读层级，逐层递进，帮助用户在 1–3 分钟内获得最有价值的信息。通过特征记住该植物，通过故事理解该植物为什么值得认识。</p>
          </div>
          <ProductDevice src="/assets/product/story-scroll.png" alt="北方红橡树趣味知识页面" scrollable />
        </article>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <h3>跟随引导观察</h3>
            <p>Nature Observer 通过基于真实形态特征的问题，引导用户观察眼前植物的叶片、果实、树皮等部位。选项使用对比图片呈现，降低初学者理解专业植物术语的门槛。</p>
            <p>用户回答后，系统会解释相应特征；观察结束时，再将关键知识总结为三个 Takeaways，帮助用户记忆与回顾。</p>
            <p className="experience-value">体验价值：1. 让用户从被动接收识别结果，转变为主动发现植物特征，并提高下次独立识别的可能性。2. 帮助新手逐渐建立观察植物的方法——了解“应该从哪里开始观察一株植物”。</p>
          </div>
          <ProductDevice videoSrc="/assets/product/guided-observation-v2.mp4" alt="Nature Observer 跟随引导观察交互演示" />
        </article>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <div className="feature-heading-row">
              <h3>保存观察记录</h3>
              <span className="planned-feature-label">PLANNED FEATURE · 未来功能</span>
            </div>
            <p>完成探索后，用户可以保存植物的识别结果、关键特征与观察总结，形成个人的植物收藏。</p>
            <p className="experience-value">体验价值：支持用户长期记录自己的观察经历。<span>（也为未来关联同一植物在不同地点、不同季节的照片提供基础。）</span></p>
          </div>
          <ProductDevice src="/assets/product/history.png" alt="Nature Observer 保存观察记录历史界面" className="planned-device" />
        </article>
      </section>

      <section className="product-demo">
        <div className="section-kicker"><span>05</span>Demo</div>
        <div className="product-demo-layout">
          <figure className="product-device demo-device">
            <video controls playsInline preload="metadata" aria-label="Nature Observer 产品体验 Demo">
              <source src="/assets/product/demo-v2.mp4" type="video/mp4" />
              您的浏览器暂不支持视频播放。
            </video>
          </figure>
        </div>
      </section>
    </div>
  );
}

function ResearchPanel() {
  return (
    <div className="panel-inner research-panel-latest">
      <header className="research-intro">
        <div className="section-kicker"><span>01</span>RESEARCH</div>
        <p>通过线上问卷，先广泛理解自然兴趣与困难，再进入植物园确认人群与需求，最后通过访谈和影子观察理解真实学习行为。</p>
      </header>
      <div className="research-ladder">
        <article><span>01</span><b>线上问卷</b><small>n = 106</small><p>广泛了解热爱自然的人，在探索自然时的动机、习惯、学习自然的方式、遇到的困难、对学习工具的期待。</p></article>
        <i>→</i><article><span>02</span><b>游客拦访</b><small>n = 24</small><p>初步了解来植物园或公园的人群画像与科普需求，同时招募后续半结构化访谈参与者。</p></article>
        <i>→</i><article><span>03</span><b>半结构访谈</b><small>15 人次</small><p>理解人们如何学习植物，以及植物园中不同角色对科普的态度、需求与痛点。</p></article>
        <i>→</i><article><span>04</span><b>实地观察</b><small>2 类活动</small><p>以 shadow 的形式观察高中生研学活动与市民 Wonder Walk，理解人们在实地中学习植物的方式。</p></article>
      </div>

      <section className="study-block">
        <div className="study-copy">
          <span className="study-index">STUDY 01 · ONLINE SURVEY</span>
          <h2>线上问卷 <small>n = 106</small></h2>
          <p className="study-purpose">广泛了解热爱自然的人在探索自然时的动机、习惯、学习方式、困难与工具期待。</p>
          <div className="method-note"><b>过程</b><p>发放《自然探索体验和工具需求》问卷，有效样本中 18–25 岁占 72.6%；覆盖户外习惯、植物学习方式、好奇心体验、工具使用与功能期待五个维度。</p></div>
          <a className="source-link" href="https://www.wjx.cn/vm/QpBP7CJ.aspx" target="_blank" rel="noreferrer">查看问卷 ↗</a>
        </div>
        <figure className="study-visual portrait-doc"><img src="/assets/research/online-questionnaire-v2.webp" alt="自然探索体验和工具需求线上问卷截图" /><figcaption>《自然探索体验和工具需求》问卷</figcaption></figure>
      </section>

      <section className="survey-findings research-dark-band">
        <span className="research-band-label">KEY FINDINGS · STUDY 01</span>
        <article>
          <h3>1. 探索自然，了解植物的兴趣广泛存在</h3>
          <div className="metric-pair"><div><b>78.3%</b><p>对观察自然感兴趣<br />或非常感兴趣</p></div><div><b>69.8%</b><p>能明确回忆对自然<br />产生好奇的时刻</p></div></div>
        </article>
        <article>
          <h3>2. 大部分人在观察植物中遇到困难</h3>
          <div className="metric-pair"><div><b>75%</b><p>在学习自然时<br />遇到困难</p></div><div><b>51%</b><p>不知道应该观察<br />什么特征</p></div></div>
        </article>
        <p className="research-wide-finding">3. 兴趣广泛存在，但主动探索知识的人相对较少；大部分人的兴趣是拍照、放松等“氛围性”兴趣。</p>
      </section>

      <section className="study-block reverse-study">
        <div className="study-copy">
          <span className="study-index">STUDY 02 · INTERCEPT SURVEY</span>
          <h2>游客拦访 <small>n = 24</small></h2>
          <p className="study-purpose">初步了解来植物园或公园的人群画像与科普需求，同时招募后续半结构化访谈参与者。</p>
          <div className="method-note"><b>过程</b><p>先与植物园沟通 email 与计划 brief，再在现场发放拦访问卷；24 份回复最终转化为 5 位愿意继续接受访谈的受访者。</p></div>
          <div className="study-source-links">
            <a className="source-link" href="https://forms.gle/Fxrzt4qEehdrrQyu5" target="_blank" rel="noreferrer">查看拦访问卷 ↗</a>
            <a className="source-link" href="/assets/research/mbgna-visitor-plant-knowledge-interest-survey-result.docx" target="_blank" rel="noreferrer">查看问卷结果 ↗</a>
          </div>
        </div>
        <div className="study-visual doc-pair intercept-visual">
          <figure><img src="/assets/research/intercept-questionnaire-v2.webp" alt="植物园游客拦访问卷" /><figcaption>拦访问卷</figcaption></figure>
          <figure><img src="/assets/research/intercept-results-v2.webp" alt="植物园游客拦访问卷结果图表" /><figcaption>问卷结果</figcaption></figure>
        </div>
      </section>

      <section className="visitor-profile-band research-dark-band">
        <span className="research-band-label">KEY FINDINGS · STUDY 02</span>
        <div className="visitor-profile-main">
          <h3>植物园访客的基本画像</h3>
          <div className="visitor-profile-groups">
            <div><b>身份</b><div className="profile-items"><span><img src="/assets/research/icons/professor.svg" alt="" />UM教职工</span><span><img src="/assets/research/icons/student.svg" alt="" />UM学生</span><span><img src="/assets/research/icons/resident.svg" alt="" />安娜堡居民</span></div></div>
            <div><b>需求</b><div className="profile-items"><span><img src="/assets/research/icons/exercise.svg" alt="" />运动</span><span><img src="/assets/research/icons/family.svg" alt="" />带娃</span><span><img src="/assets/research/icons/gathering.svg" alt="" />聚会放松</span><span><img src="/assets/research/icons/inspiration.svg" alt="" />获得灵感</span><span><img src="/assets/research/icons/learn-plants.svg" alt="" />了解植物</span></div></div>
          </div>
        </div>
        <div className="visitor-profile-conclusion">
          <h3>大部分人会阅读植物标牌，<br />约一半认为标牌不能满足好奇心</h3>
          <p>1. 大部分人都对植物有好奇，且会阅读植物园提供的植物标牌；</p>
          <p>2. 约一半的人认为目前的植物标牌不能满足自己的好奇心。</p>
        </div>
      </section>

      <section className="study-block">
        <div className="study-copy">
          <span className="study-index">STUDY 03 · INTERVIEWS</span>
          <h2>半结构化访谈 <small>15 人次</small></h2>
          <p className="study-purpose">了解植物园中不同角色对科普的态度、需求与痛点；了解植物爱好者学习植物的方式。</p>
          <b className="interview-audience-label">访谈对象</b>
          <div className="participant-tags dark-tags interview-audience-tags">
            <span>植物园员工<small>GARDEN STAFF</small></span>
            <span>植物园访客<small>VISITORS</small></span>
            <span>植物爱好者<small>PLANT ENTHUSIASTS</small></span>
          </div>
          <div className="method-note"><b>招募方式</b><p>通过小红书、Reddit、LinkedIn 等公共社交媒体、现场拦访与教授 networking 三种方式进行招募，并为三类人群分别准备访谈 protocol。</p></div>
        </div>
        <div className="study-visual interview-collage" aria-label="线下访谈、线上会议与植物园访谈记录拼贴">
          <img className="collage-office" src="/assets/research/interview-office.webp" alt="团队开展线下半结构化访谈" />
          <img className="collage-remote-one" src="/assets/research/interview-remote.webp" alt="团队开展线上半结构化访谈" />
          <img className="collage-selfie" src="/assets/research/interview-selfie.webp" alt="团队与植物园受访者合影" />
          <img className="collage-remote-two" src="/assets/research/interview-sarah.png" alt="与 Sarah 开展半结构化访谈" />
        </div>
      </section>

      <section className="role-findings">
        <span className="light-band-label">KEY FINDINGS · STUDY 03</span>
        <article><span>植物园方</span><p>有意愿通过电子工具提供更好的科普；GIS Hub 中仍有大量数据未被转化为公众可理解的内容。</p></article>
        <article><span>植物园游客</span><p>大部分人来这里是为了放松，学习只是少数人的主要需求。</p></article>
        <article><span>植物爱好者</span><p>他们学习植物的场景通常发生在身边的公园与街道，而不只在植物园。</p></article>
      </section>

      <section className="study-block reverse-study field-study">
        <div className="study-copy">
          <span className="study-index">STUDY 04 · FIELD OBSERVATION</span>
          <h2>实地观察 <small>2 类活动</small></h2>
          <p className="study-purpose">以 shadow 的形式观察高中生研学活动与市民 Wonder Walk，理解人们在实地中学习植物的方式。</p>
        </div>
        <figure className="study-visual field-photo-pair">
          <div><img src="/assets/research/field-forest.webp" alt="团队观察户外自然教育活动" /><img src="/assets/research/field-greenhouse.webp" alt="团队观察温室内植物讲解活动" /></div>
          <figcaption>高中研学活动与市民 Wonder Walk · Shadowing</figcaption>
        </figure>
      </section>

      <section className="field-findings research-dark-band">
        <span className="research-band-label">KEY FINDINGS · STUDY 04</span>
        <article><h3>1. 植物学习软件可以作为人工讲解的补充，<br />但不具有替代性</h3><p>人工讲解中的很多内容是不可替代的，尤其是本地实时信息、本地具体特定的信息（动植物的小 fun fact）、宏观的生境信息和户外环境中的引导观察。</p></article>
        <article><h3>2. 研学活动可能成为产品的潜在使用场景</h3><p>研学活动—强制学习场景下</p><ul><li>学生会使用手机扫码查询植物的濒危情况（用 IUCN 网站），是植入电子化软件的入口。</li><li>教师准备的习题，让学生在答题中学习。</li></ul></article>
      </section>

      <section className="insight-map">
        <SectionHeading index="05" label="SYNTHESIS" title="四类研究，如何共同塑造产品" />
        <div className="insight-table" role="table" aria-label="研究发现与产品机会">
          <div className="table-head" role="row"><span>RESEARCH EVIDENCE</span><span>PRODUCT OPPORTUNITY</span></div>
          <div role="row"><p>51% 的人不知道应该观察什么特征</p><p>用分步骤问题提供观察框架，而不只返回名称</p></div>
          <div role="row"><p>主动学习较少，大部分兴趣来自拍照与放松</p><p>以轻量、有趣、现场可读的知识降低进入门槛</p></div>
          <div role="row"><p>约一半访客认为实体标牌无法满足好奇心</p><p>成为标牌与人工讲解之外的数字知识延展</p></div>
          <div role="row"><p>人工讲解擅长本地实时信息、故事与环境引导</p><p>数字体验应补充而非替代真实的人际导览</p></div>
        </div>
      </section>
    </div>
  );
}

function EvolutionPanel() {
  const phases = [
    { num: "01", date: "2025.10 — 2025.12", title: "+Tech Innovation Jam", subtitle: "完成第一版原型", points: ["组建跨学科团队，提出初版 Problem Statement", "开展初步问卷调研，做出以引导观察为核心的自然教育软件原型", "初步了解做产品、短期创业比赛与跨学科合作的全流程"], image: "/assets/development/jam-team.webp" },
    { num: "02", date: "2026 · WINTER", title: "MVP V1.0", subtitle: "开发可用软件，继续寻找方向", points: ["将比赛原型开发为可以实际使用的 Demo", "与 SEAS 环境学院教师交流项目", "寻找学校创业比赛资源并思考项目如何持续"] },
    { num: "03", date: "2026 · SPRING", title: "Dare to Dream + Demo Day", subtitle: "深化项目，更新 MVP V2.0", points: ["在 Ross 创业导师指导下完成 15 场访谈与现场调研，重新验证需求", "MVP V2.0 更侧重 Description 页面与植物知识", "Demo Day 展示、轻量可用性测试，并推进与 U-M 植物园合作"], image: "/assets/development/demo-poster.webp" },
    { num: "04", date: "PLANNED", title: "Botanical Garden Implementation", subtitle: "落地植物园，申请孵化器项目", points: ["把植物园定期更换的科普展板电子化归档", "把下架植物的内容沉淀进 App，延长信息生命周期", "收集高质量植物科普与手绘插画，建立精选数字内容库"], image: "/assets/development/garden-fieldwork.webp" },
  ];
  return (
    <div className="panel-inner">
      <SectionHeading index="01" label="EVOLUTION" title="从比赛原型，到真实场景中的产品" copy="项目跨越四个阶段：组队与原型、可用 Demo、研究驱动的 V2.0，以及计划中的植物园落地。" />
      <div className="timeline">
        {phases.map((phase, index) => (
          <article className={`timeline-item ${index % 2 ? "right" : "left"}`} key={phase.num}>
            <div className="timeline-marker"><span>{phase.num}</span></div>
            <div className="timeline-card">
              <span className="phase-date">{phase.date}</span><h3>{phase.title}</h3><h4>{phase.subtitle}</h4>
              <ul>{phase.points.map(point => <li key={point}>{point}</li>)}</ul>
              {phase.image && <img src={phase.image} alt={`${phase.title} 阶段项目照片`} />}
            </div>
          </article>
        ))}
      </div>

      <section className="funding-strip">
        <div><span>GRANT</span><b>$300</b><p>Dare to Dream Phase I</p></div>
        <div><span>FUEL</span><b>$500</b><p>项目资金支持</p></div>
        <div><span>CLOUD</span><b>$5K</b><p>Amazon 服务器 Credit</p></div>
        <div><span>OUTPUT</span><b>V2.0</b><p>上线 Demo 与调研成果</p></div>
      </section>

    </div>
  );
}

function ReflectionPanel() {
  const lessons = [
    { num: "01", tag: "SCENARIO", title: "提问的理念没有错，错的是把它做成了考试。", copy: "我们希望通过提问让用户放慢速度、降低信息密度并回到植物本身。但 Quiz 的形式让户外观察像做题，和休闲场景的心理预期产生冲突。下一步应探索更自然、低压力的互动方式。" },
    { num: "02", tag: "BIAS", title: "机构认同的价值，不一定是访客主动表达的需求。", copy: "植物园 Staff 希望提供更好的科普体验，但许多普通访客以休闲为主，现有标签已经基本够用。这个落差提醒我们警惕“利益相关者偏差”，并把每个判断放回真实使用场景验证。" },
    { num: "03", tag: "TECH", title: "技术选择不是追求最强模型，而是拆清每项任务。", copy: "早期使用 Plant.id 面临较高成本。当前由 BioCLIP 负责植物识别，以 Gemini 生成对应知识与观察题目。准确性、成本与内容质量必须被分别评估，而不是用单一指标替代产品判断。" },
    { num: "04", tag: "TEAM", title: "让非技术成员理解工程约束，设计才能真正复用。", copy: "跨学科协作初期会议时间过长。后来由工程成员主动解释实现方式，PM 与设计能够更早理解组件、数据与复用边界，会议也从信息同步转向共同决策。" },
  ];
  return (
    <div className="panel-inner">
      <SectionHeading index="01" label="REFLECTION" title="最有价值的结果，不一定是我们最初想做的产品" copy="这些反思不是项目尾声的总结，而是下一轮验证的起点。" />
      <div className="reflection-grid">{lessons.map((lesson) => <article key={lesson.num}><div className="reflection-meta"><span>{lesson.num}</span><small>{lesson.tag}</small></div><h3>{lesson.title}</h3><p>{lesson.copy}</p></article>)}</div>

      <section className="big-reflection">
        <div className="pixel-folder" aria-hidden="true"><span>?</span></div>
        <div><span className="feature-num">NEXT HYPOTHESIS</span><h3>户外更重要的，也许不是“现场学习”，而是记录与收集。</h3><p>真实行为显示，人们在路边或植物园遇到感兴趣的植物时，往往先拍照、识别和保存；更深入的学习可能发生在回家之后、阅读时或有人引导的教育场景中。</p><p>因此，下一阶段将验证：自动关联同一植物在不同季节的照片、生成个人观察档案，是否比强制现场学习更符合真实需求。</p></div>
      </section>

      <section className="closing-note">
        <span>WHAT I LEARNED</span>
        <blockquote>好的产品研究，不是不断证明最初的想法正确；<br />而是让团队有证据、有勇气，及时改变方向。</blockquote>
        <div className="closing-sign">Nature Observer · Field Notes / 2026</div>
      </section>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState<TabId>(() => {
    if (typeof window === "undefined") return "overview";
    const hash = window.location.hash.replace("#", "") as TabId;
    return tabs.some(tab => tab.id === hash) ? hash : "overview";
  });

  function changeTab(id: TabId) {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); changeTab("overview"); }} aria-label="返回项目概览">
          <span className="brand-mark brand-logo"><img src="/assets/overview/brand-acorn.webp" alt="" /></span><span>Nature Observer<small>An AI - powered Plant Learning Application</small></span>
        </a>
        <div className="header-meta"><span>Build from · 2025</span><b>keep working</b></div>
      </header>
      <FolderTabs active={active} onChange={changeTab} />
      <section className="file-shell" id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`}>
        <div className="file-topline"><span>FILE / {tabs.find(tab => tab.id === active)?.eyebrow}</span><span>UPDATED · 2026.08</span></div>
        {active === "overview" && <OverviewPanel />}
        {active === "product" && <ProductPanel />}
        {active === "research" && <ResearchPanel />}
        {active === "evolution" && <EvolutionPanel />}
        {active === "reflection" && <ReflectionPanel />}
      </section>
      <footer><span>© 2026 NATURE OBSERVER</span><span>DESIGNED AS A FIELD ARCHIVE</span><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>BACK TO TOP ↑</button></footer>
      {EDITOR_ENABLED && <DraftEditor active={active} />}
    </main>
  );
}
