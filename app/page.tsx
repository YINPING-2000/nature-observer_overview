"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type TabId = "overview" | "product" | "research" | "evolution" | "reflection";

const EDITOR_ENABLED = false;

const tabs: { id: TabId; label: string; eyebrow: string }[] = [
  { id: "overview", label: "Project Overview", eyebrow: "OVERVIEW" },
  { id: "product", label: "Product", eyebrow: "PRODUCT" },
  { id: "research", label: "Research", eyebrow: "RESEARCH" },
  { id: "evolution", label: "Project Evolution", eyebrow: "EVOLUTION" },
];

const productSteps = [
  { number: "01", title: "Identify", copy: "Take a photo or upload an image of a plant to identify it quickly." },
  { number: "02", title: "Explore", copy: "Understand a plant through its defining traits, ecology, and cultural connections." },
  { number: "03", title: "Observe", copy: "Use guided questions to examine the plant in front of you." },
  { number: "04", title: "Save", copy: "Save identification records for future review." },
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
    <nav className="folder-nav" aria-label="Case study sections">
      <div className="folder-tabs" role="tablist" aria-label="Nature Observer project archive">
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
          Your browser does not support video playback.
        </video>
      ) : src ? (
        scrollable ? (
          <div className="device-scroll-viewport" role="region" aria-label={`${alt}; scroll vertically to explore`} tabIndex={0}>
            <img src={src} alt={alt} />
          </div>
        ) : <img src={src} alt={alt} />
      ) : <div className="device-empty" aria-hidden="true"><span /></div>}
    </figure>
  );
}

function SceneDiagram({ type }: { type: "core" | "education" }) {
  const steps = type === "core"
    ? ["Find a plant", "Identify it", "Observe on site"]
    : ["Learning prompt", "Student interaction", "Explore further"];
  return (
    <div className={`scene-diagram scene-${type}`} aria-label={steps.join(", then ")}>
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
  const [saveStatus, setSaveStatus] = useState("Local draft unchanged");
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
        setSaveStatus(Object.keys(savedDraft.text).length || savedDraft.hidden.length || Object.keys(savedDraft.images).length ? "Local draft loaded" : "Local draft unchanged");
        setIsReady(true);
        setApplyVersion((version) => version + 1);
      })
      .catch(() => { setSaveStatus("This browser cannot save drafts"); setIsReady(true); });
  }, []);

  function commitDraft(nextDraft: SiteDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveStatus("Saving…");
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      writeSiteDraft(draftRef.current)
        .then(() => setSaveStatus("Autosaved in this browser"))
        .catch(() => setSaveStatus("Save failed. Please export the draft."));
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
        setSelectedBlockLabel(element.querySelector("h1,h2,h3,h4")?.textContent?.trim() || "Current section");
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
    setSaveStatus("Draft file exported");
  }

  async function resetDraft() {
    if (!window.confirm("Clear all draft changes stored in this browser? This will not affect the published site.")) return;
    await clearSiteDraft();
    window.location.reload();
  }

  return (
    <aside className={`draft-editor ${isEditing ? "is-editing" : ""}`} aria-label="Page draft editor">
      <input ref={fileInputRef} className="draft-file-input" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) replaceImage(file); event.target.value = ""; }} />
      <div className="draft-editor-primary">
        <button className="draft-primary-button" onClick={() => { setIsEditing((value) => !value); setSelectedBlockKey(null); selectedBlockRef.current?.classList.remove("is-draft-selected"); selectedBlockRef.current = null; }}>
          {isEditing ? "Preview draft" : "Edit draft"}
        </button>
        <div><b>{isEditing ? "Edit mode" : "Draft preview"}</b><span>{saveStatus}</span></div>
      </div>
      {isEditing && <div className="draft-selection"><span>{selectedBlockKey ? `Selected: ${selectedBlockLabel}` : "Click a section to select it; click an image to replace it"}</span>{selectedBlockKey && <button className="draft-danger" onClick={hideSelectedBlock}>Delete selected section</button>}</div>}
      <div className="draft-editor-actions">
        {draft.hidden.length > 0 && <button onClick={restoreLastBlock}>Undo deletion</button>}
        {draft.hidden.length > 1 && <button onClick={restoreAllBlocks}>Restore all sections</button>}
        <button onClick={exportDraft}>Export edit file</button>
        <button onClick={resetDraft}>Clear draft</button>
      </div>
    </aside>
  );
}

const overviewTeam = {
  design: [
    { name: "Ping Yin", detail: "University of Michigan, Master’s\nLandscape Architecture + Interaction Design", avatar: "ping" },
    { name: "Ningrui Zhu", detail: "University of Michigan, Master’s\nInteraction Design", avatar: "ningrui" },
    { name: "Fangyi Li", detail: "University of Michigan, Master’s\nInteraction Design", avatar: "fangyi" },
  ],
  tech: [
    { name: "Jiayuan Jiang", detail: "University of Michigan, Master’s\nGeospatial Data Sciences + Data Science", avatar: "jiayuan" },
    { name: "Jiangpan Bian", detail: "University of Michigan, Master’s\nGeospatial Data Sciences", avatar: "jiangpan" },
    { name: "Jun Su", detail: "University of Michigan, Master’s\nApplied Statistics + Data Science", avatar: "junsu" },
    { name: "Honghao Zhang", detail: "University of Michigan, Bachelor’s\nComputer Science + Statistics", avatar: "honghao" },
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
        ? <div className={`member-avatar avatar-${member.avatar}`}><img src={standalone} alt={`${member.name} team portrait`} /></div>
        : <div className={`member-avatar composite-avatar avatar-${member.avatar}`} role="img" aria-label={`${member.name} team portrait`} />}
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
            <h1>Nature Observer<br /><span>AI Plant Learning App</span></h1>
            <p>An AI-powered plant learning tool that helps people identify and observe plants in parks—and understand the stories behind them.</p>
            <div className="status-chip"><i /> FIELD TESTED · MVP V2.0</div>
          </div>
          <figure className="overview-hero-composite">
            <img src="/assets/overview/overview-hero-composite-v2.png" alt="Nature Observer identification, plant knowledge, and guided observation screens" />
          </figure>
        </div>
      </section>

      <section className="project-strip overview-project-strip" aria-label="Project summary">
        <div><span>Users</span><strong>Beginner plant enthusiasts</strong></div>
        <div><span>Contexts</span><strong>Outdoors: botanical gardens, parks, and streets</strong></div>
        <div><span>Problem</span><strong>Plant ID tools give an answer,<br />but leave out the learning process</strong></div>
      </section>

      <section id="overview-story" className="overview-problem-latest">
        <SectionHeading index="01" label="Core Problem" title="Identification shows the answer, but loses the learning process" />
        <p className="overview-problem-intro">When people encounter an unfamiliar plant outdoors, they often use an identification tool to find its name. But the experience stops at “What is it?” without explaining its defining traits. This creates two problems:</p>
        <div className="overview-problem-grid">
          <article>
            <div className="overview-problem-illustration memory"><img src="/assets/overview/problem-memory.png" alt="Illustration of observation becoming memory" /></div>
            <h3>Passive learning is easy to forget</h3>
            <p>Without actively observing a plant’s defining traits, the identification result rarely becomes a lasting memory. The next time people see it, they still cannot recognize it on their own.</p>
          </article>
          <article>
            <div className="overview-problem-illustration curiosity"><img src="/assets/overview/problem-curiosity.png" alt="Illustration of a plant and its ecological relationships" /></div>
            <h3>A name alone cannot satisfy curiosity</h3>
            <p>Plant enthusiasts also want to learn about a plant’s unique form, seasonal changes, and relationships with people, other species, and the wider ecosystem.</p>
          </article>
        </div>
      </section>

      <section className="overview-solution-latest">
        <div className="section-kicker"><span>02</span>Solution</div>
        <h2>Turn one-off plant identification into active observational learning</h2>
        <div className="overview-solution-flow" aria-label="Photograph, identify, explore, observe, and save">
          <b>Photograph</b><i>→</i><b>Identify</b><i>→</i><b>Explore</b><i>→</i><b>Observe</b><i>→</i><b>Save</b>
        </div>
      </section>

      <section className="overview-research-latest">
        <SectionHeading index="03" label="Research Methods" title={<>Four research methods<br />clarified user needs and potential contexts</>} />
        <div className="overview-method-grid">
          <article>
            <b>106</b><span>online survey responses</span>
            <p>Explored interest in nature, observation habits, challenges, and expectations for tools</p>
          </article>
          <article>
            <b>24</b><span>on-site intercepts</span>
            <p>Validated visitor profiles and needs for educational content</p>
          </article>
          <article>
            <b>15</b><span>in-depth interviews</span>
            <p>Included garden staff, visitors, and plant enthusiasts</p>
          </article>
          <article>
            <b>02</b><span>field observation settings</span>
            <p>A high-school field program and a public Wonder Walk</p>
          </article>
        </div>
      </section>

      <section className="overview-closing overview-latest-closing">
        <div className="section-kicker overview-closing-kicker"><span>04</span>Team & Timeline</div>
        <div className="overview-closing-content">
          <div className="project-period">
            <h3>Project Timeline</h3>
            <strong>Oct 2025—Present</strong>
          </div>
          <div className="team-roster">
            <h3>Team</h3>
            <div className="team-groups">
              <section>
                <h3>Product + Design</h3>
                <div className="team-member-grid design-team">{overviewTeam.design.map((member) => <TeamMember key={member.name} member={member} />)}</div>
              </section>
              <section>
                <h3>Engineering</h3>
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
          label="Core Experience Flow"
          title={<>Turn one-off plant identification<br />into active observational learning</>}
        />
        <div className="product-flow" aria-label="Photograph, identify, explore, observe, and save">
          <b>Photograph</b><i>→</i><b>Identify</b><i>→</i><b>Explore</b><i>→</i><b>Observe</b><i>→</i><b>Save</b>
        </div>
      </section>

      <section className="product-capabilities">
        <div className="section-kicker"><span>02</span>Product Capabilities</div>
        <div className="product-capability-grid">
          {productSteps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.copy}</p></article>)}
        </div>
      </section>

      <section className="product-scenes">
        <div className="section-kicker"><span>03</span>Use Cases</div>
        <div className="product-scene-grid">
          <article>
            <h3>Core Use Case</h3>
            <p>A beginner plant enthusiast encounters an interesting plant in a botanical garden, park, or neighborhood. After identifying it with a photo, they spend 1–3 minutes learning its defining traits and following guided questions to observe it on site.</p>
            <SceneDiagram type="core" />
          </article>
          <article>
            <h3>Extended Use Case</h3>
            <p>In nature education programs, Nature Observer becomes a digital aid for educators: students or participants scan plants, answer observation questions, and continue exploring images, stories, and ecological relationships after the guided activity ends.</p>
            <SceneDiagram type="education" />
          </article>
        </div>
      </section>

      <section className="product-feature-list">
        <div className="section-kicker"><span>04</span>Key Features & Interfaces</div>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <h3>Identify Plants</h3>
            <p>When users encounter an unfamiliar plant in a park, botanical garden, or nature education program, they can quickly identify it by taking or uploading a photo.</p>
            <p className="experience-value">Experience value: quickly answer the most basic question—“What is it?”</p>
          </div>
          <ProductDevice src="/assets/product/upload.png" alt="Nature Observer plant photo upload screen" />
        </article>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <h3>Explore Engaging Knowledge</h3>
            <p>After identification, users first see the plant’s name and its most memorable traits. They can then explore its form, seasonal changes, native range, ecological relationships, and cultural stories according to their interests.</p>
            <p className="experience-value">Experience value: a progressive reading hierarchy—learn the name, understand the traits, then explore further—helps users find the most valuable information in 1–3 minutes. Traits make the plant memorable; stories reveal why it is worth knowing.</p>
          </div>
          <ProductDevice src="/assets/product/story-scroll.png" alt="Northern red oak knowledge page" scrollable />
        </article>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <h3>Follow Guided Observation</h3>
            <p>Nature Observer uses questions grounded in real morphological traits to direct attention to leaves, fruit, bark, and other visible parts of the plant. Comparative images make technical botanical terms easier for beginners to understand.</p>
            <p>After each response, the system explains the relevant trait. At the end, it summarizes the essential knowledge into three takeaways for memory and review.</p>
            <p className="experience-value">Experience value: 1. Shift users from passively receiving an identification result to actively discovering plant traits, increasing the chance they can identify it independently next time. 2. Help beginners develop a method for observing plants—knowing where to start.</p>
          </div>
          <ProductDevice videoSrc="/assets/product/guided-observation-v2.mp4" alt="Nature Observer guided observation interaction demo" />
        </article>

        <article className="product-feature-item">
          <div className="product-feature-copy">
            <div className="feature-heading-row">
              <h3>Save Observation Records</h3>
              <span className="planned-feature-label">PLANNED FEATURE · FUTURE</span>
            </div>
            <p>After exploring, users can save the identification result, defining traits, and observation summary to build a personal plant collection.</p>
            <p className="experience-value">Experience value: supports a long-term record of personal observations.<span> It also lays a foundation for linking photos of the same plant across locations and seasons.</span></p>
          </div>
          <ProductDevice src="/assets/product/history.png" alt="Nature Observer saved observation history screen" className="planned-device" />
        </article>
      </section>

      <section className="product-demo">
        <div className="section-kicker"><span>05</span>Demo</div>
        <div className="product-demo-layout">
          <figure className="product-device demo-device">
            <video controls playsInline preload="metadata" aria-label="Nature Observer product demo">
              <source src="/assets/product/demo-v2.mp4" type="video/mp4" />
              Your browser does not support video playback.
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
        <p>We began with an online survey to broadly understand interest in nature and common challenges, then moved into the botanical garden to validate visitor profiles and needs, and finally used interviews and shadowing to understand real learning behavior.</p>
      </header>
      <div className="research-ladder">
        <article><span>01</span><b>Online Survey</b><small>n = 106</small><p>Explored the motivations, habits, learning approaches, challenges, and tool expectations of people who enjoy nature.</p></article>
        <i>→</i><article><span>02</span><b>Visitor Intercepts</b><small>n = 24</small><p>Built an initial picture of botanical-garden and park visitors and their educational needs, while recruiting participants for follow-up interviews.</p></article>
        <i>→</i><article><span>03</span><b>Semi-structured Interviews</b><small>15 interviews</small><p>Examined how people learn about plants and how different roles in a botanical garden view educational content, needs, and pain points.</p></article>
        <i>→</i><article><span>04</span><b>Field Observation</b><small>2 activities</small><p>Shadowed a high-school field program and a public Wonder Walk to understand how people learn about plants on site.</p></article>
      </div>

      <section className="study-block">
        <div className="study-copy">
          <span className="study-index">STUDY 01 · ONLINE SURVEY</span>
          <h2>Online Survey <small>n = 106</small></h2>
          <p className="study-purpose">Broadly explored motivations, habits, learning approaches, challenges, and expectations for tools among people who enjoy nature.</p>
          <div className="method-note"><b>Process</b><p>We distributed the “Nature Exploration Experience and Tool Needs” survey. Among valid responses, 72.6% were ages 18–25. Questions covered outdoor habits, plant-learning methods, experiences of curiosity, tool use, and feature expectations.</p></div>
          <a className="source-link" href="https://www.wjx.cn/vm/QpBP7CJ.aspx" target="_blank" rel="noreferrer">View survey ↗</a>
        </div>
        <figure className="study-visual portrait-doc"><img src="/assets/research/online-questionnaire-v2.webp" alt="Nature Exploration Experience and Tool Needs online survey" /><figcaption>Nature Exploration Experience and Tool Needs survey</figcaption></figure>
      </section>

      <section className="survey-findings research-dark-band">
        <span className="research-band-label">KEY FINDINGS · STUDY 01</span>
        <article>
          <h3>1. Interest in exploring nature and learning about plants is widespread</h3>
          <div className="metric-pair"><div><b>78.3%</b><p>are interested or very interested<br />in observing nature</p></div><div><b>69.8%</b><p>can clearly recall a moment<br />when nature sparked their curiosity</p></div></div>
        </article>
        <article>
          <h3>2. Most people face challenges when observing plants</h3>
          <div className="metric-pair"><div><b>75%</b><p>encounter difficulty<br />when learning about nature</p></div><div><b>51%</b><p>do not know which<br />traits to observe</p></div></div>
        </article>
        <p className="research-wide-finding">3. Interest is widespread, but relatively few people actively seek knowledge; for most, the appeal is atmospheric—taking photos, relaxing, and enjoying the setting.</p>
      </section>

      <section className="study-block reverse-study">
        <div className="study-copy">
          <span className="study-index">STUDY 02 · INTERCEPT SURVEY</span>
          <h2>Visitor Intercepts <small>n = 24</small></h2>
          <p className="study-purpose">Built an initial picture of botanical-garden and park visitors and their educational needs, while recruiting participants for follow-up semi-structured interviews.</p>
          <div className="method-note"><b>Process</b><p>We first coordinated with the botanical garden by email and shared a research brief, then distributed an intercept survey on site. Of 24 respondents, five agreed to participate in a follow-up interview.</p></div>
          <div className="study-source-links">
            <a className="source-link" href="https://forms.gle/Fxrzt4qEehdrrQyu5" target="_blank" rel="noreferrer">View intercept survey ↗</a>
            <a className="source-link" href="/assets/research/mbgna-visitor-plant-knowledge-interest-survey-result.docx" target="_blank" rel="noreferrer">View survey results ↗</a>
          </div>
        </div>
        <div className="study-visual doc-pair intercept-visual">
          <figure><img src="/assets/research/intercept-questionnaire-v2.webp" alt="Botanical garden visitor intercept survey" /><figcaption>Intercept survey</figcaption></figure>
          <figure><img src="/assets/research/intercept-results-v2.webp" alt="Botanical garden visitor intercept survey results" /><figcaption>Survey results</figcaption></figure>
        </div>
      </section>

      <section className="visitor-profile-band research-dark-band">
        <span className="research-band-label">KEY FINDINGS · STUDY 02</span>
        <div className="visitor-profile-main">
          <h3>Botanical Garden Visitor Profile</h3>
          <div className="visitor-profile-groups">
            <div><b>Who they are</b><div className="profile-items"><span><img src="/assets/research/icons/professor.svg" alt="" />U-M faculty & staff</span><span><img src="/assets/research/icons/student.svg" alt="" />U-M students</span><span><img src="/assets/research/icons/resident.svg" alt="" />Ann Arbor residents</span></div></div>
            <div><b>What they seek</b><div className="profile-items"><span><img src="/assets/research/icons/exercise.svg" alt="" />Exercise</span><span><img src="/assets/research/icons/family.svg" alt="" />Family time</span><span><img src="/assets/research/icons/gathering.svg" alt="" />Gather & relax</span><span><img src="/assets/research/icons/inspiration.svg" alt="" />Inspiration</span><span><img src="/assets/research/icons/learn-plants.svg" alt="" />Learn about plants</span></div></div>
          </div>
        </div>
        <div className="visitor-profile-conclusion">
          <h3>Most visitors read plant labels,<br />but about half say the labels do not satisfy their curiosity</h3>
          <p>1. Most visitors are curious about plants and read the labels provided by the botanical garden.</p>
          <p>2. About half feel that the current labels do not fully satisfy their curiosity.</p>
        </div>
      </section>

      <section className="study-block">
        <div className="study-copy">
          <span className="study-index">STUDY 03 · INTERVIEWS</span>
          <h2>Semi-structured Interviews <small>15 interviews</small></h2>
          <p className="study-purpose">Explored how different roles in a botanical garden view educational content, their needs and pain points, and how plant enthusiasts learn about plants.</p>
          <b className="interview-audience-label">Participants</b>
          <div className="participant-tags dark-tags interview-audience-tags">
            <span>Garden Staff<small>GARDEN STAFF</small></span>
            <span>Garden Visitors<small>VISITORS</small></span>
            <span>Plant Enthusiasts<small>PLANT ENTHUSIASTS</small></span>
          </div>
          <div className="method-note"><b>Recruitment</b><p>We recruited through public social platforms including Xiaohongshu, Reddit, and LinkedIn; through on-site intercepts; and through faculty networking. Separate interview protocols were prepared for each audience.</p></div>
        </div>
        <div className="study-visual interview-collage" aria-label="Collage of in-person, remote, and botanical-garden interviews">
          <img className="collage-office" src="/assets/research/interview-office.webp" alt="Team conducting an in-person semi-structured interview" />
          <img className="collage-remote-one" src="/assets/research/interview-remote.webp" alt="Team conducting a remote semi-structured interview" />
          <img className="collage-selfie" src="/assets/research/interview-selfie.webp" alt="Team with a botanical-garden interview participant" />
          <img className="collage-remote-two" src="/assets/research/interview-sarah.png" alt="Semi-structured interview with Sarah" />
        </div>
      </section>

      <section className="role-findings">
        <span className="light-band-label">KEY FINDINGS · STUDY 03</span>
        <article><span>Garden Staff</span><p>They want to improve public education through digital tools; the GIS Hub still contains extensive data that has not been translated into accessible public content.</p></article>
        <article><span>Garden Visitors</span><p>Most come to relax; learning is the primary goal for only a minority.</p></article>
        <article><span>Plant Enthusiasts</span><p>They usually learn about plants in nearby parks and streets—not only in botanical gardens.</p></article>
      </section>

      <section className="study-block reverse-study field-study">
        <div className="study-copy">
          <span className="study-index">STUDY 04 · FIELD OBSERVATION</span>
          <h2>Field Observation <small>2 activities</small></h2>
          <p className="study-purpose">Shadowed a high-school field program and a public Wonder Walk to understand how people learn about plants in real settings.</p>
        </div>
        <figure className="study-visual field-photo-pair">
          <div><img src="/assets/research/field-forest.webp" alt="Team observing an outdoor nature education activity" /><img src="/assets/research/field-greenhouse.webp" alt="Team observing plant interpretation in a greenhouse" /></div>
          <figcaption>High-school field program and public Wonder Walk · Shadowing</figcaption>
        </figure>
      </section>

      <section className="field-findings research-dark-band">
        <span className="research-band-label">KEY FINDINGS · STUDY 04</span>
        <article><h3>1. Plant-learning software can complement<br />human interpretation, but cannot replace it</h3><p>Many parts of human interpretation are irreplaceable—especially real-time local information, site-specific facts about plants and animals, broader habitat context, and guided observation in the outdoor environment.</p></article>
        <article><h3>2. Field-learning programs may be a promising use case</h3><p>In structured learning settings:</p><ul><li>Students already scan QR codes on their phones to check plants’ conservation status on the IUCN website, creating a natural entry point for a digital tool.</li><li>Teacher-prepared questions help students learn by answering.</li></ul></article>
      </section>

      <section className="insight-map">
        <SectionHeading index="05" label="SYNTHESIS" title="How four research methods shaped the product" />
        <div className="insight-table" role="table" aria-label="Research findings and product opportunities">
          <div className="table-head" role="row"><span>RESEARCH EVIDENCE</span><span>PRODUCT OPPORTUNITY</span></div>
          <div role="row"><p>51% do not know which traits to observe</p><p>Provide an observation framework through step-by-step questions, not just a name</p></div>
          <div role="row"><p>Active learning is limited; most interest centers on photography and relaxation</p><p>Lower the barrier with lightweight, engaging knowledge designed for on-site reading</p></div>
          <div role="row"><p>About half of visitors say physical labels do not satisfy their curiosity</p><p>Extend knowledge digitally beyond labels and human interpretation</p></div>
          <div role="row"><p>Human guides excel at real-time local information, stories, and environmental cues</p><p>The digital experience should complement—not replace—human guidance</p></div>
        </div>
      </section>
    </div>
  );
}

function EvolutionPanel() {
  const phases = [
    { num: "01", date: "Oct — Dec 2025", title: "+Tech Innovation Jam", subtitle: "Built the first prototype", points: ["Formed an interdisciplinary team and defined the first problem statement", "Ran an initial survey and created a nature-education prototype centered on guided observation", "Learned the end-to-end process of product development, short-form startup competitions, and interdisciplinary collaboration"], image: "/assets/development/jam-team.webp" },
    { num: "02", date: "WINTER 2026", title: "MVP V1.0", subtitle: "Built a usable product and kept exploring the direction", points: ["Developed the competition prototype into a working demo", "Discussed the project with faculty at the School for Environment and Sustainability", "Explored university entrepreneurship resources and considered how the project could continue"] },
    { num: "03", date: "SPRING 2026", title: "Dare to Dream + Demo Day", subtitle: "Deepened the project and updated MVP V2.0", points: ["Completed 15 interviews and field research with guidance from a Ross entrepreneurship mentor, then revalidated the need", "Shifted MVP V2.0 toward the description experience and richer plant knowledge", "Presented at Demo Day, ran lightweight usability testing, and advanced collaboration with the U-M botanical gardens"], image: "/assets/development/demo-poster.webp" },
    { num: "04", date: "PLANNED", title: "Botanical Garden Implementation", subtitle: "Launch in a botanical garden and apply to an incubator", points: ["Digitally archive educational displays that the garden rotates regularly", "Preserve content about plants no longer on display and extend its useful life in the app", "Build a curated digital library of high-quality plant education and hand-drawn illustrations"], image: "/assets/development/garden-fieldwork.webp" },
  ];
  return (
    <div className="panel-inner">
      <SectionHeading index="01" label="EVOLUTION" title="From a competition prototype to a product grounded in real contexts" copy="The project spans four stages: team formation and prototyping, a usable demo, a research-driven V2.0, and a planned botanical-garden implementation." />
      <div className="timeline">
        {phases.map((phase, index) => (
          <article className={`timeline-item ${index % 2 ? "right" : "left"}`} key={phase.num}>
            <div className="timeline-marker"><span>{phase.num}</span></div>
            <div className="timeline-card">
              <span className="phase-date">{phase.date}</span><h3>{phase.title}</h3><h4>{phase.subtitle}</h4>
              <ul>{phase.points.map(point => <li key={point}>{point}</li>)}</ul>
              {phase.image && <img src={phase.image} alt={`${phase.title} phase project photo`} />}
            </div>
          </article>
        ))}
      </div>

      <section className="funding-strip">
        <div><span>GRANT</span><b>$300</b><p>Dare to Dream Phase I</p></div>
        <div><span>FUEL</span><b>$500</b><p>Project funding</p></div>
        <div><span>CLOUD</span><b>$5K</b><p>Amazon server credits</p></div>
        <div><span>OUTPUT</span><b>V2.0</b><p>Published demo and research outcomes</p></div>
      </section>

    </div>
  );
}

function ReflectionPanel() {
  const lessons = [
    { num: "01", tag: "SCENARIO", title: "The idea of asking questions was right; turning them into a test was not.", copy: "We wanted questions to slow users down, reduce information density, and bring attention back to the plant itself. But a quiz made outdoor observation feel like homework and clashed with the mindset of a relaxing visit. The next step is to explore more natural, low-pressure interactions." },
    { num: "02", tag: "BIAS", title: "Value recognized by an institution is not always a need visitors express themselves.", copy: "Botanical-garden staff want to provide a better educational experience, but many everyday visitors primarily come to relax and find existing labels sufficient. This gap reminds us to watch for stakeholder bias and validate every assumption in the actual context of use." },
    { num: "03", tag: "TECH", title: "Choosing technology is not about finding the strongest model; it is about separating the tasks clearly.", copy: "Plant.id created high costs early on. Today BioCLIP handles plant identification, while Gemini generates related knowledge and observation prompts. Accuracy, cost, and content quality must be evaluated separately rather than collapsed into a single metric." },
    { num: "04", tag: "TEAM", title: "Design becomes reusable only when non-technical teammates understand engineering constraints.", copy: "Early interdisciplinary meetings ran too long. Once engineers began explaining implementation choices, product and design could understand components, data, and reuse boundaries earlier. Meetings shifted from information sharing to shared decision-making." },
  ];
  return (
    <div className="panel-inner">
      <SectionHeading index="01" label="REFLECTION" title="The most valuable outcome may not be the product we first imagined" copy="These reflections are not an ending; they are the starting point for the next round of validation." />
      <div className="reflection-grid">{lessons.map((lesson) => <article key={lesson.num}><div className="reflection-meta"><span>{lesson.num}</span><small>{lesson.tag}</small></div><h3>{lesson.title}</h3><p>{lesson.copy}</p></article>)}</div>

      <section className="big-reflection">
        <div className="pixel-folder" aria-hidden="true"><span>?</span></div>
        <div><span className="feature-num">NEXT HYPOTHESIS</span><h3>Outdoors, recording and collecting may matter more than learning on the spot.</h3><p>Observed behavior shows that when people encounter an interesting plant on the street or in a botanical garden, they usually photograph, identify, and save it first. Deeper learning may happen later at home, while reading, or in a guided educational setting.</p><p>The next phase will test whether automatically linking photos of the same plant across seasons and generating personal observation archives better matches real needs than requiring on-site learning.</p></div>
      </section>

      <section className="closing-note">
        <span>WHAT I LEARNED</span>
        <blockquote>Good product research is not about repeatedly proving the original idea right;<br />it gives a team the evidence and courage to change direction in time.</blockquote>
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
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); changeTab("overview"); }} aria-label="Return to project overview">
          <span className="brand-mark brand-logo"><img src="/assets/overview/brand-acorn.webp" alt="" /></span><span>Nature Observer<small>An AI - powered Plant Learning Application</small></span>
        </a>
        <div className="header-actions">
          <a className="language-switch" href="https://nature-observer-case-study.yinping884824.chatgpt.site" lang="zh-CN" aria-label="切换至中文版本">切换至中文 <span aria-hidden="true">↗</span></a>
          <div className="header-meta"><span>Build from · 2025</span><b>keep working</b></div>
        </div>
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
