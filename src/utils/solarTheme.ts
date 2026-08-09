/**
 * Utility for calculating local sunrise and sunset times based on geolocation coordinates or system time.
 */

export interface SolarTimes {
  sunrise: Date;
  sunset: Date;
  sunriseStr: string;
  sunsetStr: string;
  isNight: boolean;
  locationName: string;
}

/**
 * Computes solar times for a given latitude/longitude and date.
 * If lat/lng are omitted, checks cached coordinates in localStorage or defaults to 06:00 - 18:00 local time.
 */
export function getSolarTimes(lat?: number, lng?: number, date: Date = new Date()): SolarTimes {
  let activeLat = lat;
  let activeLng = lng;
  let isFromGps = false;

  if (activeLat === undefined || activeLng === undefined) {
    try {
      const storedLat = localStorage.getItem("feheziko_gps_lat");
      const storedLng = localStorage.getItem("feheziko_gps_lng");
      if (storedLat && storedLng) {
        activeLat = parseFloat(storedLat);
        activeLng = parseFloat(storedLng);
        isFromGps = true;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  } else {
    isFromGps = true;
  }

  let isNight = false;
  let sunriseDate: Date;
  let sunsetDate: Date;
  let locationName = "Heure système (06:00 - 18:00)";

  if (activeLat !== undefined && activeLng !== undefined && !isNaN(activeLat) && !isNaN(activeLng)) {
    locationName = isFromGps 
      ? `GPS (${activeLat > 0 ? activeLat.toFixed(2) + '°N' : Math.abs(activeLat).toFixed(2) + '°S'}, ${activeLng > 0 ? activeLng.toFixed(2) + '°E' : Math.abs(activeLng).toFixed(2) + '°W'})`
      : "Heure locale solar";
    
    // Day of year calculation
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    const zenith = 90.833; // Standard zenith for sunrise/sunset
    const D2R = Math.PI / 180;
    const R2D = 180 / Math.PI;

    const calcSolar = (isSunrise: boolean): Date => {
      const lngHour = activeLng / 15;
      const t = dayOfYear + ((isSunrise ? 6 : 18) - lngHour) / 24;
      const M = (0.9856 * t) - 3.289;
      let L = M + (1.916 * Math.sin(M * D2R)) + (0.020 * Math.sin(2 * M * D2R)) + 282.634;
      L = (L % 360 + 360) % 360;
      let RA = R2D * Math.atan(0.91764 * Math.tan(L * D2R));
      RA = (RA % 360 + 360) % 360;
      const Lquadrant = Math.floor(L / 90) * 90;
      const RAquadrant = Math.floor(RA / 90) * 90;
      RA = RA + (Lquadrant - RAquadrant);
      RA = RA / 15;
      const sinDec = 0.39782 * Math.sin(L * D2R);
      const cosDec = Math.cos(Math.asin(sinDec));
      const cosH = (Math.cos(zenith * D2R) - (sinDec * Math.sin(activeLat * D2R))) / (cosDec * Math.cos(activeLat * D2R));

      const fallback = new Date(date);
      if (cosH > 1) {
        fallback.setHours(12, 0, 0, 0);
        return fallback;
      }
      if (cosH < -1) {
        fallback.setHours(isSunrise ? 0 : 23, 59, 0, 0);
        return fallback;
      }

      const H = isSunrise ? (360 - R2D * Math.acos(cosH)) / 15 : (R2D * Math.acos(cosH)) / 15;
      const T = H + RA - (0.06571 * t) - 6.622;
      let UT = T - lngHour;
      UT = (UT % 24 + 24) % 24;

      const res = new Date(date);
      res.setUTCHours(Math.floor(UT), Math.floor((UT % 1) * 60), 0, 0);
      return res;
    };

    sunriseDate = calcSolar(true);
    sunsetDate = calcSolar(false);
  } else {
    sunriseDate = new Date(date);
    sunriseDate.setHours(6, 0, 0, 0);
    sunsetDate = new Date(date);
    sunsetDate.setHours(18, 0, 0, 0);
  }

  const nowTime = date.getTime();
  isNight = nowTime < sunriseDate.getTime() || nowTime >= sunsetDate.getTime();

  const formatTime = (d: Date) => {
    try {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
  };

  return {
    sunrise: sunriseDate,
    sunset: sunsetDate,
    sunriseStr: formatTime(sunriseDate),
    sunsetStr: formatTime(sunsetDate),
    isNight,
    locationName
  };
}

/**
 * Attempts geolocation retrieval and updates cached coordinates.
 */
export function requestGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          localStorage.setItem("feheziko_gps_lat", String(lat));
          localStorage.setItem("feheziko_gps_lng", String(lng));
        } catch (e) {}
        resolve({ lat, lng });
      },
      (err) => {
        console.warn("Geolocation lookup failed or was denied:", err.message);
        resolve(null);
      },
      { timeout: 8000, maximumAge: 600000 }
    );
  });
}
