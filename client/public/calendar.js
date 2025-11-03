(function () {
  function parseScheduleData() {
    const container = document.querySelector("#scheduleListView");
    if (!container) return [];

    const events = [];
    const wrappers = container.querySelectorAll(".listViewWrapper");

    wrappers.forEach((wrapper) => {
      const titleEl = wrapper.querySelector(".list-view-course-title a");
      const courseName = titleEl ? titleEl.innerText.trim() : "Unknown Course";

      const meetingInfos = wrapper.querySelectorAll(
        ".listViewMeetingInformation"
      );
      meetingInfos.forEach((meeting) => {
        const dateRanges = Array.from(
          meeting.querySelectorAll("span.meetingTimes")
        ).map((span) => span.textContent.trim());
        const pillboxes = Array.from(meeting.querySelectorAll(".ui-pillbox"));
        const typeLabels = Array.from(
          meeting.querySelectorAll("span.bold")
        ).filter((span) => span.textContent.includes("Type:"));

        const locationLabel = Array.from(
          meeting.querySelectorAll("span.bold")
        ).find((span) => span.textContent.includes("Location:"));
        const location =
          locationLabel?.nextSibling?.textContent
            ?.replace(/\u00a0/g, " ")
            .trim() || "Unknown";

        const buildingLabel = Array.from(
          meeting.querySelectorAll("span.bold")
        ).find((span) => span.textContent.includes("Building:"));
        const building =
          buildingLabel?.nextSibling?.textContent
            ?.replace(/\u00a0/g, " ")
            .trim() || "Unknown";

        const roomLabel = Array.from(
          meeting.querySelectorAll("span.bold")
        ).find((span) => span.textContent.includes("Room:"));
        const room =
          roomLabel?.nextSibling?.textContent?.replace(/\u00a0/g, " ").trim() ||
          "Unknown";

        const fullLocation = `${location} ${building} ${room}`
          .replace(/\s+/g, " ")
          .trim();

        const rawSpans = Array.from(meeting.querySelectorAll("span"));
        const timeSpans = rawSpans.filter((span) =>
          /\d{1,2}:\d{2}\s*[AP]M/.test(span.textContent)
        );

        const totalEntries = Math.max(
          dateRanges.length,
          pillboxes.length,
          typeLabels.length,
          timeSpans.length
        );

        for (let i = 0; i < totalEntries; i++) {
          const dateRange = dateRanges[i] || dateRanges[0] || "N/A";
          const [startDate, endDate] = dateRange
            .split("--")
            .map((d) => d.trim());

          const typeText =
            typeLabels[i]?.nextSibling?.textContent
              ?.replace(/\u00a0/g, " ")
              .trim() || "Unknown Type";

          let timeText = "No Time Found";
          if (timeSpans[i]) {
            timeText = timeSpans[i].textContent.replace(/\s+/g, " ").trim();
          } else {
            const fallbackMatch = meeting.textContent.match(
              /\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M/
            );
            if (fallbackMatch)
              timeText = fallbackMatch[0].replace(/\s+/g, " ").trim();
          }

          let days = "None";
          if (pillboxes[i]) {
            const dayLis = pillboxes[i].querySelectorAll(
              "li.ui-state-highlight"
            );
            days =
              Array.from(dayLis)
                .map((li) => li.getAttribute("data-abbreviation"))
                .join("") || "None";
          }

          events.push({
            courseName,
            type: typeText,
            days,
            time: timeText,
            startDate,
            endDate,
            location: fullLocation,
          });
        }
      });
    });

    return events;
  }

  function downloadAsICS(filename, content) {
    const blob = new Blob([content], { type: "text/calendar" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatTimeTo24Hour(str) {
    if (!str || typeof str !== "string") {
      throw new Error("Invalid time string");
    }
    const [start, end] = str.split("-").map((s) => s.trim());

    const startMatch = start.match(/(\d{1,2}):(\d{2})\s*([AP]M)/);
    const endMatch = end.match(/(\d{1,2}):(\d{2})\s*([AP]M)/);

    if (!startMatch || !endMatch) {
      throw new Error("Invalid time format");
    }

    const [sHour, sMin, sPeriod] = startMatch.slice(1);
    const [eHour, eMin, ePeriod] = endMatch.slice(1);

    function to24Hour(h, m, p) {
      let hour = parseInt(h);
      if (p === "PM" && hour < 12) hour += 12;
      if (p === "AM" && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, "0")}${m}`;
    }

    return [to24Hour(sHour, sMin, sPeriod), to24Hour(eHour, eMin, ePeriod)];
  }

  function formatDateYYYYMMDD(dateStr) {
    if (!dateStr || typeof dateStr !== "string") {
      throw new Error("Invalid date string");
    }
    const parts = dateStr.split("/");
    if (parts.length !== 3) {
      throw new Error("Invalid date format. Expected MM/DD/YYYY");
    }
    const [month, day, year] = parts;
    return `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`;
  }

  function formatICSEvents(events) {
    const dayMap = {
      M: "MO",
      T: "TU",
      W: "WE",
      R: "TH",
      F: "FR",
      S: "SA",
      U: "SU",
    };
    const dayToNum = { U: 0, M: 1, T: 2, W: 3, R: 4, F: 5, S: 6 };
    const now =
      new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

    let icsBody =
      "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nPRODID:-//BetterWebSchedule//EN\n";

    events.forEach((event) => {
      if (event.days === "None" || event.time === "No Time Found") return;

      try {
        const [startTime, endTime] = formatTimeTo24Hour(event.time);
        let startDate = formatDateYYYYMMDD(event.startDate);
        const endDate = formatDateYYYYMMDD(event.endDate);

        for (const day of event.days) {
          const weekday = dayMap[day];
          if (!weekday) continue;

          const initialDate = new Date(
            parseInt(startDate.slice(0, 4)),
            parseInt(startDate.slice(4, 6)) - 1,
            parseInt(startDate.slice(6, 8))
          );

          const daysDiff = (dayToNum[day] - initialDate.getDay() + 7) % 7;
          if (daysDiff > 0) {
            initialDate.setDate(initialDate.getDate() + daysDiff);
            startDate =
              initialDate.getFullYear().toString() +
              (initialDate.getMonth() + 1).toString().padStart(2, "0") +
              initialDate.getDate().toString().padStart(2, "0");
          }

          icsBody += `BEGIN:VEVENT\n`;
          icsBody += `DTSTAMP:${now}\n`;
          icsBody += `UID:${Math.random()
            .toString(36)
            .slice(2)}@betterwebschedule\n`;
          icsBody += `SUMMARY:${event.courseName} (${event.type})\n`;
          icsBody += `DTSTART;TZID=America/Los_Angeles:${startDate}T${startTime}00\n`;
          icsBody += `DTEND;TZID=America/Los_Angeles:${startDate}T${endTime}00\n`;
          icsBody += `LOCATION:${event.location || "TBD"}\n`;
          icsBody += `RRULE:FREQ=WEEKLY;BYDAY=${weekday};UNTIL=${endDate}T235900Z\n`;
          icsBody += `END:VEVENT\n`;
        }
      } catch (error) {
        console.error(`Error formatting event for ${event.courseName}:`, error);
      }
    });

    icsBody += "END:VCALENDAR";
    return icsBody;
  }

  window.downloadScheduleICS = () => {
    try {
      const events = parseScheduleData();
      if (events.length === 0) {
        alert(
          "No schedule data found. Please make sure you're on the schedule list view page."
        );
        return;
      }
      const ics = formatICSEvents(events);
      downloadAsICS("schedule.ics", ics);

      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ action: "icsExported" });
      }
    } catch (error) {
      console.error("Error downloading schedule ICS:", error);
      alert(
        "Error generating calendar file. Please check the console for details."
      );
    }
  };

  // Inject download button into the schedule page
  function injectDownloadButton() {
    const scheduleListView = document.querySelector("#scheduleListView");
    if (!scheduleListView) return;

    if (document.querySelector("#webschedule-calendar-download-btn")) return;

    const button = document.createElement("button");
    button.id = "webschedule-calendar-download-btn";
    button.textContent = "Export Schedule to Calendar";
    button.style.cssText = `
        background-color: #002F65;
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
        padding-left: 2rem;
        padding-right: 2rem;
        display: block;
        margin: 1rem auto 0 auto;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.5s;
        font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    `;

    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0px)";
      button.style.boxShadow = "0 2px 6px rgba(0,0,0,0.18)";
    });

    button.onclick = () => window.downloadScheduleICS();

    const parent = scheduleListView.parentElement;
    if (parent) {
      parent.insertBefore(button, scheduleListView);
    } else {
      scheduleListView.insertBefore(button, scheduleListView.firstChild);
    }
  }

  // waits for schedule details to be selected
  const scheduleObserver = new MutationObserver(() => {
    if (document.querySelector("#scheduleListView")) {
      injectDownloadButton();
    }
  });

  if (document.body) {
    scheduleObserver.observe(document.body, { childList: true, subtree: true });
    if (document.readyState === "complete") {
      setTimeout(injectDownloadButton, 500);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(injectDownloadButton, 500);
      });
    }
  }
})();
