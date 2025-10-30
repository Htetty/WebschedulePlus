import React, { useEffect, useRef } from "react";

const ratingEmoji =
  prof.avgRating >= 3.0 ? "😁" : prof.avgRating >= 2.0 ? "😅" : "😰";
const difficultyEmoji = prof.avgDifficulty >= 3.0 ? "🤕" : "😌";
const wouldTakeColor = prof.wouldTakeAgainPercent >= 50 ? "green" : "red";

function RatingCard({ prof, fullName }) {
  if (!prof) {
    return (
      <div
        style={{
          fontFamily: "Segoe UI",
          fontSize: 13,
          padding: "10px 14px",
          borderTop: "1px solid #ccc",
          marginTop: 8,
        }}
      >
        🧐{" "}
        <strong>
          This professor was not found in existing data for this school.
        </strong>
        <br />
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(
            fullName + " rate my professor"
          )}`}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#0073e6",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Search for {fullName} on Rate My Professor
        </a>
      </div>
    );
  }
  return (
    <div
      style={{
        fontFamily: "Segoe UI",
        fontSize: 13,
        padding: "10px 20px",
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        border: "1px solid #ccc",
        color: "#e0e0e0",
      }}
    >
      <div>
        {ratingEmoji} <strong>{prof.avgRating}</strong> / 5 ({prof.numRatings}{" "}
        ratings)
      </div>
      <div>
        {difficultyEmoji} Difficulty: <strong>{prof.avgDifficulty}</strong>
      </div>
      <div>
        👍{" "}
        <span style={{ color: wouldTakeColor }}>
          Would take again: <strong>{prof.wouldTakeAgainPercent}%</strong>
        </span>
      </div>
      <div>
        🔗{" "}
        <a
          href={prof.profileUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#0073e6",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          View on Rate My Professor
        </a>
      </div>
      <div style={{ fontSize: 12, color: "#aaa" }}>
        Data Last Updated: 04/01/2025
      </div>
    </div>
  );
}

async function fetchJSON(path) {
  const url = chrome?.runtime?.getURL ? chrome.runtime.getURL(path) : path;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    const data = await res.json();
    return data;
  } catch (err) {
    return [];
  }
}

function normalizeName(fullName) {
  const parts = fullName
    .split(/\s+/)
    .filter((p) => /^[A-Za-z.'-]+$/.test(p))
    .map((p) => p.replace(/[.'-]/g, ""));

  if (parts.length === 0) return { first: "", last: "" };
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  return { first, last };
}

export default function RMPInjector() {
  const dataRef = useRef({
    professors: [],
    lastNameSeen: null,
  });

  const observerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDataAndAttach() {
      const [skyline, csm, canada] = await Promise.all([
        fetchJSON("ScrapedData/all_professors_Skyline.json"),
        fetchJSON("ScrapedData/all_professors_CSM.json"),
        fetchJSON("ScrapedData/all_professors_Canada.json"),
      ]);

      if (cancelled) return;

      dataRef.current.professors = [...skyline, ...csm, ...canada];
      attachObserver();
    }

    function attachObserver() {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      const obs = new MutationObserver(() => {
        const profileCard = document.querySelector(".profileCard");
        if (!profileCard) return;

        const nameElem = profileCard.querySelector(".facultyName");
        if (!nameElem) return;

        const fullName = nameElem.textContent.trim();
        if (!fullName) return;

        if (dataRef.current.lastNameSeen === fullName) return;
        dataRef.current.lastNameSeen = fullName;

        // Remove old card if any
        const existing = profileCard.querySelector(".rmpCard");
        if (existing) existing.remove();

        // Find matching prof
        const { first, last } = normalizeName(fullName);
        const prof = dataRef.current.professors.find(
          (p) =>
            p.firstName?.toLowerCase() === first.toLowerCase() &&
            p.lastName?.toLowerCase() === last.toLowerCase()
        );

        // Insert container near the info box
        const infoBox = profileCard.querySelector(".info") || profileCard;
        const card = document.createElement("div");
        card.className = "rmpCard";
        card.style.opacity = "0";
        card.style.transform = "translateY(10px)";
        card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        infoBox.appendChild(card);

        // Make the close button click-able above everything
        const closeBtn = document.querySelector(
          ".close.ui-icon.ui-icon-closethick"
        );
        if (closeBtn) closeBtn.style.zIndex = "9999";

        root.render(<RatingCard prof={prof} fullName={fullName} />);

        // Animate in
        requestAnimationFrame(() => {
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
        });
      });

      observerRef.current = obs;

      if (document.body instanceof Node) {
        obs.observe(document.body, { childList: true, subtree: true });
        console.log("RMP MutationObserver attached");
      } else {
        console.warn("document.body not ready, observer not attached");
      }
    }

    loadDataAndAttach();

    return () => {
      cancelled = true;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = null;
    };
  }, []);

  return null;
}
