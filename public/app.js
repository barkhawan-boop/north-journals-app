const translations = {
  en: {
    searchTitle: "Search Kurdish-region journals",
    searchHint: "Find articles by topic, author, journal, university, city, or keyword in English, Sorani, Badini, and Arabic.",
    keyword: "Keyword",
    searchButton: "Search",
    institutionType: "Institution type",
    all: "All",
    public: "Public",
    private: "Private",
    subject: "Subject",
    institutions: "Institutions",
    journals: "Journals",
    seedArticles: "Seed Articles",
    catalogTitle: "Recognised universities",
    resultsTitle: "Results",
    assistantTools: "Research tools",
    paraphraseTitle: "Paraphrasing helper",
    paraphraseNote: "Use this for drafting support only. Keep citations and check the meaning before submission.",
    academicTone: "Academic",
    simpleTone: "Simple",
    paraphraseButton: "Paraphrase",
    noResults: "No matches yet. Try a broader keyword such as Kurdish, water, education, medical, digital, Erbil, Duhok, or Sulaimani.",
    pdfUnavailable: "PDF unavailable",
    copied: "Copied",
    copyCitation: "Copy citation",
    copySummary: "Copy summary",
    score: "score"
  },
  ku: {
    searchTitle: "گەڕان لە گۆڤارە زانستییەکانی هەرێمی کوردستان",
    searchHint: "بە بابەت، نووسەر، گۆڤار، زانکۆ، شار یان وشەی سەرەکی بە ئینگلیزی، سۆرانی، بادینی و عەرەبی بگەڕێ.",
    keyword: "وشەی سەرەکی",
    searchButton: "گەڕان",
    institutionType: "جۆری دامەزراوە",
    all: "هەموو",
    public: "حکومی",
    private: "تایبەت",
    subject: "بواری توێژینەوە",
    institutions: "دامەزراوەکان",
    journals: "گۆڤارەکان",
    seedArticles: "تۆمارە نمونەییەکان",
    catalogTitle: "زانکۆ ناسراوەکان",
    resultsTitle: "ئەنجامەکان",
    assistantTools: "ئامرازەکانی توێژەر",
    paraphraseTitle: "یارمەتیدەری داڕشتنەوە",
    paraphraseNote: "تەنها بۆ یارمەتی نووسین بەکاری بهێنە. سەرچاوەکان بهێڵەوە و ماناکە پێش پێشکەشکردن بپشکنە.",
    academicTone: "ئەکادیمی",
    simpleTone: "سادە",
    paraphraseButton: "داڕشتنەوە",
    noResults: "هیچ ئەنجامێک نییە. وشەیەکی فراوانتر تاقی بکەرەوە وەک Kurdish، water، education، medical، digital، Erbil، Duhok یان Sulaimani.",
    pdfUnavailable: "PDF بەردەست نییە",
    copied: "کۆپی کرا",
    copyCitation: "کۆپی کردنی سەرچاوە",
    copySummary: "کۆپی کردنی پوختە",
    score: "پلە"
  },
  ar: {
    searchTitle: "البحث في مجلات إقليم كردستان",
    searchHint: "ابحث حسب الموضوع أو المؤلف أو المجلة أو الجامعة أو المدينة أو الكلمة المفتاحية بالإنكليزية والسورانية والبادينية والعربية.",
    keyword: "الكلمة المفتاحية",
    searchButton: "بحث",
    institutionType: "نوع المؤسسة",
    all: "الكل",
    public: "حكومية",
    private: "أهلية",
    subject: "التخصص",
    institutions: "المؤسسات",
    journals: "المجلات",
    seedArticles: "سجلات تجريبية",
    catalogTitle: "الجامعات المعترف بها",
    resultsTitle: "النتائج",
    assistantTools: "أدوات الباحث",
    paraphraseTitle: "مساعد إعادة الصياغة",
    paraphraseNote: "استخدمه للمساعدة في المسودة فقط. حافظ على الاستشهادات وراجع المعنى قبل التسليم.",
    academicTone: "أكاديمي",
    simpleTone: "بسيط",
    paraphraseButton: "إعادة الصياغة",
    noResults: "لا توجد نتائج. جرب كلمة أوسع مثل Kurdish أو water أو education أو medical أو digital أو Erbil أو Duhok أو Sulaimani.",
    pdfUnavailable: "PDF غير متاح",
    copied: "تم النسخ",
    copyCitation: "نسخ الاستشهاد",
    copySummary: "نسخ الملخص",
    score: "درجة"
  }
};

const state = {
  lang: "en",
  catalog: null,
  results: []
};

const $ = (selector) => document.querySelector(selector);
const resultsEl = $("#results");
const template = $("#result-template");

function t(key) {
  return translations[state.lang][key] || translations.en[key] || key;
}

function applyLanguage(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  document.body.classList.toggle("rtl", lang === "ku" || lang === "ar");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll(".language-switcher button").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === lang);
  });
  renderInstitutions();
  renderResults();
}

function localizedInstitution(institution) {
  if (!institution) return "";
  if (state.lang === "ku") return institution.name_ku || institution.name_en;
  if (state.lang === "ar") return institution.name_ar || institution.name_en;
  return institution.name_en;
}

function localizedTitle(article) {
  if (state.lang === "ku") return article.title_ku || article.title;
  if (state.lang === "ar") return article.title_ar || article.title;
  return article.title;
}

async function loadCatalog() {
  const response = await fetch("/api/catalog");
  state.catalog = await response.json();

  $("#institution-count").textContent = state.catalog.institutions.length;
  $("#journal-count").textContent = state.catalog.journals.length;
  $("#article-count").textContent = state.catalog.article_count;

  const subjectFilter = $("#subject-filter");
  state.catalog.subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectFilter.appendChild(option);
  });
  renderInstitutions();
}

function renderInstitutions() {
  if (!state.catalog) return;
  const list = $("#institution-list");
  list.innerHTML = "";
  state.catalog.institutions.forEach((institution) => {
    const item = document.createElement("div");
    item.className = "institution-item";
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    name.textContent = localizedInstitution(institution);
    meta.textContent = `${institution.city} · ${t(institution.type)}`;
    item.append(name, meta);
    list.appendChild(item);
  });
}

async function runSearch() {
  const q = $("#query").value.trim();
  const type = $("#type-filter").value;
  const subject = $("#subject-filter").value;
  const params = new URLSearchParams({ q, type, subject });
  const response = await fetch(`/api/search?${params}`);
  const payload = await response.json();
  state.results = payload.results;
  $("#result-count").textContent = `${payload.count} ${state.lang === "en" ? "results" : ""}`;
  renderResults();
}

function renderResults() {
  if (!resultsEl) return;
  resultsEl.innerHTML = "";
  if (!state.results.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t("noResults");
    resultsEl.appendChild(empty);
    return;
  }

  const style = $("#citation-style").value;
  state.results.forEach((article) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".result-card");
    const citation = article.citations[style] || article.citations.apa;
    const pdfLink = node.querySelector(".pdf-link");
    const summary = article.summary || article.abstract;

    node.querySelector(".result-meta").textContent = `${article.authors.join(", ")} · ${article.year} · ${t("score")} ${article.score}`;
    node.querySelector("h3").textContent = article.title;
    node.querySelector(".localized-title").textContent = localizedTitle(article);
    node.querySelector(".summary").textContent = summary;
    node.querySelector(".journal-name").textContent = article.journal.title;
    node.querySelector(".institution-name").textContent = localizedInstitution(article.institution);
    node.querySelector(".impact-factor").textContent = article.journal.impact_factor ?? "Not verified";
    node.querySelector(".ranking").textContent = article.journal.ranking || "Not verified";
    node.querySelector(".citation").textContent = citation;
    node.querySelector(".copy-citation").textContent = t("copyCitation");
    node.querySelector(".copy-summary").textContent = t("copySummary");

    const tags = node.querySelector(".tags");
    article.keywords.slice(0, 8).forEach((keyword) => {
      const tag = document.createElement("span");
      tag.textContent = keyword;
      tags.appendChild(tag);
    });

    if (article.pdf_url) {
      pdfLink.href = article.pdf_url;
      pdfLink.textContent = "PDF";
    } else {
      pdfLink.removeAttribute("href");
      pdfLink.classList.add("disabled");
      pdfLink.textContent = t("pdfUnavailable");
    }

    node.querySelector(".copy-citation").addEventListener("click", (event) => {
      copyText(citation, event.currentTarget);
    });
    node.querySelector(".copy-summary").addEventListener("click", (event) => {
      copyText(summary, event.currentTarget);
    });

    resultsEl.appendChild(card);
  });
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const oldText = button.textContent;
  button.textContent = t("copied");
  setTimeout(() => {
    button.textContent = oldText;
  }, 1200);
}

async function paraphrase() {
  const text = $("#paraphrase-input").value;
  const tone = $("#paraphrase-tone").value;
  const response = await fetch("/api/paraphrase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, tone })
  });
  const payload = await response.json();
  $("#paraphrase-output").value = payload.paraphrased;
}

$("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});
$("#type-filter").addEventListener("change", runSearch);
$("#subject-filter").addEventListener("change", runSearch);
$("#citation-style").addEventListener("change", renderResults);
$("#paraphrase-button").addEventListener("click", paraphrase);

document.querySelectorAll(".language-switcher button").forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.lang));
});

loadCatalog().then(() => {
  applyLanguage("en");
  runSearch();
});
