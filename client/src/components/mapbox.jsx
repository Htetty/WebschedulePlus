import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";
import locationsData from "../data/locations.json";

function Mapbox() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);

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

    function createMarker(location, iconUrl) {
      const el = document.createElement("div");
      el.className = "marker";
      el.style.backgroundImage = `url(${iconUrl})`;
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.backgroundSize = "cover";

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

    function addMarkers(school) {
      setBounds(school.center);
      map.flyTo({ center: school.center, zoom: 17 });

      school.buildings.forEach((loc) => {
        const marker = createMarker(loc, "/mappin.svg");
        markersRef.current.push(marker);
      });

      school.studentParking.forEach((loc) => {
        const marker = createMarker(loc, "/parking.svg");
        markersRef.current.push(marker);
      });
    }

    map.on("load", () => {
      setBounds(locationsData.skyline.center);
      addMarkers(locationsData.skyline);
    });

    window.mapboxHandlers = {
      skyline: () => {
        clearMarkers();
        addMarkers(locationsData.skyline);
      },
      canada: () => {
        clearMarkers();
        addMarkers(locationsData.canada);
      },
      csm: () => {
        clearMarkers();
        addMarkers(locationsData.csm);
      },
    };

    return () => {
      clearMarkers();
      map.remove();
      delete window.mapboxHandlers;
    };
  }, []);

  const handleSkylineClick = () => {
    if (window.mapboxHandlers?.skyline) {
      window.mapboxHandlers.skyline();
    }
  };

  const handleCanadaClick = () => {
    if (window.mapboxHandlers?.canada) {
      window.mapboxHandlers.canada();
    }
  };

  const handleCsmClick = () => {
    if (window.mapboxHandlers?.csm) {
      window.mapboxHandlers.csm();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-4 z-10 grid grid-col left-5 gap-5 mapbox-controls">
        <button
          onClick={handleSkylineClick}
          className="bg-[#F03D3A] text-md rounded-lg"
        >
          Skyline
        </button>
        <button
          onClick={handleCsmClick}
          className="bg-[#004990] text-md rounded-lg"
        >
          CSM
        </button>
        <button
          onClick={handleCanadaClick}
          className="bg-[#205C40] rounded-lg text-md"
        >
          Canada
        </button>
      </div>
    </div>
  );
}

export default Mapbox;
