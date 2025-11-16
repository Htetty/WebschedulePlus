import { useRef, useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";
import locationsData from "../assets/data/locations.json";
import csmpinIcon from "../../shared/mappin_csm.svg?url";
import skylinepinIcon from "../../shared/mappin_skyline.svg?url";
import canadaPinIcon from "../../shared/mappin_canada.svg?url";

import parkingIcon from "../../shared/parking.svg?url";

function Mapbox() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const [activeCampus, setActiveCampus] = useState('skyline');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken =
      "pk.eyJ1IjoiaHRldHR5IiwiYSI6ImNtYTRreXRjdzA4ZTkycnB5bnFlZTVjNTAifQ.lNpc5t2USJrlL2wOrVRIAw";

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: locationsData.skyline.center,
      zoom: 17,
      maxZoom: 18,
      minZoom: 16,
    });

    const map = mapRef.current;

    function clearMarkers() {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    function setBounds(center, padding = 0.01) {
      const bounds = [
        [center[0] - padding, center[1] - padding],
        [center[0] + padding, center[1] + padding],
      ];
      map.setMaxBounds(bounds);
    }

    function createMarker(location, iconUrl, campusKey, type = "building") {
      const el = document.createElement("img");
      const finalIconUrl =
        typeof iconUrl === "string" ? iconUrl : iconUrl.default || iconUrl;
      el.src = finalIconUrl;
      el.alt = `${location.name} marker`;
      el.className = "marker";
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.objectFit = "contain";
      el.style.cursor = "pointer";
      el.style.display = "block";
      el.dataset.campusKey = campusKey || "";
      el.dataset.buildingName = location.name || "";
      el.dataset.type = type;

      return new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
                    <strong style="font-size: 16px; font-weight: bold;">${location.name}</strong><br>
                    <span style="font-size: 13px;">${location.description}
                    </span>
                `)
        )
        .addTo(map);
    }

    const campusIcons = {
      skyline: skylinepinIcon,
      csm: csmpinIcon,
      canada: canadaPinIcon,
    };

    function addMarkers(school, campusKey) {
      setBounds(school.center);
      map.flyTo({ center: school.center, zoom: 17 });

      const icon = campusIcons[campusKey];
      if (icon) {
        school.buildings.forEach((loc) => {
          const marker = createMarker(loc, icon, campusKey);
          markersRef.current.push(marker);
        });
      }

      school.studentParking.forEach((loc) => {
        const marker = createMarker(loc, parkingIcon, campusKey, "parking");
        markersRef.current.push(marker);
      });
    }

    let currentCampusKey = "skyline";

    map.on("load", () => {
      setBounds(locationsData.skyline.center);
      addMarkers(locationsData.skyline, "skyline");
    });

    function closeAllPopups() {
      const popups = document.querySelectorAll(".mapboxgl-popup");
      popups.forEach((el) => el.remove());
    }

    function ensureCampusLoaded(targetCampusKey) {
      if (currentCampusKey !== targetCampusKey) {
        const target = locationsData[targetCampusKey];
        if (target) {
          addMarkers(target, targetCampusKey);
          currentCampusKey = targetCampusKey;
        }
      }
    }

    function findBuildingByNameOrNumber(school, name) {
      const n = (name || "").toLowerCase();
      const list = school.buildings || [];

      // exact
      let b = list.find((x) => (x.name || "").toLowerCase() === n);
      if (b) return b;

      // contains
      b = list.find((x) => (x.name || "").toLowerCase().includes(n));
      if (b) return b;

      // number match
      const num = n.match(/\b\d+\b/)?.[0];
      if (num) {
        b = list.find((x) => new RegExp(`\\b${num}\\b`).test(x.name || ""));
        if (b) return b;
      }

      // normalize "bldg/building"
      const n2 = n.replace(/\b(bldg|building|bld)\.?/g, "").trim();
      if (n2 && n2 !== n) {
        b = list.find((x) => (x.name || "").toLowerCase().includes(n2));
      }
      return b || null;
    }

    function flyToBuilding(campusKey, buildingName) {
      const school = locationsData[campusKey];
      if (!school) return;

      ensureCampusLoaded(campusKey);
      closeAllPopups();

      const building = findBuildingByNameOrNumber(school, buildingName);

      if (!building) return;

      map.flyTo({ center: [building.lng, building.lat], zoom: 18 });
      const onMoveEnd = () => {
        map.off("moveend", onMoveEnd);
        const marker = markersRef.current.find((m) => {
          const el = m.getElement?.();
          return (
            el &&
            el.dataset?.type === "building" &&
            el.dataset?.campusKey === campusKey &&
            el.dataset?.buildingName?.toLowerCase?.() ===
              (building.name || "").toLowerCase()
          );
        });
        if (marker) {
          marker.togglePopup();
        }
      };
      map.on("moveend", onMoveEnd);
    }

    window.addEventListener("message", (e) => {
      const msg = e.data;
      if (!msg || msg.source !== "BetterWebSchedule") return;
      if (msg.type === "flyToBuilding") {
        const { campusKey, buildingName } = msg.payload || {};
        flyToBuilding(campusKey, buildingName);
      }
    });

    window.mapboxHandlers = {
      skyline: () => {
        clearMarkers();
        addMarkers(locationsData.skyline, "skyline");
        currentCampusKey = "skyline";
      },
      canada: () => {
        clearMarkers();
        addMarkers(locationsData.canada, "canada");
        currentCampusKey = "canada";
      },
      csm: () => {
        clearMarkers();
        addMarkers(locationsData.csm, "csm");
        currentCampusKey = "csm";
      },
      flyToBuilding,
    };

    let messageListener = null;
    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      messageListener = (msg) => {
        if (msg?.type === "flyToBuilding") {
          const { campusKey, buildingName } = msg.payload || {};
          flyToBuilding(campusKey, buildingName);
        }
      };
      chrome.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      clearMarkers();
      map.remove();
      delete window.mapboxHandlers;
      if (messageListener && chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, []);

  const handleClick = (campus) => {
    setActiveCampus(campus);
    if (window.mapboxHandlers?.[campus]) {
      window.mapboxHandlers[campus]();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-4 left-5 z-10 grid grid-cols-1 gap-5 mapbox-controls">
        <button
            onClick={() => handleClick("skyline")}
            className={`rounded-md py-2.5 px-7 text-white font-semibold transition-all duration-200 border ${
            activeCampus === "skyline"
                ? "bg-[#F03D3A] border-white/60 brightness-110 shadow-md"
                : "bg-[#F03D3A]/80 hover:bg-[#F03D3A] hover:brightness-110 border-transparent opacity-80"
            }`}
        >
            Skyline
        </button>

        <button
            onClick={() => handleClick("csm")}
            className={`rounded-md py-2.5 px-7 text-white font-semibold transition-all duration-200 border ${
            activeCampus === "csm"
                ? "bg-[#004990] border-white/60 brightness-110 shadow-md"
                : "bg-[#004990]/80 hover:bg-[#004990] hover:brightness-110 border-transparent opacity-80"
            }`}
        >
            CSM
        </button>

        <button
            onClick={() => handleClick("canada")}
            className={`rounded-md py-2.5 px-7 text-white font-semibold transition-all duration-200 border ${
            activeCampus === "canada"
                ? "bg-[#205C40] border-white/60 brightness-110 shadow-md"
                : "bg-[#205C40]/80 hover:bg-[#205C40] hover:brightness-110 border-transparent opacity-80"
            }`}
        >
            Canada
        </button>
</div>


    </div>
  );
}

export default Mapbox;
