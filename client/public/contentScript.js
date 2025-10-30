(() => {
    console.log("content script loaded");
  
    const init = async () => {
      try {
  
        const fetchJSON = async (path) => {
          const url = chrome.runtime.getURL(path);
          try {
            console.log("📥 Fetching:", url);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
            const data = await res.json();
            console.log(`✅ Loaded ${path} (${Array.isArray(data) ? data.length : "?"} entries)`);
            return data;
          } catch (err) {
            console.error(`❌ Failed to load ${path}:`, err);
            return [];
          }
        };
  
        const [skyline, csm, canada] = await Promise.all([
          fetchJSON("ScrapedData/all_professors_Skyline.json"),
          fetchJSON("ScrapedData/all_professors_CSM.json"),
          fetchJSON("ScrapedData/all_professors_Canada.json"),
        ]);
  
        const professors = [...skyline, ...csm, ...canada];
        console.log(`📊 Loaded combined RMP data: ${professors.length} professors`);
  
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
  
          const nameParts = fullName.split(" ").filter((n) => /^[A-Za-z]+$/.test(n));
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
            console.log(`Match found for ${normalized}`);
  
            const deptLine = document.createElement("div");
            deptLine.textContent = prof.department;
            deptLine.className = "injectedDept";
            deptLine.style.cssText = "font-size: 12px; color: #666; margin-top: 4px;";
            nameElem.insertAdjacentElement("afterend", deptLine);
  
            const ratingEmoji = prof.avgRating >= 3.0 ? "😁" : prof.avgRating >= 2.0 ? "😅" : "😰";
            const difficultyEmoji = prof.avgDifficulty >= 3.0 ? "🤕" : "😌";
            const wouldTakeColor = prof.wouldTakeAgainPercent >= 50 ? "green" : "red";
            const borderColor = "#ccc";

            const closeBtn = document.querySelector(".close.ui-icon.ui-icon-closethick");
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
            console.log(`⚠️ Match not found for ${normalized}`);
            card.innerHTML = `
              <div style="font-family:Segoe UI;font-size:13px;padding:10px 14px;border-top:1px solid #ccc;margin-top:8px;">
                🧐 <strong>This professor was not found in existing data for this school.</strong><br/>
                <a href="https://www.google.com/search?q=${encodeURIComponent(fullName + ' rate my professor')}"
                   target="_blank" style="color:#0073e6;text-decoration:none;font-weight:bold;">
                  Search for ${fullName} on Rate My Professor
                </a>
              </div>
            `;
          }
        });
  
        if (document.body instanceof Node) {
          rmpObserver.observe(document.body, { childList: true, subtree: true });
          console.log("RMP MutationObserver attached");
        } else {
          console.warn("document.body not ready, observer not attached");
        }
      } catch (err) {
        console.error("Top-level RMP error:", err);
      }
    };
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
  