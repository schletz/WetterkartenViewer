/* jshint strict:global */
/* globals $, localStorage, console */
"use strict";

/* 
 * DATE Erweiterungen 
 */
Date.prototype.getIsoDate = function () {
    var month = this.getUTCMonth() + 1;
    var day = this.getUTCDate();
    var hour = this.getUTCHours();
    var minute = this.getUTCMinutes();
    var second = this.getUTCSeconds();
    return this.getUTCFullYear() + "-" +
        (month < 10 ? "0" : "") + month + "-" +
        (day < 10 ? "0" : "") + day + "T" +
        (hour < 10 ? "0" : "") + hour + ":" +
        (minute < 10 ? "0" : "") + minute + ":" +
        (second < 10 ? "0" : "") + second + "Z";
};

/*
 * GfsEns Object
 */

var GfsEns = {
    version: "201724129_2",
    parsedData: [],
    /* Der Startzeitpunkt der Diagrammausgabe ist die letzte volle 6. Stunde, die aber mindestens 
     * 6 Stunden her ist. Wird in den getData Methoden verwendet. */
    startDate: new Date(Math.floor((Date.now() - 6 * 3600e3) / 6 / 3600e3) * 6 * 3600e3).getTime(),
    planetOsUrl: "https://api.planetos.com/v1/datasets/noaa_gfs_pgrb2_global_forecast_recompute_0.25degree/point?var={param}" +
    "&z={z}&lat={lat}&lon={lon}&count={count}&reftime_start={firstRun}&reftime_end={lastRun}&apikey=a7017583aeb944d2b8bfec81ff9a2363",
    lat: 48,
    lon: 16.5,
    /* Alle abzufragenden Daten. Jeder Eintrag ist ein Ajax Request, bei dem die Daten von
     * PlanetOs angefordert werden. Alle Werte werden mit der Transform-Funktion, wenn angegeben,
     * umgewandelt. */
    requests: [
        /* Temperatur auf 850hpa */
        { param: "tmpprs", zIndex: 25, transform: function (val) { return val - 273.15; }, loadHistory: true },
        /* Temperatur auf 500hpa */
        { param: "tmpprs", zIndex: 18, transform: function (val) { return val - 273.15; }, loadHistory: true },

        /* Geopot Höhe 500hpa, die Transformation erzeugt die Abweichung vom Mittel in dam. */
        { param: "hgtprs", zIndex: 18, transform: function (val) { return (val - 5570) / 10.0; } },
        /* Geopot Höhe 1000hpa, die Transformation erzeugt die Abweichung vom Mittel in dam. */
        { param: "hgtprs", zIndex: 30, transform: function (val) { return (val - 111) / 10.0; } },

        /* Temperatur auf 500hpa */
        { param: "tmpprs", zIndex: 18, transform: function (val) { return val - 273.15; }, loadHistory: true },
        /* Temperatur in Höhen über dem Boden. Wir brauchen nur 2m (z: fist) */
        { param: "tmp_m", zIndex: "first", transform: function (val) { return val - 273.15; }, loadHistory: true },
        /* Druck reduziert auf Meeresniveau. */
        { param: "prmslmsl", zIndex: "first", transform: function (val) { return val / 100.0; } },
        /* Relative Feuchte auf 700hpa */
        { param: "rhprs", zIndex: 22 },
        /* 3h Niederschlag */
        { param: "apcpsfc_3_Hour_Accumulation" },
        /* U und V Komponente des 10m Windws (z: first wird als Standard gesetzt) */
        { param: "vgrd_m" },
        { param: "ugrd_m" }
    ],
    requestsLoaded: 0,    // Für die Bestimmung, wann alle Ajax Requests fertig sind.
    windColors: [[0, '#CCCCCC'], [10, '#6E79FA'], [20, '#1AFF00'], [30, '#FFE900'], [40, '#FF0000'], [50, '#CC0074']],
    windSectors: ["N", "NO", "O", "SO", "S", "SW", "W", "NW", "N"],

    onReady: function (source) { return; },
    onError: function (source, message, details) { return; },
    onLoaded: function (source, message, details) { return; },

    /**
     * Liefert die URL, mit der die in RequestData geforderten Daten von PlanetOs geladen werden.
     * 
     * @param {object} requestData Parameter des Requests in der Form
     * { param: string, z: string, transform: function (val), firstRun: object, lastRun: object, loadHistory: boolean }
     * @returns URL für den AJAX Request.
     */
    getRequestUrl: function (requestData) {
        var count = 1000000;
        if (requestData.param === undefined) { return ""; }
        if (requestData.zIndex === undefined) { requestData.zIndex = "first"; }
        if (requestData.firstRun === undefined) { requestData.firstRun = new Date(); }
        if (requestData.lastRun === undefined) { requestData.lastRun = new Date(); }

        var url = this.planetOsUrl;

        if (requestData.param == "reftime") {
            count = 1; requestData.zIndex = "first";
            url = url.replace("reftime_start={firstRun}&reftime_end={lastRun}", "context=reftime_time1_isobaric3_lat_lon");
        }
        return url.replace("{lat}", this.lat).
            replace("{lon}", this.lon).
            replace("{param}", requestData.param).
            replace("{z}", requestData.zIndex).
            replace("{count}", count).
            replace("{firstRun}", requestData.firstRun.getIsoDate()).
            replace("{lastRun}", requestData.lastRun.getIsoDate());

    },

    /**
     * Führt die AJAX Requests durch und startet für jeden gelesenen Datensatz die Methode
     * parseData. Zuerst wird ein reftime Request abgesetzt, der das Datum des letzten Laufes
     * ermittelt. Ist dieser Lauf schon im localStorage, wird von diesem gelesen. Nur wenn
     * ein neuerer Lauf vorhanden ist, wird aus dem Web gelesen.
     * 
     * @param {number} lastRun Der Timestamp (ms seit 1.1.1970) des aktuellsten Laufes. Wenn nicht 
     * angegeben, wird mit einem reftime request von PlanetOs das Datum des letzten Laufes gelesen. 
     * Wenn angegeben, werden alle Requests in requests geladen, in die Variable parsedData geschrieben
     * und nach dem letzten Request
     * die Funktion onReady aufgerufen. Außerdem werden die Daten in den localStorage mit dem Key
     * parsedData und lastRun geschrieben.
     * @returns 
     */
    loadData: function (lastRun) {
        var self = this;
        var url = "";
        /* Kein letzter Lauf? Diesen anfordern */
        if (lastRun === undefined) {
            url = self.getRequestUrl({ param: "reftime" });
            $.ajax({ url: url, dataType: "json" }).done(function (data) {
                var lastRun = new Date(data.entries[0].axes.reftime);
                if (isNaN(lastRun.getTime())) { return self.onError(self, "READ_LAST_RUN_FAILED"); }

                self.onLoaded(self, "Letzter Lauf auf PlanetOs: " + lastRun.toISOString());
                self.loadData(lastRun.getTime());
            }).fail(function () {
                self.onError(self, "REQUEST_FAILED", url);
            });
            return;
        }

        /* Wurde dieser Lauf schon einmal im localStorage gespeichert? Dann lesen wir nicht neu,
         * sondern setzen parsedData auf die gespeicherten Daten. */
        if (localStorage.getItem("version") == self.version &&
            localStorage.getItem("lastRun") == lastRun && localStorage.getItem("parsedData") !== null) {
            self.onLoaded(self, "Daten im Local Storage aktuell.");
            self.parsedData = JSON.parse(localStorage.getItem("parsedData"));
            self.onReady(self);
            return true;
        }
        else {
            self.requests.forEach(function (item) {
                item.lastRun = new Date(lastRun);
                item.firstRun = new Date(lastRun);
                /* loadHistory lädt die letzten 4 Läufe. Dazu wird 1 Tag abgezogen (4 Läufe pro Tag)
                 * und 1 min dazuaddiert, da die API mit >= vergleicht. Sonst wären es 5 Läufe. */
                if (item.loadHistory) {
                    item.firstRun.setUTCDate(item.firstRun.getUTCDate() - 1);
                    item.firstRun.setUTCMinutes(1);
                }
                url = self.getRequestUrl(item);

                $.ajax({ url: url, dataType: "json" }).done(function (data) {
                    self.parseData(data, item.param, item.transform);
                    self.requestsLoaded++;
                    self.onLoaded(self, "Parameter geladen (" +
                        self.requestsLoaded + "/" + self.requests.length + ")",
                        item.param);
                    /* Alles geladen? Dann in den localStorage schreiben und onReady aufrufen. */
                    if (self.requestsLoaded == self.requests.length) {
                        self.postprocessData();
                        self.onReady(self);
                        localStorage.setItem("parsedData", JSON.stringify(self.parsedData));
                        localStorage.setItem("lastRun", lastRun);
                        localStorage.setItem("version", self.version);
                        return true;
                    }
                }).fail(function () {
                    self.onError(self, "REQUEST_FAILED", url);
                });
            });
        }

        return true;
    },

    /**
     * Speichert die geladenen Daten in parsedData. Es wird ein JSON Array in der Form
     * [{param: string, z: number, time: number, val: number, count: number, minVal: number, maxVal: number, lastRun: number}]
     * erstellt.
     * 
     * @param {object} data Die JSON Daten von PlanetOs.
     * @param {string} param Der gelesene Parameter (z. B. tmp_m).
     * @param {function} transform Die Transformationsfunktion, die für jeden Wert ausgeführt wird.
     */
    parseData: function (data, param, transform) {
        var self = this;
        var indexes = [];

        data.entries.forEach(function (item) {
            var run = new Date(item.axes.reftime).getTime();
            var time = new Date(item.axes.time).getTime();
            var z = 0;
            /* Manche Daten haben kein z. Sie werden mit z = 0 gespeichert. */
            if (item.axes.z !== undefined) { z = 1 * item.axes.z; }

            var val = 1 * item.data[param];
            if (transform !== undefined) { val = transform(val); }

            if (indexes[z] === undefined) { indexes[z] = []; }
            if (indexes[z][time] === undefined) {
                self.parsedData.push({
                    param: param,
                    z: z,
                    time: time,
                    val: val,
                    count: 1,
                    minVal: val,
                    maxVal: val,
                    lastRun: run
                });
                indexes[z][time] = self.parsedData.length - 1;
            }
            /* Wurde der Messwert für diesen Zeitpunkt schon gelesen, dann ist es eine Prognose
             * eines anderen Laufes. Hier werden die Daten aktualisiert. */
            else {
                var currentItem = self.parsedData[indexes[z][time]];
                if (currentItem.lastRun < run) {
                    currentItem.val = val;
                    currentItem.lastRun = run;
                }
                currentItem.count++;
                currentItem.minVal = Math.min(currentItem.minVal, val);
                currentItem.maxVal = Math.max(currentItem.maxVal, val);
            }
        });
        return true;
    },

    /**
     * Erstellt Parameter, die sich durch Berechnung aus anderen Parametern ergeben. Aktuell
     * wird nur die Relative Topografie berechnet, also die Differenz zwischen der Höhe der 
     * 500 und 1000 hPa Druckschickt.
     * 
     * @returns 
     */
    postprocessData: function () {
        var self = this;
        var gpt500 = { time: 0, val: 0 };
        var gpt1000 = { time: 0, val: 0 };

        /* Highcharts und die nachfolgende Bearbeitung benötigen nach der Zeit sortierte Daten. */
        self.parsedData.sort(function (a, b) { return a.time - b.time; });

        self.parsedData.forEach(function (item) {
            var time = item.time;
            if (item.param == "hgtprs" && item.z == 100000) {
                gpt1000.time = time; gpt1000.val = item.val;
            }
            if (item.param == "hgtprs" && item.z == 50000) {
                gpt500.time = time; gpt500.val = item.val;
            }
            if (gpt500.time == time && gpt1000.time == time) {
                self.parsedData.push({
                    param: "retop",
                    z: 50000,
                    time: time,
                    val: gpt500.val - gpt1000.val,
                    count: 1,
                    minVal: gpt500.val - gpt1000.val,
                    maxVal: gpt500.val - gpt1000.val,
                    lastRun: item.lastRun
                });
                gpt500.time = 0; gpt1000.time = 0;
            }
        });

        return true;
    },


    /**
     * Liefert ein JSON Objekt, welches eine Zeitreihe für den Parameter zurückgibt (values) oder
     * die Min und Max Werte der Läufe (Property ranges).
     * @example var dataSource = getData("tmpprs", 85000).ranges;
     * 
     * @param {string} param Der Parametername. tmpprs wenn nicht übergeben wird.
     * @returns Ein JSON Objekt mit dem Aufbau
     * {values: [[Timestamp, Value], ...], ranges: [[Timestamp, Min, Max], ...]}
     */
    getData: function (param, z) {
        if (param === undefined) { param = "tmpprs"; }
        if (z === undefined) { z = 0; }

        var self = this;
        var result = { values: [], ranges: [] };
        this.parsedData.forEach(function (item) {
            var time = item.time;
            if (item.param == param && item.z == z) {
                if (time >= self.startDate) {
                    result.values.push([time - 60e3 * new Date(time).getTimezoneOffset(), item.val]);
                    /* Nur wenn mindestens 3 Läufe einen Wert berechnet haben, geben wir min und max
                     * zurück. */
                    if (item.count > 2) {
                        result.ranges.push([time - 60e3 * new Date(time).getTimezoneOffset(), item.minVal, item.maxVal]);
                    }
                }
            }
        });
        return result;
    },


    /**
     * Liefert eine Zeitreihe mit den Winddaten. Dabei wird Windgeschrindigkeit und Windrichtung aus
     * den U und V Komponenten des Windes berechnet (Umwandlung kartesisch -> polar).
     * Außerdem wird ein color Property geschrieben, welches die Windgeschwindigkeit mit den in
     * windColors definierten Farben kategorisiert.
     * Es werden hierfür die Parameter vgrd_m und ugrd_m aus parsedData gelesen.
     * @returns JSON Objekt mit dem Aufbau [{x: Timestamp, y: Windrichtung, speed: Windgeschw., color: HTML Farbstring}]
     */
    getWindData: function (z) {
        var self = this;
        var vgrd = { time: 0, val: 0 };
        var ugrd = { time: 0, val: 0 };
        var windSpeed = 0, windDir = 0, result = [];

        if (z === undefined) { z = 10; }
        this.parsedData.forEach(function (item) {
            var time = item.time;
            /* Nur wenn der Zeitpunkt im Intervall [jetzt-6h, letzterLauf + 240h] liegt, wird der
             * Datenpunkt zurückgegeben. Prognosen > 240h sind für das Diagramm uninteressant, da 
             * hier nur mit einer Auflösung von 6h gerechnet wird. */
            if (time >= self.startDate) {
                if (item.param == "vgrd_m" && item.z == z) {
                    vgrd.time = time; vgrd.val = item.val;
                }
                if (item.param == "ugrd_m" && item.z == z) {
                    ugrd.time = time; ugrd.val = item.val;
                }
                if (vgrd.time == time && ugrd.time == time) {
                    windSpeed = 3.6 * Math.sqrt(vgrd.val * vgrd.val + ugrd.val * ugrd.val);
                    /* Formel siehe https://www.eol.ucar.edu/content/wind-direction-quick-reference */
                    windDir = 270 - Math.atan2(vgrd.val, ugrd.val) * 180 / Math.PI;
                    if (windDir < 0) { windDir += 360; }
                    if (windDir >= 360) { windDir -= 360; }
                    result.push({
                        x: time - 60e3 * new Date(time).getTimezoneOffset(),
                        y: windDir,
                        speed: Math.round(windSpeed),
                        sector: self.windSectors[Math.floor((windDir + 45 / 2) / 45)],
                        color: self.getWindColor(windSpeed)
                    });

                    vgrd.time = 0;
                    ugrd.time = 0;
                }
            }
        });
        return result;
    },
    /**
     * Liefert den Farbcode eines Wertes aufgrund der in windColors definierten Heatmap.
     * 
     * @param {number} val Wert
     * @returns HTML Farbcode als String.
     */
    getWindColor: function (val) {
        var colors = this.windColors;
        for (var i = 1; i < colors.length; i++) {
            if (colors[i][0] > val) {
                return colors[i - 1][1];
            }
        }
        return colors[colors.length - 1][1];
    }
};