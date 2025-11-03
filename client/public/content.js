(() => {
  const init = async () => {
    try {
      const fetchJSON = async (path) => {
        const url = chrome.runtime.getURL(path);
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
          const data = await res.json();
          return data;
        } catch (err) {
          return [];
        }
      };

      const [skyline, csm, canada] = await Promise.all([
        fetchJSON("ScrapedData/all_professors_Skyline.json"),
        fetchJSON("ScrapedData/all_professors_CSM.json"),
        fetchJSON("ScrapedData/all_professors_Canada.json"),
      ]);

      const professors = [...skyline, ...csm, ...canada];

      const rmpObserver = new MutationObserver(() => {
        const profileCard = document.querySelector(".profileCard");
        if (!profileCard) return;

        const nameElem = profileCard.querySelector(".facultyName");
        if (!nameElem) return;

        const fullName = nameElem.textContent.trim();
        if (!fullName) return;

        if (rmpObserver.lastNameSeen === fullName) return;
        rmpObserver.lastNameSeen = fullName;

        const oldCard = profileCard.querySelector(".rmpCard");
        if (oldCard) oldCard.remove();

        const nameParts = fullName
          .split(" ")
          .filter((n) => /^[A-Za-z]+$/.test(n));
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        const normalized = `${firstName} ${lastName}`;

        const prof = professors.find(
          (p) =>
            p.firstName.toLowerCase() === firstName.toLowerCase() &&
            p.lastName.toLowerCase() === lastName.toLowerCase()
        );

        const infoBox = profileCard.querySelector(".info");
        const card = document.createElement("div");
        card.className = "rmpCard";
        card.style.opacity = "0";
        card.style.transform = "translateY(10px)";
        card.style.transition = "opacity 0.4s ease, transform 0.4s ease";

        if (infoBox) {
          infoBox.appendChild(card);
          requestAnimationFrame(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
          });
        }

        if (prof) {
          const deptLine = document.createElement("div");
          deptLine.textContent = prof.department;
          deptLine.className = "injectedDept";
          deptLine.style.cssText =
            "font-size: 12px; color: #666; margin-top: 4px;";
          nameElem.insertAdjacentElement("afterend", deptLine);

          const ratingEmoji =
            prof.avgRating >= 3.0 ? "😁" : prof.avgRating >= 2.0 ? "😅" : "😰";
          const difficultyEmoji = prof.avgDifficulty >= 3.0 ? "🤕" : "😌";
          const wouldTakeColor =
            prof.wouldTakeAgainPercent >= 50 ? "green" : "red";
          const borderColor = "#ccc";

          // tag colors and tags HTML
          const tagColors = [
            "#6c5ce7", // purple
            "#00b894", // teal
            "#fdcb6e", // yellow
            "#0984e3", // blue
            "#e17055", // orange
            "#74b9ff", // light blue
            "#fab1a0", // pink
          ];

          const tagsHTML =
            prof.tags && prof.tags.length > 0
              ? prof.tags
                  .map((tag, i) => {
                    const bg = tagColors[i % tagColors.length];
                    return `<span class="tag" style="--bg:${bg}">${tag}</span>`;
                  })
                  .join("")
              : `<span class="noTags">No tags</span>`;

          const closeBtn = document.querySelector(
            ".close.ui-icon.ui-icon-closethick"
          );
          if (closeBtn) {
            closeBtn.style.zIndex = "9999";
          }

          const shadow = card.shadowRoot || card.attachShadow({ mode: "open" });
          shadow.innerHTML = `
            <style>
              :host { all: initial; }
              .card {
                font-family: Segoe UI, -apple-system, system-ui, Roboto, Arial, sans-serif;
                font-size: 13px;
                color: #222;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 12px 16px;
                margin-top: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,.08);
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 560px;
              }
              .row { display: flex; align-items: center; gap: 6px; color: #222; }
              .muted { color: #666; font-size: 12px; }
              .link a { color: #0073e6; text-decoration: none; font-weight: 600; }
              .link a:hover { text-decoration: underline; }
              .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
              .tag {
                display: inline-block;
                background: var(--bg, #6c5ce7);
                color: #fff;
                border-radius: 999px;
                padding: 2px 8px;
                font-size: 11px;
                line-height: 1.4;
                white-space: nowrap;
              }
              .noTags { color: #999; font-size: 12px; }
              .emph { font-weight: 700; }
            </style>
            <div class="card">
              <div class="row">${ratingEmoji} <span class="emph">${prof.avgRating}</span> / 5 (${prof.numRatings} ratings)</div>
              <div class="row">${difficultyEmoji} Difficulty: <span class="emph">${prof.avgDifficulty}</span></div>
              <div class="row">👍 <span style="color:${wouldTakeColor}">Would take again: <span class="emph">${prof.wouldTakeAgainPercent}%</span></span></div>
              <div class="tags">${tagsHTML}</div>
              <div class="link">🔗 <a href="${prof.profileUrl}" target="_blank" rel="noopener noreferrer">View on Rate My Professor</a></div>
              <div class="muted">Data Last Updated: 11/03/2025</div>
            </div>
          `;

          const linkEl = shadow.querySelector(".link a");
          if (linkEl) {
            linkEl.addEventListener("click", (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              const url = linkEl.getAttribute("href");
              if (!url) return;
              if (
                typeof chrome !== "undefined" &&
                chrome.runtime?.sendMessage
              ) {
                chrome.runtime.sendMessage({ type: "openTab", url });
              } else {
                try {
                  window.open(url, "_blank", "noopener");
                } catch (_) {}
              }
            });
          }
        } else {
          card.innerHTML = `
              <div style="font-family:Segoe UI;font-size:13px;padding:10px 14px;border-top:1px solid #ccc;margin-top:8px;">
                🧐 <strong>This professor was not found in existing data for this school.</strong><br/>
                <a href="https://www.google.com/search?q=${encodeURIComponent(
                  fullName + " rate my professor"
                )}"
                   target="_blank" style="color:#0073e6;text-decoration:none;font-weight:bold;">
                  Search for ${fullName} on Rate My Professor
                </a>
              </div>
            `;
        }
      });

      if (document.body instanceof Node) {
        rmpObserver.observe(document.body, { childList: true, subtree: true });
      }

      const parseBuildingInfo = (buildingStr) => {
        if (!buildingStr) return null;

        const normalized = buildingStr.trim();
        const campusMatch = normalized.match(/^(SKY|CSM|CA[ÑN]ADA?)\s+/i);
        let campusKey = null;
        let buildingName = normalized;

        if (campusMatch) {
          const campusCode = campusMatch[1].toUpperCase();
          campusKey =
            campusCode === "SKY" || campusCode === "SKYLINE"
              ? "skyline"
              : campusCode === "CSM"
              ? "csm"
              : "canada";

          buildingName = normalized.replace(/^(SKY|CSM|CA[ÑN]ADA?)\s+/i, "");
        } else {
          campusKey = "skyline";
        }

        buildingName = buildingName.replace(/\s*-\s*$/, "").trim();
        buildingName = buildingName.replace(/\b(bldg|bld)\.?\s*/i, "Building ");

        if (/^\d+/.test(buildingName.trim())) {
          buildingName = "Building " + buildingName.trim();
        }

        return { campusKey, buildingName: buildingName.trim() };
      };

      const extractBuildingFromElement = (element) => {
        const title = element.getAttribute("title");
        if (title) {
          const buildingMatch = title.match(
            /Building:\s*([\s\S]*?)(?:\s*-\s*)?(?:\s+Room:|$)/i
          );
          if (buildingMatch) {
            return buildingMatch[1].trim();
          }
        }

        const tooltipRows = element.querySelectorAll(".tooltip-row");
        for (const tooltipRow of tooltipRows) {
          const text = tooltipRow.textContent || tooltipRow.innerText;
          if (text && text.includes("Building:")) {
            const buildingMatch = text.match(/Building:\s*([^\n]+)/i);
            if (buildingMatch) {
              const buildingSpan = tooltipRow.querySelector("span");
              if (
                buildingSpan &&
                !buildingSpan.textContent.includes("Building:")
              ) {
                return buildingSpan.textContent.trim();
              }
              return buildingMatch[1].trim();
            }
          }
        }

        return null;
      };

      const sendBuildingToMapbox = (campusKey, buildingName) => {
        window.postMessage(
          {
            source: "BetterWebSchedule",
            type: "flyToBuilding",
            payload: { campusKey, buildingName },
          },
          "*"
        );

        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: "flyToBuilding",
            payload: { campusKey, buildingName },
          });
        }
      };

      const courseSelectionObserver = new MutationObserver(() => {
        const selectedMeetingTimeCells = document.querySelectorAll(
          "td.selected[data-property='meetingTime']"
        );

        selectedMeetingTimeCells.forEach((element) => {
          const dataId = element.getAttribute("data-id");
          if (
            courseSelectionObserver.processedIds &&
            courseSelectionObserver.processedIds.has(dataId)
          ) {
            return;
          }

          if (!courseSelectionObserver.processedIds) {
            courseSelectionObserver.processedIds = new Set();
          }

          const buildingInfo = extractBuildingFromElement(element);
          if (!buildingInfo) return;

          const parsed = parseBuildingInfo(buildingInfo);
          if (!parsed || !parsed.campusKey || !parsed.buildingName) return;

          courseSelectionObserver.processedIds.add(dataId);
          sendBuildingToMapbox(parsed.campusKey, parsed.buildingName);
        });

        const allSelected = document.querySelectorAll(
          "td.selected[data-property='meetingTime']"
        );
        if (allSelected.length === 0) {
          courseSelectionObserver.processedIds?.clear();
        }
      });

      if (document.body instanceof Node) {
        courseSelectionObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    } catch (err) {}
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
