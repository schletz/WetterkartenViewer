/* jshint strict:global */
/* globals $, Image, window, console */

"use strict";
/**
 * Erzeugt ein Datumsobjekt, welches auf den aktuellen Lauf verweist. Dabei wird das Intervall der
 * Läufe und die Verzögerung der Datenaufbereitung berücksichtigt. 
 * @example Date.fromRunParam(6,5) // Liefert am 12.2.2017 um 15:00 UTC den Wert 12.2.2017 6:00 UTC
 * 
 * @param {number} runsInterval Der Abstand zwischen den Läufen (z. B: 6 für 4x täglich)
 * @param {number} delay Die Verzögerung, bis die Daten zur Verfügungs stehen.
 * @returns Das Datumsobjekt, wann der aktuelle Lauf gestartet wurde.
 */
Date.fromRunParam = function (runsInterval, delay) {
    if (isNaN(runsInterval)) { runsInterval = 6; }
    if (isNaN(delay)) { delay = 0; }

    runsInterval *= 3600000;
    var d = new Date();
    d.setUTCHours(d.getUTCHours() - delay);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    d.setTime(Math.floor(d.getTime() / runsInterval) * runsInterval);
    return d;
};
/**
 * Erzeugt ein Datumsobjekt, welches aus dem wetter3 Datumsstring gelesen wird.
 * Dieser String ist unter http://www1.wetter3.de/initarpege abrufbar und legt eine Variable
 * var init1 = 'Mi, 01-03-2017 06 UTC' an.
 * 
 * @param {string} val Der Datumsstring.
 * @returns Das Datumsobjekt, welches dem Datum entspricht. Ist der String ungültig, wird der 
 * Zeitwert der letzten vollen 6 Stunden, die aber mindestens 6 Stunden zurück liegen, zurückgegeben.
 */
Date.fromW3InitString = function (val) {
    if (val === undefined) { val = ""; }
    var d = new Date(0);
    var matches = val.match(/(\d+)-(\d+)-(\d+)\s(\d+)\s+UTC/i);
    if (matches !== null) {
        d.setUTCFullYear(matches[3]);
        d.setUTCMonth(matches[2] - 1);  // Das Monat beginnt in JS bei 0.
        d.setUTCDate(matches[1]);
        d.setUTCHours(matches[4]);
        return d;
    }
    else {
        return null;
    }
};

/**
 * Erzeugt ein Datumsobjekt mit der übergebenen vollen Stunde (0min, 0sek). Würde das Datum in der
 * Zukunft liegen, so wird der Vortag genommen.
 * Date.fromUTCHours(4) liefet also am 3.2.2017 3h UTC das Datum 2.2.2017 4:00:00 UTC
 * @param {number} hour Die Stunde.
 * @returns Das Datumsobjekt, welches den oberen Regeln entspricht.
 */
Date.fromUTCHours = function(hour) {
    var d = new Date();
    if (d.getUTCHours() < hour) {
        d.setUTCDate(d.getUTCDate()-1);
    }
    d.setUTCHours(hour);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    return d;
};

/**
 * Formatiert das Datum in der Form YYYYMMDD. Dies wird bei manchen URLs als Parameter verwendet.
 * 
 * @returns Ein String der Form YYYYMMDD
 */
Date.prototype.getUTCymd = function () {
    var year = this.getUTCFullYear();
    var month = this.getUTCMonth() + 1;
    var day = this.getUTCDate();

    if (month < 10) { month = "0" + month; }
    if (day < 10) { day = "0" + day; }

    return "" + year + month + day;
};

/**
 * Formatiert das Datum in der Form YYYYMMDDHH. Dies wird bei manchen URLs als Parameter verwendet.
 * 
 * @returns Ein String der Form YYYYMMDDHH
 */
Date.prototype.getUTCymdh = function () {
    var hour = this.getUTCHours();
    hour = hour < 10 ? "0" + hour : "" + hour;

    return this.getUTCymd() + hour;
};