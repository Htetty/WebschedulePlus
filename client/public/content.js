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

          const closeBtn = document.querySelector(
            ".close.ui-icon.ui-icon-closethick"
          );
          if (closeBtn) {
            closeBtn.style.zIndex = "9999";
          }

          card.innerHTML = `
              <div style="font-family:Segoe UI;font-size:13px;padding:10px 20px;margin-top:8px;display:flex;flex-direction:column;gap:6px;border:1px solid ${borderColor};color:#e0e0e0;">
                <div>${ratingEmoji} <strong>${prof.avgRating}</strong> / 5 (${prof.numRatings} ratings)</div>
                <div>${difficultyEmoji} Difficulty: <strong>${prof.avgDifficulty}</strong></div>
                <div>👍 <span style="color:${wouldTakeColor};">Would take again: <strong>${prof.wouldTakeAgainPercent}%</strong></span></div>
                <div>
                  🔗 <a href="${prof.profileUrl}" target="_blank" style="color:#0073e6;text-decoration:none;font-weight:bold;">View on Rate My Professor</a>
                </div>
                <div style="font-size:12px;color:#aaa;">Data Last Updated: 04/01/2025</div>
              </div>
            `;
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
