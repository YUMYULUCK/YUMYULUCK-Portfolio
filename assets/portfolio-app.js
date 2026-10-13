import { React, createRoot, ArrowUpRight, Play, Close, Menu, Mail, Instagram, Linkedin, ChevronLeft, ChevronRight } from './vendor-ui.js';
import { projects, strengths } from './portfolio-data.js';
import { bindWorkDrag, centerProject, observeScene, startIntro, createVideoLoop } from './portfolio-motion.js';

function App() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [modalProject, setModalProject] = React.useState(null);
  const [currentProject, setCurrentProject] = React.useState(projects[0]);
  const [activeVideo, setActiveVideo] = React.useState(0);
  const [introPhase, setIntroPhase] = React.useState('loading');
  const [reducedMotion, setReducedMotion] = React.useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rootRef = React.useRef(null);
  const trackRef = React.useRef(null);
  const currentProjectRef = React.useRef(projects[0]);
  const introHasStarted = React.useRef(false);

  const syncProject = id => {
    const project = projects.find(item => item.number === id);
    if (!project) return;
    currentProjectRef.current = project;
    setCurrentProject(project);
  };
  const selectProject = project => {
    syncProject(project.number);
    centerProject(trackRef.current, project.number, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  const stepProject = direction => {
    const index = projects.findIndex(item => item.number === currentProjectRef.current.number);
    selectProject(projects[(index + direction + projects.length) % projects.length]);
  };
  const navigate = id => {
    setMenuOpen(false);
    const target = document.getElementById(id);
    if (!target) return;
    let top = 0;
    for (let element = target; element; element = element.offsetParent) top += element.offsetTop;
    const header = rootRef.current.querySelector('.topbar');
    window.scrollTo({ top: id === 'top' ? 0 : Math.max(0, top - header.offsetHeight - 16), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = event => setReducedMotion(event.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  React.useEffect(() => {
    const root = rootRef.current;
    const videos = [...root.querySelectorAll('.hero-video')];
    const loop = createVideoLoop(videos, { onActive: setActiveVideo, reducedMotion });
    const timers = new Set();
    const bounded = promise => Promise.race([
      Promise.resolve(promise).catch(() => {}),
      new Promise(resolve => { timers.add(setTimeout(resolve, 3500)); })
    ]);
    const poster = new Image();
    const posterReady = new Promise(resolve => { poster.onload = resolve; poster.onerror = resolve; });
    poster.src = './assets/dunhuang-hero.jpg';
    const assetsReady = Promise.all([loop.ready, bounded(posterReady), bounded(document.fonts?.ready)]);
    let cancelIntro = () => {};
    if (!introHasStarted.current) {
      introHasStarted.current = true;
      cancelIntro = startIntro(root, { assetsReady, reducedMotion, onPhase: setIntroPhase });
    } else {
      root.style.setProperty('--entry-progress', '1');
      setIntroPhase('complete');
    }
    let inView = true;
    const syncPlayback = () => loop.suspend(document.hidden || !inView);
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncPlayback();
    }, { threshold: 0 });
    observer.observe(root.querySelector('.hero'));
    document.addEventListener('visibilitychange', syncPlayback);
    syncPlayback();
    return () => {
      cancelIntro(); loop.dispose(); observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      timers.forEach(timer => clearTimeout(timer));
      poster.onload = null; poster.onerror = null;
    };
  }, [reducedMotion]);

  React.useEffect(() => observeScene(rootRef.current), []);
  React.useEffect(() => bindWorkDrag(trackRef.current, { onSelect: syncProject, onStep: stepProject }), []);
  React.useEffect(() => {
    const root = rootRef.current;
    const hashLink = event => {
      const link = event.target.closest('a[href^="#"]');
      if (link && root.contains(link)) { event.preventDefault(); navigate(link.hash.slice(1)); }
    };
    const escape = event => {
      if (event.key === 'Escape') { setMenuOpen(false); setModalProject(null); }
    };
    root.addEventListener('click', hashLink);
    window.addEventListener('keydown', escape);
    return () => { root.removeEventListener('click', hashLink); window.removeEventListener('keydown', escape); };
  }, []);

  React.useEffect(() => {
    if (!modalProject) return;
    const previousFocus = document.activeElement;
    document.body.classList.add('modal-open');
    const modal = rootRef.current.querySelector('.project-modal');
    modal.querySelector('.modal-close').focus({ preventScroll: true });
    const trap = event => {
      if (event.key !== 'Tab') return;
      const controls = [...modal.querySelectorAll('button,a[href],[tabindex="0"]')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    modal.addEventListener('keydown', trap);
    return () => {
      document.body.classList.remove('modal-open');
      modal.removeEventListener('keydown', trap);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [modalProject]);

  return (

React.createElement("div", {
  className: `site-shell intro-${introPhase}`,
  ref: rootRef,
  "data-intro-phase": introPhase
}, React.createElement("div", {
  className: "entry-loader",
  "aria-hidden": "true"
}, React.createElement("div", {
  className: "entry-loader-mark"
}, "YUMYULUCK", React.createElement("span", null, "AI FILM DIRECTOR"))), React.createElement("div", {
  className: "grain",
  "aria-hidden": "true"
}), React.createElement("header", {
  className: "topbar"
}, React.createElement("button", {
  className: "wordmark",
  onClick: () => navigate("top"),
  "aria-label": "回到首页"
}, "YUMYULUCK", React.createElement("span", null, "STUDIO / 2026")), React.createElement("nav", {
  className: menuOpen ? "nav-links is-open" : "nav-links",
  "aria-label": "主导航"
}, ["about", "work", "strengths", "contact"].map((m, E) => React.createElement("button", {
  key: m,
  onClick: () => navigate(m)
}, React.createElement("span", null, "0", E + 1), m.toUpperCase()))), React.createElement("button", {
  className: "contact-pill",
  onClick: () => navigate("contact")
}, "LET'S TALK ", React.createElement(ArrowUpRight, {
  size: 16
})), React.createElement("button", {
  className: "menu-button",
  onClick: () => setMenuOpen(m => !m),
  "aria-label": menuOpen ? "关闭菜单" : "打开菜单",
  "aria-expanded": menuOpen
}, menuOpen ? React.createElement(Close, {
  size: 21
}) : React.createElement(Menu, {
  size: 21
}))), React.createElement("main", {
  id: "top"
}, React.createElement("div", {
  className: "hero-transition"
}, React.createElement("section", {
  className: "hero section-pad"
}, React.createElement("div", {
  className: "hero-grid"
}, React.createElement("div", {
  className: "hero-copy"
}, React.createElement("p", {
  className: "eyebrow"
}, React.createElement("span", {
  className: "eyebrow-dot"
}), " AI FILM DIRECTOR / VISUAL STORYTELLER"), React.createElement("h1", null, React.createElement("span", null, "A frame"), React.createElement("em", null, "that shapes"), React.createElement("span", null, "your world.")), React.createElement("p", {
  className: "hero-intro"
}, "用生成式技术导演影像，把故事、角色与氛围变成可以进入的世界。"), React.createElement("div", {
  className: "hero-actions"
}, React.createElement("button", {
  className: "text-link",
  onClick: () => navigate("work")
}, "WATCH REEL ", React.createElement(Play, {
  size: 14,
  fill: "currentColor"
})), React.createElement("button", {
  className: "text-link text-link-ghost",
  onClick: () => navigate("contact")
}, "LET'S TALK ", React.createElement(ArrowUpRight, {
  size: 16
})))), React.createElement("div", {
  className: "hero-stage",
  "aria-label": "动态视觉背景"
}, React.createElement("video", {
  className: `hero-video hero-video-a ${activeVideo === 0 ? "is-active" : ""}`,
  muted: !0,
  playsInline: !0,
  autoPlay: false,
  preload: "auto",
  poster: "./assets/dunhuang-hero.jpg",
  "aria-hidden": "true"
}, React.createElement("source", {
  src: "./assets/hero-reel.mp4",
  type: "video/mp4"
})), React.createElement("video", {
  className: `hero-video hero-video-b ${activeVideo === 1 ? "is-active" : ""}`,
  muted: !0,
  playsInline: !0,
  autoPlay: false,
  preload: "auto",
  poster: "./assets/dunhuang-hero.jpg",
  "aria-hidden": "true"
}, React.createElement("source", {
  src: "./assets/hero-reel.mp4",
  type: "video/mp4"
})), React.createElement("div", {
  className: "hero-glass",
  "aria-hidden": "true"
}, React.createElement("span", {
  className: "hero-glass-layer hero-glass-layer-1"
}), React.createElement("span", {
  className: "hero-glass-layer hero-glass-layer-2"
}), React.createElement("span", {
  className: "hero-glass-layer hero-glass-layer-3"
}), React.createElement("span", {
  className: "hero-glass-layer hero-glass-layer-4"
})))), React.createElement("div", {
  className: "hero-side-index",
  "aria-hidden": "true"
}, React.createElement("span", null, "01"), React.createElement("i", null)), React.createElement("div", {
  className: "hero-vertical-meta",
  "aria-hidden": "true"
}, "AI FILM / VISUAL STORY / SHANGHAI ↗ REMOTE"), React.createElement("div", {
  className: "hero-socials"
}, React.createElement("a", {
  href: "#contact",
  "aria-label": "Instagram"
}, "IG"), React.createElement("a", {
  href: "#contact",
  "aria-label": "Vimeo"
}, "VM"), React.createElement("a", {
  href: "#contact",
  "aria-label": "Email"
}, "@")), React.createElement("div", {
  className: "hero-footer"
}, React.createElement("span", null, "SCROLL TO EXPLORE"), React.createElement("span", null, "SHANGHAI ↗ REMOTE")))), React.createElement("section", {
  id: "about",
  className: "about section-pad section-border reveal"
}, React.createElement("div", {
  className: "section-kicker"
}, React.createElement("span", null, "01"), React.createElement("span", null, "ABOUT / PROFILE")), React.createElement("div", {
  className: "about-layout"
}, React.createElement("div", {
  className: "portrait-wrap reveal reveal-left"
}, React.createElement("div", {
  className: "portrait"
}, React.createElement("img", {
  src: "./assets/old-temple.jpg",
  alt: "YUMYULUCK AI 影视导演视觉档案图"
})), React.createElement("div", {
  className: "portrait-note"
}, "IMAGE MAKER", React.createElement("br", null), "& SYSTEM THINKER")), React.createElement("div", {
  className: "about-copy reveal reveal-right"
}, React.createElement("p", {
  className: "display-copy"
}, "视觉不是装饰，", React.createElement("br", null), React.createElement("span", null, "是让观点被看见的方式。")), React.createElement("p", {
  className: "body-copy"
}, "你好，我是 YUMYULUCK，一名独立 AI 影视导演。我的工作从故事概念、角色设定延伸到镜头设计、生成与后期，习惯在技术实验和情绪叙事之间找到准确的平衡。"), React.createElement("div", {
  className: "contact-row"
}, React.createElement("a", {
  href: "mailto:hello@yumyuluck.com"
}, React.createElement(Mail, {
  size: 16
}), " hello@yumyuluck.com"), React.createElement("span", {
  className: "available"
}, React.createElement("i", null), " AVAILABLE FOR SELECT PROJECTS")))), React.createElement("div", {
  className: "stats"
}, React.createElement("div", null, React.createElement("strong", null, "08"), React.createElement("span", null, "YEARS IN VISUALS")), React.createElement("div", null, React.createElement("strong", null, "26"), React.createElement("span", null, "WORLDS BUILT")), React.createElement("div", null, React.createElement("strong", null, "17"), React.createElement("span", null, "AI FILM / IMAGE SERIES")), React.createElement("div", null, React.createElement("strong", null, "∞"), React.createElement("span", null, "WAYS TO FRAME A STORY")))), React.createElement("section", {
  id: "work",
  className: "work work-books section-pad section-border reveal"
}, React.createElement("div", {
  className: "work-section-heading"
}, React.createElement("div", {
  className: "work-heading-content"
}, React.createElement("div", {
  className: "section-kicker"
}, React.createElement("span", null, "02"), React.createElement("span", null, "SELECTED WORK / 2021—26")), React.createElement("h2", {
  className: "work-title"
}, "Worlds", React.createElement("br", null), React.createElement("em", null, "worth entering.")), React.createElement("p", {
  className: "work-heading-copy"
}, "Three visual worlds built from atmosphere, character and a camera that keeps moving.")), React.createElement("p", {
  className: "work-handnote"
}, "AI FILM", React.createElement("br", null), "/ IMAGE SERIES")), React.createElement("div", {
  className: "work-slider-bar"
}, React.createElement("span", {
  className: "work-slider-label"
}, "SELECTED FRAMES"), React.createElement("div", {
  className: "work-slider-controls"
}, React.createElement("button", {
  type: "button",
  onClick: () => stepProject(-1),
  "aria-label": "上一个项目"
}, React.createElement(ChevronLeft, {
  size: 18
})), React.createElement("span", null, currentProject.number, " / 0", projects.length), React.createElement("button", {
  type: "button",
  onClick: () => stepProject(1),
  "aria-label": "下一个项目"
}, React.createElement(ChevronRight, {
  size: 18
})))), React.createElement("div", {
  className: "work-slider-track",
  ref: trackRef,
  tabIndex: 0,
  role: "region",
  "aria-label": "选择项目"
}, projects.map(m => {
  const E = m.number === currentProject.number;
  return React.createElement("article", {
    className: E ? "work-slide is-selected" : "work-slide",
    "data-project": m.number,
    key: m.number,
    onClick: () => selectProject(m)
  }, React.createElement("div", {
    className: "work-slide-inner"
  }, React.createElement("div", {
    className: "work-slide-cover"
  }, React.createElement("img", {
    src: m.image,
    alt: `${m.title} 项目画面`
  })), React.createElement("div", {
    className: "work-slide-content"
  }, React.createElement("div", {
    className: "work-slide-meta"
  }, React.createElement("span", null, m.number), React.createElement("span", null, m.kind)), React.createElement("h3", null, m.title), React.createElement("p", null, m.desc), React.createElement("div", {
    className: "work-slide-tags"
  }, m.tags.map(k => React.createElement("span", {
    key: k
  }, k))), React.createElement("button", {
    type: "button",
    className: "work-slide-link",
    onClick: k => {
      k.stopPropagation(), setModalProject(m);
    }
  }, "VIEW PROJECT ", React.createElement(ArrowUpRight, {
    size: 15
  })))));
})), React.createElement("div", {
  className: "work-slider-footer"
}, React.createElement("span", null, "DRAG TO EXPLORE"), React.createElement("span", null, currentProject.title, " / DIRECTED BY YUMYULUCK"))), React.createElement("section", {
  id: "strengths",
  className: "strengths section-pad section-border reveal"
}, React.createElement("div", {
  className: "section-kicker"
}, React.createElement("span", null, "03"), React.createElement("span", null, "WHAT I BRING")), React.createElement("div", {
  className: "strengths-layout"
}, React.createElement("h2", {
  className: "reveal reveal-left"
}, "Useful", React.createElement("br", null), React.createElement("em", null, "obsessions.")), React.createElement("div", {
  className: "strength-list"
}, strengths.map(([m, E, k], I) => React.createElement("div", {
  className: "strength-item reveal reveal-right",
  style: {
    "--reveal-delay": `${I * 90}ms`
  },
  key: m
}, React.createElement("span", null, m), React.createElement("div", null, React.createElement("h3", null, E), React.createElement("p", null, k)), React.createElement(ArrowUpRight, {
  size: 18
})))))), React.createElement("section", {
  id: "contact",
  className: "contact-section section-pad reveal"
}, React.createElement("div", {
  className: "contact-art"
}, React.createElement("div", {
  className: "contact-ring ring-a"
}), React.createElement("div", {
  className: "contact-ring ring-b"
}), React.createElement("span", null, "LET'S MAKE", React.createElement("br", null), React.createElement("em", null, "something real."))), React.createElement("div", {
  className: "contact-copy"
}, React.createElement("div", {
  className: "section-kicker"
}, React.createElement("span", null, "04"), React.createElement("span", null, "CONTACT / COLLABORATE")), React.createElement("h2", null, "有一个想法？", React.createElement("br", null), React.createElement("em", null, "我们聊聊。")), React.createElement("a", {
  className: "big-email",
  href: "mailto:hello@yumyuluck.com"
}, "hello@yumyuluck.com ", React.createElement(ArrowUpRight, {
  size: 24
})), React.createElement("div", {
  className: "socials"
}, React.createElement("a", {
  href: "#contact"
}, React.createElement(Instagram, {
  size: 17
}), " Instagram"), React.createElement("a", {
  href: "#contact"
}, React.createElement(Linkedin, {
  size: 17
}), " LinkedIn"))))), React.createElement("footer", {
  className: "footer"
}, React.createElement("span", null, "© 2026 YUMYULUCK STUDIO"), React.createElement("span", null, "AI FILM / VISUAL STORYTELLING / BASE VERSION")), modalProject && React.createElement("div", {
  className: "project-modal",
  role: "dialog",
  "aria-modal": "true",
  "aria-label": `${modalProject.title} 项目详情`,
  onClick: m => m.target === m.currentTarget && setModalProject(null)
}, React.createElement("button", {
  className: "modal-close",
  onClick: () => setModalProject(null),
  "aria-label": "关闭项目详情"
}, React.createElement(Close, {
  size: 22
})), React.createElement("div", {
  className: "modal-content"
}, React.createElement("div", {
  className: "modal-image"
}, React.createElement("img", {
  src: modalProject.image,
  alt: ""
})), React.createElement("div", {
  className: "modal-copy"
}, React.createElement("span", null, modalProject.number, " / ", modalProject.kind), React.createElement("h2", null, modalProject.title), React.createElement("p", null, modalProject.desc), React.createElement("div", {
  className: "tag-list"
}, modalProject.tags.map(m => React.createElement("span", {
  key: m
}, m))), React.createElement("p", {
  className: "modal-note"
}, "项目详情将在后续版本补充：概念、视觉语言、制作过程与应用延展。")))))
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
